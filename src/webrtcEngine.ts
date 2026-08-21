import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  QuerySnapshot,
  DocumentSnapshot,
  DocumentChange
} from 'firebase/firestore';

export interface CallRecord {
  callId: string;
  doctorId: string;
  doctorName: string;
  doctorSpec?: string;
  patientId: string;
  patientName: string;
  caseId: string;
  lesionTitle: string;
  callType: 'VIDEO' | 'VOICE';
  status: 'ringing' | 'accepted' | 'connecting' | 'connected' | 'declined' | 'ended' | 'failed';
  createdAt?: any;
  startedAt?: any;
  endedAt?: any;
}

export interface WebRTCDebugInfo {
  role: 'Caller (Doctor)' | 'Callee (Patient)';
  callId: string;
  isSecureContext: boolean;
  hasCamera: boolean;
  hasMicrophone: boolean;
  localStreamReady: boolean;
  localVideoTracksCount: number;
  localAudioTracksCount: number;
  remoteStreamReceived: boolean;
  remoteVideoTracksCount: number;
  remoteAudioTracksCount: number;
  signalingState: string;
  iceGatheringState: string;
  iceConnectionState: string;
  connectionState: string;
  callerCandidatesCount: number;
  calleeCandidatesCount: number;
}

const configuration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export async function initiateCall({
  doctorId,
  doctorName,
  doctorSpec = 'Dermatologist',
  patientId,
  patientName,
  caseId,
  lesionTitle,
  callType
}: {
  doctorId: string;
  doctorName: string;
  doctorSpec?: string;
  patientId: string;
  patientName: string;
  caseId: string;
  lesionTitle: string;
  callType: 'VIDEO' | 'VOICE';
}): Promise<string> {
  const callDocRef = doc(collection(db, 'calls'));
  const callId = callDocRef.id;

  const callData: CallRecord = {
    callId,
    doctorId,
    doctorName,
    doctorSpec,
    patientId,
    patientName,
    caseId,
    lesionTitle,
    callType,
    status: 'ringing',
    createdAt: serverTimestamp()
  };

  await setDoc(callDocRef, callData);
  console.log('[WebRTC Engine Doctor] Call initiated:', callId);
  return callId;
}

export async function endCallSession(callId: string): Promise<void> {
  try {
    const callDocRef = doc(db, 'calls', callId);
    await updateDoc(callDocRef, {
      status: 'ended',
      endedAt: serverTimestamp()
    });
    console.log('[WebRTC Engine Doctor] Call session ended:', callId);
  } catch (err) {
    console.warn('[WebRTC Engine Doctor] End call notice:', err);
  }
}

export async function startCallSession({
  callId,
  isCaller,
  localStream,
  onRemoteStream,
  onStatusChange,
  onEnded,
  onDebugUpdate
}: {
  callId: string;
  isCaller: boolean;
  localStream: MediaStream;
  onRemoteStream: (stream: MediaStream) => void;
  onStatusChange: (status: 'connecting' | 'connected' | 'failed' | 'ended') => void;
  onEnded: () => void;
  onDebugUpdate?: (debug: WebRTCDebugInfo) => void;
}): Promise<{ cleanup: () => void }> {
  console.log(`[WebRTC Doctor Session] Starting session for ${callId} as ${isCaller ? 'Caller (Doctor)' : 'Callee (Patient)'}`);

  const peerConnection = new RTCPeerConnection(configuration);
  const callDocRef = doc(db, 'calls', callId);
  const offerRef = doc(db, 'calls', callId, 'signaling', 'offer');
  const answerRef = doc(db, 'calls', callId, 'signaling', 'answer');
  const callerCandidatesCol = collection(db, 'calls', callId, 'callerCandidates');
  const calleeCandidatesCol = collection(db, 'calls', callId, 'calleeCandidates');

  const pendingIceCandidates: RTCIceCandidateInit[] = [];

  let callerCandCount = 0;
  let calleeCandCount = 0;
  let remoteStreamReceived: MediaStream | null = null;

  const emitDebugInfo = () => {
    if (!onDebugUpdate) return;
    const isSecureContext = window.isSecureContext;
    const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    onDebugUpdate({
      role: isCaller ? 'Caller (Doctor)' : 'Callee (Patient)',
      callId,
      isSecureContext,
      hasCamera: hasMedia,
      hasMicrophone: hasMedia,
      localStreamReady: !!(localStream && localStream.active),
      localVideoTracksCount: localStream ? localStream.getVideoTracks().length : 0,
      localAudioTracksCount: localStream ? localStream.getAudioTracks().length : 0,
      remoteStreamReceived: !!remoteStreamReceived,
      remoteVideoTracksCount: remoteStreamReceived ? remoteStreamReceived.getVideoTracks().length : 0,
      remoteAudioTracksCount: remoteStreamReceived ? remoteStreamReceived.getAudioTracks().length : 0,
      signalingState: peerConnection.signalingState,
      iceGatheringState: peerConnection.iceGatheringState,
      iceConnectionState: peerConnection.iceConnectionState,
      connectionState: peerConnection.connectionState,
      callerCandidatesCount: callerCandCount,
      calleeCandidatesCount: calleeCandCount
    });
  };

  // 1. Add local media tracks
  localStream.getTracks().forEach((track) => {
    console.log(`[WebRTC Doctor] Adding local track: ${track.kind} (${track.label})`);
    peerConnection.addTrack(track, localStream);
  });
  emitDebugInfo();

  // 2. Handle remote stream tracks arriving with fallback MediaStream construction
  peerConnection.ontrack = (event) => {
    console.log('[WebRTC Doctor] REMOTE TRACK RECEIVED:', event.track.kind, '| ID:', event.track.id);
    
    let stream = event.streams && event.streams.length > 0 ? event.streams[0] : null;
    if (!stream) {
      console.log('[WebRTC Doctor] Fallback MediaStream created for remote track.');
      stream = new MediaStream([event.track]);
    }

    remoteStreamReceived = stream;
    onRemoteStream(stream);
    emitDebugInfo();
  };

  // 3. Local ICE Candidate generator with clean JSON serialization
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('[WebRTC Doctor] Local ICE Candidate generated:', event.candidate.type);
      const candObj = JSON.parse(JSON.stringify(event.candidate.toJSON()));
      if (isCaller) {
        addDoc(callerCandidatesCol, candObj);
      } else {
        addDoc(calleeCandidatesCol, candObj);
      }
    }
  };

  // 4. Connection Observers
  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState;
    console.log('[WebRTC Doctor Connection State]:', state);
    emitDebugInfo();

    if (state === 'connected') {
      onStatusChange('connected');
    } else if (state === 'failed' || state === 'disconnected') {
      onStatusChange('failed');
    } else if (state === 'closed') {
      onStatusChange('ended');
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log('[WebRTC Doctor ICE State]:', peerConnection.iceConnectionState);
    emitDebugInfo();
  };

  peerConnection.onsignalingstatechange = () => {
    console.log('[WebRTC Doctor Signaling State]:', peerConnection.signalingState);
    emitDebugInfo();
  };

  const processPendingIceCandidates = async () => {
    while (pendingIceCandidates.length > 0) {
      const cand = pendingIceCandidates.shift();
      if (cand) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
          console.log('[WebRTC Doctor] Processed queued ICE candidate.');
        } catch (err) {
          console.warn('[WebRTC Doctor] Error adding queued ICE candidate:', err);
        }
      }
    }
  };

  // 5. Signaling Flow
  const unsubCall = onSnapshot(callDocRef, (snap: DocumentSnapshot) => {
    if (snap.exists()) {
      const data = snap.data() as CallRecord;
      if (data.status === 'ended') {
        console.log('[WebRTC Doctor] Call status updated to ENDED by patient.');
        onStatusChange('ended');
        onEnded();
      }
    }
  });

  if (isCaller) {
    console.log('[WebRTC Doctor Caller] Creating Offer...');
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await setDoc(offerRef, { sdp: offer.sdp, type: offer.type });
    emitDebugInfo();

    const unsubAnswer = onSnapshot(answerRef, async (snap: DocumentSnapshot) => {
      if (snap.exists() && !peerConnection.currentRemoteDescription) {
        const answer = snap.data() as RTCSessionDescriptionInit;
        console.log('[WebRTC Doctor Caller] Received Answer SDP from Patient.');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        await processPendingIceCandidates();
        emitDebugInfo();
      }
    });

    const unsubCalleeCandidates = onSnapshot(calleeCandidatesCol, (snap: QuerySnapshot) => {
      snap.docChanges().forEach(async (change: DocumentChange) => {
        if (change.type === 'added') {
          calleeCandCount++;
          const candidateData = change.doc.data() as RTCIceCandidateInit;
          if (peerConnection.remoteDescription) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (e) {
              console.warn('[WebRTC Doctor] Error adding callee ICE candidate:', e);
            }
          } else {
            pendingIceCandidates.push(candidateData);
          }
          emitDebugInfo();
        }
      });
    });

    const cleanup = () => {
      unsubCall();
      unsubAnswer();
      unsubCalleeCandidates();
      localStream.getTracks().forEach((t) => t.stop());
      peerConnection.close();
      console.log('[WebRTC Doctor Session] Caller Session cleaned up.');
    };

    return { cleanup };

  } else {
    const unsubOffer = onSnapshot(offerRef, async (snap: DocumentSnapshot) => {
      if (snap.exists() && !peerConnection.currentRemoteDescription) {
        const offer = snap.data() as RTCSessionDescriptionInit;
        console.log('[WebRTC Doctor Callee] Received Offer SDP.');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        await processPendingIceCandidates();

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await setDoc(answerRef, { sdp: answer.sdp, type: answer.type });
        emitDebugInfo();
      }
    });

    const unsubCallerCandidates = onSnapshot(callerCandidatesCol, (snap: QuerySnapshot) => {
      snap.docChanges().forEach(async (change: DocumentChange) => {
        if (change.type === 'added') {
          callerCandCount++;
          const candidateData = change.doc.data() as RTCIceCandidateInit;
          if (peerConnection.remoteDescription) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (e) {
              console.warn('[WebRTC Doctor] Error adding caller ICE candidate:', e);
            }
          } else {
            pendingIceCandidates.push(candidateData);
          }
          emitDebugInfo();
        }
      });
    });

    const cleanup = () => {
      unsubCall();
      unsubOffer();
      unsubCallerCandidates();
      localStream.getTracks().forEach((t) => t.stop());
      peerConnection.close();
      console.log('[WebRTC Doctor Session] Callee Session cleaned up.');
    };

    return { cleanup };
  }
}
