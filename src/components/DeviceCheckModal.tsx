import React, { useEffect, useState, useRef } from 'react';
import {
  startLocalMedia,
  getAvailableMediaDevices,
  MediaDeviceInfoSimple,
  checkSecureContext
} from '../mediaHelper';
import { Video, Mic, CheckCircle2, AlertTriangle, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface DeviceCheckModalProps {
  isOpen: boolean;
  isVideo: boolean;
  title: string;
  onConfirm: (stream: MediaStream, cameraDeviceId?: string, micDeviceId?: string) => void;
  onCancel: () => void;
}

export const DeviceCheckModal: React.FC<DeviceCheckModalProps> = ({
  isOpen,
  isVideo,
  title,
  onConfirm,
  onCancel
}) => {
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfoSimple[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfoSimple[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMic, setSelectedMic] = useState<string>('');

  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);

  const [mediaError, setMediaError] = useState<{ name: string; message: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const runTest = async (camId?: string, micId?: string) => {
    setIsTesting(true);
    setMediaError(null);
    setShowInstructions(false);

    if (activeStream) {
      activeStream.getTracks().forEach((t) => t.stop());
      setActiveStream(null);
    }

    try {
      const stream = await startLocalMedia({
        isVideo,
        cameraDeviceId: camId || selectedCamera,
        micDeviceId: micId || selectedMic
      });

      setActiveStream(stream);

      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      setCameraOk(isVideo ? hasVideo : true);
      setMicOk(hasAudio);

      if (isVideo && previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.play().catch(() => {});
      }

      const { cameras: camList, microphones: micList } = await getAvailableMediaDevices();
      setCameras(camList);
      setMics(micList);

      if (!selectedCamera && camList.length > 0) setSelectedCamera(camList[0].deviceId);
      if (!selectedMic && micList.length > 0) setSelectedMic(micList[0].deviceId);

    } catch (err: any) {
      console.error('[DeviceCheck] Stream Test Error:', { name: err.name, message: err.message });
      setMediaError({ name: err.name || 'Error', message: err.message || 'Media access failed' });
      setCameraOk(false);
      setMicOk(false);

      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        setShowInstructions(true);
      }
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkSecureContext();
      runTest();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, isVideo]);

  if (!isOpen) return null;

  const getErrorMessageText = () => {
    if (!mediaError) return null;
    switch (mediaError.name) {
      case 'NotAllowedError':
        return 'Camera or microphone permission was denied by your browser.';
      case 'NotFoundError':
        return 'No camera or microphone hardware found on this device.';
      case 'NotReadableError':
        return 'The camera or microphone is currently locked by another application (e.g. Zoom, Teams).';
      case 'SecurityError':
        return 'Media access is blocked by your browser security policy.';
      case 'OverconstrainedError':
        return 'Selected camera resolution or constraint is unsupported by your hardware.';
      default:
        return mediaError.message || 'Unable to access media devices.';
    }
  };

  const handleJoin = () => {
    if (activeStream) {
      onConfirm(activeStream, selectedCamera, selectedMic);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full flex flex-col gap-5 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Doctor Device Check</h3>
              <p className="text-xs text-slate-400">{title}</p>
            </div>
          </div>

          <button onClick={onCancel} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Camera Preview Box */}
        {isVideo && (
          <div className="relative bg-slate-950 rounded-2xl h-52 overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
            <video
              ref={previewVideoRef}
              className={`w-full h-full object-cover ${activeStream && cameraOk ? 'block' : 'hidden'}`}
              playsInline
              autoPlay
              muted
            />

            {(!activeStream || !cameraOk) && (
              <div className="flex flex-col items-center gap-2 text-slate-500 p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <span className="text-xs text-slate-300 font-semibold">Camera Stream Inactive</span>
                <span className="text-[11px] text-slate-500 max-w-xs">{getErrorMessageText() || 'Click "Try Again" to request camera access.'}</span>
              </div>
            )}

            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-bold text-white border border-slate-700 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cameraOk ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              <span>Live Test Preview</span>
            </div>
          </div>
        )}

        {/* Status Indicators Bar */}
        <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
            cameraOk ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <Video className="w-4 h-4" />
            <span>{cameraOk ? '🟢 Camera Detected' : '🔴 Camera Unavailable'}</span>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
            micOk ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}>
            <Mic className="w-4 h-4" />
            <span>{micOk ? '🟢 Microphone Detected' : '🔴 Microphone Unavailable'}</span>
          </div>
        </div>

        {/* Device Selectors */}
        <div className="flex flex-col gap-3 text-xs">
          {isVideo && cameras.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-semibold">Camera Device:</label>
              <select
                value={selectedCamera}
                onChange={(e) => {
                  setSelectedCamera(e.target.value);
                  runTest(e.target.value, selectedMic);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
              >
                {cameras.map((c) => (
                  <option key={c.deviceId} value={c.deviceId}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          {mics.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-slate-400 font-semibold">Microphone Device:</label>
              <select
                value={selectedMic}
                onChange={(e) => {
                  setSelectedMic(e.target.value);
                  runTest(selectedCamera, e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
              >
                {mics.map((m) => (
                  <option key={m.deviceId} value={m.deviceId}>{m.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Browser Permission Instructions Box */}
        {showInstructions && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4" />
              <span>Browser Permission Blocked</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-100">
              Your browser is blocking camera/microphone access. Follow these steps to unblock:
            </p>
            <ol className="list-decimal pl-5 text-[11px] space-y-1 font-mono text-slate-300">
              <li>Click the 🔒 lock icon near the address bar.</li>
              <li>Select <strong>Site permissions</strong> or <strong>Permissions</strong>.</li>
              <li>Set <strong>Camera</strong> & <strong>Microphone</strong> to <strong>Allow</strong>.</li>
              <li>Click "Try Again" below.</li>
            </ol>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
          <button
            onClick={() => runTest()}
            disabled={isTesting}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>Try Again</span>
          </button>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={!activeStream}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Start Doctor Call</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
