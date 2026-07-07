import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LenderLayout   from './components/layout/LenderLayout'

import Login      from './pages/Login'
import FarmerForm from './pages/farmer/FarmerForm'
import Dashboard  from './pages/lender/Dashboard'
import AllFarmers from './pages/lender/AllFarmers'
import Pending    from './pages/lender/Pending'
import Approved   from './pages/lender/Approved'

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