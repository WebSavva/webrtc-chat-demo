import {
  type Conversation,
  type UserId,
  type User as BaseUser,
} from '@webrtc-chat/types';

import type { Socket } from 'socket.io';

export interface User extends BaseUser {
  socket: Socket;
  activeConversationId?: string;
}

class Database {
  users = new Map<UserId, User>();
  conversations = new Map<string, Conversation>();
};

export const database = new Database();
