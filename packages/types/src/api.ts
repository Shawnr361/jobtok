// Envelope used by every REST response under /api/v1.

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface HealthStatus {
  status: 'ok';
  service: string;
  version: string;
  time: string;
}
