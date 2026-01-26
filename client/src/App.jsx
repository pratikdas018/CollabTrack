import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CreateProject from './pages/CreateProject';
import Dashboard from './pages/Dashboard';
import { ToastContainer } from 'react-toastify';
import LandingPage from './pages/LandingPage';
import MyTasks from './pages/MyTasks';
import { useTheme } from './components/useTheme.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [darkMode] = useTheme();

  return (
    <div className="font-sans min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 transition-colors duration-300">
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/projects" element={<MyTasks />} />
          <Route path="/my-tasks" element={<Navigate to="/projects" replace />} />
          <Route path="/create" element={<CreateProject />} />
          <Route path="/project/:id" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
      <ToastContainer 
        theme={darkMode ? 'dark' : 'light'} 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />
    </div>
  );
}

export default App;