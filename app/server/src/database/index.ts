import {
  type Conversation,
  type UserId,
  type User as BaseUser,
  type SocketServerEventsMap,
} from '@webrtc-chat/types';

import type { Socket } from 'socket.io';


export interface User extends BaseUser {
  socket: Socket<SocketServerEventsMap>;
  activeConversationId?: string;
}

class Database {
  users = new Map<UserId, User>();
  conversations = new Map<string, Conversation>();
};

export const database = new Database();
