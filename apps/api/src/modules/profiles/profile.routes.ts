import { Router, type Request } from 'express';
import type { Db } from '../../db/client.js';
import { ok } from '../../lib/http.js';
import { createRateLimiter } from '../../lib/rate-limit.js';
import type { AuthDeps } from '../auth/auth.config.js';
import { authenticate, getAuth, requireAuth } from '../auth/auth.middleware.js';
import { SessionService } from '../auth/session.service.js';
import { AvatarService, type AvatarDeps } from './avatar.service.js';
import { ProfileService } from './profile.service.js';
import {
  addLinkSchema,
  addSkillSchema,
  idParam,
  profileUpdateSchema,
  projectCreateSchema,
  projectUpdateSchema,
  skillSearchSchema,
  usernameCheckSchema,
} from './profile.validation.js';

function contentLength(req: Request): number | null {
  const n = Number(req.get('content-length'));
  return req.get('content-length') && Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * /api/v1/profiles: creator profiles. `/me` routes act only on the signed-in user's own
 * profile (there is no way to name another user's profile in a write).
 */
export function createProfilesRouter(
  db: Db,
  deps: AuthDeps,
  mediaUrl: (key: string) => string | null = () => null,
  media: AvatarDeps = { storage: null, processor: null },
) {
  const service = new ProfileService(db, mediaUrl);
  const avatars = new AvatarService(db, media, service);
  const photoLimit = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    name: 'profile-photo',
  });
  const router = Router();
  router.use(createRateLimiter({ ...deps.config.rateLimits.general, name: 'profiles' }));
  router.use(authenticate(new SessionService(db, deps)));

  router.get('/me', requireAuth, async (req, res) => {
    ok(res, { profile: await service.getMine(getAuth(req).userId) });
  });

  router.patch('/me', requireAuth, async (req, res) => {
    const input = profileUpdateSchema.parse(req.body ?? {});
    const { profile, created } = await service.upsertMine(getAuth(req).userId, input);
    ok(res, { profile }, created ? 201 : 200);
  });

  router.post('/me/skills', requireAuth, async (req, res) => {
    const input = addSkillSchema.parse(req.body ?? {});
    ok(res, { skills: await service.addSkill(getAuth(req).userId, input) }, 201);
  });

  router.delete('/me/skills/:skillId', requireAuth, async (req, res) => {
    const skillId = idParam.parse(req.params.skillId);
    ok(res, { skills: await service.removeSkill(getAuth(req).userId, skillId) });
  });

  router.post('/me/links', requireAuth, async (req, res) => {
    const input = addLinkSchema.parse(req.body ?? {});
    ok(res, { links: await service.addLink(getAuth(req).userId, input) }, 201);
  });

  router.delete('/me/links/:linkId', requireAuth, async (req, res) => {
    const linkId = idParam.parse(req.params.linkId);
    ok(res, { links: await service.removeLink(getAuth(req).userId, linkId) });
  });

  router.post('/me/projects', requireAuth, async (req, res) => {
    const input = projectCreateSchema.parse(req.body ?? {});
    ok(res, { projects: await service.addProject(getAuth(req).userId, input) }, 201);
  });

  router.patch('/me/projects/:projectId', requireAuth, async (req, res) => {
    const projectId = idParam.parse(req.params.projectId);
    const input = projectUpdateSchema.parse(req.body ?? {});
    ok(res, { projects: await service.updateProject(getAuth(req).userId, projectId, input) });
  });

  router.delete('/me/projects/:projectId', requireAuth, async (req, res) => {
    const projectId = idParam.parse(req.params.projectId);
    ok(res, { projects: await service.removeProject(getAuth(req).userId, projectId) });
  });

  /** Is this username valid and free? Guidance for the edit screen; saving checks again. */
  router.get('/username-check', requireAuth, async (req, res) => {
    const { username } = usernameCheckSchema.parse(req.query);
    ok(res, await service.checkUsername(getAuth(req).userId, username));
  });

  /** Upload or replace your profile photo: the raw image as the body (JPEG, PNG or WebP). */
  router.put('/me/avatar', photoLimit, requireAuth, async (req, res) => {
    ok(res, { profile: await avatars.set(getAuth(req).userId, req, contentLength(req)) });
  });

  router.delete('/me/avatar', requireAuth, async (req, res) => {
    ok(res, { profile: await avatars.remove(getAuth(req).userId) });
  });

  /** Public creator profile by profile id or username. No sign-in needed. */
  router.get('/:handle', async (req, res) => {
    const handle = String(req.params.handle).slice(0, 60);
    ok(res, { profile: await service.getPublic(handle, req.auth?.userId ?? null) });
  });

  router.post('/:handle/follow', requireAuth, async (req, res) => {
    const handle = String(req.params.handle).slice(0, 60);
    ok(res, await service.setFollow(getAuth(req).userId, handle, true));
  });

  router.delete('/:handle/follow', requireAuth, async (req, res) => {
    const handle = String(req.params.handle).slice(0, 60);
    ok(res, await service.setFollow(getAuth(req).userId, handle, false));
  });

  return router;
}

/** /api/v1/skills: the skill taxonomy, for picking and discovery. Public. */
export function createSkillsRouter(db: Db, deps: AuthDeps) {
  const service = new ProfileService(db);
  const router = Router();
  router.use(createRateLimiter({ ...deps.config.rateLimits.general, name: 'skills' }));

  router.get('/', async (req, res) => {
    ok(res, { skills: await service.searchSkills(skillSearchSchema.parse(req.query)) });
  });

  router.get('/categories', async (_req, res) => {
    ok(res, { categories: await service.categories() });
  });

  return router;
}
