import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

const GOOGLE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/auth/google`
  : '/api/auth/google'

export default function Login() {
  const [tab,      setTab]      = useState('signin')
  const [role,     setRole]     = useState('farmer')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const [signinForm,   setSignin]   = useState({ email: '', password: '' })
  const [registerForm, setRegister] = useState({ name: '', email: '', password: '', org: '', secret: '' })

  const { login } = useAuth()
  const navigate  = useNavigate()

  // ── Sign in ─────────────────────────────────────────────────────────────────
  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    if (!signinForm.email || !signinForm.password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    try {
      const data = await api.login({ email: signinForm.email, password: signinForm.password })
      login(data.token, data.user)
      const dest = data.user.role === 'admin' ? '/admin' : data.user.role === 'lender' ? '/lender' : '/farmer'
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  // ── Register ─────────────────────────────────────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (!registerForm.name || !registerForm.email || !registerForm.password) {
      setError('Please fill in all required fields.')
      return
    }
    if ((role === 'lender' || role === 'admin') && !registerForm.secret) {
      setError(`Secret key is required for ${role === 'admin' ? 'Admin' : 'Lender / SACCO'} accounts.`)
      return
    }
    setLoading(true)
    try {
      const data = await api.register({
        name:         registerForm.name,
        email:        registerForm.email,
        password:     registerForm.password,
        role,
        organization: registerForm.org    || undefined,
        adminSecret:  registerForm.secret || undefined,
      })
      login(data.token, data.user)
      const dest = data.user.role === 'admin' ? '/admin' : data.user.role === 'lender' ? '/lender' : '/farmer'
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const ROLES = [
    { val: 'farmer', icon: '🌱', label: 'Farmer',        desc: 'Submit assessments and view your FarmScore.',   secret: false },
    { val: 'lender', icon: '🏦', label: 'Lender / SACCO', desc: 'Review farmer scores and make loan decisions.', secret: true,  secretLabel: 'Lender secret key',  secretHint: 'Provided by your FarmScore administrator.' },
    { val: 'admin',  icon: '⚙️', label: 'Administrator',  desc: 'Manage users, lenders and system settings.',   secret: true,  secretLabel: 'Admin secret key',   secretHint: 'Contact the platform owner for this key.' },
  ]

  const selectedRole = ROLES.find(r => r.val === role)

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">

      {/* ── Left panel ── */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-10 relative overflow-hidden min-h-[220px] md:min-h-screen">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)' }} />

        {/* Brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}>🌱</div>
          <div>
            <div className="font-bold text-white text-base leading-tight">FarmScore</div>
            <div className="text-[10px] text-gray-500 font-semibold tracking-[2px] uppercase">Credit Intelligence</div>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold text-white leading-[1.15] tracking-tight mb-4">
            The connected credit<br />profile for smallholder<br />
            <span className="text-blue-400">lending.</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
            FarmScore turns advisory history and farm performance into a creditworthiness
            signal lenders, SACCOs, and cooperatives can act on.
          </p>
        </div>

        <div className="text-xs text-gray-600 relative z-10">Kenya AI Challenge · 2026</div>
      </div>

      {/* Divider */}
      <div className="hidden md:block w-px bg-[#1E2D45] self-stretch" />

      {/* ── Right panel ── */}
      <div className="w-full md:w-[480px] flex-shrink-0 flex flex-col justify-center px-6 md:px-12 py-8 md:py-10 overflow-y-auto">

        {/* Tab toggle */}
        <div className="flex bg-[#0E1525] border border-[#1E2D45] rounded-xl p-1 mb-7">
          {['signin','register'].map((t, i) => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                tab === t ? 'bg-[#1E2D45] text-white' : 'text-gray-400 hover:text-gray-200'
              }`}>
              {i === 0 ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-xl mb-5">
            {error}
          </div>
        )}

        {/* ── Sign in ── */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn}>
            <h2 className="text-2xl font-extrabold text-white mb-1">Welcome back</h2>
            <p className="text-gray-400 text-sm mb-6">Sign in to your workstation.</p>

            <GoogleButton onClick={() => { window.location.href = GOOGLE_URL }}>Continue with Google</GoogleButton>

            <OrDivider />

            <div className="space-y-4 mb-5">
              <Field label="Email">
                <DarkInput type="email" value={signinForm.email}
                  onChange={e => setSignin(p => ({ ...p, email: e.target.value }))} />
              </Field>
              <Field label="Password">
                <DarkInput type="password" value={signinForm.password}
                  onChange={e => setSignin(p => ({ ...p, password: e.target.value }))} />
              </Field>
            </div>

            <SubmitButton loading={loading}>Sign in</SubmitButton>
          </form>
        )}

        {/* ── Register ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            <h2 className="text-2xl font-extrabold text-white mb-1">Create your account</h2>
            <p className="text-gray-400 text-sm mb-5">Join FarmScore in under a minute.</p>

            <GoogleButton onClick={() => { window.location.href = GOOGLE_URL }}>Sign up with Google</GoogleButton>

            <OrDivider />

            {/* ── Role selector ── */}
            <p className="text-sm text-gray-300 font-semibold mb-3">I am joining as a…</p>
            <div className="space-y-2 mb-5">
              {ROLES.map(r => (
                <button key={r.val} type="button"
                  onClick={() => { setRole(r.val); setRegister(p => ({ ...p, secret: '' })) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    role === r.val
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#1E2D45] bg-[#080D1A] hover:border-[#2D6A4F]'
                  }`}>
                  {/* Radio dot */}
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    role === r.val ? 'border-blue-500' : 'border-gray-600'
                  }`}>
                    {role === r.val && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <span className="text-lg flex-shrink-0">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm ${role === r.val ? 'text-white' : 'text-gray-300'}`}>{r.label}</div>
                    <div className="text-xs text-gray-500 truncate">{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Fields */}
            <div className="space-y-4 mb-5">
              <Field label="Full name">
                <DarkInput type="text" value={registerForm.name}
                  onChange={e => setRegister(p => ({ ...p, name: e.target.value }))} />
              </Field>

              {(role === 'lender' || role === 'admin') && (
                <Field label="Organization">
                  <DarkInput type="text"
                    placeholder={role === 'lender' ? 'e.g. Ol Kalou SACCO' : 'e.g. FarmScore Operations'}
                    value={registerForm.org}
                    onChange={e => setRegister(p => ({ ...p, org: e.target.value }))} />
                </Field>
              )}

              <Field label="Email">
                <DarkInput type="email" value={registerForm.email}
                  onChange={e => setRegister(p => ({ ...p, email: e.target.value }))} />
              </Field>

              <Field label="Password">
                <DarkInput type="password" value={registerForm.password}
                  onChange={e => setRegister(p => ({ ...p, password: e.target.value }))} />
              </Field>

              {selectedRole?.secret && (
                <Field label={selectedRole.secretLabel}>
                  <DarkInput type="password" placeholder="Enter secret key…"
                    value={registerForm.secret}
                    onChange={e => setRegister(p => ({ ...p, secret: e.target.value }))} />
                  <span className="text-xs text-gray-500 mt-1">{selectedRole.secretHint}</span>
                </Field>
              )}
            </div>

            <SubmitButton loading={loading}>Create account</SubmitButton>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function GoogleButton({ children, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center justify-center gap-3 py-3 bg-[#0E1525] border border-[#1E2D45] rounded-xl text-sm font-semibold text-white hover:bg-[#1E2D45] transition-colors mb-5">
      <GoogleIcon />{children}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-5 text-gray-500 text-xs">
      <div className="flex-1 h-px bg-[#1E2D45]" />OR<div className="flex-1 h-px bg-[#1E2D45]" />
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-white font-medium">{label}</label>
      {children}
    </div>
  )
}

function DarkInput(props) {
  return (
    <input className="w-full px-3.5 py-3 bg-[#080D1A] border border-[#1E2D45] rounded-xl text-white text-sm outline-none
      focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all placeholder:text-gray-600"
      {...props} />
  )
}

function SubmitButton({ children, loading }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm rounded-xl
        transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed
        flex items-center justify-center gap-2">
      {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}