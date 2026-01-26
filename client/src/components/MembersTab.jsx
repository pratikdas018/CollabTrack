import { useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const MembersTab = ({ projectId, members, onUpdate, commits = [], tasks = [], isLoading = false }) => {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'commits', direction: 'desc' });
  
  const isOwner = members.some(m => m.user._id === user?._id && m.role === 'Owner');

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, { username });
      onUpdate(res.data);
      setUsername('');
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteLink = async () => {
    const inviteLink = `${window.location.origin}/project/${projectId}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Project link copied to clipboard!', { position: toast.POSITION.BOTTOM_RIGHT });
    } catch (err) {
      console.error('Failed to copy link: ', err);
      toast.error('Failed to copy link.', { position: toast.POSITION.BOTTOM_RIGHT });
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await api.put(`/projects/${projectId}/members/${userId}`, { role: newRole });
      onUpdate(res.data);
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        const res = await api.delete(`/projects/${projectId}/members/${memberId}`);
        onUpdate(res.data);
      } catch (err) {
        alert(err.response?.data?.msg || 'Failed to remove member');
      }
    }
  };

  const getMemberStats = (member) => {
    const memberUsername = member.user.username;
    
    // 1. Commits
    const memberCommits = commits.filter(c => c.committerName === memberUsername);
    
    // 2. Tasks Completed
    const completedTasks = tasks.filter(t => 
      t.status === 'done' && t.assignees.some(a => a.username === memberUsername)
    ).length;

    // 3. Last Active (Check commits, task history, and comments)
    let lastActiveTime = 0;
    
    if (memberCommits.length > 0) {
      const lastCommit = new Date(memberCommits[0].timestamp).getTime();
      if (lastCommit > lastActiveTime) lastActiveTime = lastCommit;
    }

    tasks.forEach(task => {
      task.history?.forEach(h => {
        if (h.user?.username === memberUsername) {
          const time = new Date(h.timestamp).getTime();
          if (time > lastActiveTime) lastActiveTime = time;
        }
      });
      task.comments?.forEach(c => {
        if (c.user?.username === memberUsername) {
          const time = new Date(c.timestamp).getTime();
          if (time > lastActiveTime) lastActiveTime = time;
        }
      });
    });

    const lastActiveDate = lastActiveTime > 0 ? new Date(lastActiveTime) : null;
    const isActive = lastActiveDate && (Date.now() - lastActiveTime < 3 * 24 * 60 * 60 * 1000); // Active if < 3 days

    return {
      commits: memberCommits.length,
      tasks: completedTasks,
      lastActive: lastActiveDate ? lastActiveDate.toLocaleString() : 'Never',
      status: isActive ? '✅ Active' : '💤 Inactive'
    };
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedMembers = members.map(member => ({
    member,
    stats: getMemberStats(member)
  })).sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = sortConfig.key === 'username' ? a.member.user.username.toLowerCase() : a.stats[sortConfig.key];
    const bValue = sortConfig.key === 'username' ? b.member.user.username.toLowerCase() : b.stats[sortConfig.key];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  if (isLoading) {
    return (
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-white/20 dark:border-slate-800/50 h-full relative z-10 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg mb-6"></div>
        <div className="flex gap-3 max-w-md mb-10">
          <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between">
            <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div> {/* For the new button */}
            <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="py-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
              <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
              <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-white/20 dark:border-slate-800/50 h-full relative z-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold dark:text-white">Team Performance</h2>
        {isOwner && (
          <button
            onClick={handleCopyInviteLink}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 flex-shrink-0"
          >
            Copy Project Link
          </button>
        )}
      </div>

      {/* Add Member Form */}
      <form onSubmit={handleAddMember} className="mb-10 flex gap-3 max-w-md">
        <input
          type="text"
          placeholder="Enter GitHub Username"
          className="flex-1 border border-white/20 dark:border-slate-700 p-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
        >
          {loading ? 'Inviting...' : 'Invite'}
        </button>
      </form>

      {/* Members Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter text-[11px]">
              <th 
                className="pb-4 pl-2 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 select-none"
                onClick={() => handleSort('username')}
              >
                Member {sortConfig.key === 'username' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="pb-4">Role</th>
              <th 
                className="pb-4 text-center cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 select-none"
                onClick={() => handleSort('tasks')}
              >
                Tasks Done {sortConfig.key === 'tasks' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="pb-4 text-center cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 select-none"
                onClick={() => handleSort('commits')}
              >
                Commits {sortConfig.key === 'commits' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="pb-4">Last Active</th>
              <th className="pb-4">Activity</th>
              <th className="pb-4">Invite Status</th>
              {isOwner && <th className="pb-4 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map(({ member, stats }) => {
              return (
                <tr key={member._id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-3">
                      <img 
                        src={member.user.avatarUrl || `https://github.com/${member.user.username}.png`} 
                        alt={member.user.username} 
                        className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-700 shadow-sm"
                      />
                      <span className="font-bold text-slate-700 dark:text-slate-200">{member.user.username}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <select 
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.user._id, e.target.value)}
                      className="border rounded p-1 text-xs bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="Owner">Owner</option>
                      <option value="Member">Member</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="py-3 text-center text-gray-700 dark:text-gray-300 font-medium">{stats.tasks}</td>
                  <td className="py-3 text-center text-gray-700 dark:text-gray-300 font-medium">{stats.commits}</td>
                  <td className="py-3 text-gray-500 dark:text-gray-400 text-xs">{stats.lastActive}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${stats.status.includes('Active') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {stats.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${member.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {member.status || 'Accepted'}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="py-3 text-right">
                      {member.user._id !== user?._id && (
                        <button 
                          onClick={() => handleRemoveMember(member.user._id)}
                          className="text-red-500 hover:text-red-700 text-xs border border-red-200 bg-red-50 px-2 py-1 rounded hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/50 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MembersTab;