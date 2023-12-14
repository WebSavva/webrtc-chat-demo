import { createServer } from 'http';

import express from 'express';
import { Server } from 'socket.io';
import { isProduction } from 'std-env';
import {
  CONVERTATION_STATUS,
  type Conversation,
  USER_STATUS,
} from '@webrtc-chat/types';

import { User, database } from './database';

// server initialization
const app = express();
const httpServer = createServer(app);

const io = new Server(
  httpServer,
  isProduction
    ? undefined
    : {
        cors: {
          origin: '*',
        },
      },
);

io.on('connection', (socket) => {
  const userId = socket.id;

  const user: User = {
    id: userId,
    status: USER_STATUS.IDLE,
    socket,
  };

  console.log('USER HAS JOINED', userId);

  socket.emit('greeting', {
    message: 'Hello World',
  });

  socket.on('conversation:search', () => {
    if (user.status !== USER_STATUS.IDLE) return;

    user.status = USER_STATUS.SEARCHING;
  });

  socket.on('conversation:start', () => {
    const activeConversation = database.conversations.get(
      user.activeConversationId,
    );

    activeConversation.status = CONVERTATION_STATUS.ACTIVE;

    socket.broadcast.to(activeConversation.id).emit('conversation:start', {
      conversation: activeConversation,
    });
  });

  socket.on('conversation:end', () => {
    const activeConversation = database.conversations.get(
      user.activeConversationId,
    );

    activeConversation.status = CONVERTATION_STATUS.SUCCESS;
    activeConversation.endedAt = new Date();

    user.socket.broadcast.to(activeConversation.id).emit('conversation:end', {
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

  database.users.set(userId, user);

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
      activeConversation.endedAt = new Date();
      activeConversation.status = CONVERTATION_STATUS.FAILED;

      const anotherParticipant = database.users.get(
        userId === activeConversation.initiatorId
          ? activeConversation.receiverId
          : activeConversation.initiatorId,
      );

      anotherParticipant.status = USER_STATUS.IDLE;
      anotherParticipant.activeConversationId = null;

      anotherParticipant.socket.emit('conversation:failure', {
        conversation: activeConversation,
      });
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

    user.socket.emit('conversation:establishing', {
      isInitiator: !!index,
      conversation,
    });

    [
      'conversation:answer',
      'conversation:offer',
      'conversation:candidate:offer',
      'conversation:candidate:offer',
    ].forEach((eventName) => {
      user.socket.on(eventName, (...args) => {
        user.socket.broadcast.to(conversationId).emit(eventName, ...args);
      });
    });
  });
}, 1e3);

httpServer.listen(3000, () => {
  console.log('SIGNALING SERVER IS UP AND RUNNING !');
});
