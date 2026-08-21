import React, { useState, useEffect, useRef } from 'react';
import { connectWebRTCPeerCall } from '../webrtcSignaling';
import { Video, Mic, MicOff, VideoOff, PhoneOff, Activity, Volume2, UserCheck } from 'lucide-react';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  patientName: string;
  doctorName: string;
  lesionTitle: string;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  onClose,
  consultationId,
  patientName,
  doctorName,
  lesionTitle
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);

  useEffect(() => {
    if (!isOpen || !consultationId) return;

    let localStream: MediaStream | null = null;
    let rtcCleanup: (() => void) | null = null;

    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(async (stream) => {
        localStream = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        // Establish 2-Way WebRTC Peer Connection with Audio & Video
        const { cleanup } = await connectWebRTCPeerCall(
          consultationId,
          stream,
          (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play().catch(() => {});
              setRemoteConnected(true);
            }
          }
        );
        rtcCleanup = cleanup;
      })
      .catch((err) => {
        console.warn('WebRTC Media Error:', err);
      });

    return () => {
      if (rtcCleanup) rtcCleanup();
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      setRemoteConnected(false);
    };
  }, [isOpen, consultationId]);

  if (!isOpen) return null;

  const toggleMic = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach((t) => (t.enabled = isMicMuted));
      setIsMicMuted(!isMicMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl w-full flex flex-col gap-6 shadow-2xl relative overflow-hidden">
        
        {/* Call Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Live 2-Way Video Call with {patientName}</span>
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Activity className="w-3 h-3 animate-pulse" /> HD Encrypted
                </span>
              </h3>
              <p className="text-xs text-slate-400">Case Evaluation: {lesionTitle}</p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            {doctorName}
          </div>
        </div>

        {/* Video Feeds Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-80">
          
          {/* Local Doctor Video Feed */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-lg">
            <video
              ref={localVideoRef}
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
              playsInline
              muted
            />
            {isVideoOff && (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <VideoOff className="w-10 h-10" />
                <span className="text-xs">Your Camera is Off</span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-bold text-white border border-slate-700">
              You ({doctorName})
            </div>
          </div>

          {/* Patient Remote Video Feed Stream */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-lg">
            <video
              ref={remoteVideoRef}
              className={`w-full h-full object-cover ${remoteConnected ? 'block' : 'hidden'}`}
              playsInline
              autoPlay
            />

            {!remoteConnected && (
              <div className="flex flex-col items-center gap-3 text-slate-400 p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 text-xl font-bold animate-pulse">
                  {patientName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 block">{patientName}</span>
                  <span className="text-[11px] text-emerald-400 font-mono">Connecting Patient Audio & Video Stream...</span>
                </div>
              </div>
            )}

            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-bold text-white border border-slate-700">
              Patient: {patientName}
            </div>
          </div>

        </div>

        {/* Call Action Controls */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-800">
          <button
            onClick={toggleMic}
            className={`p-3.5 rounded-2xl font-bold transition-all cursor-pointer ${
              isMicMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-sky-400" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl font-bold transition-all cursor-pointer ${
              isVideoOff ? 'bg-rose-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5 text-emerald-400" />}
          </button>

          <button
            onClick={onClose}
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
