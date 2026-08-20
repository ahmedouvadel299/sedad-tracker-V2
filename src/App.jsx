import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import WelcomeSplash from './pages/WelcomeSplash.jsx'
import AgentDashboard from './pages/AgentDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ObserverDashboard from './pages/ObserverDashboard.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/bienvenue" element={<WelcomeSplash />} />
      <Route path="/agent" element={<AgentDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/observateur" element={<ObserverDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
