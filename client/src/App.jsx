import { Routes, Route } from 'react-router-dom';
import CreateProject from './pages/CreateProject';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import MyTasks from './pages/MyTasks';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
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