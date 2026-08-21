import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './firebase';
import { DoctorLogin } from './pages/DoctorLogin';
import { DoctorDashboard } from './pages/DoctorDashboard';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [localDoctor, setLocalDoctor] = useState<any>(() => {
    const saved = localStorage.getItem('dermavision_doctor');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety fallback timer so loading state NEVER hangs indefinitely
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    const unsub = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer);
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  const handleLoginSuccess = (user: any) => {
    setLocalDoctor(user);
    localStorage.setItem('dermavision_doctor', JSON.stringify(user));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Doctor Sign Out Notice:', err);
    }
    localStorage.removeItem('dermavision_doctor');
    sessionStorage.clear();
    setCurrentUser(null);
    setLocalDoctor(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400 font-sans">
        <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold">Authenticating Doctor Workspace...</span>
      </div>
    );
  }

  const isAuthenticated = !!(currentUser || localDoctor);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <DoctorDashboard onLogout={handleLogout} />
            ) : (
              <DoctorLogin onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <DoctorDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};
