import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useTheme } from '../components/useTheme.jsx';
import Footer from '../components/Footer';

const CreateProject = () => {
  const [formData, setFormData] = useState({
    name: '',
    repoUrl: '',
    githubRepoId: '',
    deadline: ''
  });
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/projects', formData);
      navigate(`/project/${res.data._id}`);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        alert('Your session has expired. Please log in again.');
        window.location.href = '/'; // Redirect to login
      } else {
        alert('Error creating project');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="flex-grow flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl w-full max-w-[400px] border border-slate-200 dark:border-slate-800 transition-all animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Start New Project</h2>
            <button type="button" onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xl" title="Toggle Dark Mode">
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
          <div className="space-y-4">
            <input 
              className="w-full border border-slate-200 dark:border-slate-700 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              placeholder="Project Name" 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
            <input 
              className="w-full border border-slate-200 dark:border-slate-700 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              placeholder="GitHub Repo URL" 
              onChange={e => setFormData({...formData, repoUrl: e.target.value})} 
            />
            <input 
              className="w-full border border-slate-200 dark:border-slate-700 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              placeholder="GitHub Repo ID (Required for Webhook)" 
              onChange={e => setFormData({...formData, githubRepoId: e.target.value})} 
            />
            <input 
              type="date"
              className="w-full border border-slate-200 dark:border-slate-700 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              onChange={e => setFormData({...formData, deadline: e.target.value})} 
            />
            <button className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-95 mt-2">
              Create Project
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default CreateProject;
