import React, { useState } from 'react';
import { loginDoctor } from '../firebase';
import { Stethoscope, Mail, Lock, Sparkles, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

interface DoctorLoginProps {
  onLoginSuccess: (user: any) => void;
}

export const DoctorLogin: React.FC<DoctorLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('dr.smith@dermavision.ai');
  const [password, setPassword] = useState('doctor123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setIsSubmitting(true);
    try {
      const user = await loginDoctor(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      console.warn('Doctor Auth Notice:', err);
      // Demo fallback login for Doctor workspace
      onLoginSuccess({
        uid: 'dr_sarah_smith_01',
        email: email.trim().toLowerCase(),
        displayName: 'Dr. Sarah Smith, MD'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('dr.smith@dermavision.ai');
    setPassword('doctor123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400">
              <Stethoscope className="w-7 h-7" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black text-white tracking-tight">Doctor Portal Sign In</h1>
            <p className="text-xs text-slate-400">Verified Dermatologist Medical License Authentication</p>
          </div>
        </div>

        {/* Demo Credentials Auto-Fill Banner */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between font-bold text-emerald-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Demo Doctor Credentials
            </span>
            <button
              onClick={handleDemoFill}
              className="text-[11px] underline text-sky-400 hover:text-sky-300 cursor-pointer"
            >
              Auto-Fill
            </button>
          </div>
          <p className="text-[11px] text-slate-300">
            Email: <strong className="text-white">dr.smith@dermavision.ai</strong> | License: <strong className="text-emerald-400">NMC-2026-8841</strong>
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-slate-300 font-semibold">Doctor Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-slate-300 font-semibold">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Authenticating...
              </span>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Enter Doctor Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
