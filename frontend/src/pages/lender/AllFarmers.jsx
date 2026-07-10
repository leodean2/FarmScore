import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { StatCard, GradePill, ScoreBar, StatusBadge, showToast } from '../../components/ui'
import FarmerModal from '../../components/FarmerModal'

const gradeFromScore = s =>
  s >= 80 ? 'Strong' : s >= 65 ? 'Good' : s >= 50 ? 'Moderate' : s >= 35 ? 'Developing' : 'Needs support'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AllFarmers() {
  const [farmers,  setFarmers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [selected, setSelected] = useState(null)
  const [search,   setSearch]   = useState('')
  const [gradeF,   setGradeF]   = useState('')
  const [statusF,  setStatusF]  = useState('')
  const [cropF,    setCropF]    = useState('')
  const [sortF,    setSortF]    = useState('score-desc')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await api.getFarmers()
      setFarmers(data.farmers || [])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleDecision(farmerId, decision) {
    try {
      await api.makeDecision(farmerId, { decision })
      setFarmers(prev => prev.map(f => f.id === farmerId ? { ...f, decision } : f))
      setSelected(prev => prev ? { ...prev, decision } : null)
      showToast(`Marked as ${decision}`)
    } catch (err) { alert('Failed: ' + err.message) }
  }

  function exportCSV() {
    if (!filtered.length) { alert('No data to export.'); return }
    const headers = ['Name','County','Crop','Size','Seasons','Score','Grade','Status','Submitted']
    const rows = filtered.map(f => [
      f.name, f.county, f.crop, f.size, f.seasons,
      f.total, gradeFromScore(f.total), f.decision || 'pending', formatDate(f.submitted)
    ])
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'farmscore_farmers.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = farmers
    .filter(f => {
      const q = search.toLowerCase()
      const matchQ      = !q       || f.name?.toLowerCase().includes(q) || f.county?.toLowerCase().includes(q)
      const matchGrade  = !gradeF  || gradeFromScore(f.total) === gradeF
      const matchStatus = !statusF || (statusF === 'pending' ? (!f.decision || f.decision === 'none') : f.decision === statusF)
      const matchCrop   = !cropF   || f.crop === cropF
      return matchQ && matchGrade && matchStatus && matchCrop
    })
    .sort((a, b) => {
      if (sortF === 'score-desc') return b.total - a.total
      if (sortF === 'score-asc')  return a.total - b.total
      if (sortF === 'name-asc')   return a.name?.localeCompare(b.name)
      return new Date(b.submitted) - new Date(a.submitted)
    })

  const purposeLabel = { inputs:'Buy inputs', equipment:'Equipment', irrigation:'Irrigation', storage:'Storage', other:'Other' }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-xl md:text-2xl font-extrabold text-forest mb-0.5">All Farmers</h1>
      <p className="text-sm text-gray-400 mb-6">Complete list of all farmer assessments in the system.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="Total"          value={farmers.length}                                         sub="all farmers" />
        <StatCard label="Approved"       value={farmers.filter(f=>f.decision==='approved').length}      sub="decisions made"       color="green" />
        <StatCard label="Pending/Review" value={farmers.filter(f=>!f.decision||f.decision==='review').length} sub="awaiting decision" color="gold" />
        <StatCard label="Declined"       value={farmers.filter(f=>f.decision==='declined').length}      sub="not approved"         color="red" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or county…"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-moss" />
        </div>
        <select value={gradeF}  onChange={e => setGradeF(e.target.value)}  className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-moss cursor-pointer">
          <option value="">All grades</option>
          {['Strong','Good','Moderate','Developing','Needs support'].map(g => <option key={g}>{g}</option>)}
        </select>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-moss cursor-pointer">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="review">Flagged for review</option>
          <option value="declined">Declined</option>
        </select>
        <select value={cropF}   onChange={e => setCropF(e.target.value)}   className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-moss cursor-pointer">
          <option value="">All crops</option>
          {['Maize','Tomatoes','Beans','Potatoes','Kale'].map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={sortF}   onChange={e => setSortF(e.target.value)}   className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-moss cursor-pointer">
          <option value="score-desc">Score: High → Low</option>
          <option value="score-asc">Score: Low → High</option>
          <option value="name-asc">Name: A → Z</option>
          <option value="date-desc">Newest first</option>
        </select>
        <button onClick={exportCSV} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">
          📥 Export CSV
        </button>
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
                {['Farmer','FarmScore','Grade','Crop','Purpose','Status','Flags','Submitted',''].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-bold text-moss uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-gray-400">No farmers match your filters.</td></tr>
              ) : filtered.map(f => (
                <tr key={f.id} onClick={() => setSelected(f)}
                  className="border-b border-gray-100 hover:bg-green-50/40 cursor-pointer transition-colors">
                  <td className="px-3 py-3">
                    <div className="font-bold text-forest text-sm">{f.name}</div>
                    <div className="text-xs text-gray-400">{f.county} · {f.size} ac</div>
                  </td>
                  <td className="px-3 py-3"><ScoreBar score={f.total||0} /></td>
                  <td className="px-3 py-3"><GradePill grade={gradeFromScore(f.total)} /></td>
                  <td className="px-3 py-3 text-sm text-gray-600">{f.crop}</td>
                  <td className="px-3 py-3 text-xs text-gray-400">{purposeLabel[f.purpose]||f.purpose||'—'}</td>
                  <td className="px-3 py-3"><StatusBadge status={f.decision||'pending'} /></td>
                  <td className="px-3 py-3 text-xs text-gray-400">
                    {f.prevLoan==='yes-default'||f.loss==='major'||f.advisory==='never'
                      ? <span className="text-danger font-bold">🔴 Risk</span> : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400">{formatDate(f.submitted)}</td>
                  <td className="px-3 py-3">
                    <button onClick={e=>{e.stopPropagation();setSelected(f)}}
                      className="bg-forest text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-leaf transition-colors">
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && <FarmerModal farmer={selected} onClose={() => setSelected(null)} onDecision={handleDecision} />}
    </div>
  )
}