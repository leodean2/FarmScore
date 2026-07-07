import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/lender',          icon: '📊', label: 'Dashboard',    end: true },
  { to: '/lender/farmers',  icon: '👩‍🌾', label: 'All Farmers' },
  { to: '/lender/pending',  icon: '📋', label: 'Pending Review' },
  { to: '/lender/approved', icon: '✅', label: 'Approved' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-surface border-r border-border flex flex-col">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-lg">
            🌱
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">FarmScore</div>
            <div className="text-[10px] text-moss font-semibold tracking-widest uppercase">Credit Intelligence</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2 mt-1">Menu</p>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-moss-lt text-forest font-bold'
                  : 'text-gray-400 hover:bg-border hover:text-white'
              }`
            }
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="border-t border-border my-3" />
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2">Tools</p>

        <NavLink
          to="/farmer"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-border hover:text-white transition-colors"
        >
          <span className="text-base w-5 text-center">➕</span>
          New Assessment
        </NavLink>
      </nav>

      {/* User + logout */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-border">
          <div className="w-7 h-7 rounded-full bg-moss flex items-center justify-center text-forest font-bold text-xs flex-shrink-0">
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{user?.name || 'Loan Officer'}</div>
            <div className="text-[10px] text-gray-500 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-red-400 transition-colors font-medium"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}