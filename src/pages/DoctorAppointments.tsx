import React, { useEffect, useState } from 'react';
import {
  AppointmentRecord,
  startDoctorAppointmentMeeting,
  completeDoctorAppointment,
  updateAppointmentStatus,
  deleteDoctorAppointment
} from '../firebase';
import {
  Calendar,
  Clock,
  User,
  FileText,
  Video,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ChevronRight,
  Bell,
  ExternalLink,
  Volume2,
  X,
  Trash2
} from 'lucide-react';

interface DoctorAppointmentsProps {
  appointments: AppointmentRecord[];
  doctorMeetLink?: string;
}

export const DoctorAppointments: React.FC<DoctorAppointmentsProps> = ({ appointments, doctorMeetLink }) => {
  const [filter, setFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [selectedAppt, setSelectedAppt] = useState<AppointmentRecord | null>(null);
  const [customMeetUrl, setCustomMeetUrl] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  // 2-Hour Audio Chime Fallback Synthesizer (Part 13: Web Audio API)
  const playAudioChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio chime notice:', e);
    }
  };

  // Check 2-Hour Reminder (Part 4)
  const now = new Date().getTime();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  const upcoming2HAppt = appointments.find((a) => {
    if (a.appointmentStatus !== 'Scheduled' && a.appointmentStatus !== 'Confirmed') return false;
    const apptTime = new Date(a.appointmentDateTime || `${a.appointmentDate}T${a.appointmentTime}:00`).getTime();
    const diff = apptTime - now;
    return diff > 0 && diff <= twoHoursMs;
  });

  useEffect(() => {
    if (upcoming2HAppt && soundEnabled) {
      playAudioChime();
    }
  }, [upcoming2HAppt?.id]);

  // Filter Appointments
  const filteredAppointments = appointments.filter((a) => {
    if (filter === 'TODAY') return a.appointmentDate === todayStr;
    if (filter === 'UPCOMING') return a.appointmentDate >= todayStr && a.appointmentStatus !== 'Completed' && a.appointmentStatus !== 'Cancelled';
    if (filter === 'COMPLETED') return a.appointmentStatus === 'Completed';
    if (filter === 'CANCELLED') return a.appointmentStatus === 'Cancelled';
    return true; // ALL
  });

  // Handle Start Google Meet (Part 6 & 8: Real Google Meet URL)
  const handleStartMeet = async (appt: AppointmentRecord) => {
    const meetUrlToUse = appt.meetingUrl || customMeetUrl.trim() || doctorMeetLink || 'https://meet.google.com/new';
    await startDoctorAppointmentMeeting(appt.id, meetUrlToUse);
    window.open(meetUrlToUse, '_blank');
  };

  // Handle Complete Consultation (Part 10)
  const handleComplete = async (apptId: string) => {
    await completeDoctorAppointment(apptId);
    setSelectedAppt((prev) => prev?.id === apptId ? { ...prev, appointmentStatus: 'Completed', meetingStatus: 'COMPLETED' } : prev);
  };

  // Handle Delete Appointment
  const handleDeleteAppt = async (apptId: string) => {
    if (window.confirm('Are you sure you want to delete this appointment record?')) {
      await deleteDoctorAppointment(apptId);
      if (selectedAppt?.id === apptId) {
        setSelectedAppt(null);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* 2-HOUR REMINDER BANNER (PART 4 & PART 13) */}
      {upcoming2HAppt && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-amber-200 text-sm">🔔 UPCOMING CONSULTATION REMINDER</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">Starts in under 2 hours</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Patient: <strong className="text-white">{upcoming2HAppt.patientName}</strong> • Scheduled Today at <strong className="text-emerald-400">{upcoming2HAppt.appointmentTime}</strong> ({upcoming2HAppt.diseaseName})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedAppt(upcoming2HAppt)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs cursor-pointer shadow-md"
            >
              OPEN APPOINTMENT
            </button>
          </div>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <span>Doctor Appointments Schedule</span>
          </h2>
          <p className="text-xs text-slate-400">Manage patient tele-dermatology appointments and launch video sessions</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          {(['ALL', 'TODAY', 'UPCOMING', 'COMPLETED', 'CANCELLED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                filter === f
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List Grid */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-500">
          <Calendar className="w-12 h-12 stroke-[1.5]" />
          <h3 className="text-base font-bold text-slate-300">No Appointments Found</h3>
          <p className="text-xs text-slate-500 max-w-sm">There are no scheduled patient appointments matching the selected filter ({filter}).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((appt) => {
            const isReady = appt.meetingStatus === 'READY' || appt.appointmentStatus === 'In Progress';
            const isCompleted = appt.appointmentStatus === 'Completed';

            return (
              <div
                key={appt.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all shadow-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                    <User className="w-6 h-6" />
                  </div>

                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-base truncate">{appt.patientName}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-slate-800 text-slate-400'
                          : isReady
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      }`}>
                        {appt.appointmentStatus}
                      </span>
                    </div>

                    <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{appt.diseaseName} ({appt.confidence}%)</span>
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1">
                      <span className="flex items-center gap-1 text-slate-200">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" />
                        {appt.appointmentDate}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        {appt.appointmentTime}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setSelectedAppt(appt)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>View Details</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAppt(appt.id);
                      }}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                      title="Delete Appointment Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {!isCompleted && (
                      <button
                        onClick={() => handleStartMeet(appt)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>{isReady ? 'Rejoin Google Meet' : 'Start Google Meet'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APPOINTMENT DETAILS MODAL (PART 3) */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Appointment & Report Summary</h3>
                  <p className="text-xs font-mono text-sky-400">{selectedAppt.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Patient Info */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">Patient Name:</span>
                <span className="text-white font-bold">{selectedAppt.patientName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">Patient Email:</span>
                <span className="text-slate-200 font-mono">{selectedAppt.patientEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Scheduled Time:</span>
                <span className="text-emerald-400 font-bold">{selectedAppt.appointmentDate} at {selectedAppt.appointmentTime}</span>
              </div>
            </div>

            {/* Linked AI Report Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">Linked AI Screening:</span>
                <span className="text-emerald-400 font-bold">{selectedAppt.diseaseName}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">AI Confidence:</span>
                <span className="text-sky-300 font-mono font-bold">{selectedAppt.confidence}%</span>
              </div>

              {selectedAppt.imageUrl && (
                <div className="mt-2 w-full h-40 rounded-xl overflow-hidden border border-slate-800">
                  <img src={selectedAppt.imageUrl} alt="Lesion" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Consultation Reason */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1 text-xs">
              <span className="text-slate-400 font-bold">Patient Consultation Reason:</span>
              <p className="text-slate-300 leading-relaxed">{selectedAppt.consultationReason}</p>
            </div>

            {/* Custom Google Meet URL Input */}
            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-slate-400 font-bold">Custom Google Meet URL (Optional Override)</label>
              <input
                type="url"
                value={customMeetUrl}
                onChange={(e) => setCustomMeetUrl(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => handleStartMeet(selectedAppt)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Start REAL Google Meet Session & Notify Patient</span>
              </button>

              {selectedAppt.appointmentStatus !== 'Completed' && (
                <button
                  onClick={() => handleComplete(selectedAppt.id)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer border border-slate-700"
                >
                  Mark Consultation Completed
                </button>
              )}

              <button
                onClick={() => handleDeleteAppt(selectedAppt.id)}
                className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs cursor-pointer border border-red-500/20 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Appointment Record</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
