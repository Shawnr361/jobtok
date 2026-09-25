// Real video fixtures, generated with FFmpeg for each test run (nothing binary is committed),
// and the development storage stack pointed at a throwaway folder.
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll } from 'vitest';
import { FfmpegProcessor } from '../../src/modules/videos/processor.js';
import { LocalDiskStorage, MediaSigner } from '../../src/modules/videos/storage.js';
import type { VideoDeps } from '../../src/modules/videos/video.service.js';

function ffmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) =>
    execFile('ffmpeg', ['-y', '-v', 'error', ...args], { windowsHide: true }, (err) =>
      err ? reject(err) : resolve(),
    ),
  );
}

export interface VideoFixtures {
  dir: string;
  /** 3 s portrait H.264 MP4 with audio. */
  mp4: Buffer;
  /** Same, in a QuickTime (.mov) container. */
  mov: Buffer;
  /** 62 s: longer than the 60 s limit. */
  tooLong: Buffer;
  /** Audio only, in an MP4 container. */
  audioOnly: Buffer;
  /** MPEG-4 Part 2 video: a real video, but not a codec phones play. */
  oldCodec: Buffer;
  /** First 4 KB of a valid MP4: has the right header but is broken. */
  truncated: Buffer;
  /** Plain text. */
  text: Buffer;
}

export async function makeVideoFixtures(): Promise<VideoFixtures> {
  const dir = await mkdtemp(path.join(tmpdir(), 'jobtok-fixtures-'));
  afterAll(() => rm(dir, { recursive: true, force: true }));
  const p = (name: string) => path.join(dir, name);
  const src = ['-f', 'lavfi', '-i', 'testsrc=size=240x426:rate=15'];
  const tone = ['-f', 'lavfi', '-i', 'sine=frequency=440'];
  const h264 = ['-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p'];

  await Promise.all([
    ffmpeg([...src, ...tone, '-t', '3', ...h264, '-c:a', 'aac', '-shortest', p('a.mp4')]),
    ffmpeg([...src, '-t', '3', ...h264, '-f', 'mov', p('a.mov')]),
    ffmpeg(['-f', 'lavfi', '-i', 'testsrc=size=64x64:rate=5', '-t', '62', ...h264, p('long.mp4')]),
    ffmpeg([...tone, '-t', '2', '-c:a', 'aac', '-f', 'mp4', p('audio.mp4')]),
    ffmpeg([...src, '-t', '2', '-c:v', 'mpeg4', p('old.mp4')]),
  ]);
  const mp4 = await readFile(p('a.mp4'));
  await writeFile(p('text.txt'), 'not a video '.repeat(400));
  return {
    dir,
    mp4,
    mov: await readFile(p('a.mov')),
    tooLong: await readFile(p('long.mp4')),
    audioOnly: await readFile(p('audio.mp4')),
    oldCodec: await readFile(p('old.mp4')),
    truncated: mp4.subarray(0, 4096),
    text: await readFile(p('text.txt')),
  };
}

export const TEST_MEDIA_SECRET = 'test-media-secret-at-least-32-characters!!';

/** Development storage in a temp folder, real FFmpeg processing. */
export async function createTestVideoDeps(
  overrides: Partial<VideoDeps> = {},
): Promise<VideoDeps & { signer: MediaSigner; storage: LocalDiskStorage }> {
  const root = await mkdtemp(path.join(tmpdir(), 'jobtok-media-'));
  afterAll(() => rm(root, { recursive: true, force: true }));
  const signer = new MediaSigner(TEST_MEDIA_SECRET);
  const storage = new LocalDiskStorage(root, signer);
  return {
    storage,
    processor: new FfmpegProcessor(),
    unavailableReason: null,
    maxBytes: 20 * 1024 * 1024,
    urlTtlSeconds: 3600,
    rateLimits: {
      create: { windowMs: 60_000, limit: 10_000 },
      upload: { windowMs: 60_000, limit: 10_000 },
    },
    signer,
    ...overrides,
  } as VideoDeps & { signer: MediaSigner; storage: LocalDiskStorage };
}

export const randomUuid = () => {
  const h = randomBytes(16).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

export interface ImageFixtures {
  /** 800×600 landscape JPEG, with EXIF-style metadata to be stripped. */
  jpeg: Buffer;
  /** 300×500 portrait PNG. */
  png: Buffer;
  /** 400×400 WebP. */
  webp: Buffer;
  /** 32×32 PNG: too small for a profile photo. */
  tiny: Buffer;
  /** JPEG magic bytes followed by junk. */
  fakeJpeg: Buffer;
  /** A GIF: a real image, but not a format we take. */
  gif: Buffer;
}

/** Real photos for profile-picture tests, generated with FFmpeg. */
export async function makeImageFixtures(): Promise<ImageFixtures> {
  const dir = await mkdtemp(path.join(tmpdir(), 'jobtok-images-'));
  afterAll(() => rm(dir, { recursive: true, force: true }));
  const p = (name: string) => path.join(dir, name);
  const still = (size: string) => [
    '-f',
    'lavfi',
    '-i',
    `testsrc=size=${size}:rate=1`,
    '-frames:v',
    '1',
  ];
  await Promise.all([
    ffmpeg([...still('800x600'), '-metadata', 'comment=secret-location', p('a.jpg')]),
    ffmpeg([...still('300x500'), p('a.png')]),
    ffmpeg([...still('400x400'), '-c:v', 'libwebp', p('a.webp')]),
    ffmpeg([...still('32x32'), p('tiny.png')]),
    ffmpeg([...still('200x200'), p('a.gif')]),
  ]);
  return {
    jpeg: await readFile(p('a.jpg')),
    png: await readFile(p('a.png')),
    webp: await readFile(p('a.webp')),
    tiny: await readFile(p('tiny.png')),
    fakeJpeg: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(5000)]),
    gif: await readFile(p('a.gif')),
  };
}
