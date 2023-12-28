import { shallowRef } from 'vue';

const iceServers: RTCIceServer[] = [
  // {
  //   urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
  // },
];

if (import.meta.env.PROD) {
  iceServers.push({
    urls: `turn:85.193.81.245:3478`,
    username: 'username',
    credential: 'password1234',
  });
}

const DEFAULT_CONFIGURATIONS = {
  iceServers,
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
