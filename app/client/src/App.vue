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

const myScreen = ref<HTMLVideoElement | null>(null);
const partnerScreen = ref<HTMLVideoElement | null>();

let myScreenStream: MediaStream | null = null;
let partnerScreenStream: MediaStream | null = null;

const currentStatus = ref<USER_STATUS>(USER_STATUS.IDLE);

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

        myScreenStream!.getTracks().forEach((track) => {
          pc.value!.addTrack(track, myScreenStream!);
        }); 

        console.log({
          isInitiator
        });

        // Pull tracks from remote stream, add to video stream
        pc.value!.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
            partnerScreenStream!.addTrack(track);
          });
        };

        if (isInitiator) {
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

async function startScreensTranslation() {
  myScreenStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  if (!myScreen.value) return;

  myScreen.value.srcObject = myScreenStream;

  partnerScreenStream = new MediaStream();

  if (!partnerScreen.value) return;

  partnerScreen.value.srcObject = partnerScreenStream;
}

onMounted(async () => {
  await startScreensTranslation();

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
      background ref
</style>
