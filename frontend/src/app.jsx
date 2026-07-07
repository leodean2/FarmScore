import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LenderLayout   from './components/layout/LenderLayout'

import Login      from './pages/Login'
import FarmerForm from './pages/farmer/FarmerForm'
import Dashboard  from './pages/lender/Dashboard'
import AllFarmers from './pages/lender/AllFarmers'
import Pending    from './pages/lender/Pending'
import Approved   from './pages/lender/Approved'

// Reads token from query params after Google OAuth redirect
function OAuthHandler() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const token  = params.get('token')
    const role   = params.get('role')
    const id     = params.get('id')
    const name   = params.get('name')
    const email  = params.get('email')

    if (token && role) {
      login(token, { id, name, email, role })
      // Clean URL then redirect
      window.history.replaceState({}, '', location.pathname)
      navigate(role === 'admin' ? '/lender' : '/farmer', { replace: true })
    }
  }, [])

  return null
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <OAuthHandler />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Farmer */}
          <Route path="/farmer" element={
            <ProtectedRoute role="farmer">
              <FarmerForm />
            </ProtectedRoute>
          } />

          {/* Lender — nested under LenderLayout (Sidebar) */}
          <Route path="/lender" element={
            <ProtectedRoute role="admin">
              <LenderLayout />
            </ProtectedRoute>
          }>
            <Route index        element={<Dashboard />} />
            <Route path="farmers"  element={<AllFarmers />} />
            <Route path="pending"  element={<Pending />} />
            <Route path="approved" element={<Approved />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}