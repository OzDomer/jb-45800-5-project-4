import type { NextFunction, Request, Response } from 'express';
import { logger } from '../logger';

export function requestLogger(request: Request, response: Response, next: NextFunction): void {
  logger.info(`${request.method} ${request.originalUrl}`);
  next();
}
