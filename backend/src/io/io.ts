import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { appConfig } from '../config';
import { logger } from '../logger';

let io: Server | null = null;

export function initIo(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: appConfig.cors.origin,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`[io] client connected (${socket.id})`);

    // rooms: a client watches exactly the jobs it asked for -- results are
    // emitted to io.to(jobId), never broadcast
    socket.on('job:watch', (jobId: string) => {
      socket.join(jobId);
      logger.info(`[io] ${socket.id} watching job ${jobId}`);
    });
  });

  return io;
}

export function getIo(): Server {
  if (!io) {
    throw new Error('Socket.io was not initialized');
  }
  return io;
}
