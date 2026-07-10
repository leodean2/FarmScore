import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { StatCard, GradePill, ScoreBar, StatusBadge, showToast } from '../../components/ui'
import FarmerModal from '../../components/FarmerModal'

export default function Dashboard() {
  const [farmers,  setFarmers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [selected, setSelected] = useState(null)
  const [search,   setSearch]   = useState('')
  const [gradeF,   setGradeF]   = useState('')
  const [sortF,    setSortF]    = useState('score-desc')
  const navigate = useNavigate()

  useEffect(() => { loadFarmers() }, [])

  async function loadFarmers() {
    try {
      const data = await api.getFarmers()
      setFarmers(data.farmers || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDecision(farmerId, decision) {
    try {
      await api.makeDecision(farmerId, { decision })
      setFarmers(prev => prev.map(f => f.id === farmerId ? { ...f, decision } : f))
      setSelected(prev => prev ? { ...prev, decision } : null)
      showToast(`Marked as ${decision}`)
    } catch (err) {
      alert('Failed: ' + err.message)
    }
  }

  const gradeFromScore = s =>
    s >= 80 ? 'Strong' : s >= 65 ? 'Good' : s >= 50 ? 'Moderate' : s >= 35 ? 'Developing' : 'Needs support'

  const filtered = farmers
    .filter(f => {
      const q = search.toLowerCase()
      return (!q || f.name?.toLowerCase().includes(q) || f.county?.toLowerCase().includes(q))
        && (!gradeF || gradeFromScore(f.total) === gradeF)
    })
    .sort((a, b) => {
      if (sortF === 'score-desc') return b.total - a.total
      if (sortF === 'score-asc')  return a.total - b.total
      if (sortF === 'name-asc')   return a.name?.localeCompare(b.name)
      return new Date(b.submitted) - new Date(a.submitted)
    })

  const stats = {
    total:  farmers.length,
    strong: farmers.filter(f => f.total >= 65).length,
    review: farmers.filter(f => f.total >= 35 && f.total < 65).length,
    risk:   farmers.filter(f => f.total < 35).length,
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-xl md:text-2xl font-extrabold text-forest mb-0.5">Loan Officer Dashboard</h1>
      <p className="text-sm text-gray-400 mb-6">Review farmer FarmScores and make credit decisions.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="Total farmers" value={stats.total}  sub="in the system" />
        <StatCard label="Strong / Good"  value={stats.strong} sub="score ≥ 65"    color="green" />
        <StatCard label="Needs review"   value={stats.review} sub="score 35–64"   color="gold" />
        <StatCard label="Risk flags"     value={stats.risk}   sub="score < 35"    color="red" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search farmer name or county…"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-moss" />
        </div>
        {[
          { value: gradeF, onChange: setGradeF, opts: ['','Strong','Good','Moderate','Developing','Needs support'], labels: ['All grades'] },
          { value: sortF,  onChange: setSortF,  opts: ['score-desc','score-asc','name-asc','date-desc'], labels: ['Score: High → Low','Score: Low → High','Name: A → Z','Newest first'] },
        ].map((sel, i) => (
          <select key={i} value={sel.value} onChange={e => sel.onChange(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-moss cursor-pointer">
            {sel.opts.map((o, j) => <option key={o} value={o}>{sel.labels[j] || o}</option>)}
          </select>
        ))}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} farmers</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-moss-lt border-t-moss rounded-full animate-spin mx-auto mb-3" />
            Loading farmers…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">{error}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-forest">
                {['Farmer','FarmScore','Grade','Crop','Status','Submitted',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-moss uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-gray-400">No farmers match your filters.</td></tr>
              ) : filtered.map(f => (
                <tr key={f.id} onClick={() => setSelected(f)}
                  className="border-b border-gray-100 hover:bg-green-50/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-forest text-sm">{f.name}</div>
                    <div className="text-xs text-gray-400">{f.county} · {f.size} ac · {f.seasons} seasons</div>
                  </td>
                  <td className="px-4 py-3"><ScoreBar score={f.total || 0} /></td>
                  <td className="px-4 py-3"><GradePill grade={gradeFromScore(f.total)} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{f.crop}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.decision || 'pending'} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(f.submitted).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}</td>
                  <td className="px-4 py-3">
                    <button onClick={e => { e.stopPropagation(); setSelected(f) }}
                      className="bg-forest text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-leaf transition-colors whitespace-nowrap">
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <FarmerModal
          farmer={selected}
          onClose={() => setSelected(null)}
          onDecision={handleDecision}
        />
      )}
    </div>
  )
}