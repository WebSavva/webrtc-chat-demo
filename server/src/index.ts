import { Server } from 'socket.io';

import {
  CONVERTATION_STATUS,
  Conversation,
  USER_STATUS,
  database,
} from './database';

const io = new Server();

io.on('connection', (socket) => {
  const userId = socket.id;

  const user = {
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

  database.users.set(userId, user);

  socket.on('disconnect', () => {
    database.users.delete(userId);

    // canceling ongoing conversation if it exists
    const activeConversation = [...database.conversations.values()].find(
      ({ initiatorId, status, receiverId }) => {
        return (
          [
            CONVERTATION_STATUS.ACTIVE,
            CONVERTATION_STATUS.ESTABLISHING,
          ].includes(status) && [initiatorId, receiverId].includes(userId)
        );
      },
    );

    if (activeConversation) {
      activeConversation.endedAt = new Date();
      activeConversation.status = CONVERTATION_STATUS.FAILED;

      const anotherParticipant = database.users.get(
        userId === activeConversation.initiatorId
          ? activeConversation.receiverId
          : activeConversation.initiatorId,
      );

      anotherParticipant.socket.leave(activeConversation.id);

      anotherParticipant.status = USER_STATUS.IDLE;

      console.log(anotherParticipant);

      anotherParticipant.socket.emit('conversation:end', {
        converation: activeConversation,
      });
    }

    console.log('USER HAS LEFT', userId);
  });
});

io.listen(3000);

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

    user.socket.emit('conversation:start', {
      isInitiator: !!index,
      conversation,
    });
  });
}, 1e3);

console.log('SIGNALING SERVER IS UP AND RUNNING !');
