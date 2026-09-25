import { ApiClientError } from '@jobtok/api-client';
import { AUTH_CLIENT_HEADER, type ApiResponse } from '@jobtok/types';

export interface UploadHandle<T> {
  /** Resolves only when the server has received, checked and stored the file. */
  done: Promise<T>;
  abort: () => void;
}

/**
 * Sends a picked file (a file://, blob: or data: URI) as the raw body of a PUT, with real
 * progress for the bytes sent. The server inspects the file before answering, so a resolved
 * promise means it was accepted. Uses XHR because fetch can't report upload progress.
 */
export function putFile<T>(
  url: string,
  fileUri: string,
  accessToken: string,
  onProgress: (fraction: number) => void,
): UploadHandle<T> {
  const xhr = new XMLHttpRequest();
  let aborted = false;

  const done = (async () => {
    const blob = await (await fetch(fileUri)).blob();
    if (aborted) throw new ApiClientError(0, 'aborted', 'Upload cancelled.');
    return new Promise<T>((resolve, reject) => {
      xhr.open('PUT', url);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader(AUTH_CLIENT_HEADER, 'mobile');
      xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) onProgress(Math.min(1, e.loaded / e.total));
      };
      xhr.onload = () => {
        let body: ApiResponse<T> | null = null;
        try {
          body = JSON.parse(xhr.responseText) as ApiResponse<T>;
        } catch {
          // handled below
        }
        if (body?.ok) resolve(body.data);
        else if (body && !body.ok) {
          reject(
            new ApiClientError(xhr.status, body.error.code, body.error.message, body.error.details),
          );
        } else {
          reject(
            new ApiClientError(
              xhr.status,
              'bad_response',
              'Something went wrong. Please try again.',
            ),
          );
        }
      };
      xhr.onerror = () =>
        reject(
          new ApiClientError(
            0,
            'network_error',
            'The upload stopped. Check your internet connection and try again.',
          ),
        );
      xhr.onabort = () => reject(new ApiClientError(0, 'aborted', 'Upload cancelled.'));
      xhr.send(blob);
    });
  })();

  return {
    done,
    abort: () => {
      aborted = true;
      xhr.abort();
    },
  };
}
