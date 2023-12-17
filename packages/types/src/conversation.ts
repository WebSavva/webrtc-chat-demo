import type { UserId } from './user';

export enum CONVERTATION_STATUS {
  ESTABLISHING = 'establishing',
  ACTIVE = 'active',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface Conversation {
  id: string;
  initiatorId: UserId;
  receiverId: UserId;
  startedAt?: Date;
  endedAt?: Date;
  status: CONVERTATION_STATUS;
}
