import React, { useState, useEffect, useRef } from 'react';
import { CallRecord, startCallSession, endCallSession, WebRTCDebugInfo } from '../webrtcEngine';
import { Video, Mic, MicOff, VideoOff, PhoneOff, Activity, Volume2, Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface DoctorCallRoomProps {
  call: CallRecord;
  initialStream: MediaStream;
  onClose: () => void;
}

export const DoctorCallRoom: React.FC<DoctorCallRoomProps> = ({ call, initialStream, onClose }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const isVideoCall = call.callType === 'VIDEO';

  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'failed' | 'ended'>('connecting');
  const [remoteStreamObj, setRemoteStreamObj] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<WebRTCDebugInfo | null>(null);

  const localStreamRef = useRef<MediaStream>(initialStream);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (isVideoCall && localVideoRef.current) {
      localVideoRef.current.srcObject = initialStream;
      localVideoRef.current.play().catch(() => {});
    }

    const setupSession = async () => {
      const { cleanup } = await startCallSession({
        callId: call.callId,
        isCaller: true,
        localStream: initialStream,
        onRemoteStream: (remoteStream) => {
          console.log('[DoctorCallRoom] Remote Stream Attached:', remoteStream.getTracks());
          setRemoteStreamObj(remoteStream);
          if (remoteVideoRef.current && isMounted) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch((err) => console.warn('Remote video play notice:', err));
          }
        },
        onStatusChange: (status) => {
          if (isMounted) setCallStatus(status);
        },
        onEnded: () => {
          if (isMounted) {
            setCallStatus('ended');
            setTimeout(() => onClose(), 1200);
          }
        },
        onDebugUpdate: (info) => {
          if (isMounted) setDebugInfo(info);
        }
      });

      cleanupRef.current = cleanup;
    };

    setupSession();

    return () => {
      isMounted = false;
      if (cleanupRef.current) cleanupRef.current();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [call.callId]);

  const handleToggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isMicMuted;
      });
      setIsMicMuted(!isMicMuted);
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current && isVideoCall) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleHangUp = async () => {
    await endCallSession(call.callId);
    if (cleanupRef.current) cleanupRef.current();
    onClose();
  };

  const hasRemoteMedia = remoteStreamObj && (isVideoCall ? remoteStreamObj.getVideoTracks().length > 0 : remoteStreamObj.getAudioTracks().length > 0);
  const isTrulyConnected = callStatus === 'connected' && hasRemoteMedia;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-5xl w-full flex flex-col gap-5 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              {isVideoCall ? <Video className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>{isVideoCall ? 'Live 2-Way Video Consultation' : 'Live Voice Consultation'} • Patient: {call.patientName}</span>
                <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isTrulyConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : callStatus === 'connecting'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  <Activity className="w-3 h-3 animate-pulse" />
                  {isTrulyConnected
                    ? 'CONNECTED (LIVE)'
                    : callStatus === 'connecting'
                    ? 'RINGING PATIENT...'
                    : 'CONNECTION INTERRUPTED'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Clinical Evaluation: {call.lesionTitle}</p>
            </div>
          </div>

          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>Debug Panel</span>
            {showDebug ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Real-time Collapsible WebRTC Debugger Panel (Requirement 21) */}
        {showDebug && debugInfo && (
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300 shadow-inner">
            <div>
              <span className="text-slate-500 block">Secure Context:</span>
              <span className={debugInfo.isSecureContext ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {debugInfo.isSecureContext ? 'true' : 'false'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Camera / Microphone:</span>
              <span className="text-emerald-400">
                Cam: {debugInfo.hasCamera ? 'available' : 'unavailable'} | Mic: {debugInfo.hasMicrophone ? 'available' : 'unavailable'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Local Stream:</span>
              <span className="text-sky-300">
                {debugInfo.localStreamReady ? 'ready' : 'not ready'} ({debugInfo.localVideoTracksCount} v / {debugInfo.localAudioTracksCount} a)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Remote Stream:</span>
              <span className={debugInfo.remoteStreamReceived ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {debugInfo.remoteStreamReceived ? 'received' : 'not received'} ({debugInfo.remoteVideoTracksCount} v / {debugInfo.remoteAudioTracksCount} a)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Signaling State:</span>
              <span className="text-slate-200">{debugInfo.signalingState}</span>
            </div>
            <div>
              <span className="text-slate-500 block">ICE Gathering State:</span>
              <span className="text-slate-200">{debugInfo.iceGatheringState}</span>
            </div>
            <div>
              <span className="text-slate-500 block">ICE Connection State:</span>
              <span className="text-amber-300">{debugInfo.iceConnectionState}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Peer Connection State:</span>
              <span className={debugInfo.connectionState === 'connected' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {debugInfo.connectionState}
              </span>
            </div>
          </div>
        )}

        {/* Media Call Layout — Always-Mounted Video Ref Elements */}
        {isVideoCall ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-80">
            
            {/* Local Doctor Video Panel */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-lg">
              <video
                ref={localVideoRef}
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
                playsInline
                autoPlay
                muted
              />
              {isVideoOff && (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <VideoOff className="w-10 h-10" />
                  <span className="text-xs">Your Camera is Off</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-bold text-white border border-slate-700">
                You ({call.doctorName})
              </div>
            </div>

            {/* Remote Patient Video Panel — Always-Mounted DOM Video Element */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-lg">
              <video
                ref={remoteVideoRef}
                className={`w-full h-full object-cover ${hasRemoteMedia ? 'block' : 'hidden'}`}
                playsInline
                autoPlay
              />

              {!hasRemoteMedia && (
                <div className="flex flex-col items-center gap-3 text-slate-400 p-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 text-xl font-bold animate-pulse">
                    {call.patientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">{call.patientName}</span>
                    <span className="text-[11px] text-amber-300 font-mono">
                      {callStatus === 'connecting' ? 'CONNECTING WEBRTC STREAM...' : 'WAITING FOR PATIENT REMOTE VIDEO TRACK...'}
                    </span>
                  </div>
                </div>
              )}

              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-bold text-white border border-slate-700">
                Patient: {call.patientName}
              </div>
            </div>

          </div>
        ) : (
          /* VOICE ONLY CALL LAYOUT */
          <div className="h-80 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-8 text-center gap-6 relative overflow-hidden">
            <audio ref={remoteVideoRef} autoPlay />

            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-sky-500/20 border-2 border-sky-500/40 flex items-center justify-center text-sky-400 text-3xl font-black shadow-2xl animate-pulse">
                {call.patientName.slice(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <h4 className="text-xl font-black text-white">{call.patientName}</h4>
              <p className="text-xs text-emerald-400 font-mono flex items-center justify-center gap-1">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>{isTrulyConnected ? 'CONNECTED (LIVE VOICE)' : 'CONNECTING AUDIO...'}</span>
              </p>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-800">
          <button
            onClick={handleToggleMic}
            className={`p-3.5 rounded-2xl font-bold transition-all cursor-pointer ${
              isMicMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isMicMuted ? 'Unmute' : 'Mute'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-sky-400" />}
          </button>

          {isVideoCall && (
            <button
              onClick={handleToggleVideo}
              className={`p-3.5 rounded-2xl font-bold transition-all cursor-pointer ${
                isVideoOff ? 'bg-rose-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5 text-emerald-400" />}
            </button>
          )}

          <button
            onClick={handleHangUp}
            className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Call</span>
          </button>
        </div>

      </div>
    </div>
  );
};
