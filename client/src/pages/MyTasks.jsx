import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../components/useTheme.jsx';
import Footer from '../components/Footer';

const MyTasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useTheme();

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, invitationsRes] = await Promise.all([
        api.get('/projects'),
        api.get('/projects/invitations/me')
      ]);
      setProjects(projectsRes.data);
      setInvitations(invitationsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(API_URL, { withCredentials: true });

    if (user?._id) {
      socket.emit('join-user', user._id);
      socket.on('notification', (notif) => {
        if (notif.type === 'project_invitation') {
          fetchData(); // Refresh list when a new invitation arrives
        }
      });
    }

    return () => socket.disconnect();
  }, [user, fetchData]);

  const handleAcceptInvitation = async (projectId) => {
    setProcessingId(projectId);
    try {
      await api.put(`/projects/${projectId}/accept`);
      toast.success('Invitation accepted successfully!', { position: toast.POSITION.TOP_RIGHT });
      setSelectedInvitation(null);
      navigate(`/project/${projectId}`);
    } catch (err) {
      toast.error('Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectInvitation = async (projectId) => {
    if (window.confirm('Are you sure you want to reject this invitation?')) {
      try {
        await api.put(`/projects/${projectId}/reject`);
        setSelectedInvitation(null);
        setInvitations(prev => prev.filter(inv => inv._id !== projectId));
      } catch (err) {
        toast.error('Failed to reject invitation');
      }
    }
  };

  const filteredProjects = useMemo(() => projects.filter(project =>
    project.name.toLowerCase().includes(projectSearchQuery.toLowerCase())
  ), [projects, projectSearchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 transition-colors duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Projects</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Toggle Dark Mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <Link to="/create" className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex-1 sm:flex-none text-center font-bold">
            + New Project
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-12 animate-pulse">
          {/* Invitations Skeleton */}
          <div>
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1].map(i => (
                <div key={i} className="bg-slate-200 dark:bg-slate-800 h-40 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      ) : (projects.length === 0 && invitations.length === 0) ? (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-20 bg-white dark:bg-slate-900/50 p-10 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
          <div className="text-5xl mb-4">📁</div>
          <p className="text-xl font-medium mb-6">No projects found.</p>
          <Link to="/create" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
            Create your first project →
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Invitations Section */}
          {invitations.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                Pending Invitations <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full">{invitations.length}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {invitations.map(invitation => (
                  <div key={invitation._id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-900/30 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1 truncate">{invitation.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1">
                      <span className="opacity-70">Invited by</span> 
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">Owner</span>
                    </p>
                    <button 
                      onClick={() => setSelectedInvitation(invitation)}
                      className="w-full mb-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-700"
                    >
                      View Project Details
                    </button>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleAcceptInvitation(invitation._id)}
                        disabled={processingId === invitation._id}
                        className="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                      >
                        {processingId === invitation._id ? '...' : 'Accept'}
                      </button>
                      <button 
                        onClick={() => handleRejectInvitation(invitation._id)}
                        disabled={processingId === invitation._id}
                        className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects Section */}
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">My Projects</h2>
              <div className="relative w-full md:w-64">
                <input 
                  type="text" 
                  placeholder="Search projects..." 
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                />
                <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.length > 0 ? (
                filteredProjects.map(project => (
                <Link 
                  key={project._id} 
                  to={`/project/${project._id}`}
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-xl text-2xl group-hover:scale-110 transition-transform">
                      📁
                    </div>
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {project.members?.length || 0} Members
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-4">
                    {project.repoUrl}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-400">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 text-sm font-bold">View Dashboard →</span>
                  </div>
                </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-10 text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                  {projects.length === 0 ? "No projects created yet." : `No projects found matching "${projectSearchQuery}"`}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Project Overview Modal */}
      {selectedInvitation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedInvitation(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="p-8">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-3xl mb-6">
                📁
              </div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Project Overview</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Review the project details before joining the team.</p>

              <div className="space-y-6 mb-10">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Project Name</label>
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{selectedInvitation.name}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">GitHub Repository</label>
                  <a 
                    href={selectedInvitation.repoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline break-all flex items-center gap-2"
                  >
                    {selectedInvitation.repoUrl}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Team Members</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedInvitation.members?.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">
                        <img 
                          src={m.user?.avatarUrl || `https://github.com/${m.user?.username}.png`} 
                          alt={m.user?.username} 
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{m.user?.username}</span>
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">{m.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => handleAcceptInvitation(selectedInvitation._id)}
                  disabled={processingId === selectedInvitation._id}
                  className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 active:scale-95"
                >
                  {processingId === selectedInvitation._id ? 'Joining...' : 'Accept Invitation'}
                </button>
                <button 
                  onClick={() => handleRejectInvitation(selectedInvitation._id)}
                  disabled={processingId === selectedInvitation._id}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-4 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default MyTasks;
