import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthContext } from './api/AuthContext'
import Layout from './components/Layout'
import LoginPage    from './pages/LoginPage'
import Dashboard    from './pages/Dashboard'
import JobCardsPage from './pages/JobCardsPage'
import KanbanPage   from './pages/KanbanPage'
import FinancePage  from './pages/FinancePage'
import ReportsPage  from './pages/ReportsPage'
import TodosPage    from './pages/TodosPage'
import AdminPage    from './pages/AdminPage'
import CustomersPage from './pages/CustomersPage'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuthContext()
  if (loading) return <div className="flex h-screen items-center justify-center"><span className="text-brand font-bold">Loading...</span></div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user } = useAuthContext()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="jobcards" element={<JobCardsPage />} />
        <Route path="kanban"   element={<KanbanPage />} />
        <Route path="finance"  element={<ProtectedRoute adminOnly><FinancePage /></ProtectedRoute>} />
        <Route path="reports"  element={<ProtectedRoute adminOnly><ReportsPage /></ProtectedRoute>} />
        <Route path="todos"    element={<TodosPage />} />
        <Route path="admin"    element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
        <Route path="customers" element={<ProtectedRoute adminOnly><CustomersPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
