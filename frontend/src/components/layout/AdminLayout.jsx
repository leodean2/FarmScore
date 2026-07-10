import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/admin',          icon: '📊', label: 'Overview',         end: true },
  { to: '/admin/users',    icon: '👥', label: 'User Management' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings & Audit' },
  { divider: true },
  { to: '/lender',         icon: '🏦', label: 'Lender View' },
]

function AdminSidebarContent({ onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-lg">🌱</div>
          <div>
            <div className="font-bold text-gray-800 text-sm leading-tight">FarmScore</div>
            <div className="text-[10px] text-purple-500 font-bold tracking-widest uppercase">Admin Panel</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none ml-2">✕</button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2 mt-1">Admin</p>
        {NAV.map((item, i) => {
          if (item.divider) return <div key={i} className="border-t border-gray-100 my-3" />
          return (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-purple-50 text-purple-700 font-bold' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                }`
              }>
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {(user?.name || 'A')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-700 truncate">{user?.name}</div>
            <div className="text-[10px] text-purple-500 font-bold uppercase">Admin</div>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/login') }}
          className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-red-400 transition-colors font-medium">
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#F1F5F0]">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-sm">🌱</div>
          <span className="font-bold text-gray-800 text-sm">FarmScore Admin</span>
        </div>
        <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">☰</button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-64 bg-white flex flex-col h-full shadow-2xl">
            <AdminSidebarContent onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-white border-r border-gray-200 flex-col">
        <AdminSidebarContent />
      </aside>

      <main className="flex-1 overflow-x-hidden min-w-0 pt-14 md:pt-0">{children}</main>
    </div>
  )
}
