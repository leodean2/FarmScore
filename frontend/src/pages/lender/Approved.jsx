import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { StatCard, GradePill, ScoreBar } from '../../components/ui'
import FarmerModal from '../../components/FarmerModal'

const gradeFromScore = s =>
  s >= 80 ? 'Strong' : s >= 65 ? 'Good' : s >= 50 ? 'Moderate' : s >= 35 ? 'Developing' : 'Needs support'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Approved() {
  const [farmers,  setFarmers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [selected, setSelected] = useState(null)
  const [search,   setSearch]   = useState('')
  const [gradeF,   setGradeF]   = useState('')
  const [cropF,    setCropF]    = useState('')
  const [sortF,    setSortF]    = useState('date-desc')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await api.getFarmers()
      setFarmers((data.farmers || []).filter(f => f.decision === 'approved'))
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  function exportCSV() {
    if (!filtered.length) { alert('No data to export.'); return }
    const headers = ['Name','County','Crop','Size','Seasons','Score','Grade','Loan Purpose','Approved On']
    const rows = filtered.map(f => [
      f.name, f.county, f.crop, f.size, f.seasons,
      f.total, gradeFromScore(f.total), f.purpose || '—', formatDate(f.decidedAt || f.submitted)
    ])
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'farmscore_approved.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = farmers
    .filter(f => {
      const q = search.toLowerCase()
      return (!q     || f.name?.toLowerCase().includes(q) || f.county?.toLowerCase().includes(q))
        && (!gradeF  || gradeFromScore(f.total) === gradeF)
        && (!cropF   || f.crop === cropF)
    })
    .sort((a, b) => {
      if (sortF === 'date-desc')  return new Date(b.decidedAt||b.submitted) - new Date(a.decidedAt||a.submitted)
      if (sortF === 'score-desc') return b.total - a.total
      if (sortF === 'score-asc')  return a.total - b.total
      return a.name?.localeCompare(b.name)
    })

  const avg    = farmers.length ? Math.round(farmers.reduce((s, f) => s + (f.total||0), 0) / farmers.length) : 0
  const strong = farmers.filter(f => f.total >= 65).length
  const moderate = farmers.filter(f => f.total < 65).length
  const purposeLabel = { inputs:'Buy inputs', equipment:'Equipment', irrigation:'Irrigation', storage:'Storage', other:'Other' }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-extrabold text-forest mb-0.5">Approved Applications</h1>
      <p className="text-sm text-gray-400 mb-6">Farmers whose applications have been approved by a loan officer.</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total approved"   value={farmers.length} sub="applications"      color="green" />
        <StatCard label="Avg FarmScore"    value={avg || '—'}     sub="approved group" />
        <StatCard label="Strong / Good"    value={strong}         sub="score ≥ 65"        color="gold" />
        <StatCard label="Moderate / Below" value={moderate}       sub="score < 65"        color="blue" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or county…"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-moss" />
        </div>
        <select value={gradeF} onChange={e => setGradeF(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
          <option value="">All grades</option>
          {['Strong','Good','Moderate','Developing','Needs support'].map(g => <option key={g}>{g}</option>)}
        </select>
        <select value={cropF} onChange={e => setCropF(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
          <option value="">All crops</option>
          {['Maize','Tomatoes','Beans','Potatoes','Kale'].map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={sortF} onChange={e => setSortF(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
          <option value="date-desc">Decision: Newest first</option>
          <option value="score-desc">Score: High → Low</option>
          <option value="score-asc">Score: Low → High</option>
          <option value="name-asc">Name: A → Z</option>
        </select>
        <button onClick={exportCSV} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">
          📥 Export CSV
        </button>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} farmers</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
                {['Farmer','FarmScore','Grade','Crop','Loan Purpose','Approved On',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-moss uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-gray-400">
                  {farmers.length === 0 ? '📋 No approved applications yet.' : 'No farmers match your filters.'}
                </td></tr>
              ) : filtered.map(f => (
                <tr key={f.id} onClick={() => setSelected(f)}
                  className="border-b border-gray-100 hover:bg-green-50/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-forest text-sm">{f.name}</div>
                    <div className="text-xs text-gray-400">{f.county} · {f.size} ac · {f.seasons} seasons</div>
                  </td>
                  <td className="px-4 py-3"><ScoreBar score={f.total||0} /></td>
                  <td className="px-4 py-3"><GradePill grade={gradeFromScore(f.total)} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{f.crop}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{purposeLabel[f.purpose]||f.purpose||'—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(f.decidedAt||f.submitted)}</td>
                  <td className="px-4 py-3">
                    <button onClick={e=>{e.stopPropagation();setSelected(f)}}
                      className="bg-forest text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-leaf transition-colors">
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Read-only modal — no decision buttons */}
      {selected && <FarmerModal farmer={selected} onClose={() => setSelected(null)} onDecision={() => {}} readOnly />}
    </div>
  )
}