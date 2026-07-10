import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/admin',          icon: '📊', label: 'Overview',         end: true },
  { to: '/admin/users',    icon: '👥', label: 'User Management' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings & Audit' },
  { divider: true },
  { to: '/lender',         icon: '🏦', label: 'Lender View' },
]

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-[#F1F5F0]">
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-lg">🌱</div>
            <div>
              <div className="font-bold text-gray-800 text-sm leading-tight">FarmScore</div>
              <div className="text-[10px] text-purple-500 font-bold tracking-widest uppercase">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2 mt-1">Admin</p>
          {NAV.map((item, i) => {
            if (item.divider) return <div key={i} className="border-t border-gray-100 my-3" />
            return (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-50 text-purple-700 font-bold'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                  }`
                }>
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* User */}
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
      </aside>

      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  )
}