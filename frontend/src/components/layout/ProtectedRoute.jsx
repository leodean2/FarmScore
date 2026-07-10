import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, token, ready } = useAuth()

  if (!ready) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1E2D45] border-t-moss rounded-full animate-spin" />
    </div>
  )

  if (!token || !user) return <Navigate to="/login" replace />

  // Role-based access
  if (role) {
    // Admin can access everything
    if (user.role === 'admin') return children

    // Lender can access lender routes
    if (role === 'lender' && user.role !== 'lender') {
      return <Navigate to={`/${user.role}`} replace />
    }

    // Farmer can only access farmer routes
    if (role === 'farmer' && user.role !== 'farmer') {
      return <Navigate to={`/${user.role}`} replace />
    }
  }

  return children
}