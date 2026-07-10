import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { StatCard, GradePill, ScoreBar, showToast } from '../../components/ui'
import FarmerModal from '../../components/FarmerModal'

const gradeFromScore = s =>
  s >= 80 ? 'Strong' : s >= 65 ? 'Good' : s >= 50 ? 'Moderate' : s >= 35 ? 'Developing' : 'Needs support'

function urgency(f) {
  if (f.prevLoan === 'yes-default' || f.loss === 'major' || f.advisory === 'never') return 'high'
  if (f.total >= 65 && f.loss !== 'moderate' && f.timing !== 'late') return 'low'
  return 'medium'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const URGENCY_ORDER = { high: 0, medium: 1, low: 2 }

export default function Pending() {
  const [farmers,  setFarmers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [selected, setSelected] = useState(null)
  const [search,   setSearch]   = useState('')
  const [urgencyF, setUrgencyF] = useState('')
  const [typeF,    setTypeF]    = useState('')
  const [sortF,    setSortF]    = useState('urgency')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await api.getFarmers()
      const all  = data.farmers || []
      setFarmers(all.filter(f => !f.decision || f.decision === 'none' || f.decision === 'review'))
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleDecision(farmerId, decision) {
    try {
      await api.makeDecision(farmerId, { decision })
      setFarmers(prev => prev.filter(f => f.id !== farmerId || decision === 'review'))
      setSelected(null)
      showToast(`Marked as ${decision}`)
    } catch (err) { alert('Failed: ' + err.message) }
  }

  const filtered = farmers
    .filter(f => {
      const q = search.toLowerCase()
      const matchQ  = !q       || f.name?.toLowerCase().includes(q) || f.county?.toLowerCase().includes(q)
      const matchU  = !urgencyF || urgency(f) === urgencyF
      const matchT  = !typeF   ||
        (typeF === 'undecided' && (!f.decision || f.decision === 'none')) ||
        (typeF === 'flagged'   && f.decision === 'review')
      return matchQ && matchU && matchT
    })
    .sort((a, b) => {
      if (sortF === 'urgency')    return URGENCY_ORDER[urgency(a)] - URGENCY_ORDER[urgency(b)]
      if (sortF === 'score-desc') return b.total - a.total
      if (sortF === 'score-asc')  return a.total - b.total
      return new Date(b.submitted) - new Date(a.submitted)
    })

  const avgScore = farmers.length
    ? Math.round(farmers.reduce((s, f) => s + (f.total || 0), 0) / farmers.length)
    : 0

  const UrgencyBadge = ({ f }) => {
    const u = urgency(f)
    const styles = {
      high:   'bg-danger-lt text-danger',
      medium: 'bg-gold-lt text-yellow-800',
      low:    'bg-moss-lt text-forest',
    }
    const icons = { high: '🔴', medium: '⚠️', low: '✅' }
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[u]}`}>
        {icons[u]} {u.charAt(0).toUpperCase() + u.slice(1)}
      </span>
    )
  }

  const borderColor = f => {
    const u = urgency(f)
    return u === 'high' ? 'border-l-4 border-l-danger' : u === 'medium' ? 'border-l-4 border-l-gold' : 'border-l-4 border-l-moss'
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-xl md:text-2xl font-extrabold text-forest mb-0.5">Pending Review</h1>
      <p className="text-sm text-gray-400 mb-6">Farmers awaiting a decision or flagged for review. Sorted by urgency.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="High urgency"      value={farmers.filter(f=>urgency(f)==='high').length}                    sub="risk flags present"   color="red" />
        <StatCard label="Flagged for review" value={farmers.filter(f=>f.decision==='review').length}                 sub="officer flagged"       color="gold" />
        <StatCard label="Undecided"          value={farmers.filter(f=>!f.decision||f.decision==='none').length}      sub="no decision yet" />
        <StatCard label="Avg score"          value={avgScore || '—'}                                                 sub="pending group"         color="green" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or county…"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-moss" />
        </div>
        <select value={urgencyF} onChange={e => setUrgencyF(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
          <option value="">All urgency levels</option>
          <option value="high">High urgency</option>
          <option value="medium">Medium urgency</option>
          <option value="low">Low urgency</option>
        </select>
        <select value={typeF} onChange={e => setTypeF(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
          <option value="">Undecided + Flagged</option>
          <option value="undecided">Undecided only</option>
          <option value="flagged">Flagged for review only</option>
        </select>
        <select value={sortF} onChange={e => setSortF(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
          <option value="urgency">Urgency first</option>
          <option value="score-desc">Score: High → Low</option>
          <option value="score-asc">Score: Low → High</option>
          <option value="date-desc">Newest first</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} farmers</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-moss-lt border-t-moss rounded-full animate-spin mx-auto mb-3" />
            Loading…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">{error}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-forest">
                {['Farmer','FarmScore','Grade','Urgency','Type','Crop','Risk Flags','Submitted',''].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-bold text-moss uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-gray-400">
                  {farmers.length === 0 ? '✅ All applications have been reviewed.' : 'No farmers match your filters.'}
                </td></tr>
              ) : filtered.map(f => {
                const risks = [f.prevLoan==='yes-default', f.loss==='major', f.advisory==='never'].filter(Boolean).length
                return (
                  <tr key={f.id} onClick={() => setSelected(f)}
                    className={`border-b border-gray-100 hover:bg-green-50/40 cursor-pointer transition-colors ${borderColor(f)}`}>
                    <td className="px-3 py-3">
                      <div className="font-bold text-forest text-sm">{f.name}</div>
                      <div className="text-xs text-gray-400">{f.county} · {f.crop}</div>
                    </td>
                    <td className="px-3 py-3"><ScoreBar score={f.total||0} /></td>
                    <td className="px-3 py-3"><GradePill grade={gradeFromScore(f.total)} /></td>
                    <td className="px-3 py-3"><UrgencyBadge f={f} /></td>
                    <td className="px-3 py-3">
                      {f.decision === 'review'
                        ? <span className="bg-gold-lt text-yellow-800 px-2.5 py-0.5 rounded-full text-xs font-bold">⚑ Flagged</span>
                        : <span className="bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full text-xs font-bold">⏳ Undecided</span>}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600">{f.crop}</td>
                    <td className="px-3 py-3 text-xs">
                      {risks > 0
                        ? <span className="text-danger font-bold">🔴 {risks} risk{risks>1?'s':''}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-400">{formatDate(f.submitted)}</td>
                    <td className="px-3 py-3">
                      <button onClick={e=>{e.stopPropagation();setSelected(f)}}
                        className="bg-forest text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-leaf transition-colors">
                        Review →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && <FarmerModal farmer={selected} onClose={() => setSelected(null)} onDecision={handleDecision} />}
    </div>
  )
}