export type ErrorCode =
  | 'unknown'
  | 'offline'
  | 'network'
  | 'not_configured'
  | 'provider'
  | 'rate_limited'
  | 'invalid_input'
  | 'permission'
  | 'geofence_limit';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function isOfflineError(error: unknown): boolean {
  if (error instanceof AppError) return error.code === 'offline' || error.code === 'network';
  return false;
}
