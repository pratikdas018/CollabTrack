import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import TaskBoard from '../components/TaskBoard';

const socket = io('http://localhost:5000');
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/projects/${id}`);
        setProject(res.data.project);
        setCommits(res.data.commits);
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();

    socket.emit('join-project', id);
    
    socket.on('new-commit', (newCommits) => {
      setCommits(prev => [...newCommits, ...prev]);
      alert('🔥 New Code Pushed!');
    });

    return () => {
      socket.off('new-commit');
    };
  }, [id]);

  if (loading) return <div className="p-10">Loading...</div>;

  // Calculate Contribution Data
  const contributionData = commits.reduce((acc, commit) => {
    const found = acc.find(item => item.name === commit.committerName);
    if (found) found.value += 1;
    else acc.push({ name: commit.committerName, value: 1 });
    return acc;
  }, []);

  const isPanicMode = project.riskLevel === 'High';

  return (
    <div className={`min-h-screen p-6 ${isPanicMode ? 'bg-red-50' : 'bg-gray-50'}`}>
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-gray-500">Repo: {project.repoUrl}</p>
        </div>
        {isPanicMode && (
          <div className="bg-red-600 text-white px-4 py-2 rounded animate-pulse font-bold">
            ⚠️ DEADLINE RISK: HIGH
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Stats & Commits */}
        <div className="lg:col-span-1 space-y-6">
          {/* Chart */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Contributions</h2>
            <div className="h-64">
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
            </div>
          </div>

          {/* Commit Feed */}
          <div className="bg-white p-4 rounded-lg shadow h-96 overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Live Commits</h2>
            <ul className="space-y-3">
              {commits.map((commit, idx) => (
                <li key={idx} className="border-b pb-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-blue-600">{commit.committerName}</span>
                    <span className="text-xs text-gray-400">{new Date(commit.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-gray-700">{commit.message}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Col: Task Board */}
        <div className="lg:col-span-2">
           <TaskBoard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;