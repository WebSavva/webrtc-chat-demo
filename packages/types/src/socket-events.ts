import type { Conversation } from './conversation';

export enum SOCKET_EVENT_NAME {
  CONVERSATION_OFFER = 'conversation:offer',
  CONVERSATION_ANSWER = 'conversation:answer',
  CONVERSATION_CANDIDATE_ANSWER = 'conversation:candidate:answer',
  CONVERSATION_CANDIDATE_OFFER = 'conversation:candidate:offer',
  CONVERSATION_ESTABLISHING = 'conversation:establishing',
  CONVERSATION_START = 'conversation:start',
  CONVERSATION_END = 'conversation:end',
  CONVERSATION_FAILURE = 'conversation:failure',
  CONVERSATION_SEARCH = 'conversation:search',
}

export interface ConversationBasePayload {
  conversation: Conversation;
}

export type SocketEventPayload = {
  [SOCKET_EVENT_NAME.CONVERSATION_ESTABLISHING]: {
    isInitiator: boolean;
  } & ConversationBasePayload;
  [SOCKET_EVENT_NAME.CONVERSATION_SEARCH]: void;
} & Record<
  | SOCKET_EVENT_NAME.CONVERSATION_START
  | SOCKET_EVENT_NAME.CONVERSATION_END
  | SOCKET_EVENT_NAME.CONVERSATION_FAILURE,
  ConversationBasePayload
> &
  Record<
    | SOCKET_EVENT_NAME.CONVERSATION_CANDIDATE_ANSWER
    | SOCKET_EVENT_NAME.CONVERSATION_CANDIDATE_OFFER,
    RTCIceCandidate
  > &
  Record<
    | SOCKET_EVENT_NAME.CONVERSATION_OFFER
    | SOCKET_EVENT_NAME.CONVERSATION_ANSWER,
    RTCSessionDescriptionInit
  >;
