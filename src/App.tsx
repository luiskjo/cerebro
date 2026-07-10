import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProjectBrain from './pages/ProjectBrain';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Safety from './pages/Safety';
import Rfis from './pages/Rfis';
import Plans from './pages/Plans';
import Materials from './pages/Materials';
import DocIndex from './pages/DocIndex';
import DecisionLog from './pages/DecisionLog';
import Briefing from './pages/Briefing';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ProjectBrain />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/rfis" element={<Rfis />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/docs" element={<DocIndex />} />
        <Route path="/decisions" element={<DecisionLog />} />
        <Route path="/briefing" element={<Briefing />} />
      </Route>
    </Routes>
  );
}
