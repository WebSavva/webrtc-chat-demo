<template>
  <div class="conversation">
    <div>
      <p v-for="({ text }, index) in messages" :key="index">
        {{ text }}
      </p>
    </div>

    <form @submit.prevent="onMessageSend">
      <textarea v-model="messageText" />
      <button type="submit">Send</button>
    </form>

    <button
      v-if="currentStatus !== USER_STATUS.SPEAKING"
      :disabled="currentStatus === USER_STATUS.SEARCHING"
      class="conversation__btn conversation__btn_search"
      @click="onSearchConversation"
    >
      Search
    </button>

    <button v-else class="conversation__btn conversation__btn_stop">
      Stop
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { io, type Socket } from 'socket.io-client';
import { type Conversation, USER_STATUS } from '@webrtc-chat/types';

import { usePeerConnection } from './composition/peer-connection';

const currentStatus = ref<USER_STATUS>(USER_STATUS.IDLE);

interface Message {
  isMine: boolean;
  text: string;
}

const messages = ref<Message[]>([]);

const messageText = ref('');

let messagesChannel: RTCDataChannel;

function onMessageSend() {
  messagesChannel.send(messageText.value);

  messages.value.push({
    isMine: true,
    text: messageText.value,
  });

  messageText.value = '';
}

const {
  pc,

  startPeerConnection,
  resetPeerConnection,
} = usePeerConnection();

let socket: Socket;

function onSearchConversation() {
  socket.emit('conversation:search');
  currentStatus.value = USER_STATUS.SEARCHING;
}

function startListeningToServer() {
  socket = io('http://127.0.0.1:3000');

  socket.on('connect', () => {
    console.log('Connected');

    socket.on(
      'conversation:establishing',
      async ({
        isInitiator,
      }: {
        conversation: Conversation;
        isInitiator: boolean;
      }) => {
        currentStatus.value = USER_STATUS.SPEAKING;

        startPeerConnection();

        if (isInitiator) {
          messagesChannel = pc.value!.createDataChannel('messages');

          messagesChannel.onmessage = (event) => {
            messages.value.push({
              isMine: false,
              text: event.data,
            });
          };

          const offer = await pc.value!.createOffer();

          pc.value!.setLocalDescription(offer);

          socket.emit('conversation:offer', offer);

          socket.on('conversation:answer', (answer: any) => {
            if (!pc.value!.currentRemoteDescription && answer) {
              const answerDescription = new RTCSessionDescription(answer);

              pc.value!.setRemoteDescription(answerDescription);
            }
          });
        } else {
          pc.value!.ondatachannel = ({ channel }) => {
            messagesChannel = channel;

            messagesChannel.onmessage = ({ data: text }) =>
              messages.value.push({
                isMine: false,
                text,
              });
          };
          
          socket.on('conversation:offer', async (offer) => {
            await pc.value!.setRemoteDescription(
              new RTCSessionDescription(offer),
            );

            const answer = await pc.value!.createAnswer();
            await pc.value!.setLocalDescription(answer);

            socket.emit('conversation:answer', answer);
          });
        }

        pc.value!.onicecandidate = ({ candidate }) => {
          if (!candidate) return;

          socket.emit(
            `conversation:candidate:${isInitiator ? 'offer' : 'answer'}`,
            candidate,
          );
        };

        socket.on(
          `conversation:candidate:${isInitiator ? 'answer' : 'offer'}`,
          (answerCandidate) => {
            const candidate = new RTCIceCandidate(answerCandidate);
            pc.value!.addIceCandidate(candidate);
          },
        );

        pc.value!.onconnectionstatechange = () => {
          if (pc.value!.connectionState == 'connected') {
            socket.emit('conversation:start');
          }
        };
      },
    );
  });
}

onMounted(async () => {
  startListeningToServer();
});
</script>

<style scoped lang="stylus">
.conversation
  display flex
  flex-direction column
  padding 1rem 5rem
  max-width 1400px
  margin 0 auto

  &__btn
    margin-top 7rem
    font-weight bold
    align-self center
    font-size 2rem
    color #fff
    height 5rem
    border-radius 15px
    outline none
    border none
    cursor pointer
    width 20rem

    &:disabled
      opacity .8

    &_search
      background #37c037

    &_stop
      background ref
</style>
