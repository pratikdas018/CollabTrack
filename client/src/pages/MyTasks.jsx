import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useDarkMode } from '../components/useDarkMode';
import { useAuth } from '../context/AuthContext';

const MyTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useDarkMode();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMyActivity, setShowMyActivity] = useState(false);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 transition-colors duration-200">
      <div className="flex justify-between items-center mb-8 relative">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">My Tasks</h1>
        
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3 mr-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <img 
                src={user.avatarUrl || `https://github.com/${user.username}.png`} 
                alt={user.username} 
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.name || user.username}</span>
            </div>
          )}
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
            {user && (
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <img 
                    src={user.avatarUrl || `https://github.com/${user.username}.png`} 
                    alt={user.username} 
                    className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700"
                  />
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{user.name || user.username}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{user.username}</p>
                  </div>
                </div>
              </div>
            )}
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
      ) : (
        <div className="space-y-12">
          {/* Projects Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">My Projects</h2>
            
            {projects.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                <p className="text-slate-500 dark:text-slate-400 mb-4">You haven't created any projects yet.</p>
                <Link to="/create" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Create Your First Project
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                  <Link 
                    key={project._id} 
                    to={`/project/${project._id}`}
                    className="group bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words pr-2">
                        {project.name}
                      </h3>
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded whitespace-nowrap shrink-0">
                        {project.members?.length || 1} Members
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">
                      {project.description || 'No description provided.'}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        Created {new Date(project.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                        View Dashboard &rarr;
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Tasks Section */}
          <section>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">My Tasks</h2>
            {tasks.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-xl">No tasks assigned to you yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map(task => (
                  <div key={task._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow border dark:border-gray-700">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${getStatusColor(task.status)} shrink-0`}>
                        {task.status}
                      </span>
                      {task.deadline && (
                        <span className="text-xs text-red-500 font-medium whitespace-nowrap">
                          Due: {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold mb-2 dark:text-white break-words">{task.title}</h3>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t dark:border-gray-700">
                      <Link to={`/project/${task.project._id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        {task.project.name}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Activity Section */}
          <section>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Recent Activity</h2>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showMyActivity} 
                  onChange={(e) => setShowMyActivity(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700"
                />
                Show only my commits
              </label>
            </div>
            {filteredActivities.length === 0 ? (
               <p className="text-slate-500 dark:text-slate-400">No recent activity found.</p>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredActivities.map((activity, idx) => (
                    <li key={idx} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1 gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{activity.committerName}</span>
                          <span className="text-slate-400 dark:text-slate-500 text-sm">pushed to</span>
                          <Link to={`/project/${activity.projectId}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            {activity.projectName}
                          </Link>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 font-mono bg-slate-50 dark:bg-slate-900/50 p-2 rounded mt-2 break-words">{activity.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default MyTasks;
