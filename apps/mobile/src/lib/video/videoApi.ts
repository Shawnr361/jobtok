import { createVideoApi } from '@jobtok/api-client';
import type { MyVideo, VideoUploadTarget } from '@jobtok/types';
import { API_URL } from '../config';
import { putFile, type UploadHandle } from '../upload';

/** Real videos: create, upload, publish, feed and interactions. */
export const videoApi = createVideoApi({ baseUrl: API_URL, client: 'mobile' });

export type { UploadHandle };

/**
 * Sends a picked/recorded video to the upload target. Progress covers the bytes actually sent;
 * the server then inspects the file before answering, so a resolved promise means it's ready.
 */
export function uploadVideoFile(
  fileUri: string,
  target: VideoUploadTarget,
  accessToken: string,
  onProgress: (fraction: number) => void,
): UploadHandle<MyVideo> {
  const handle = putFile<{ video: MyVideo }>(
    videoApi.absolute(target.url),
    fileUri,
    accessToken,
    onProgress,
  );
  return { done: handle.done.then((d) => d.video), abort: handle.abort };
}

/** API-relative media URLs (development storage) become absolute; CDN URLs pass through. */
export const mediaUrl = (url: string | null) => (url ? videoApi.absolute(url) : null);
