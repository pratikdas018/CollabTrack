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
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    window.location.href = `${apiUrl}/api/auth/github`;
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-900 text-white">
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Group Project <span className="text-blue-500">Tracker</span>
        </h1>
        <p className="text-xl text-slate-300">
          The ultimate tool for CSE students to track contributions, sync GitHub commits, and avoid last-minute panic.
        </p>
        
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <p className="text-lg mb-4 font-medium">Get started by connecting your GitHub</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-[#24292F] hover:bg-[#24292F]/90 text-white font-bold py-3 px-5 md:py-4 md:px-6 rounded-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105"
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
      <footer className="py-6 text-center text-slate-500 text-sm border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex justify-center gap-6 mb-4">
          <a href="https://github.com/pratikdas018" className="hover:text-blue-400 transition-colors">
            <span className="sr-only">GitHub</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>
          <a href="https://x.com/PratikChan29907" className="hover:text-blue-400 transition-colors">
            <span className="sr-only">Twitter</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
            </svg>
          </a>
          <a href="https://www.linkedin.com/in/pratik018/" className="hover:text-blue-400 transition-colors">
            <span className="sr-only">LinkedIn</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
        <p>
          &copy; 2026 All rights reserved by <span className="text-blue-400 font-semibold">Pratik</span> and <span className="text-blue-400 font-semibold">Sonali</span>.
        </p>
        <p className="mt-2">
          <a href="mailto:support@collabtrack.com" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors inline-block">Contact Us</a>
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
