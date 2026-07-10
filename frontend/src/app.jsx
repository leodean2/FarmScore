import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LenderLayout   from './components/layout/LenderLayout'
import AdminLayout    from './components/layout/AdminLayout'

import Login          from './pages/Login'
import FarmerDashboard from './pages/farmer/FarmerDashboard'
import Dashboard      from './pages/lender/Dashboard'
import AllFarmers     from './pages/lender/AllFarmers'
import Pending        from './pages/lender/Pending'
import Approved       from './pages/lender/Approved'
import AdminDashboard from './pages/admin/AdminDashboard'
import Users          from './pages/admin/Users'
import Settings       from './pages/admin/Settings'

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
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

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
            <Route index           element={<Dashboard />} />
            <Route path="farmers"  element={<AllFarmers />} />
            <Route path="pending"  element={<Pending />} />
            <Route path="approved" element={<Approved />} />
          </Route>

          {/* Admin */}
          <Route path="/admin"          element={<AdminPage><AdminDashboard /></AdminPage>} />
          <Route path="/admin/users"    element={<AdminPage><Users /></AdminPage>} />
          <Route path="/admin/settings" element={<AdminPage><Settings /></AdminPage>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
