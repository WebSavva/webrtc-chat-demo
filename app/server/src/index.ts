import { createServer } from 'http';
import { join } from 'path';

import express from 'express';
import { Op } from 'sequelize';
import { Server } from 'socket.io';
import { isProduction } from 'std-env';
import {
  CONVERTATION_STATUS,
  USER_STATUS,
  type SocketServerEventsMap,
  SOCKET_EVENT_NAME,
} from '@webrtc-chat/types';

import { sequelize, UserModel, ConversationModel } from './models';
import { User, database } from './database';

async function main() {
  // ensuring database connection
  await sequelize.authenticate();

  await sequelize.sync({
    force: true,
  })

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

  async function setupConversationListeners(userId: string) {
    const socket = io.sockets.sockets.get(userId);

    const user = await UserModel.findOne({
      where: {
        id: userId,
      },
    });

    const activeConversation = await ConversationModel.findOne({
      where: {
        id: user.activeConversationId,
      },
    });

    const activeConversationParticipantIds = [
      activeConversation.initiatorId,
      activeConversation.receiverId,
    ];

    async function cleanupConversation() {
      await UserModel.update(
        {
          activeConversationId: null,
          status: USER_STATUS.IDLE,
        },
        {
          where: {
            id: {
              [Op.in]: activeConversationParticipantIds,
            },
          },
        },
      );

      activeConversationParticipantIds.forEach((userId) =>
        cleanupConversationListeners(userId),
      );
    }

    socket.once(SOCKET_EVENT_NAME.CONVERSATION_START, async () => {
      activeConversation.status = CONVERTATION_STATUS.ACTIVE;

      await activeConversation.save();

      socket.broadcast
        .to(activeConversation.id)
        .emit(SOCKET_EVENT_NAME.CONVERSATION_START, {
          conversation: activeConversation,
        });
    });

    socket.once(SOCKET_EVENT_NAME.CONVERSATION_END, async () => {
      activeConversation.status = CONVERTATION_STATUS.SUCCESS;
      activeConversation.endedAt = new Date();

      await activeConversation.save();

      socket.broadcast
        .to(activeConversation.id)
        .emit(SOCKET_EVENT_NAME.CONVERSATION_END, {
          conversation: activeConversation,
        });

      await cleanupConversation();
    });

    socket.once(SOCKET_EVENT_NAME.CONVERSATION_FAILURE, async () => {
      activeConversation.status = CONVERTATION_STATUS.FAILED;
      activeConversation.endedAt = new Date();

      await activeConversation.save();

      socket.broadcast
        .to(activeConversation.id)
        .emit(SOCKET_EVENT_NAME.CONVERSATION_FAILURE, {
          conversation: activeConversation,
        });

      await cleanupConversation();
    });

    // retargeting all conversation-scope events
    // such as conversation:offer and so on
    CONVERSATION_SCOPE_EVENT_NAMES.forEach((eventName) => {
      socket.on(eventName, (...args: any[]) => {
        socket.broadcast
          .to(user.activeConversationId)
          .emit(eventName, ...(args as any));
      });
    });
  }

  function cleanupConversationListeners(userId: string) {
    const socket = io.sockets.sockets.get(userId);

    [
      ...CONVERSATION_SCOPE_EVENT_NAMES,
      SOCKET_EVENT_NAME.CONVERSATION_FAILURE,
      SOCKET_EVENT_NAME.CONVERSATION_START,
      SOCKET_EVENT_NAME.CONVERSATION_END,
    ].forEach((eventName) => socket.removeAllListeners(eventName));
  }

  io.on('connection', async (socket) => {
    const userId = socket.id;

    const user = await UserModel.create({
      id: userId,
      status: USER_STATUS.IDLE,
    });

    console.log('USER HAS JOINED', userId);

    socket.on(SOCKET_EVENT_NAME.CONVERSATION_SEARCH_START, async () => {
      if (user.status !== USER_STATUS.IDLE) return;

      user.status = USER_STATUS.SEARCHING;

      await user.save();
    });

    socket.on(SOCKET_EVENT_NAME.CONVERSATION_SEARCH_END, async () => {
      if (user.status !== USER_STATUS.SEARCHING) return;

      user.status = USER_STATUS.IDLE;

      await user.save();
    });

    socket.on('disconnecting', async () => {
      await user.destroy();

      // canceling ongoing conversation if it exists
      const activeConversation = await ConversationModel.findOne({
        where: {
          id: user.activeConversationId,
          status: {
            [Op.in]: [
              CONVERTATION_STATUS.ESTABLISHING,
              CONVERTATION_STATUS.ACTIVE,
            ],
          },
        },
      });

      if (activeConversation) {
        const isEstablishing =
          activeConversation.status === CONVERTATION_STATUS.ESTABLISHING;

        activeConversation.endedAt = new Date();

        // if user disconnects while conversation is being established
        // then failure event should be triggered
        // otherwise it's deemed as successful
        activeConversation.status = isEstablishing
          ? CONVERTATION_STATUS.FAILED
          : CONVERTATION_STATUS.SUCCESS;

        await activeConversation.save();

        const anotherParticipantId =
          userId === activeConversation.initiatorId
            ? activeConversation.receiverId
            : activeConversation.initiatorId;

        await UserModel.update(
          {
            status: USER_STATUS.IDLE,
            activeConversationId: null,
          },
          {
            where: {
              id: anotherParticipantId,
            },
          },
        );

        const anotherParticipantSocket =
          io.sockets.sockets.get(anotherParticipantId);

        anotherParticipantSocket.emit(
          isEstablishing
            ? SOCKET_EVENT_NAME.CONVERSATION_FAILURE
            : SOCKET_EVENT_NAME.CONVERSATION_END,
          {
            conversation: activeConversation,
          },
        );

        cleanupConversationListeners(anotherParticipantId);
      }

      console.log('USER HAS LEFT', userId);
    });
  });

  function setMatchUsersTimeout () {
    setTimeout(matchUsers, 3e3);
  }

   async function matchUsers () {
    const [initiator, receiver] = await UserModel.findAll({
      where: {
        status: USER_STATUS.SEARCHING,
      },

      order: sequelize.random(),

      limit: 2,
    });

    if (!initiator || !receiver) {
      setMatchUsersTimeout();

      return;
    }

    const conversationId = `${initiator.id}-${receiver.id}`;

    const conversation = await ConversationModel.create({
      id: conversationId,
      initiatorId: initiator.id,
      receiverId: receiver.id,
      status: CONVERTATION_STATUS.ESTABLISHING,
      startedAt: new Date(),
    });

    await Promise.all(
      [initiator, receiver].map(async (user, index) => {
        user.status = USER_STATUS.SPEAKING;

        user.activeConversationId = conversationId;

        await user.save();

        const socket = io.sockets.sockets.get(user.id);

        socket.join(conversationId);

        setupConversationListeners(user.id);

        socket.emit(SOCKET_EVENT_NAME.CONVERSATION_ESTABLISHING, {
          isInitiator: !!index,
          conversation,
        });
      }),
    );

    setMatchUsersTimeout();
  };

  setMatchUsersTimeout();

  httpServer.listen(3000, () => {
    console.log('SIGNALING SERVER IS UP AND RUNNING !');
  });
}

main();
