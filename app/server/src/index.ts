import { createServer } from 'http';
import { join } from 'path';

import express from 'express';
import { Server } from 'socket.io';
import { isProduction } from 'std-env';
import {
  CONVERTATION_STATUS,
  type Conversation,
  USER_STATUS,
  type SocketServerEventsMap,
  SOCKET_EVENT_NAME,
} from '@webrtc-chat/types';

import { User, database } from './database';

// server initialization
const app = express();
const httpServer = createServer(app);

if (isProduction) {
  app.use(express.static(join(__dirname, 'client')));
}

const CONVERSATION_SCOPE_EVENT_NAMES = [
  SOCKET_EVENT_NAME.CONVERSATION_OFFER,
  SOCKET_EVENT_NAME.CONVERSATION_ANSWER,
  SOCKET_EVENT_NAME.CONVERSATION_CANDIDATE_ANSWER,
  SOCKET_EVENT_NAME.CONVERSATION_CANDIDATE_OFFER,
] as const;

const io = new Server<SocketServerEventsMap>(
  httpServer,
  isProduction
    ? undefined
    : {
        cors: {
          origin: '*',
        },
      },
);

function setupConversationListeners(user: User) {
  const { socket } = user;

  socket.once(SOCKET_EVENT_NAME.CONVERSATION_START, () => {
    const activeConversation = database.conversations.get(
      user.activeConversationId,
    );

    activeConversation.status = CONVERTATION_STATUS.ACTIVE;

    socket.broadcast
      .to(activeConversation.id)
      .emit(SOCKET_EVENT_NAME.CONVERSATION_START, {
        conversation: activeConversation,
      });
  });

  socket.once(SOCKET_EVENT_NAME.CONVERSATION_END, () => {
    const activeConversation = database.conversations.get(
      user.activeConversationId,
    );

    activeConversation.status = CONVERTATION_STATUS.SUCCESS;
    activeConversation.endedAt = new Date();

    user.socket.broadcast
      .to(activeConversation.id)
      .emit(SOCKET_EVENT_NAME.CONVERSATION_END, {
        conversation: activeConversation,
      });

    [activeConversation.initiatorId, activeConversation.receiverId].forEach(
      (userId) => {
        const currentParticipant = database.users.get(userId);

        if (!currentParticipant) return;

        currentParticipant.activeConversationId = null;
        currentParticipant.status = USER_STATUS.IDLE;
      },
    );
  });

  socket.once(SOCKET_EVENT_NAME.CONVERSATION_FAILURE, () => {
    const activeConversation = database.conversations.get(
      user.activeConversationId,
    );

    user.socket.broadcast
      .to(activeConversation.id)
      .emit(SOCKET_EVENT_NAME.CONVERSATION_FAILURE, {
        conversation: activeConversation,
      });

    [activeConversation.initiatorId, activeConversation.receiverId].forEach(
      (userId) => {
        const user = database.users.get(userId);

        user.activeConversationId = null;
        user.status = USER_STATUS.IDLE;

        activeConversation.status = CONVERTATION_STATUS.FAILED;

        cleanupConversationListeners(user);
      },
    );
  });

  // retargeting all conversation-scope events
  // such as conversation:offer and so on
  CONVERSATION_SCOPE_EVENT_NAMES.forEach((eventName) => {
    user.socket.on(eventName, (...args: any[]) => {
      user.socket.broadcast
        .to(user.activeConversationId)
        .emit(eventName, ...(args as any));
    });
  });
}

function cleanupConversationListeners(user: User) {
  const { socket } = user;

  [
    ...CONVERSATION_SCOPE_EVENT_NAMES,
    SOCKET_EVENT_NAME.CONVERSATION_FAILURE,
    SOCKET_EVENT_NAME.CONVERSATION_START,
    SOCKET_EVENT_NAME.CONVERSATION_END,
  ].forEach((eventName) => socket.removeAllListeners(eventName));
}

io.on('connection', (socket) => {
  const userId = socket.id;

  const user: User = {
    id: userId,
    status: USER_STATUS.IDLE,
    socket,
  };

  console.log('USER HAS JOINED', userId);

  database.users.set(userId, user);

  socket.on(SOCKET_EVENT_NAME.CONVERSATION_SEARCH_START, () => {
    if (user.status !== USER_STATUS.IDLE) return;

    user.status = USER_STATUS.SEARCHING;
  });

  socket.on(SOCKET_EVENT_NAME.CONVERSATION_SEARCH_END, () => {
    if (user.status !== USER_STATUS.SEARCHING) return;

    user.status = USER_STATUS.IDLE;
  });

  socket.on('disconnecting', () => {
    database.users.delete(userId);

    // canceling ongoing conversation if it exists
    const activeConversation = database.conversations.get(
      user.activeConversationId,
    );

    if (
      activeConversation &&
      [CONVERTATION_STATUS.ESTABLISHING, CONVERTATION_STATUS.ACTIVE].includes(
        activeConversation.status,
      )
    ) {
      const isEstablishing =
        activeConversation.status === CONVERTATION_STATUS.ESTABLISHING;

      activeConversation.endedAt = new Date();

      // if user disconnects while conversation is being established
      // then failure event should be triggered
      // otherwise it's deemed as successful
      activeConversation.status = isEstablishing
        ? CONVERTATION_STATUS.FAILED
        : CONVERTATION_STATUS.SUCCESS;

      const anotherParticipant = database.users.get(
        userId === activeConversation.initiatorId
          ? activeConversation.receiverId
          : activeConversation.initiatorId,
      );

      anotherParticipant.status = USER_STATUS.IDLE;
      anotherParticipant.activeConversationId = null;

      anotherParticipant.socket.emit(
        isEstablishing
          ? SOCKET_EVENT_NAME.CONVERSATION_FAILURE
          : SOCKET_EVENT_NAME.CONVERSATION_END,
        {
          conversation: activeConversation,
        },
      );

      cleanupConversationListeners(anotherParticipant);
    }

    console.log('USER HAS LEFT', userId);
  });
});

setInterval(() => {
  const [initiator, receiver] = [...database.users.values()]
    .filter(({ status }) => status === USER_STATUS.SEARCHING)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  if (!initiator || !receiver) return;

  const conversationId = `${initiator.id}-${receiver.id}`;

  const conversation: Conversation = {
    id: conversationId,
    initiatorId: initiator.id,
    receiverId: receiver.id,
    status: CONVERTATION_STATUS.ESTABLISHING,
    startedAt: new Date(),
  };

  database.conversations.set(conversationId, conversation);

  [initiator, receiver].forEach((user, index) => {
    user.status = USER_STATUS.SPEAKING;

    user.socket.join(conversationId);
    user.activeConversationId = conversationId;

    setupConversationListeners(user);

    user.socket.emit(SOCKET_EVENT_NAME.CONVERSATION_ESTABLISHING, {
      isInitiator: !!index,
      conversation,
    });
  });
}, 1e3);

httpServer.listen(3000, () => {
  console.log('SIGNALING SERVER IS UP AND RUNNING !');
});
