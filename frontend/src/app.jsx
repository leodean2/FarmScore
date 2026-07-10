import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute  from './components/layout/ProtectedRoute'
import LenderLayout    from './components/layout/LenderLayout'
import AdminLayout     from './components/layout/AdminLayout'

import Login           from './pages/Login'
import CompleteProfile from './pages/CompleteProfile'
import FarmerDashboard from './pages/farmer/FarmerDashboard'
import Dashboard       from './pages/lender/Dashboard'
import AllFarmers      from './pages/lender/AllFarmers'
import Pending         from './pages/lender/Pending'
import Approved        from './pages/lender/Approved'
import AdminDashboard  from './pages/admin/AdminDashboard'
import Users           from './pages/admin/Users'
import Settings        from './pages/admin/Settings'

// Handles Google OAuth redirect params and sends users to the right route
function OAuthHandler() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const mode   = params.get('mode')
    const token  = params.get('token')
    const role   = params.get('role')
    const id     = params.get('id')
    const name   = params.get('name')
    const email  = params.get('email')
    const googleId = params.get('googleId')
    const avatar = params.get('avatar')

    if (!location.pathname.startsWith('/auth') && !location.search) return

    if (mode === 'complete-profile' && googleId && email) {
      const nextParams = new URLSearchParams({
        googleId,
        name: name || '',
        email,
        avatar: avatar || '',
      })
      navigate(`/complete-profile?${nextParams.toString()}`, { replace: true })
      return
    }

    if (token && role) {
      login(token, { id, name, email, role })
      const dest = role === 'admin' ? '/admin' : role === 'lender' ? '/lender' : '/farmer'
      navigate(dest, { replace: true })
    }
  }, [location.pathname, location.search, login, navigate])

  return null
}

// Admin pages wrapped in AdminLayout
function AdminPage({ children }) {
  return (
    <ProtectedRoute role="admin">
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <OAuthHandler />
        <Routes>
          {/* Public */}
          <Route path="/login"            element={<Login />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />

          {/* Farmer */}
          <Route path="/farmer" element={
            <ProtectedRoute role="farmer">
              <FarmerDashboard />
            </ProtectedRoute>
          } />

          {/* Lender */}
          <Route path="/lender" element={
            <ProtectedRoute role="lender">
              <LenderLayout />
            </ProtectedRoute>
          }>
            <Route index         element={<Dashboard />} />
            <Route path="farmers"  element={<AllFarmers />} />
            <Route path="pending"  element={<Pending />} />
            <Route path="approved" element={<Approved />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<AdminPage><AdminDashboard /></AdminPage>} />
          <Route path="/admin/users"    element={<AdminPage><Users /></AdminPage>} />
          <Route path="/admin/settings" element={<AdminPage><Settings /></AdminPage>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}