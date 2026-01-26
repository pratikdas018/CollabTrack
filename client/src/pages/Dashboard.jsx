import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import Confetti from 'react-confetti';
import api from '../api';
import TaskBoard from '../components/TaskBoard';
import MembersTab from '../components/MembersTab';
import NotificationDropdown from '../components/NotificationDropdown';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAuth } from '../context/AuthContext';
import { playNotificationSound } from '../components/soundUtils';
import { useDarkMode } from '../components/useDarkMode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(API_URL, {
  withCredentials: true,
});
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [commits, setCommits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [nudgeCooldowns, setNudgeCooldowns] = useState({});
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('notification_muted') === 'true');
  const [darkMode, setDarkMode] = useDarkMode();
  const isMutedRef = useRef(isMuted);
  const activityLogRef = useRef(null);
  const [activityDateFilter, setActivityDateFilter] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data.project);
      setTasks(res.data.project.tasks || []);
      setCommits(res.data.commits);
    } catch (err) {
      console.error(err);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    isMutedRef.current = isMuted;
    localStorage.setItem('notification_muted', isMuted);
  }, [isMuted]);

  useEffect(() => {
    fetchData();

    if (!socket.connected) socket.connect();
    socket.emit('join-project', id);
    
    socket.on('new-commit', (newCommits) => {
      setCommits(prev => [...newCommits, ...prev]);
      if (!isMutedRef.current && document.hidden) playNotificationSound('success');
      alert('🔥 New Code Pushed!');
    });

    socket.on('task-updated', (updatedTask) => {
      setTasks(prev => {
        const exists = prev.find(t => t._id === updatedTask._id);
        if (exists) {
          return prev.map(t => t._id === updatedTask._id ? updatedTask : t);
        }
        return [...prev, updatedTask];
      });
    });

    socket.on('task-created', (newTask) => {
      setTasks(prev => [...prev, newTask]);
      if (!isMutedRef.current && document.hidden) playNotificationSound('info');
    });

    socket.on('member-added', (newMember) => {
      setProject(prev => (prev ? { ...prev, members: [...prev.members, newMember] } : prev));
      if (!isMutedRef.current && document.hidden) playNotificationSound('success');
      alert(`👋 New member joined: ${newMember.user.name}`);
    });

    // Load nudge cooldowns from local storage
    const storedCooldowns = localStorage.getItem(`nudgeCooldowns_${id}`);
    if (storedCooldowns) {
      setNudgeCooldowns(JSON.parse(storedCooldowns));
    }

    return () => {
      socket.off('new-commit');
      socket.off('task-updated');
      socket.off('task-created');
      socket.off('member-added');
      socket.disconnect();
    };
  }, [id, fetchData]);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.post(`/projects/${id}/sync`);
      setCommits(res.data);
    } catch (err) {
      alert('Failed to sync commits');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNudge = async (userId) => {
    const now = Date.now();
    try {
      await api.post(`/projects/${id}/nudge`, { memberId: userId });
      alert('Nudge sent! 👋');
      const newCooldowns = { ...nudgeCooldowns, [userId]: now };
      setNudgeCooldowns(newCooldowns);
      localStorage.setItem(`nudgeCooldowns_${id}`, JSON.stringify(newCooldowns));
    } catch (err) {
      alert('Failed to send nudge');
    }
  };

  const handleUpdateProject = async () => {
    try {
      await api.put(`/projects/${id}`, { name: project.name });
      alert('Project updated successfully!');
    } catch (err) {
      alert('Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    if (window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      try {
        await api.delete(`/projects/${id}`);
        navigate('/create');
      } catch (err) {
        alert('Failed to delete project');
      }
    }
  };

  const handleLeaveProject = async () => {
    if (window.confirm('Are you sure you want to leave this project? You will be removed from the member list.')) {
      try {
        await api.post(`/projects/${id}/leave`);
        navigate('/my-tasks');
      } catch (err) {
        alert(err.response?.data?.msg || 'Failed to leave project');
      }
    }
  };

  const handleExportCSV = () => {
    if (!activityLog.length) return alert("No activity to export");

    const headers = ["Date", "User", "Type", "Action"];
    const rows = activityLog.map(log => [
      log.time.toLocaleString(),
      log.user,
      log.type,
      `"${log.action.replace(/"/g, '""')}"` // Escape quotes for CSV
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${project.name.replace(/\s+/g, '-').toLowerCase()}-activity.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 6️⃣ Activity Log (Aggregated Timeline)
  const activityLog = useMemo(() => {
    const logs = [];
    
    // 1. Commits
    commits.forEach(c => {
      logs.push({
        id: c.url || Math.random(),
        type: 'commit',
        user: c.committerName,
        action: `pushed code: "${c.message}"`,
        time: new Date(c.timestamp),
        icon: '🔥'
      });
    });

    // 2. Task History & Comments
    tasks.forEach(t => {
      t.history?.forEach(h => {
        logs.push({
          id: h._id || Math.random(),
          type: 'history',
          user: h.user?.username || 'System',
          action: `${h.action} in "${t.title}"`,
          time: new Date(h.timestamp),
          icon: '📋'
        });
      });
      
      t.comments?.forEach(c => {
        logs.push({
          id: c._id || Math.random(),
          type: 'comment',
          user: c.user?.username || 'Unknown',
          action: `commented on "${t.title}"`,
          time: new Date(c.timestamp),
          icon: '💬'
        });
      });
    });

    const filtered = logs.filter(log => {
      if (!activityDateFilter) return true;
      const logDate = `${log.time.getFullYear()}-${String(log.time.getMonth() + 1).padStart(2, '0')}-${String(log.time.getDate()).padStart(2, '0')}`;
      return logDate === activityDateFilter;
    });

    return filtered.sort((a, b) => b.time - a.time);
  }, [commits, tasks, activityDateFilter]);

  useEffect(() => {
    if (activeTab === 'activity' && activityLogRef.current) {
      activityLogRef.current.scrollTop = 0;
    }
  }, [activityLog, activeTab]);

  if (!loading && !project) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-200">
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-10 rounded-3xl shadow-xl border border-white/20 dark:border-slate-800/50 text-center max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
        <div className="text-6xl mb-6">🔍</div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Project Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          We couldn't retrieve the project details. This might be due to a connection issue, or the project may no longer exist.
        </p>
        <div className="flex flex-col gap-4">
          <button 
            onClick={fetchData}
            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
          >
            Retry Connection
          </button>
          <button 
            onClick={() => navigate('/my-tasks')}
            className="text-slate-500 dark:text-slate-400 font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Go to My Tasks
          </button>
        </div>
      </div>
    </div>
  );

  // Calculate Contribution Data
  const contributionData = commits.reduce((acc, commit) => {
    const found = acc.find(item => item.name === commit.committerName);
    if (found) found.value += 1;
    else acc.push({ name: commit.committerName, value: 1 });
    return acc;
  }, []);

  const isPanicMode = project?.riskLevel === 'High';
  const isOwner = project?.members.some(m => m.user._id === user?._id && m.role === 'Owner');
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // 5️⃣ Deadline Risk Prediction 🧠
  let isDeadlineRisk = false;
  if (project?.deadline) {
    const hoursRemaining = (new Date(project.deadline) - new Date()) / (1000 * 60 * 60);
    const incompleteRatio = totalTasks > 0 ? (totalTasks - completedTasks) / totalTasks : 0;
    
    if (incompleteRatio > 0.4 && hoursRemaining < 48 && hoursRemaining > 0) {
      isDeadlineRisk = true;
    }
  }

  // 3️⃣ Task-Level Deadline Warnings & Virtual "At Risk" State
  const processedTasks = tasks.map(task => {
    if (!task.deadline) return task;
    
    const diffTime = new Date(task.deadline) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Determine badge color (logic for TaskBoard to potentially use)
    let deadlineColor = diffDays > 3 ? 'green' : diffDays >= 0 ? 'yellow' : 'red';
    
    // Auto move overdue tasks to "At Risk" (Virtual State)
    let status = task.status;
    if (diffDays < 0 && task.status !== 'done') {
      status = 'At Risk';
    }

    return { ...task, deadlineColor, status };
  });

  // 4️⃣ Contribution Fairness Score (Weighted Algorithm)
  const memberStats = (project?.members || []).map(m => {
    const username = m.user.username;
    
    // 1. Commits (Weight: 2)
    const memberCommits = commits.filter(c => c.committerName === username).length;
    
    // 2. Tasks Completed (Weight: 5)
    const memberTasks = tasks.filter(t => 
      t.status === 'done' && t.assignees.some(a => a.username === username)
    ).length;

    // 3. Activity (History + Comments) (Weight: 1)
    let activityCount = 0;
    tasks.forEach(t => {
      t.history?.forEach(h => {
        if (h.user?.username === username) activityCount++;
      });
      t.comments?.forEach(c => {
        if (c.user?.username === username) activityCount++;
      });
    });

    const score = (memberCommits * 2) + (memberTasks * 5) + activityCount;

    return {
      userId: m.user._id,
      username,
      commits: memberCommits,
      tasks: memberTasks,
      activity: activityCount,
      score
    };
  });

  const totalScore = memberStats.reduce((acc, curr) => acc + curr.score, 0);

  const fairnessScores = memberStats.map(stat => {
    const lastNudge = nudgeCooldowns[stat.userId];
    const isCooldown = lastNudge && (Date.now() - lastNudge < 24 * 60 * 60 * 1000);
    return {
      ...stat,
      percentage: totalScore === 0 ? 0 : Math.round((stat.score / totalScore) * 100),
      isCooldown
    };
  }).sort((a, b) => b.percentage - a.percentage);

  return (
    <ErrorBoundary>
    <div className={`min-h-screen p-4 md:p-6 relative overflow-hidden ${(isPanicMode || isDeadlineRisk) ? 'bg-red-50/50 dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-950'} transition-colors duration-200`}>
      {/* Background Blobs for Glassmorphism Effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {progress === 100 && <Confetti width={windowSize.width} height={windowSize.height} />}
      <header className="mb-8 sticky top-0 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl py-4 border-b border-slate-200/50 dark:border-slate-800/50 -mx-4 px-4 md:-mx-6 md:px-6">
        <div className="flex justify-between items-center gap-4">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg mb-2"></div>
              <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{project.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-2">
                <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">Repository</span>
                {project.repoUrl}
              </p>
            </div>
          )}

          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-xl shadow-sm border border-white/20 dark:border-slate-800/50">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Toggle Dark Mode">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <NotificationDropdown socket={socket} userId={user?._id} muted={isMuted} />
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-indigo-600 text-white px-3 md:px-5 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md hover:shadow-indigo-500/20 text-sm md:text-base"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button onClick={() => navigate('/my-tasks')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400" title="Back to My Tasks">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </button>
          </div>

          {/* Mobile Controls */}
          <div className="flex md:hidden items-center gap-2">
            <NotificationDropdown socket={socket} userId={user?._id} muted={isMuted} />
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-white/20 dark:border-slate-800/50 text-slate-700 dark:text-slate-200">
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 shadow-xl animate-in slide-in-from-top-2">
            <button onClick={() => { setDarkMode(!darkMode); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
              <span className="text-xl">{darkMode ? '☀️' : '🌙'}</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button onClick={() => { handleSync(); setIsMobileMenuOpen(false); }} disabled={isSyncing} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
              <span className="text-xl">🔄</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{isSyncing ? 'Syncing...' : 'Sync Project'}</span>
            </button>
            <button onClick={() => navigate('/my-tasks')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
              <span className="text-xl">🏠</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">Back to My Tasks</span>
            </button>
          </div>
        )}

        {(isPanicMode || isDeadlineRisk) && (
          <div className="mt-4 md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-red-600 text-white px-4 py-2 rounded-lg animate-pulse font-bold shadow-lg shadow-red-500/40 text-center text-sm md:text-base z-50">
            {isDeadlineRisk ? '⚠️ Project at HIGH RISK of missing deadline' : '⚠️ DEADLINE RISK: HIGH'}
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center md:justify-start gap-1 mb-8 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md p-1 rounded-xl w-full md:w-fit border border-white/20 dark:border-slate-800/50 shadow-sm relative z-10">
        <button 
          className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all flex-1 md:flex-none whitespace-nowrap ${activeTab === 'overview' ? 'bg-white/80 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all flex-1 md:flex-none whitespace-nowrap ${activeTab === 'members' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          onClick={() => setActiveTab('members')}
        >
          Members
        </button>
        <button 
          className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all flex-1 md:flex-none whitespace-nowrap ${activeTab === 'activity' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
        <button 
          className={`px-4 md:px-6 py-2 rounded-lg text-sm font-bold transition-all flex-1 md:flex-none whitespace-nowrap ${activeTab === 'settings' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {activeTab === 'overview' ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Stats & Commits */}
        <div className="lg:col-span-1 space-y-6 relative z-10">
          {/* Progress Bar */}
          <div className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/20 dark:border-slate-800/50 ${loading ? 'animate-pulse' : ''}`}>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completion</span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{loading ? '...' : `${progress}%`}</span>
            </div>
            <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full h-3 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: loading ? '0%' : `${progress}%` }}></div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 font-medium">{completedTasks} of {totalTasks} tasks completed</p>
          </div>

          {/* Chart */}
          <div className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/20 dark:border-slate-800/50 ${loading ? 'animate-pulse' : ''}`}>
            <h2 className="text-lg font-bold mb-4 dark:text-white">Commit Distribution</h2>
            <div className="h-64">
              {contributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contributionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {contributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No contribution data yet
                </div>
              )}
            </div>
          </div>

          {/* Fairness Score Card */}
          <div className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/20 dark:border-slate-800/50 ${loading ? 'animate-pulse' : ''}`}>
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Contribution Fairness ⚖️</h2>
            <div className="space-y-4">
              {fairnessScores.map(member => (
                <div key={member.username}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{member.username}</span>
                    <span className={`font-bold ${member.percentage < 15 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {member.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${member.percentage < 15 ? 'bg-red-500' : 'bg-blue-500'}`} 
                      style={{ width: `${member.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                    <span>{member.commits} commits • {member.tasks} tasks</span>
                    <span>{member.activity} actions</span>
                  </div>
                  {member.percentage < 15 && (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-red-500 dark:text-red-400 font-bold flex items-center gap-1">
                        ⚠️ Low Contribution Alert
                      </p>
                      {member.username !== user?.username && (
                        <button 
                          onClick={() => handleNudge(member.userId)}
                          disabled={member.isCooldown}
                          className={`text-xs px-2 py-1 rounded border ${member.isCooldown ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600' : 'bg-red-100 text-red-600 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'}`}
                        >
                          {member.isCooldown ? 'Nudged 🕒' : 'Nudge 👋'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fairness Leaderboard Chart */}
          <div className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/20 dark:border-slate-800/50 ${loading ? 'animate-pulse' : ''}`}>
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Leaderboard 🏆</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fairnessScores} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="username" type="category" width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="percentage" name="Contribution %" radius={[0, 4, 4, 0]}>
                    {fairnessScores.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.percentage < 15 ? '#EF4444' : '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Commit Feed */}
          <div className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/20 dark:border-slate-800/50 h-96 overflow-y-auto ${loading ? 'animate-pulse' : ''}`}>
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Live Commits</h2>
            {commits.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-10">
                No commits found. <br/> 
                <span className="text-sm">Push code to GitHub or check Repo URL.</span>
              </p>
            ) : (
              <ul className="space-y-3">
                {commits.map((commit, idx) => (
                  <li key={idx} className="border-b dark:border-gray-700 pb-2">
                    <div className="flex justify-between">
                      <span className="font-bold text-blue-600 dark:text-blue-400">{commit.committerName}</span>
                      <span className="text-xs text-gray-400">{new Date(commit.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{commit.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Col: Task Board */}
        <div className="lg:col-span-2">
           <TaskBoard 
             tasks={processedTasks} 
             projectId={id}
             isLoading={loading}
             members={project?.members || []}
             onTaskUpdate={(t) => setTasks(prev => [...prev, t])} 
           />
        </div>
      </div>
      ) : activeTab === 'members' ? (
        <MembersTab 
          projectId={id} 
          members={project.members} 
          commits={commits}
          tasks={tasks}
          isLoading={loading}
          onUpdate={(newMembers) => setProject(prev => ({ ...prev, members: newMembers }))} 
        />
      ) : activeTab === 'activity' ? (
        <div 
          ref={activityLogRef}
          className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow max-w-4xl mx-auto max-h-[80vh] overflow-y-auto scroll-smooth ${loading ? 'animate-pulse' : ''}`}
        >
          <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-2 border-b dark:border-gray-700">
            <h2 className="text-xl font-semibold dark:text-white">Project Activity Log 🕰️</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleExportCSV}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
              >
                📥 Export CSV
              </button>
              <input 
                type="date" 
                value={activityDateFilter}
                onChange={(e) => setActivityDateFilter(e.target.value)}
                className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {activityDateFilter && (
                <button 
                  onClick={() => setActivityDateFilter('')}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="space-y-6">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4 items-start border-b dark:border-gray-700 pb-4 last:border-0">
                  <div className="bg-slate-200 dark:bg-slate-800 w-10 h-10 rounded-full shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
                    <div className="h-3 w-1/4 bg-slate-100 dark:bg-slate-800 rounded"></div>
                  </div>
                </div>
              ))
            ) : (
              activityLog.map((log, i) => (
                <div key={i} className="flex gap-4 items-start border-b dark:border-gray-700 pb-4 last:border-0">
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0">
                    {log.icon}
                  </div>
                  <div>
                    <p className="text-gray-800 dark:text-gray-200 text-sm">
                      <span className="font-bold">{log.user}</span> {log.action}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{log.time.toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
            {!loading && activityLog.length === 0 && <div className="text-center text-gray-500 dark:text-gray-400">No activity found.</div>}
          </div>
        </div>
      ) : (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-white/20 dark:border-slate-800/50 max-w-2xl mx-auto relative z-10">
          <h2 className="text-2xl font-bold mb-8 dark:text-white">Project Settings</h2>
          
          <div className="mb-8 pb-8 border-b border-slate-200/50 dark:border-slate-800/50">
            <label className="flex items-center gap-3 font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isMuted} 
                onChange={(e) => setIsMuted(e.target.checked)}
                className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
              />
              Mute Notification Sounds
            </label>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-8">Disable audio alerts for new commits and tasks.</p>
          </div>

          {isOwner ? (
            <>
              <div className="mb-10">
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Project Name</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={project.name}
                    onChange={(e) => setProject({ ...project, name: e.target.value })}
                    className="flex-1 border border-white/20 dark:border-slate-700 p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button onClick={handleUpdateProject} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20">
                    Save
                  </button>
                </div>
              </div>

              <div className="bg-red-50/30 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Once you delete a project, there is no going back. All tasks and history will be permanently removed.</p>
                <button 
                  onClick={handleDeleteProject}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-md shadow-red-500/20"
                >
                  Delete Project
                </button>
              </div>
            </>
          ) : (
            <div className="bg-red-50/30 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Leaving the project will remove you from the member list and unassign you from all your tasks.</p>
              <button 
                onClick={handleLeaveProject}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-md shadow-red-500/20"
              >
                Leave Project
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
