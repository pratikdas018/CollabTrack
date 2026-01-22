import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/my-tasks');
    }
  }, [user, navigate]);

  const handleLogin = () => {
    // Redirects to the backend route that triggers passport-github2
    window.location.href = 'http://localhost:5000/api/auth/github';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
          Group Project <span className="text-blue-500">Tracker</span>
        </h1>
        <p className="text-xl text-slate-300">
          The ultimate tool for CSE students to track contributions, sync GitHub commits, and avoid last-minute panic.
        </p>
        
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <p className="text-lg mb-4 font-medium">Get started by connecting your GitHub</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-[#24292F] hover:bg-[#24292F]/90 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105"
          >
            <svg height="32" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="32" data-view-component="true" className="fill-white">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0 4.42 3.58 8 8 8Z"></path>
            </svg>
            <span className="text-xl">Login with GitHub</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-400 mt-12">
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <span className="block text-2xl mb-2">🔍</span>
            Verified Commits
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <span className="block text-2xl mb-2">📊</span>
            Contribution Stats
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <span className="block text-2xl mb-2">🚨</span>
            Deadline Alerts
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;