import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) =>
      `${timestamp} [${level.toUpperCase()}] ${message}`)
  ),
  transports: [new winston.transports.Console()],
});

export function logError(message: string, error: unknown): void {
  const details = error instanceof Error ? error.stack : String(error);
  logger.error(`${message}: ${details}`);
}
