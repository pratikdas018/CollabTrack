import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../components/useTheme.jsx';
import Footer from '../components/Footer';

const MyTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMyActivity, setShowMyActivity] = useState(false);
  const [darkMode, setDarkMode] = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          api.get('/projects/tasks/me'),
          api.get('/projects')
        ]);
        setTasks(tasksRes.data);
        setProjects(projectsRes.data);

        // Fetch recent activity (commits) from all projects
        if (projectsRes.data.length > 0) {
          const commitsPromises = projectsRes.data.map(p => 
            api.get(`/projects/${p._id}`)
              .then(res => ({
                projectName: res.data.project.name,
                projectId: res.data.project._id,
                commits: res.data.commits || []
              }))
              .catch(() => null)
          );
          
          const projectsDetails = await Promise.all(commitsPromises);
          
          const allCommits = projectsDetails
            .filter(p => p !== null)
            .flatMap(p => p.commits.map(c => ({
              ...c,
              projectName: p.projectName,
              projectId: p.projectId
            })))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50);
            
          setActivities(allCommits);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'todo': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
      case 'doing': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'done': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      default: return 'bg-slate-100 dark:bg-slate-800';
    }
  };

  const filteredActivities = activities
    .filter(activity => !showMyActivity || (user && (activity.committerName === user.username || activity.committerName === user.name)))
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-200">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Tasks</h1>
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
        <div className="space-y-12 animate-pulse">
          {/* Projects Skeleton */}
          <div>
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-200 dark:bg-slate-800 h-40 rounded-2xl"></div>
              ))}
            </div>
          </div>
          {/* Tasks Skeleton */}
          <div>
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-200 dark:bg-slate-800 h-48 rounded-2xl"></div>
              ))}
            </div>
          </div>
          {/* Activity Skeleton */}
          <div>
            <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-6"></div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl h-64 border border-slate-200 dark:border-slate-700"></div>
          </div>
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

      {!loading && activities.length > 0 && (
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Recent Activity</h2>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={showMyActivity} 
                onChange={(e) => setShowMyActivity(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700"
              />
              Show only my activity
            </label>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((activity, i) => (
                <div key={i} className="p-4 border-b border-slate-100 dark:border-slate-800 last:border-0 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200 truncate">
                      <span className="font-bold">{activity.committerName}</span> pushed to <Link to={`/project/${activity.projectId}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{activity.projectName}</Link>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 italic truncate">"{activity.message}"</p>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-600 whitespace-nowrap ml-4">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-slate-500 dark:text-slate-400">
                No recent activity matches your filter.
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default MyTasks;
