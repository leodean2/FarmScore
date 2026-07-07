import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, token, ready } = useAuth()

  if (!ready) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-moss-lt border-t-moss rounded-full animate-spin" />
    </div>
  )

  if (!token || !user) return <Navigate to="/login" replace />

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/lender' : '/farmer'} replace />
  }

  return children
}