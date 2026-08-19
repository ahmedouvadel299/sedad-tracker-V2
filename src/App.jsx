import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import AgentDashboard from './pages/AgentDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ObserverDashboard from './pages/ObserverDashboard.jsx'

// TODO: استبدال هذا لاحقاً بمنطق حقيقي يقرأ حالة تسجيل الدخول من Firebase Auth
// ودور المستخدم من roles/{uid} في Realtime Database
function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/agent" element={<AgentDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/observateur" element={<ObserverDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
