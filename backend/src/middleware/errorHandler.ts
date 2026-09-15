import type { NextFunction, Request, Response } from 'express';
import { logError } from '../logger';

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  next: NextFunction
): void {
  logError(`Unhandled error on ${request.method} ${request.originalUrl}`, error);
  response.status(500).json({ message: 'Something went wrong, please try again' });
}
