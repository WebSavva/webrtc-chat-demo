<template>
  <div class="conversation">
    <div class="conversation__screens">
      <span class="conversation__screens__screen">
        <h3>Me</h3>

        <video ref="myScreen" autoplay playsinline />
      </span>

      <span class="conversation__screens__screen">
        <h3>Partner</h3>

        <video ref="partnerScreen" autoplay playsinline />
      </span>
    </div>

    <button
      v-if="currentStatus !== USER_STATUS.SPEAKING"
      :disabled="!isSocketConnected"
      class="conversation__btn conversation__btn_search"
      @click="onToggleSearchConversation"
    >
      {{ isSearching ? 'Stop' : 'Start' }} search
    </button>

    <button
      v-else
      class="conversation__btn conversation__btn_stop"
      @click="onStopConversation"
    >
      Stop
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { io, type Socket } from 'socket.io-client';
import {
  USER_STATUS,
  SOCKET_EVENT_NAME,
  type SocketClientEventsMap,
} from '@webrtc-chat/types';

import { usePeerConnection } from './composition/peer-connection';

const myScreen = ref<HTMLVideoElement | null>(null);
const partnerScreen = ref<HTMLVideoElement | null>();

let myScreenStream: MediaStream | null = null;
let partnerScreenStream: MediaStream | null = null;

const currentStatus = ref<USER_STATUS>(USER_STATUS.IDLE);
const isSocketConnected = ref(false);

const {
  pc,

  startPeerConnection,
  resetPeerConnection,
} = usePeerConnection();

let socket: Socket<SocketClientEventsMap>;

const isSearching = computed(
  () => currentStatus.value === USER_STATUS.SEARCHING,
);

function resetConversation() {
  // removing all socket listeners
  [
    SOCKET_EVENT_NAME.CONVERSATION_ANSWER,
    SOCKET_EVENT_NAME.CONVERSATION_CANDIDATE_ANSWER,
    SOCKET_EVENT_NAME.CONVERSATION_CANDIDATE_OFFER,
    SOCKET_EVENT_NAME.CONVERSATION_END,
    SOCKET_EVENT_NAME.CONVERSATION_ESTABLISHING,
    SOCKET_EVENT_NAME.CONVERSATION_FAILURE,
    SOCKET_EVENT_NAME.CONVERSATION_OFFER,
    SOCKET_EVENT_NAME.CONVERSATION_START,
  ].forEach((eventName) => {
    socket.removeAllListeners(eventName);
  });

  // closing peer connection
  resetPeerConnection();

  // reseting partner's screen
  partnerScreenStream = null;

  partnerScreen.value!.srcObject = partnerScreenStream;

  // updating status to idle
  currentStatus.value = USER_STATUS.IDLE;
}

function onStopConversation() {
  socket.emit(SOCKET_EVENT_NAME.CONVERSATION_END);

  resetConversation();
}

function onFailureConversation() {
  alert('Conversation has failed !');

  resetConversation();
}

function onToggleSearchConversation() {
  if (currentStatus.value === USER_STATUS.SEARCHING) {
    // triggering end of the conversation search
    socket.emit(SOCKET_EVENT_NAME.CONVERSATION_SEARCH_END);

    currentStatus.value = USER_STATUS.IDLE;
  } else {
    socket.once(
      SOCKET_EVENT_NAME.CONVERSATION_ESTABLISHING,
      async ({ isInitiator }) => {
        // updating user status to SPEAKING
        currentStatus.value = USER_STATUS.SPEAKING;

        // starting peer connection
        startPeerConnection();

        // setting up partner's screen
        partnerScreenStream = new MediaStream();

        partnerScreen.value!.srcObject = partnerScreenStream;

        pc.value!.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
            partnerScreenStream!.addTrack(track);
          });
        };

        // passing my screen's tracks to peer connection
        myScreenStream!.getTracks().forEach((track) => {
          pc.value!.addTrack(track, myScreenStream!);
        });

        // attaching socket socket listeners
        // depending on the side type of the speaker
        if (isInitiator) {
          const offer = await pc.value!.createOffer();

          pc.value!.setLocalDescription(offer);

          socket.emit(SOCKET_EVENT_NAME.CONVERSATION_OFFER, offer);

          socket.once(SOCKET_EVENT_NAME.CONVERSATION_ANSWER, (answer) => {
            if (!pc.value!.currentRemoteDescription && answer) {
              const answerDescription = new RTCSessionDescription(answer);

              pc.value!.setRemoteDescription(answerDescription);
            }
          });
        } else {
          socket.once(SOCKET_EVENT_NAME.CONVERSATION_OFFER, async (offer) => {
            await pc.value!.setRemoteDescription(
              new RTCSessionDescription(offer),
            );

            const answer = await pc.value!.createAnswer();
            await pc.value!.setLocalDescription(answer);

            socket.emit(SOCKET_EVENT_NAME.CONVERSATION_ANSWER, answer);
          });
        }

        // attaching ice candidate listeners
        pc.value!.onicecandidate = ({ candidate }) => {
          if (!candidate) return;

          socket.emit(
            isInitiator
              ? SOCKET_EVENT_NAME.CONVERSATION_CANDIDATE_OFFER
              : SOCKET_EVENT_NAME.CONVERSATION_CANDIDATE_ANSWER,
            candidate,
          );
        };

        socket.on(
          isInitiator
            ? SOCKET_EVENT_NAME.CONVERSATION_CANDIDATE_ANSWER
            : SOCKET_EVENT_NAME.CONVERSATION_CANDIDATE_OFFER,
          (answerCandidate) => {
            const candidate = new RTCIceCandidate(answerCandidate);
            pc.value!.addIceCandidate(candidate);
          },
        );

        socket.once(SOCKET_EVENT_NAME.CONVERSATION_END, resetConversation);
        socket.once(
          SOCKET_EVENT_NAME.CONVERSATION_FAILURE,
          onFailureConversation,
        );

        // crucial logic that triggers start or failure of a conversation
        pc.value!.onconnectionstatechange = () => {
          switch (pc.value!.connectionState) {
            case 'connected':
              return socket.emit(SOCKET_EVENT_NAME.CONVERSATION_START);

            case 'failed':
              onFailureConversation();

              return socket.emit(SOCKET_EVENT_NAME.CONVERSATION_FAILURE);
          }
        };
      },
    );

    // triggering start of the conversation search
    socket.emit(SOCKET_EVENT_NAME.CONVERSATION_SEARCH_START);

    currentStatus.value = USER_STATUS.SEARCHING;
  }
}

function startListeningToServer() {
  if (import.meta.env.PROD) {
    socket = io();
  } else {
    socket = io('ws://127.0.0.1:3000');
  }
  
  socket.on('connect', () => {
    isSocketConnected.value = true;
  });
}

async function startMyScreenTranslation() {
  myScreenStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  if (!myScreen.value) return;

  myScreen.value.srcObject = myScreenStream;
}

onMounted(async () => {
  await startMyScreenTranslation();

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

  &__screens
    display flex
    gap 1rem
    justify-content space-between

    &__screen
      flex 0 0 45%
      display flex
      flex-direction column

      h3
        font-size 2.2rem
        text-align center

      video
        border-radius 15px
        background gray
        flex 1

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
      background #f00
</style>
