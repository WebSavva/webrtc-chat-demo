import type { Socket } from 'socket.io';

export enum USER_STATUS {
  IDLE = 'idle',
  SEARCHING = 'searching',
  SPEAKING = 'speaking',
}

export enum CONVERTATION_STATUS {
  ESTABLISHING = 'establishing',
  ACTIVE = 'active',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export type UserId = string;

export interface Conversation {
  id: string;
  initiatorId: UserId;
  receiverId: UserId;
  startedAt?: Date;
  endedAt?: Date;
  status: CONVERTATION_STATUS;
}

export interface User {
  id: UserId;
  status: USER_STATUS;
  socket: Socket;
}

export interface Database {
  users: Map<UserId, User>;
  conversations: Map<string, Conversation>;
}
export const database: Database = {
  users: new Map(),
  conversations: new Map(),
};
