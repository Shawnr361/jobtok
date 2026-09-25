import { Router, type Request } from 'express';
import type { Db } from '../../db/client.js';
import { HttpError, ok } from '../../lib/http.js';
import { createRateLimiter } from '../../lib/rate-limit.js';
import type { AuthDeps } from '../auth/auth.config.js';
import {
  authenticate,
  getAuth,
  requireAuth,
  requirePhoneVerified,
} from '../auth/auth.middleware.js';
import { SessionService } from '../auth/session.service.js';
import {
  CONTENT_TYPES,
  LocalDiskStorage,
  STORAGE_KEY_PATTERN,
  type MediaSigner,
} from './storage.js';
import { VideoService, type VideoDeps } from './video.service.js';
import {
  createVideoSchema,
  feedQuerySchema,
  interactionSchema,
  updateVideoSchema,
  videoIdParam,
} from './video.validation.js';

const HOUR = 60 * 60_000;

function contentLength(req: Request): number | null {
  const raw = req.get('content-length');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * /api/v1/videos: create, upload, publish and manage your own videos, and interact with
 * others'. Ownership always comes from the session, never from the request.
 */
export function createVideosRouter(db: Db, auth: AuthDeps, deps: VideoDeps) {
  const service = new VideoService(db, deps);
  const router = Router();
  router.use(createRateLimiter({ ...auth.config.rateLimits.general, name: 'videos' }));
  router.use(authenticate(new SessionService(db, auth)));
  const limits = deps.rateLimits ?? {
    create: { windowMs: HOUR, limit: 30 },
    upload: { windowMs: HOUR, limit: 30 },
  };
  const createLimit = createRateLimiter({ ...limits.create, name: 'video-create' });
  const uploadLimit = createRateLimiter({ ...limits.upload, name: 'video-upload' });

  router.post('/', createLimit, requirePhoneVerified, async (req, res) => {
    const input = createVideoSchema.parse(req.body ?? {});
    ok(res, await service.create(getAuth(req).userId, input), 201);
  });

  router.get('/mine', requireAuth, async (req, res) => {
    ok(res, { videos: await service.listMine(getAuth(req).userId) });
  });

  // Raw file body (any content type): the file itself is inspected, not the header.
  router.put('/:id/file', uploadLimit, requirePhoneVerified, async (req, res) => {
    const id = videoIdParam.parse(req.params.id);
    const video = await service.receiveUpload(getAuth(req).userId, id, req, contentLength(req));
    ok(res, { video });
  });

  router.post('/:id/publish', requirePhoneVerified, async (req, res) => {
    const id = videoIdParam.parse(req.params.id);
    ok(res, { video: await service.publish(getAuth(req).userId, id) });
  });

  router.patch('/:id', requireAuth, async (req, res) => {
    const id = videoIdParam.parse(req.params.id);
    const input = updateVideoSchema.parse(req.body ?? {});
    ok(res, { video: await service.update(getAuth(req).userId, id, input) });
  });

  router.delete('/:id', requireAuth, async (req, res) => {
    const id = videoIdParam.parse(req.params.id);
    await service.remove(getAuth(req).userId, id);
    ok(res, { deleted: true });
  });

  router.get('/:id', async (req, res) => {
    const id = videoIdParam.parse(req.params.id);
    ok(res, { video: await service.getOne(id, req.auth?.userId ?? null) });
  });

  for (const [path, set] of [
    ['like', service.setLike.bind(service)],
    ['save', service.setSave.bind(service)],
  ] as const) {
    router.post(`/:id/${path}`, requireAuth, async (req, res) => {
      const id = videoIdParam.parse(req.params.id);
      ok(res, await set(getAuth(req).userId, id, true));
    });
    router.delete(`/:id/${path}`, requireAuth, async (req, res) => {
      const id = videoIdParam.parse(req.params.id);
      ok(res, await set(getAuth(req).userId, id, false));
    });
  }

  router.post('/:id/events', requireAuth, async (req, res) => {
    const id = videoIdParam.parse(req.params.id);
    await service.record(getAuth(req).userId, id, interactionSchema.parse(req.body ?? {}));
    ok(res, { recorded: true }, 202);
  });

  return router;
}

/** /api/v1/feed: the vertical discovery feed of real, public work videos. */
export function createFeedRouter(db: Db, auth: AuthDeps, deps: VideoDeps) {
  const service = new VideoService(db, deps);
  const router = Router();
  router.use(createRateLimiter({ ...auth.config.rateLimits.general, name: 'feed' }));
  router.use(authenticate(new SessionService(db, auth)));
  router.get('/', async (req, res) => {
    ok(res, await service.feed(req.auth?.userId ?? null, feedQuerySchema.parse(req.query)));
  });
  return router;
}

/**
 * /api/v1/media/*: serves files from DEVELOPMENT local storage. Every URL is signed and
 * expires; keys must match the server's own fixed shape, so no path can be requested.
 */
export function createMediaRouter(deps: VideoDeps, signer: MediaSigner) {
  const router = Router();
  router.get('/:folder/:file', async (req, res) => {
    const storage = deps.storage;
    if (!(storage instanceof LocalDiskStorage)) {
      throw new HttpError(404, 'not_found', 'Not found.');
    }
    const key = `${req.params.folder}/${req.params.file}`;
    const exp = Number(req.query.exp);
    const sig = typeof req.query.sig === 'string' ? req.query.sig : '';
    if (!STORAGE_KEY_PATTERN.test(key) || !signer.verify(key, exp, sig)) {
      throw new HttpError(403, 'media_link_expired', 'This link has expired. Please refresh.');
    }
    const size = await storage.size(key);
    if (size === null) throw new HttpError(404, 'not_found', 'Not found.');

    const ext = key.slice(key.lastIndexOf('.') + 1);
    res.setHeader('Content-Type', CONTENT_TYPES[ext] ?? 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    // The app (another origin) embeds these in <video>/<img>; the signature is the access check.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const range = /^bytes=(\d*)-(\d*)$/.exec(req.get('range') ?? '');
    if (range && (range[1] || range[2])) {
      let start = range[1] ? Number(range[1]) : size - Number(range[2]);
      let end = range[1] && range[2] ? Number(range[2]) : size - 1;
      start = Math.max(0, start);
      end = Math.min(end, size - 1);
      if (start > end || start >= size) {
        res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
        return;
      }
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', String(end - start + 1));
      storage.read(key, { start, end }).pipe(res);
      return;
    }
    res.setHeader('Content-Length', String(size));
    storage.read(key).pipe(res);
  });
  return router;
}
