import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveDoctorProfile, subscribeToDoctorProfile, DoctorProfileData } from '../firebase';
import { Stethoscope, User, Camera, Building, Award, DollarSign, Phone, Mail, Save, CheckCircle2, ArrowLeft, Video } from 'lucide-react';

interface DoctorProfileProps {
  onBack?: () => void;
}

async function compressDoctorAvatar(dataUrl: string, maxDim = 400, quality = 0.75): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const DoctorProfile: React.FC<DoctorProfileProps> = ({ onBack }) => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<DoctorProfileData>({
    id: 'dr_sarah_smith',
    name: 'Dr. Sarah Smith, MD',
    title: 'Senior Dermatologist & Clinical Specialist',
    specialty: 'Clinical & Aesthetic Dermatology',
    experienceYears: 14,
    hospital: 'DermaVision Tele-Dermatology Center, Suite 402',
    bio: 'Board-certified dermatologist specializing in early melanoma detection, inflammatory skin dermatoses, and AI-assisted tele-dermatology triage.',
    phone: '+1 (555) 382-9102',
    email: 'dr.sarah.smith@dermavision.ai',
    consultationFee: '$25 / ₹500',
    imageUrl: ''
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeToDoctorProfile('dr_sarah_smith', (data) => {
      if (data) setProfile(data);
    });
    return () => unsub();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      const compressed = await compressDoctorAvatar(rawBase64);
      setProfile((prev) => ({ ...prev, imageUrl: compressed }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const compressedImg = await compressDoctorAvatar(profile.imageUrl || '');
      const updatedProfile = { ...profile, imageUrl: compressedImg };
      await saveDoctorProfile(updatedProfile);
      setProfile(updatedProfile);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Save doctor profile error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onBack ? onBack() : navigate('/dashboard')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Back to Doctor Dashboard</span>
        </button>

        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-emerald-400" />
          <span>Edit Doctor Profile</span>
        </h1>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>Doctor Profile updated successfully! Live sync enabled for Patient Website.</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl">
        
        {/* Avatar Upload Header */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-800">
          <div className="relative group shrink-0">
            {profile.imageUrl ? (
              <img src={profile.imageUrl} alt={profile.name} className="w-28 h-28 rounded-3xl object-cover border-2 border-emerald-500/40 shadow-xl" />
            ) : (
              <div className="w-28 h-28 rounded-3xl bg-slate-950 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-1">
                <User className="w-10 h-10 text-emerald-400" />
                <span className="text-[10px]">Upload Photo</span>
              </div>
            )}

            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-3xl flex flex-col items-center justify-center text-white text-xs font-bold cursor-pointer transition-opacity">
              <Camera className="w-6 h-6 text-emerald-400 mb-1" />
              <span>Change</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          <div className="flex flex-col text-center sm:text-left gap-1">
            <h2 className="text-xl font-bold text-white">{profile.name}</h2>
            <p className="text-xs text-emerald-400 font-semibold">{profile.title}</p>
            <p className="text-[11px] text-slate-400 font-mono mt-1">{profile.hospital}</p>
          </div>
        </div>

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-bold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" /> Full Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-bold flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-400" /> Medical Title & Designation
            </label>
            <input
              type="text"
              value={profile.title}
              onChange={(e) => setProfile({ ...profile, title: e.target.value })}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" /> Specialty Area
            </label>
            <input
              type="text"
              value={profile.specialty}
              onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-bold flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-purple-400" /> Hospital / Clinic Center
            </label>
            <input
              type="text"
              value={profile.hospital}
              onChange={(e) => setProfile({ ...profile, hospital: e.target.value })}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-bold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-sky-400" /> Contact Phone Number
            </label>
            <input
              type="text"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-bold flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Consultation Fee
            </label>
            <input
              type="text"
              value={profile.consultationFee}
              onChange={(e) => setProfile({ ...profile, consultationFee: e.target.value })}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Video className="w-4 h-4 text-emerald-400" /> Official Google Meet Video Consultation Link
            </label>
            <input
              type="text"
              value={profile.googleMeetLink || 'https://meet.google.com/new'}
              onChange={(e) => setProfile({ ...profile, googleMeetLink: e.target.value })}
              placeholder="e.g. https://meet.google.com/abc-defg-hij"
              className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-300 font-mono text-xs focus:border-emerald-400 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500">Patients on the patient portal will click this link to join your live Google Meet video consultation.</span>
          </div>

        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5 text-xs">
          <label className="text-slate-400 font-bold">Clinical Biography & Experience Overview</label>
          <textarea
            rows={4}
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:border-emerald-500 focus:outline-none leading-relaxed"
          ></textarea>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving Changes...' : 'Save & Publish Doctor Profile'}</span>
        </button>

      </form>

    </div>
  );
};
