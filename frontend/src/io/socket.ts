import { io, Socket } from 'socket.io-client';
import { getApiOrigin } from '../api/client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getApiOrigin());
  }
  return socket;
}
