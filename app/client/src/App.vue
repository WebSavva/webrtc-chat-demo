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
      class="conversation__btn"
    >
      Search
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

import { usePeerConnection } from './composition/peer-connection';

const myScreen = ref<HTMLVideoElement | null>(null);
const partnerScreen = ref<HTMLVideoElement | null>(null);

let myScreenStream: MediaStream | null = null;

const {
  pc,

  startPeerConnection,
  resetPeerConnection,
} = usePeerConnection();

async function startMyScreenTranslation() {
  myScreenStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  if (!myScreen.value) return;

  myScreen.value.srcObject = myScreenStream;
}

onMounted(startMyScreenTranslation);
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
    background #37c037
    color #fff
    height 5rem
    border-radius 15px
    outline none
    border none
    cursor pointer
    width 20rem

</style>
