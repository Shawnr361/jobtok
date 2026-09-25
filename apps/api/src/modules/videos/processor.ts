// Inspects uploaded files with FFmpeg. Nothing about a video is trusted from the client: the
// container is sniffed from its first bytes, then ffprobe reads the real duration, dimensions
// and codec. Thumbnails come from ffmpeg. Transcoding/adaptive streaming can be added here later.
import { execFile } from 'node:child_process';
import { open } from 'node:fs/promises';

export interface ProbeResult {
  /** Container family detected from the file, not the name or MIME type. */
  container: 'mp4' | 'mov';
  mimeType: 'video/mp4' | 'video/quicktime';
  durationSeconds: number;
  width: number;
  height: number;
  videoCodec: string;
}

export interface VideoProcessor {
  readonly name: string;
  /** Throws `VideoRejected` when the file isn't an acceptable video. */
  probe(filePath: string): Promise<ProbeResult>;
  /** Writes a JPEG frame. Returns false if a thumbnail couldn't be made (not fatal). */
  thumbnail(filePath: string, outPath: string, atSeconds: number): Promise<boolean>;
  /**
   * Turns an uploaded photo into a square profile picture (JPEG, metadata stripped).
   * Throws `VideoRejected` with a human reason when the file isn't a usable photo.
   */
  avatar(filePath: string, outPath: string): Promise<void>;
}

/** Profile photos are re-encoded to this square size. */
export const AVATAR_SIZE = 512;
/** Smallest and largest source photos we accept (the upper bound stops decompression bombs). */
const AVATAR_MIN_SIDE = 64;
const AVATAR_MAX_SIDE = 12_000;

/** A human-readable reason the upload can't be accepted. */
export class VideoRejected extends Error {}

/** Codecs phones and browsers can realistically play back without transcoding. */
const PLAYABLE_CODECS = new Set(['h264', 'hevc']);

function run(bin: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      bin,
      args,
      { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
      (err, stdout) => (err ? reject(err) : resolve(stdout)),
    );
  });
}

/** ISO base media (MP4/MOV) files start with a `ftyp` box; QuickTime uses the `qt  ` brand. */
export async function sniffContainer(filePath: string): Promise<'mp4' | 'mov' | null> {
  const fh = await open(filePath, 'r');
  try {
    const head = Buffer.alloc(12);
    const { bytesRead } = await fh.read(head, 0, 12, 0);
    if (bytesRead < 12 || head.toString('latin1', 4, 8) !== 'ftyp') return null;
    return head.toString('latin1', 8, 12) === 'qt  ' ? 'mov' : 'mp4';
  } finally {
    await fh.close();
  }
}

interface FfprobeOutput {
  format?: { format_name?: string; duration?: string };
  streams?: {
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
    tags?: { rotate?: string };
    side_data_list?: { rotation?: number }[];
  }[];
}

export class FfmpegProcessor implements VideoProcessor {
  readonly name = 'ffmpeg';

  constructor(
    private readonly ffprobe = 'ffprobe',
    private readonly ffmpeg = 'ffmpeg',
    private readonly limits = { minSeconds: 1, maxSeconds: 60 },
  ) {}

  /** True when both tools run on this machine. */
  async available(): Promise<boolean> {
    try {
      await run(this.ffprobe, ['-version'], 10_000);
      await run(this.ffmpeg, ['-version'], 10_000);
      return true;
    } catch {
      return false;
    }
  }

  async probe(filePath: string): Promise<ProbeResult> {
    const container = await sniffContainer(filePath);
    if (!container) {
      throw new VideoRejected('Please upload an MP4 or MOV video.');
    }
    let info: FfprobeOutput;
    try {
      const out = await run(
        this.ffprobe,
        ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath],
        20_000,
      );
      info = JSON.parse(out) as FfprobeOutput;
    } catch {
      throw new VideoRejected('We couldn’t read that video. It may be damaged. Try another one.');
    }

    const formats = (info.format?.format_name ?? '').split(',');
    if (!formats.includes('mov') && !formats.includes('mp4')) {
      throw new VideoRejected('Please upload an MP4 or MOV video.');
    }
    const video = info.streams?.find((s) => s.codec_type === 'video');
    if (!video || !video.width || !video.height) {
      throw new VideoRejected('That file has no video in it. Try another one.');
    }
    const codec = video.codec_name ?? 'unknown';
    if (!PLAYABLE_CODECS.has(codec)) {
      throw new VideoRejected(
        'That video uses a format phones can’t play yet. Record it again with your camera app.',
      );
    }
    const duration = Number(info.format?.duration);
    if (!Number.isFinite(duration) || duration < this.limits.minSeconds - 0.5) {
      throw new VideoRejected('That video is too short. Show us at least a second of your work.');
    }
    if (duration > this.limits.maxSeconds + 0.99) {
      throw new VideoRejected(
        `Videos can be up to ${this.limits.maxSeconds} seconds. Trim it and try again.`,
      );
    }

    // Phones often store portrait video as landscape plus a rotation flag.
    const rotation = Math.abs(
      Number(video.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0) ||
        Number(video.tags?.rotate ?? 0),
    );
    const sideways = rotation === 90 || rotation === 270;

    return {
      container,
      mimeType: container === 'mov' ? 'video/quicktime' : 'video/mp4',
      durationSeconds: duration,
      width: sideways ? video.height : video.width,
      height: sideways ? video.width : video.height,
      videoCodec: codec,
    };
  }

  async thumbnail(filePath: string, outPath: string, atSeconds: number): Promise<boolean> {
    try {
      await run(
        this.ffmpeg,
        [
          '-y',
          '-v',
          'error',
          '-ss',
          atSeconds.toFixed(2),
          '-i',
          filePath,
          '-frames:v',
          '1',
          '-vf',
          'scale=480:-2',
          '-q:v',
          '4',
          outPath,
        ],
        30_000,
      );
      return (await sniffJpeg(outPath)) === true;
    } catch {
      return false;
    }
  }

  async avatar(filePath: string, outPath: string): Promise<void> {
    if (!(await sniffImage(filePath))) {
      throw new VideoRejected('Please choose a JPG, PNG or WebP photo.');
    }
    let width = 0;
    let height = 0;
    try {
      const out = await run(
        this.ffprobe,
        [
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=width,height',
          '-of',
          'json',
          filePath,
        ],
        15_000,
      );
      const stream = (JSON.parse(out) as { streams?: { width?: number; height?: number }[] })
        .streams?.[0];
      width = stream?.width ?? 0;
      height = stream?.height ?? 0;
    } catch {
      throw new VideoRejected('We couldn’t read that photo. It may be damaged. Try another one.');
    }
    if (width < AVATAR_MIN_SIDE || height < AVATAR_MIN_SIDE) {
      throw new VideoRejected(
        `That photo is too small. Choose one at least ${AVATAR_MIN_SIDE} pixels wide.`,
      );
    }
    if (width > AVATAR_MAX_SIDE || height > AVATAR_MAX_SIDE) {
      throw new VideoRejected('That photo is too big to use. Try a smaller one.');
    }
    try {
      await run(
        this.ffmpeg,
        [
          '-y',
          '-v',
          'error',
          '-i',
          filePath,
          '-frames:v',
          '1',
          // Fill a square, then crop the middle: faces stay centred, nothing is stretched.
          '-vf',
          `scale=${AVATAR_SIZE}:${AVATAR_SIZE}:force_original_aspect_ratio=increase,crop=${AVATAR_SIZE}:${AVATAR_SIZE}`,
          // Drop EXIF (GPS location, device) from the published file.
          '-map_metadata',
          '-1',
          '-q:v',
          '3',
          outPath,
        ],
        30_000,
      );
    } catch {
      throw new VideoRejected('We couldn’t use that photo. Try another one.');
    }
    if (!(await sniffJpeg(outPath))) {
      throw new VideoRejected('We couldn’t use that photo. Try another one.');
    }
  }
}

/** JPEG, PNG and WebP, from their first bytes (never the name or MIME type). */
export async function sniffImage(filePath: string): Promise<'jpeg' | 'png' | 'webp' | null> {
  const fh = await open(filePath, 'r');
  try {
    const h = Buffer.alloc(12);
    const { bytesRead } = await fh.read(h, 0, 12, 0);
    if (bytesRead >= 3 && h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return 'jpeg';
    if (bytesRead >= 8 && h.readUInt32BE(0) === 0x89504e47 && h.readUInt32BE(4) === 0x0d0a1a0a) {
      return 'png';
    }
    if (
      bytesRead >= 12 &&
      h.toString('latin1', 0, 4) === 'RIFF' &&
      h.toString('latin1', 8, 12) === 'WEBP'
    ) {
      return 'webp';
    }
    return null;
  } finally {
    await fh.close();
  }
}

async function sniffJpeg(filePath: string): Promise<boolean> {
  try {
    const fh = await open(filePath, 'r');
    try {
      const head = Buffer.alloc(3);
      await fh.read(head, 0, 3, 0);
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    } finally {
      await fh.close();
    }
  } catch {
    return false;
  }
}
