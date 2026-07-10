import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { StatusBadge, showToast } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ROLE_STYLES = {
  farmer: 'bg-green-100 text-green-800',
  lender: 'bg-blue-100 text-blue-800',
  admin:  'bg-purple-100 text-purple-800',
}

export default function Users() {
  const { user: me }       = useAuth()
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [search,   setSearch]   = useState('')
  const [roleF,    setRoleF]    = useState('')
  const [confirm,  setConfirm]  = useState(null) // { type, userId, value }

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await api.request('GET', '/admin/users')
      setUsers(data.users || [])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function changeRole(userId, role) {
    try {
      await api.request('PATCH', `/admin/users/${userId}/role`, { role })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      showToast(`Role updated to ${role}`)
    } catch (err) { alert('Failed: ' + err.message) }
    finally { setConfirm(null) }
  }

  async function changeStatus(userId, status) {
    try {
      await api.request('PATCH', `/admin/users/${userId}/status`, { status })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u))
      showToast(`User ${status === 'suspended' ? 'suspended' : 'activated'}`)
    } catch (err) { alert('Failed: ' + err.message) }
    finally { setConfirm(null) }
  }

  async function deleteUser(userId) {
    try {
      await api.request('DELETE', `/admin/users/${userId}`)
      setUsers(prev => prev.filter(u => u.id !== userId))
      showToast('User deleted')
    } catch (err) { alert('Failed: ' + err.message) }
    finally { setConfirm(null) }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (!q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      && (!roleF || u.role === roleF)
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-extrabold text-forest mb-0.5">User Management</h1>
      <p className="text-sm text-gray-400 mb-6">View all users, change roles, and manage account status.</p>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-moss" />
        </div>
        <select value={roleF} onChange={e => setRoleF(e.target.value)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
          <option value="">All roles</option>
          <option value="farmer">Farmers</option>
          <option value="lender">Lenders</option>
          <option value="admin">Admins</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} users</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-moss-lt border-t-moss rounded-full animate-spin mx-auto mb-3" />
            Loading users…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">{error}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-forest">
                {['User','Role','Status','Auth','Joined','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-moss uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400">No users found.</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(u.name||'?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-sm">{u.name}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                        {u.organization && <div className="text-xs text-gray-400">{u.organization}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${ROLE_STYLES[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      u.status === 'suspended' ? 'bg-danger-lt text-danger' : 'bg-moss-lt text-forest'
                    }`}>
                      {u.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {u.googleId ? '🔵 Google' : '🔑 Email'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    {u.id === me?.id ? (
                      <span className="text-xs text-gray-400 italic">You</span>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Role change */}
                        <select value={u.role}
                          onChange={e => setConfirm({ type: 'role', userId: u.id, value: e.target.value, name: u.name })}
                          className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none cursor-pointer">
                          <option value="farmer">Farmer</option>
                          <option value="lender">Lender</option>
                          <option value="admin">Admin</option>
                        </select>
                        {/* Suspend / Activate */}
                        {u.status !== 'suspended' ? (
                          <button onClick={() => setConfirm({ type: 'suspend', userId: u.id, name: u.name })}
                            className="px-2.5 py-1 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-xs font-semibold hover:bg-yellow-100 transition-colors whitespace-nowrap">
                            Suspend
                          </button>
                        ) : (
                          <button onClick={() => setConfirm({ type: 'activate', userId: u.id, name: u.name })}
                            className="px-2.5 py-1 bg-moss-lt border border-moss text-forest rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors whitespace-nowrap">
                            Activate
                          </button>
                        )}
                        {/* Delete */}
                        <button onClick={() => setConfirm({ type: 'delete', userId: u.id, name: u.name })}
                          className="px-2.5 py-1 bg-danger-lt border border-red-200 text-danger rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors">
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          confirm={confirm}
          onConfirm={() => {
            if (confirm.type === 'role')     changeRole(confirm.userId, confirm.value)
            if (confirm.type === 'suspend')  changeStatus(confirm.userId, 'suspended')
            if (confirm.type === 'activate') changeStatus(confirm.userId, 'active')
            if (confirm.type === 'delete')   deleteUser(confirm.userId)
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

function ConfirmModal({ confirm, onConfirm, onCancel }) {
  const messages = {
    role:     `Change ${confirm.name}'s role to ${confirm.value}?`,
    suspend:  `Suspend ${confirm.name}'s account? They will not be able to log in.`,
    activate: `Reactivate ${confirm.name}'s account?`,
    delete:   `Permanently delete ${confirm.name}'s account? This cannot be undone.`,
  }
  const isDanger = confirm.type === 'suspend' || confirm.type === 'delete'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="font-bold text-gray-800 text-base mb-2">Confirm action</h3>
        <p className="text-sm text-gray-500 mb-6">{messages[confirm.type]}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${isDanger ? 'bg-danger hover:bg-red-700' : 'bg-forest hover:bg-leaf'}`}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}