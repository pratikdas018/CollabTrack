import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useDarkMode } from '../components/useDarkMode';

const CreateProject = () => {
  const [formData, setFormData] = useState({
    name: '',
    repoUrl: '',
    githubRepoId: '',
    deadline: ''
  });
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useDarkMode();

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
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 p-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded shadow-md w-full max-w-md border dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold dark:text-white">Start New Project</h2>
          <button type="button" onClick={() => setDarkMode(!darkMode)} className="text-xl" title="Toggle Dark Mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
        <input 
          className="w-full border p-2 mb-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
          placeholder="Project Name" 
          onChange={e => setFormData({...formData, name: e.target.value})} 
        />
        <input 
          className="w-full border p-2 mb-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
          placeholder="GitHub Repo URL" 
          onChange={e => setFormData({...formData, repoUrl: e.target.value})} 
        />
        <input 
          className="w-full border p-2 mb-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
          placeholder="GitHub Repo ID (Required for Webhook)" 
          onChange={e => setFormData({...formData, githubRepoId: e.target.value})} 
        />
        <input 
          type="date"
          className="w-full border p-2 mb-4 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
          onChange={e => setFormData({...formData, deadline: e.target.value})} 
        />
        <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Create Project
        </button>
      </form>
    </div>
  );
};

export default CreateProject;
