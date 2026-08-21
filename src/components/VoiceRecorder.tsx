import React, { useState, useRef } from 'react';
import { Mic, Square, Send, RefreshCw } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoiceNote: (audioUrl: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoiceNote }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioBlobUrl(reader.result as string);
        };
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone Access Error:', err);
      alert('Microphone access is required for voice note recording.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = () => {
    if (audioBlobUrl) {
      onSendVoiceNote(audioBlobUrl);
      setAudioBlobUrl(null);
    }
  };

  const handleDiscard = () => {
    setAudioBlobUrl(null);
  };

  return (
    <div className="flex items-center gap-2">
      {audioBlobUrl ? (
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1.5">
          <audio src={audioBlobUrl} controls className="h-7 max-w-[160px]" />
          <button
            onClick={handleSend}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Voice</span>
          </button>
          <button
            onClick={handleDiscard}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            title="Discard"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : isRecording ? (
        <button
          onClick={stopRecording}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs animate-pulse cursor-pointer shadow-lg shadow-rose-500/20"
        >
          <Square className="w-3.5 h-3.5 fill-white" />
          <span>Stop Recording...</span>
        </button>
      ) : (
        <button
          onClick={startRecording}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          title="Record Audio Voice Note"
        >
          <Mic className="w-3.5 h-3.5 text-sky-400" />
          <span>Voice Note</span>
        </button>
      )}
    </div>
  );
};
