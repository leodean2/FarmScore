import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export default function Login() {
  const [tab,      setTab]      = useState('signin')
  const [role,     setRole]     = useState('lender')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const [signinForm,   setSignin]   = useState({ email: '', password: '' })
  const [registerForm, setRegister] = useState({ name: '', email: '', password: '', org: '', secret: '' })

  const { login } = useAuth()
  const navigate  = useNavigate()

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    if (!signinForm.email || !signinForm.password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    try {
      const data = await api.login({ email: signinForm.email, password: signinForm.password })
      login(data.token, data.user)
      navigate(data.user.role === 'admin' ? '/lender' : '/farmer', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (!registerForm.name || !registerForm.email || !registerForm.password) { setError('Please fill in all required fields.'); return }
    if (role === 'lender' && !registerForm.secret) { setError('Admin secret key is required for Lender / SACCO accounts.'); return }
    setLoading(true)
    try {
      const data = await api.register({
        name:        registerForm.name,
        email:       registerForm.email,
        password:    registerForm.password,
        role:        role === 'lender' ? 'admin' : 'farmer',
        organization:registerForm.org   || undefined,
        adminSecret: registerForm.secret || undefined,
      })
      login(data.token, data.user)
      navigate(data.user.role === 'admin' ? '/lender' : '/farmer', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex">

      {/* ── Left panel ── */}
      <div className="flex-1 flex flex-col justify-between p-10 relative overflow-hidden">
        {/* Grid bg */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />
        {/* Glow */}
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)' }}
        />

        {/* Brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}>
            🌱
          </div>
          <div>
            <div className="font-bold text-white text-base leading-tight">FarmScore</div>
            <div className="text-[10px] text-gray-500 font-semibold tracking-[2px] uppercase">Credit Intelligence</div>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold text-white leading-[1.15] tracking-tight mb-4">
            The connected credit<br />
            profile for smallholder<br />
            <span className="text-blue-400">lending.</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
            FarmScore turns advisory history and farm performance
            into a creditworthiness signal lenders, SACCOs, and
            cooperatives can act on.
          </p>
        </div>

        <div className="text-xs text-gray-600 relative z-10">Kenya AI Challenge · 2026</div>
      </div>

      {/* Divider */}
      <div className="w-px bg-border self-stretch" />

      {/* ── Right panel ── */}
      <div className="w-[460px] flex-shrink-0 flex flex-col justify-center px-14 py-12">

        {/* Tab toggle */}
        <div className="flex bg-surface border border-border rounded-xl p-1 mb-8">
          {['signin','register'].map((t, i) => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                tab === t ? 'bg-border text-white' : 'text-gray-400 hover:text-gray-200'
              }`}>
              {i === 0 ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-lg mb-5">
            {error}
          </div>
        )}

        {/* ── Sign in ── */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-0">
            <h2 className="text-2xl font-extrabold text-white mb-1">Welcome back</h2>
            <p className="text-gray-400 text-sm mb-6">Sign in to your workstation.</p>

            <button type="button" onClick={() => alert('Google OAuth requires backend OAuth flow. Use email and password for the demo.')}
              className="w-full flex items-center justify-center gap-3 py-3 bg-surface border border-border rounded-xl text-sm font-semibold text-white hover:bg-border transition-colors mb-5">
              <GoogleIcon />
              Continue with Google
            </button>

            <OrDivider />

            <div className="space-y-4 mb-5">
              <Field label="Email">
                <DarkInput type="email" placeholder="" value={signinForm.email}
                  onChange={e => setSignin(p => ({ ...p, email: e.target.value }))} />
              </Field>
              <Field label="Password">
                <DarkInput type="password" placeholder="" value={signinForm.password}
                  onChange={e => setSignin(p => ({ ...p, password: e.target.value }))} />
              </Field>
            </div>

            <PrimaryButton loading={loading}>Sign in</PrimaryButton>
          </form>
        )}

        {/* ── Register ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-0">
            <h2 className="text-2xl font-extrabold text-white mb-1">Create your account</h2>
            <p className="text-gray-400 text-sm mb-5">Join FarmScore in under a minute.</p>

            <button type="button" onClick={() => alert('Google OAuth requires backend OAuth flow. Use email and password for the demo.')}
              className="w-full flex items-center justify-center gap-3 py-3 bg-surface border border-border rounded-xl text-sm font-semibold text-white hover:bg-border transition-colors mb-3">
              <GoogleIcon />
              Sign up with Google
            </button>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Google sign-up creates a farmer account by default. Choose a role below to sign up with email.
            </p>

            <OrDivider />

            {/* Role selector */}
            <p className="text-sm text-white mb-2">I am a…</p>
            <div className="flex gap-2.5 mb-5">
              {[{ val:'lender', label:'Lender / SACCO' }, { val:'farmer', label:'Farmer' }].map(r => (
                <button key={r.val} type="button" onClick={() => setRole(r.val)}
                  className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    role === r.val
                      ? 'border-blue-500 text-white bg-blue-500/10'
                      : 'border-border text-gray-400 hover:border-gray-500'
                  }`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    role === r.val ? 'border-blue-500' : 'border-gray-500'
                  }`}>
                    {role === r.val && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  {r.label}
                </button>
              ))}
            </div>

            <div className="space-y-4 mb-5">
              <Field label="Full name">
                <DarkInput type="text" value={registerForm.name}
                  onChange={e => setRegister(p => ({ ...p, name: e.target.value }))} />
              </Field>
              {role === 'lender' && (
                <Field label="Organization">
                  <DarkInput type="text" placeholder="e.g. Ol Kalou SACCO" value={registerForm.org}
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
              {role === 'lender' && (
                <Field label="Admin secret key">
                  <DarkInput type="password" placeholder="Required for Lender / SACCO accounts" value={registerForm.secret}
                    onChange={e => setRegister(p => ({ ...p, secret: e.target.value }))} />
                </Field>
              )}
            </div>

            <PrimaryButton loading={loading}>Create account</PrimaryButton>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────
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
      <div className="flex-1 h-px bg-border" />
      OR
      <div className="flex-1 h-px bg-border" />
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
    <input
      className="w-full px-3.5 py-3 bg-input border border-border rounded-xl text-white text-sm outline-none
        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all placeholder:text-gray-600"
      {...props}
    />
  )
}

function PrimaryButton({ children, loading }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm rounded-xl
        transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1">
      {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}