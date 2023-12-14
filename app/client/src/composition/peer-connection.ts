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
  const pc = shallowRef<RTCPeerConnection | null>(null);

  function startPeerConnection() {
    pc.value = new RTCPeerConnection(config);
  }

  function resetPeerConnection() {
    pc.value?.close();
    pc.value = null;
  }

  return {
    pc,

    startPeerConnection,
    resetPeerConnection,
  };
};
