import type { ApiError, ApiResponse } from '@jobtok/types';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function ok<T>(res: Response, data: T, status = 200) {
  const body: ApiResponse<T> = { ok: true, data };
  return res.status(status).json(body);
}

function fail(res: Response, status: number, error: ApiError) {
  const body: ApiResponse<never> = { ok: false, error };
  return res.status(status).json(body);
}

export const notFoundHandler: RequestHandler = (req, res) => {
  fail(res, 404, { code: 'not_found', message: `No route for ${req.method} ${req.path}` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return fail(res, err.status, { code: err.code, message: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return fail(res, 400, {
      code: 'validation_error',
      message: 'Invalid request',
      details: err.issues,
    });
  }
  // Client errors raised by Express/body-parser (malformed JSON, payload too large, ...).
  const status = (err as { status?: number }).status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return fail(res, status, { code: 'bad_request', message: 'Malformed request' });
  }
  // Log the error itself only: request bodies (passwords, codes) are never logged.
  console.error(err);
  return fail(res, 500, { code: 'internal_error', message: 'Something went wrong' });
};
