export enum USER_STATUS {
  IDLE = 'idle',
  SEARCHING = 'searching',
  SPEAKING = 'speaking',
}

export type UserId = string;

export interface User {
  id: UserId;
  status: USER_STATUS;
}
