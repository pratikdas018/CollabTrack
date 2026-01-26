import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useDarkMode } from '../components/useDarkMode';

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useDarkMode();

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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">My Tasks</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Toggle Dark Mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <Link to="/create" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            + New Project
          </Link>
        </div>
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
