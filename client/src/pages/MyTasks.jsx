import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useDarkMode } from '../components/useDarkMode';

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useDarkMode();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api.get('/projects/tasks/me');
        setTasks(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'todo': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
      case 'doing': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'done': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      default: return 'bg-slate-100 dark:bg-slate-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 transition-colors duration-200">
      <div className="flex justify-between items-center mb-8 relative">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">My Tasks</h1>
        
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Toggle Dark Mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <Link to="/create" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            + New Project
          </Link>
          <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/logout`} className="text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 font-medium">
            Logout
          </a>
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => { setDarkMode(!darkMode); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-100 dark:border-slate-800">
              <span className="text-xl">{darkMode ? '☀️' : '🌙'}</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <Link to="/create" className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-100 dark:border-slate-800">
              <span className="text-xl">➕</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">New Project</span>
            </Link>
            <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/logout`} className="flex items-center gap-3 p-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left text-red-600 dark:text-red-400">
              <span className="text-xl">🚪</span>
              <span className="font-medium">Logout</span>
            </a>
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-48">
              <div className="flex justify-between mb-4">
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-8"></div>
              <div className="border-t dark:border-slate-700 pt-4">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
          <p className="text-xl">No tasks assigned to you yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map(task => (
            <div key={task._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow border dark:border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
                {task.deadline && (
                  <span className="text-xs text-red-500 font-medium">
                    Due: {new Date(task.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold mb-2 dark:text-white">{task.title}</h3>
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <Link to={`/project/${task.project._id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  {task.project.name}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTasks;
