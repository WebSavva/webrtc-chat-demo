import { shallowRef } from 'vue';

const DEFAULT_CONFIGURATIONS = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export const usePeerConnection = (
  config: RTCConfiguration = DEFAULT_CONFIGURATIONS,
) => {
  let pc: RTCPeerConnection | null = null;

  function startPeerConnection() {
    pc = new RTCPeerConnection(config);
  }

  function resetPeerConnection() {
    pc?.close();
    pc = null;
  }

  return {
    pc,

    startPeerConnection,
    resetPeerConnection,
  };
};
