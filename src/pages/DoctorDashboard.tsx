import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  auth,
  subscribeToDoctorQueue,
  subscribeToConsultationMessages,
  sendConsultationMessage,
  issueDoctorPrescription,
  updateConsultationStatus,
  deleteConsultationRecord,
  launchDoctorGoogleMeetCall,
  sendPatientMeetNotification,
  endDoctorMeetCall,
  ConsultationRecord
} from '../firebase';
import { DoctorNavbar } from '../components/DoctorNavbar';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { PrescriptionModal } from '../components/PrescriptionModal';
import {
  Stethoscope,
  Users,
  Video,
  FileText,
  Send,
  Volume2,
  CheckCircle2,
  Clock,
  Pill,
  Maximize2,
  AlertCircle,
  X,
  MoreVertical,
  Trash2
} from 'lucide-react';

import { DoctorProfile } from './DoctorProfile';
import { DoctorAppointments } from './DoctorAppointments';
import {
  subscribeToAppointments,
  subscribeToDoctorProfile,
  AppointmentRecord,
  DoctorProfileData
} from '../firebase';

const ChatMessageLinkBox: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/g);
  const url = urlMatch ? urlMatch[0] : null;

  if (!url) return <span className="whitespace-pre-line">{text}</span>;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parts = text.split(url);

  return (
    <div className="leading-relaxed">
      {parts[0]}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-blue-400 hover:text-blue-300 font-bold font-mono underline break-all inline"
      >
        {url}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-300 text-[10px] font-bold cursor-pointer transition-all align-middle"
        title="Copy link alone"
      >
        {copied ? (
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Copied!
          </span>
        ) : (
          <span className="flex items-center gap-1 text-blue-300">
            <Send className="w-3 h-3 text-blue-400" /> Copy Link
          </span>
        )}
      </button>
      {parts[1]}
    </div>
  );
};

interface DoctorDashboardProps {
  onLogout?: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();

  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationRecord | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  
  // Filtering states: Task Status & Risk Level
  const [taskStatusFilter, setTaskStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('PENDING');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  
  const [docImgError, setDocImgError] = useState(false);
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'PROFILE' | 'APPOINTMENTS'>('DASHBOARD');
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfileData | null>(null);

  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [notifiedPatientId, setNotifiedPatientId] = useState<string | null>(null);
  const [meetUrlInput, setMeetUrlInput] = useState<string>('');
  const [notifyErrorMsg, setNotifyErrorMsg] = useState<string | null>(null);

  // Deletion States
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ConsultationRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const doctorName = doctorProfile?.name || 'Dr. Sarah Smith, MD';

  const handleDeleteCase = async (item: ConsultationRecord) => {
    setIsDeleting(true);
    await deleteConsultationRecord(item.id);
    setConsultations((prev) => prev.filter(c => c.id !== item.id));
    if (selectedConsultation?.id === item.id) {
      const remaining = consultations.filter(c => c.id !== item.id);
      setSelectedConsultation(remaining.length > 0 ? remaining[0] : null);
    }
    setIsDeleting(false);
    setDeleteConfirmItem(null);
    setOpenMenuId(null);
  };

  const handleStartGoogleMeet = async () => {
    setNotifyErrorMsg(null);
    if (!selectedConsultation || !selectedConsultation.id) return;

    let actualMeetUrl = selectedConsultation.meetUrl || selectedConsultation.meetingUrl;

    if (!actualMeetUrl || !selectedConsultation.meetingActive) {
      actualMeetUrl = doctorProfile?.googleMeetLink || meetUrlInput;

      if (!actualMeetUrl || actualMeetUrl.trim() === '') {
        setNotifyErrorMsg('Please enter or configure your official Google Meet link in your Doctor Profile first.');
        return;
      }

      await launchDoctorGoogleMeetCall(selectedConsultation.id, actualMeetUrl);

      setSelectedConsultation((prev) => prev ? {
        ...prev,
        meetUrl: actualMeetUrl,
        meetingUrl: actualMeetUrl,
        meetingActive: true
      } : prev);
    }

    window.open(actualMeetUrl, '_blank');
  };

  const handleNotifyPatient = async () => {
    setNotifyErrorMsg(null);
    if (!selectedConsultation || !selectedConsultation.id) return;

    const patientUid = selectedConsultation.patientId;
    if (!patientUid) {
      setNotifyErrorMsg('Cannot notify patient: Patient Firebase Auth UID is missing for this consultation.');
      return;
    }

    const actualMeetUrl = selectedConsultation.meetUrl || selectedConsultation.meetingUrl;

    if (!actualMeetUrl || !selectedConsultation.meetingActive) {
      setNotifyErrorMsg(`⚠️ Please click "Launch Google Meet" first to start your video call before notifying ${selectedConsultation.patientName || 'the patient'}!`);
      return;
    }

    const doctorUid = auth.currentUser?.uid || 'dr_sarah_smith';

    await sendPatientMeetNotification({
      consultationId: selectedConsultation.id,
      patientUid: patientUid,
      doctorUid: doctorUid,
      doctorName: doctorName,
      patientName: selectedConsultation.patientName || 'Patient',
      meetUrl: actualMeetUrl
    });

    await sendConsultationMessage(selectedConsultation.id, {
      senderId: doctorUid,
      senderName: doctorName,
      senderRole: 'DOCTOR',
      type: 'TEXT',
      text: `🎥 Doctor launched Google Meet consultation link: ${actualMeetUrl}`,
      timestamp: new Date().toISOString()
    });

    setNotifiedPatientId(selectedConsultation.id);
  };

  const handleEndGoogleMeet = async () => {
    if (!selectedConsultation?.id) return;
    await endDoctorMeetCall(selectedConsultation.id);
    setSelectedConsultation((prev) => prev ? {
      ...prev,
      meetingActive: false
    } : prev);
    setNotifiedPatientId(null);
  };

  useEffect(() => {
    const unsub = subscribeToAppointments((apts) => setAppointments(apts));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToDoctorProfile('dr_sarah_smith', (prof) => {
      if (prof) setDoctorProfile(prof);
    });
    return () => unsub();
  }, []);

  // Auth Guard
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/');
      }
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    setDocImgError(false);
  }, [selectedConsultation?.id, selectedConsultation?.imageUrl]);

  // Subscribe to Patient Queue
  useEffect(() => {
    const unsub = subscribeToDoctorQueue((data: ConsultationRecord[]) => {
      setConsultations(data);
      if (data.length > 0) {
        setSelectedConsultation((prev) => {
          if (!prev) return data[0];
          const matched = data.find(c => c.id === prev.id);
          if (matched) {
            return {
              ...matched,
              imageUrl: matched.imageUrl || prev.imageUrl
            };
          }
          return data[0];
        });
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to Chat Messages when Selected Patient changes
  useEffect(() => {
    if (!selectedConsultation) return;
    const unsub = subscribeToConsultationMessages(selectedConsultation.id, (msgs: any[]) => {
      setChatMessages(msgs);
    });
    return () => unsub();
  }, [selectedConsultation?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultation || !inputText.trim()) return;

    const msgText = inputText;
    setInputText('');

    await sendConsultationMessage(selectedConsultation.id, {
      senderId: auth.currentUser?.uid || 'dr_sarah_smith',
      senderName: doctorName,
      senderRole: 'DOCTOR',
      type: 'TEXT',
      text: msgText,
      timestamp: new Date().toISOString()
    });
  };

  const handleSendVoiceNote = async (audioUrl: string) => {
    if (!selectedConsultation) return;
    await sendConsultationMessage(selectedConsultation.id, {
      senderId: auth.currentUser?.uid || 'dr_sarah_smith',
      senderName: doctorName,
      senderRole: 'DOCTOR',
      type: 'AUDIO',
      text: '🎙️ Voice Note from Doctor',
      audioUrl: audioUrl,
      timestamp: new Date().toISOString()
    });
  };

  const handleIssuePrescription = async (diagnosis: string, prescriptionText: string) => {
    if (!selectedConsultation) return;
    await issueDoctorPrescription(selectedConsultation.id, doctorName, diagnosis, prescriptionText);
    setIsPrescriptionModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('dermavision_doctor');
      sessionStorage.clear();
    } catch (err) {
      console.warn('Doctor Sign Out Notice:', err);
    }
    if (onLogout) {
      onLogout();
    } else {
      navigate('/', { replace: true });
    }
  };

  // Task Counts
  const pendingCount = consultations.filter(c => c.status !== 'COMPLETED').length;
  const completedCount = consultations.filter(c => c.status === 'COMPLETED').length;

  // Filtered consultations array
  const filteredConsultations = consultations.filter(item => {
    // 1. Separate Pending vs Completed vs All Tasks
    if (taskStatusFilter === 'PENDING' && item.status === 'COMPLETED') return false;
    if (taskStatusFilter === 'COMPLETED' && item.status !== 'COMPLETED') return false;

    // 2. Risk Level Filter
    if (filterRisk === 'HIGH') return item.riskLevel === 'High';
    if (filterRisk === 'MODERATE') return item.riskLevel === 'Moderate';
    if (filterRisk === 'LOW') return item.riskLevel === 'Low';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative" onClick={() => setOpenMenuId(null)}>
      <DoctorNavbar
        doctorName={doctorName}
        onLogout={handleLogout}
        activeCount={consultations.length}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
      />

      {/* Main Workspace Navigation Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800 py-2 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setViewMode('DASHBOARD')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === 'DASHBOARD'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Consultation Tasks Queue ({consultations.length})</span>
          </button>

          <button
            onClick={() => setViewMode('APPOINTMENTS')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === 'APPOINTMENTS'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Scheduled Appointments ({appointments.length})</span>
          </button>

          <button
            onClick={() => setViewMode('PROFILE')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === 'PROFILE'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor Profile</span>
          </button>
        </div>
      </div>

      {viewMode === 'PROFILE' ? (
        <DoctorProfile onBack={() => setViewMode('DASHBOARD')} />
      ) : viewMode === 'APPOINTMENTS' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <DoctorAppointments
            appointments={appointments}
            doctorMeetLink={doctorProfile?.googleMeetLink}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: SEPARATED PATIENT QUEUE (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 shadow-xl h-[calc(100vh-120px)] overflow-hidden">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <h2 className="font-bold text-base text-white">Patient Queue</h2>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {filteredConsultations.length} Listed
            </span>
          </div>

          {/* TASK STATUS FILTER TABS: PENDING vs COMPLETED vs ALL */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setTaskStatusFilter('PENDING')}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                taskStatusFilter === 'PENDING'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-slate-950" />
              <span>Pending ({pendingCount})</span>
            </button>

            <button
              onClick={() => setTaskStatusFilter('COMPLETED')}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                taskStatusFilter === 'COMPLETED'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
              <span>Completed ({completedCount})</span>
            </button>

            <button
              onClick={() => setTaskStatusFilter('ALL')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                taskStatusFilter === 'ALL'
                  ? 'bg-sky-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>All ({consultations.length})</span>
            </button>
          </div>

          {/* Risk Level Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold border-b border-slate-800/80 pt-1">
            <span className="text-[10px] text-slate-500 uppercase font-mono mr-1">Risk:</span>
            {['ALL', 'HIGH', 'MODERATE', 'LOW'].map((risk) => (
              <button
                key={risk}
                onClick={() => setFilterRisk(risk)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  filterRisk === risk
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>

          {/* Patient Cards List */}
          <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
            {filteredConsultations.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-10">
                No consultations found matching current filter.
              </div>
            ) : (
              filteredConsultations.map((item) => {
                const isSelected = selectedConsultation?.id === item.id;
                const isHighRisk = item.riskLevel === 'High';
                const isCompleted = item.status === 'COMPLETED';
                const isMenuOpen = openMenuId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedConsultation(item)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                      isSelected
                        ? 'bg-slate-800/90 border-sky-500/80 shadow-lg shadow-sky-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-white">{item.patientName}</h3>
                        <p className="text-xs text-sky-400 font-semibold">{item.displayTitle}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isHighRisk
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {item.riskLevel}
                        </span>

                        {/* THREE DOTS MENU BUTTON */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : item.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Case Options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* DROPDOWN MENU */}
                          {isMenuOpen && (
                            <div className="absolute right-0 top-7 z-30 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl py-1 w-44 text-xs">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmItem(item);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-500/10 font-bold flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                <span>Delete Case</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400">Conf: {(item.confidence * (item.confidence <= 1 ? 100 : 1)).toFixed(1)}%</span>
                      <span className={`px-2 py-0.5 rounded font-black uppercase ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {isCompleted ? '✓ Completed' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: STRUCTURED CLINICAL REPORT CARD CONTAINER (8 Cols) */}
        {selectedConsultation ? (
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-6 shadow-xl h-[calc(100vh-120px)] overflow-y-auto">
            
            {/* STRUCTURED REPORT CARD CONTAINER */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-sky-500/40 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl">
              
              {/* Report Banner Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black text-xl">
                    📋
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sky-400 font-black text-[11px] uppercase tracking-wider">
                      <FileText className="w-4 h-4 text-sky-400" />
                      <span>Official Clinical Screening Report</span>
                    </div>
                    <h2 className="text-xl font-black text-white">{selectedConsultation.patientName}</h2>
                    <p className="text-xs text-slate-400 font-mono">
                      Patient ID: <span className="text-sky-300">{selectedConsultation.patientId || selectedConsultation.id}</span>
                    </p>
                  </div>
                </div>

                {/* Status Badge, Risk Level & Delete Case Action */}
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 ${
                    selectedConsultation.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  }`}>
                    {selectedConsultation.status === 'COMPLETED' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Task Completed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Pending Review</span>
                      </>
                    )}
                  </span>

                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase border ${
                    selectedConsultation.riskLevel === 'High'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : selectedConsultation.riskLevel === 'Moderate'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {selectedConsultation.riskLevel} Risk
                  </span>

                  <button
                    onClick={() => setDeleteConfirmItem(selectedConsultation)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold cursor-pointer transition-all ml-1"
                    title="Delete Consultation Case"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                </div>
              </div>

              {/* Clinical Task Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">
                    Scheduled video consultations are managed under the <strong className="text-emerald-400 font-bold">Appointments</strong> tab.
                  </span>
                </div>

                {/* Status Toggle Button: Pending vs Completed */}
                <button
                  onClick={async () => {
                    const nextStatus = selectedConsultation.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
                    await updateConsultationStatus(selectedConsultation.id, nextStatus);
                    setSelectedConsultation(prev => prev ? { ...prev, status: nextStatus } : prev);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all ${
                    selectedConsultation.status === 'COMPLETED'
                      ? 'bg-slate-800 text-amber-300 border-amber-500/40 hover:bg-slate-700'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                  }`}
                >
                  {selectedConsultation.status === 'COMPLETED' ? (
                    <>
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Re-open Task as Pending</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Mark Task Completed</span>
                    </>
                  )}
                </button>
              </div>

              {/* WARNING BANNER */}
              {notifyErrorMsg && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{notifyErrorMsg}</span>
                  </div>
                  <button
                    onClick={() => setNotifyErrorMsg(null)}
                    className="p-1 text-amber-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Report Specimen & AI Diagnostics Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* Scanned Specimen Container (4 Cols) */}
                <div className="md:col-span-4 bg-slate-950 rounded-2xl border border-slate-800 p-3 flex flex-col items-center justify-center min-h-[220px] relative group shadow-inner">
                  {selectedConsultation.imageUrl && !docImgError ? (
                    <>
                      <img
                        src={selectedConsultation.imageUrl}
                        alt="Scanned Lesion"
                        onError={() => setDocImgError(true)}
                        className="w-full h-48 object-cover rounded-xl border border-slate-700"
                      />
                      <div className="w-full mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
                        <span>Scan Specimen</span>
                        <button
                          onClick={() => window.open(selectedConsultation.imageUrl, '_blank')}
                          className="text-sky-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" /> Full View
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center gap-2">
                      <FileText className="w-10 h-10 text-slate-600" />
                      <span className="text-xs font-bold text-slate-400">Scan Specimen Unavailable</span>
                      <span className="text-[10px] text-slate-500 font-mono">Patient telemetry loaded</span>
                    </div>
                  )}
                </div>

                {/* AI Telemetry Breakdown (8 Cols) */}
                <div className="md:col-span-8 bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                      <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">AI Diagnostic Analysis</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        Confidence: {(selectedConsultation.confidence * (selectedConsultation.confidence <= 1 ? 100 : 1)).toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-slate-400 font-medium">Top Prediction:</span>
                      <span className="text-lg font-black text-white bg-gradient-to-r from-sky-400 to-teal-300 bg-clip-text text-transparent">
                        {selectedConsultation.displayTitle}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 mb-3">
                      <span className="text-slate-400 font-bold text-[11px] block mb-1">Patient Reported Symptoms:</span>
                      <p className="text-slate-300 leading-relaxed">
                        {selectedConsultation.symptomsNote || 'Patient requested dermatological evaluation via DermaVision AI.'}
                      </p>
                    </div>
                  </div>

                  {/* Doctor Prescription Section */}
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-amber-400" /> Official Clinical Prescription & Notes
                      </span>
                      <button
                        onClick={() => setIsPrescriptionModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        {selectedConsultation.prescriptionNote ? 'Edit Prescription' : '+ Issue Prescription'}
                      </button>
                    </div>

                    {selectedConsultation.prescriptionNote ? (
                      <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/30 text-emerald-300 font-mono text-xs whitespace-pre-line leading-relaxed">
                        <strong>Diagnosis:</strong> {selectedConsultation.doctorDiagnosis || selectedConsultation.displayTitle}
                        {"\n"}
                        <strong>Rx Instructions:</strong> {selectedConsultation.prescriptionNote}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-[11px] italic">
                        No official prescription issued yet. Click "+ Issue Prescription" above to write diagnosis and Rx notes.
                      </p>
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* Real-time Patient-Doctor Live Chat & Voice Messages */}
            <div className="flex flex-col gap-3 bg-slate-950 p-5 rounded-3xl border border-slate-800 flex-1 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-bold text-slate-300">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" /> Live Consultation Chat & Voice Stream
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Real-time Stream</span>
              </div>

              <div className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-1">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-6">
                    No communication history yet. Type a message or record a voice note.
                  </div>
                ) : (
                  chatMessages.map((m, idx) => {
                    const isDoctor = m.senderRole === 'DOCTOR';
                    return (
                      <div key={idx} className={`flex flex-col max-w-[85%] ${isDoctor ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div className={`p-3 rounded-2xl text-xs ${isDoctor ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-100 border border-slate-700'}`}>
                          <span className="text-[10px] font-bold block mb-0.5 opacity-80">{m.senderName}</span>
                          {m.type === 'AUDIO' && m.audioUrl ? (
                            <div className="flex items-center gap-2">
                              <Volume2 className="w-4 h-4 text-emerald-400" />
                              <audio src={m.audioUrl} controls className="h-7 max-w-[200px]" />
                            </div>
                          ) : (
                            <ChatMessageLinkBox text={m.text || ''} />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input & Voice Recorder Bar */}
              <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-800/80 items-center">
                <VoiceRecorder onSendVoiceNote={handleSendVoiceNote} />

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Send direct message to ${selectedConsultation.patientName}...`}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500 font-medium"
                />

                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>

            {/* Prescription Modal Component */}
            {isPrescriptionModalOpen && (
              <PrescriptionModal
                isOpen={isPrescriptionModalOpen}
                patientName={selectedConsultation.patientName}
                defaultDiagnosis={selectedConsultation.doctorDiagnosis || selectedConsultation.displayTitle}
                onSubmitPrescription={handleIssuePrescription}
                onClose={() => setIsPrescriptionModalOpen(false)}
              />
            )}

          </div>
        ) : (
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-3 text-slate-500">
            <Users className="w-12 h-12 stroke-[1.5]" />
            <h3 className="text-base font-bold text-slate-300">No Patient Selected</h3>
            <p className="text-xs text-slate-500">Select a patient consultation from the left queue to view their clinical report and launch tele-health tools.</p>
          </div>
        )}

      </main>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Consultation Case?</h3>
                <p className="text-xs text-slate-400">Patient: <strong className="text-slate-200">{deleteConfirmItem.patientName}</strong></p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-2xl border border-slate-800 font-mono">
              Are you sure you want to delete this consultation report for <strong className="text-sky-300">{deleteConfirmItem.displayTitle}</strong>? This will remove the case record permanently.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleDeleteCase(deleteConfirmItem)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/20 transition-all"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Case'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
