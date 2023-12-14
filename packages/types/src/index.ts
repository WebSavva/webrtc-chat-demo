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

export interface User {
  id: UserId;
  status: USER_STATUS;
}

export interface Conversation {
  id: string;
  initiatorId: UserId;
  receiverId: UserId;
  startedAt?: Date;
  endedAt?: Date;
  status: CONVERTATION_STATUS;
}
