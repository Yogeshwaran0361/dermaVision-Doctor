import { db } from './firebase';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc
} from 'firebase/firestore';

const configuration: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302'
      ]
    }
  ]
};

export async function connectWebRTCPeerCall(
  consultationId: string,
  localStream: MediaStream,
  onRemoteStream: (stream: MediaStream) => void
): Promise<{ peerConnection: RTCPeerConnection; cleanup: () => void }> {
  const roomRef = doc(db, 'consultations', consultationId, 'callRoom', 'session');
  const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
  const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

  const pc = new RTCPeerConnection(configuration);

  // Add local tracks (Video + Audio)
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Handle incoming remote stream
  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onRemoteStream(event.streams[0]);
    }
  };

  // Check if an offer already exists in Firestore
  const roomSnap = await getDoc(roomRef);
  const roomData = roomSnap.exists() ? roomSnap.data() : null;

  let unsubRoom: () => void = () => {};
  let unsubCandidates: () => void = () => {};

  if (!roomData || !roomData.offer) {
    // ---- ROLE: CALLER (Create Offer) ----
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(callerCandidatesCollection, event.candidate.toJSON());
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await setDoc(roomRef, {
      offer: {
        type: offer.type,
        sdp: offer.sdp
      }
    });

    // Listen for Answer
    unsubRoom = onSnapshot(roomRef, async (snapshot) => {
      const data = snapshot.data();
      if (data?.answer && pc.signalingState !== 'closed' && !pc.currentRemoteDescription) {
        const rtcAnswer = new RTCSessionDescription(data.answer);
        await pc.setRemoteDescription(rtcAnswer);
      }
    });

    // Listen for Callee ICE Candidates
    unsubCandidates = onSnapshot(calleeCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data));
          } catch (e) {
            console.warn('ICE candidate notice:', e);
          }
        }
      });
    });

  } else {
    // ---- ROLE: CALLEE (Create Answer) ----
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(calleeCandidatesCollection, event.candidate.toJSON());
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await setDoc(roomRef, {
      answer: {
        type: answer.type,
        sdp: answer.sdp
      }
    }, { merge: true });

    // Listen for Caller ICE Candidates
    unsubCandidates = onSnapshot(callerCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data));
          } catch (e) {
            console.warn('ICE candidate notice:', e);
          }
        }
      });
    });
  }

  const cleanup = () => {
    unsubRoom();
    unsubCandidates();
    pc.getSenders().forEach((s) => s.track?.stop());
    pc.close();
  };

  return { peerConnection: pc, cleanup };
}
