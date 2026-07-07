// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', className = '', loading, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all text-sm px-4 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed'
  const variants = {
    primary:   'bg-forest text-white hover:bg-leaf active:scale-[0.98]',
    blue:      'bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.98]',
    secondary: 'bg-transparent text-forest border-2 border-forest hover:bg-moss-lt',
    ghost:     'bg-transparent text-gray-400 hover:text-white hover:bg-border',
    danger:    'bg-danger-lt text-danger border border-red-300 hover:bg-red-200',
    approve:   'bg-moss text-white hover:bg-leaf flex-1',
    review:    'bg-gold-lt text-yellow-800 border border-yellow-400 hover:bg-yellow-100 flex-1',
    decline:   'bg-danger-lt text-danger border border-red-300 hover:bg-red-200 flex-1',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading} {...props}>
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, hint, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-gray-200">{label}</label>}
      <input
        className={`px-3 py-2.5 bg-white border-[1.5px] border-gray-200 rounded-lg text-sm text-gray-800 outline-none transition-all
          focus:border-moss focus:ring-2 focus:ring-moss/15 placeholder:text-gray-400 ${className}`}
        {...props}
      />
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, className = '', children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-gray-200">{label}</label>}
      <select
        className={`px-3 py-2.5 bg-white border-[1.5px] border-gray-200 rounded-lg text-sm text-gray-800 outline-none
          focus:border-moss focus:ring-2 focus:ring-moss/15 cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
      {children}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'forest' }) {
  const colors = {
    forest: 'text-forest',
    green:  'text-moss',
    gold:   'text-gold',
    red:    'text-danger',
    blue:   'text-blue-500',
  }
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-1">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-3xl font-extrabold leading-none ${colors[color]}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}

// ── GradePill ─────────────────────────────────────────────────────────────────
export function GradePill({ grade }) {
  const styles = {
    'Strong':       'bg-moss-lt text-forest',
    'Good':         'bg-green-100 text-green-800',
    'Moderate':     'bg-gold-lt text-yellow-800',
    'Developing':   'bg-yellow-100 text-yellow-800',
    'Needs support':'bg-danger-lt text-danger',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[grade] || 'bg-gray-100 text-gray-600'}`}>
      {grade}
    </span>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    approved: { label: '✓ Approved',   cls: 'bg-moss-lt text-forest' },
    review:   { label: '⚑ Review',     cls: 'bg-gold-lt text-yellow-800' },
    declined: { label: '✕ Declined',   cls: 'bg-danger-lt text-danger' },
    pending:  { label: '⏳ Pending',   cls: 'bg-gray-100 text-gray-500' },
  }
  const s = map[status] || map.pending
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ── ScoreBar ──────────────────────────────────────────────────────────────────
export function ScoreBar({ score }) {
  const color = score >= 65 ? 'bg-moss' : score >= 35 ? 'bg-gold' : 'bg-danger'
  const text  = score >= 65 ? 'text-moss' : score >= 35 ? 'text-gold' : 'text-danger'
  return (
    <div className="flex items-center gap-2">
      <span className={`text-base font-extrabold ${text}`}>{score}</span>
      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export function showToast(msg, type = 'success') {
  const t = document.createElement('div')
  const bg = type === 'success' ? 'bg-forest' : 'bg-danger'
  t.className = `fixed bottom-6 left-1/2 -translate-x-1/2 ${bg} text-white px-5 py-3 rounded-xl text-sm font-semibold z-[999] shadow-xl`
  t.textContent = msg
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 3000)
}