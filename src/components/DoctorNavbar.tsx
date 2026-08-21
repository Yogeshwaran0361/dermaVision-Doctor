import React from 'react';
import { Stethoscope, LogOut, ShieldCheck, Activity, Calendar, Users } from 'lucide-react';

interface DoctorNavbarProps {
  doctorName: string;
  onLogout: () => void;
  activeCount: number;
  viewMode: 'DASHBOARD' | 'PROFILE' | 'APPOINTMENTS';
  onSetViewMode: (mode: 'DASHBOARD' | 'PROFILE' | 'APPOINTMENTS') => void;
}

export const DoctorNavbar: React.FC<DoctorNavbarProps> = ({
  doctorName,
  onLogout,
  activeCount,
  viewMode,
  onSetViewMode
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand & Mode Switcher */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400">
                <Stethoscope className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 font-black text-xl tracking-tight text-white">
                DermaVision <span className="text-emerald-400">Doctor Portal</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-400 tracking-wide uppercase">Clinical Tele-Dermatology Workspace</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => onSetViewMode('DASHBOARD')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'DASHBOARD'
                  ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Patient Queue ({activeCount})</span>
            </button>

            <button
              onClick={() => onSetViewMode('APPOINTMENTS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'APPOINTMENTS'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Appointments</span>
            </button>

            <button
              onClick={() => onSetViewMode('PROFILE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'PROFILE'
                  ? 'bg-purple-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>
          </nav>
        </div>

        {/* Right Doctor Actions */}
        <div className="flex items-center gap-4">
          
          {/* Active Queue Counter */}
          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>{activeCount} Active Cases</span>
          </div>

          {/* Doctor Profile Badge */}
          <button
            onClick={() => onSetViewMode('PROFILE')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs transition-colors cursor-pointer text-left"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-white max-w-[120px] truncate">{doctorName}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Settings ⚙️</span>
            </div>
          </button>

          {/* Sign Out */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

        </div>

      </div>
    </header>
  );
};
