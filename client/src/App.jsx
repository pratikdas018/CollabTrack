import { Routes, Route } from 'react-router-dom';
import CreateProject from './pages/CreateProject';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import MyTasks from './pages/MyTasks';

function App() {
  return (
    <div className="font-sans min-h-screen text-slate-900 dark:text-slate-50">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/create" element={<CreateProject />} />
        <Route path="/project/:id" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;