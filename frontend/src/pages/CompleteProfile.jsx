import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export default function CompleteProfile() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { login } = useAuth()

  const [role,    setRole]    = useState('farmer')
  const [org,     setOrg]     = useState('')
  const [secret,  setSecret]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const params   = new URLSearchParams(location.search)
  const googleId = params.get('googleId') || ''
  const name     = params.get('name')     || ''
  const email    = params.get('email')    || ''
  const avatar   = params.get('avatar')   || ''

  useEffect(() => {
    if (!googleId || !email) navigate('/login', { replace: true })
  }, [])

  const ROLES = [
    { val: 'farmer', icon: '🌱', label: 'Farmer',        desc: 'Submit farm assessments and view your FarmScore.', secret: false },
    { val: 'lender', icon: '🏦', label: 'Lender / SACCO', desc: 'Review farmer scores and make credit decisions.',  secret: true, secretLabel: 'Lender secret key', secretHint: 'Provided by your FarmScore administrator.' },
    { val: 'admin',  icon: '⚙️', label: 'Administrator',  desc: 'Manage users, lenders, and system settings.',     secret: true, secretLabel: 'Admin secret key',  secretHint: 'Contact the platform owner for this key.' },
  ]
  const selected = ROLES.find(r => r.val === role)

  function initials(n) {
    return (n || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (role === 'lender' && !org.trim()) { setError('Organization is required for lender accounts.'); return }
    if (selected?.secret && !secret) { setError(`Secret key is required for ${role === 'admin' ? 'Admin' : 'Lender'} accounts.`); return }

    setLoading(true)
    try {
      const data = await api.completeGoogleSignup({ googleId, name, email, avatar, role, organization: org || undefined, adminSecret: secret || undefined })
      login(data.token, data.user)
      const dest = data.user.role === 'admin' ? '/admin' : data.user.role === 'lender' ? '/lender' : '/farmer'
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.03) 1px,transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}>🌱</div>
          <div>
            <div className="font-bold text-white text-base leading-tight">FarmScore</div>
            <div className="text-[10px] text-gray-500 font-semibold tracking-[2px] uppercase">Credit Intelligence</div>
          </div>
        </div>

        <div className="bg-[#0E1525] border border-[#1E2D45] rounded-2xl p-8">
          {/* Google profile preview */}
          <div className="flex items-center gap-3 bg-[#080D1A] border border-[#1E2D45] rounded-xl px-4 py-3 mb-6">
            {avatar
              ? <img src={avatar} alt={name} className="w-10 h-10 rounded-full flex-shrink-0" />
              : <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{initials(name)}</div>
            }
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm truncate">{name}</div>
              <div className="text-gray-400 text-xs truncate">{email}</div>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold flex-shrink-0">Google</span>
          </div>

          <h1 className="text-xl font-extrabold text-white mb-1">Complete your profile</h1>
          <p className="text-gray-400 text-sm mb-6">Choose your role to set up your FarmScore account.</p>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm text-gray-300 font-semibold block mb-3">I am joining as a…</label>
              <div className="space-y-2.5">
                {ROLES.map(r => (
                  <button key={r.val} type="button" onClick={() => { setRole(r.val); setSecret('') }}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                      role === r.val ? 'border-blue-500 bg-blue-500/10' : 'border-[#1E2D45] hover:border-[#2D6A4F] bg-[#080D1A]'
                    }`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${role === r.val ? 'border-blue-500' : 'border-gray-600'}`}>
                      {role === r.val && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{r.icon}</span>
                        <span className={`font-bold text-sm ${role === r.val ? 'text-white' : 'text-gray-300'}`}>{r.label}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {(role === 'lender' || role === 'admin') && (
              <div>
                <label className="text-sm text-gray-300 font-semibold block mb-1.5">Organization {role === 'lender' ? '(required)' : ''}</label>
                <input type="text" value={org} onChange={e => setOrg(e.target.value)}
                  placeholder={role === 'lender' ? 'e.g. Ol Kalou SACCO' : 'e.g. FarmScore Operations'}
                  className="w-full px-3.5 py-3 bg-[#080D1A] border border-[#1E2D45] rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-all placeholder:text-gray-600" />
              </div>
            )}

            {selected?.secret && (
              <div>
                <label className="text-sm text-gray-300 font-semibold block mb-1.5">{selected.secretLabel} <span className="text-red-400">*</span></label>
                <input type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="Enter secret key…"
                  className="w-full px-3.5 py-3 bg-[#080D1A] border border-[#1E2D45] rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-all placeholder:text-gray-600" />
                <p className="text-xs text-gray-500 mt-1.5">{selected.secretHint}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Creating your account…' : 'Complete sign up →'}
            </button>

            <button type="button" onClick={() => navigate('/login')} className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
              ← Back to sign in
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-600 mt-5">Kenya AI Challenge · 2026</p>
      </div>
    </div>
  )
}
