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
  CONVERSATION_SEARCH_START = 'conversation:search:start',
  CONVERSATION_SEARCH_END = 'conversation:search:end',
}

export interface ConversationBasePayload {
  conversation: Conversation;
}

export type SocketEventPayloadMap = {
  [SOCKET_EVENT_NAME.CONVERSATION_ESTABLISHING]: {
    isInitiator: boolean;
  } & ConversationBasePayload;
  [SOCKET_EVENT_NAME.CONVERSATION_SEARCH_START]: void;
  [SOCKET_EVENT_NAME.CONVERSATION_SEARCH_END]: void;
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

export type SocketServerEventsMap = {
  [EventName in keyof SocketEventPayloadMap]: (
    payload: SocketEventPayloadMap[EventName],
  ) => any;
};

export type SocketClientEventsMap = SocketServerEventsMap &
  Record<
    | SOCKET_EVENT_NAME.CONVERSATION_START
    | SOCKET_EVENT_NAME.CONVERSATION_END
    | SOCKET_EVENT_NAME.CONVERSATION_FAILURE
    | SOCKET_EVENT_NAME.CONVERSATION_START,
    () => any
  >;
