import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api/client'

const gradeFromScore = s =>
  s >= 80 ? { grade: 'Strong',       color: '#52B788', letter: 'A', bg: 'bg-moss-lt',    text: 'text-forest' }
: s >= 65 ? { grade: 'Good',          color: '#74C69D', letter: 'B', bg: 'bg-green-100',  text: 'text-green-800' }
: s >= 50 ? { grade: 'Moderate',      color: '#D4A017', letter: 'C', bg: 'bg-gold-lt',    text: 'text-yellow-800' }
: s >= 35 ? { grade: 'Developing',    color: '#F59E0B', letter: 'D', bg: 'bg-yellow-100', text: 'text-yellow-800' }
:           { grade: 'Needs support', color: '#B91C1C', letter: 'E', bg: 'bg-danger-lt',  text: 'text-danger' }

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name) {
  return (name || 'XX').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function FarmerDashboard() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [records,  setRecords]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [tab,      setTab]      = useState('overview') // overview | history | new

  useEffect(() => { loadRecords() }, [])

  async function loadRecords() {
    try {
      const data = await api.getFarmers()
      setRecords(data.farmers || [])
      if (data.farmers?.length > 0) setSelected(data.farmers[0])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const latest = records[0]
  const g      = latest ? gradeFromScore(latest.total || 0) : null

  return (
    <div className="min-h-screen bg-[#080D1A]">

      {/* ── Nav ── */}
      <nav className="border-b border-[#1E2D45] px-6 py-0 flex items-center justify-between h-14 sticky top-0 z-50 bg-[#080D1A]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm">🌱</div>
          <div>
            <span className="font-bold text-white text-sm">FarmScore</span>
            <span className="text-[10px] text-gray-500 font-semibold tracking-widest uppercase ml-2">Credit Intelligence</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-moss flex items-center justify-center text-forest font-bold text-xs">
              {initials(user?.name)}
            </div>
            <span className="text-sm text-gray-300 font-medium hidden sm:block">{user?.name}</span>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            className="text-xs text-gray-500 border border-[#1E2D45] px-3 py-1.5 rounded-lg hover:bg-[#1E2D45] hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Tab nav ── */}
        <div className="flex gap-1 bg-[#0E1525] border border-[#1E2D45] rounded-xl p-1 mb-8 w-fit">
          {[
            { key: 'overview', label: '📊 Overview' },
            { key: 'history',  label: '📋 My History' },
            { key: 'new',      label: '➕ New Assessment' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key ? 'bg-[#1E2D45] text-white' : 'text-gray-400 hover:text-gray-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ── */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#1E2D45] border-t-moss rounded-full animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <EmptyState onNew={() => setTab('new')} />
            ) : (
              <>
                {/* Profile card */}
                <div className="bg-[#0E1525] border border-[#1E2D45] rounded-2xl p-6">
                  <div className="text-[10px] font-bold text-moss tracking-[2px] mb-3">
                    FARMSCORE PROFILE · #{initials(user?.name)}-{String(latest?.id||'001').replace(/\D/g,'').slice(-3).padStart(3,'0')}
                  </div>
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-xl bg-[#1B4332] flex items-center justify-center font-extrabold text-white text-lg flex-shrink-0">
                      {initials(user?.name)}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl font-extrabold text-white leading-tight">{user?.name}</div>
                      <div className="text-gray-400 text-sm mt-1">
                        {latest?.county || '—'} · {latest?.size || '—'} ha · {latest?.crop || '—'}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {latest?.coop === 'yes-active' && (
                          <span className="bg-[#1B4332] text-[#A7C4B5] px-2.5 py-0.5 rounded-full text-xs font-semibold">
                            {latest.county} Farmers SACCO
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${g?.bg} ${g?.text}`}>
                          {g?.grade}
                        </span>
                      </div>
                    </div>
                    {/* Score dial */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="48" cy="48" r="38" fill="none" stroke="#1B4332" strokeWidth="8"/>
                        <circle cx="48" cy="48" r="38" fill="none" stroke={g?.color || '#52B788'} strokeWidth="8"
                          strokeDasharray="239" strokeDashoffset={239 - (239 * (latest?.total || 0) / 100)}
                          strokeLinecap="round"/>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-extrabold text-white leading-none">{latest?.total || 0}</span>
                        <span className="text-[9px] font-bold" style={{ color: g?.color }}>RATING {g?.letter}</span>
                      </div>
                    </div>
                  </div>

                  {/* Key metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-[#1E2D45]">
                    {[
                      { label: 'Assessments',          value: records.length },
                      { label: 'Latest score',         value: `${latest?.total || 0}/100` },
                      { label: 'Advisory engagement',  value: latest?.advisory === 'regular' ? 'Regular' : latest?.advisory || '—' },
                      { label: 'Loan status',          value: latest?.decision || 'Pending', highlight: latest?.decision === 'approved' },
                    ].map(m => (
                      <div key={m.label} className="bg-[#080D1A] rounded-xl p-3">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">{m.label}</div>
                        <div className={`text-lg font-extrabold mt-1 capitalize ${m.highlight ? 'text-moss' : 'text-white'}`}>
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Latest score breakdown */}
                {latest && <ScoreBreakdown record={latest} />}

                {/* Latest flags */}
                {latest?.flags?.length > 0 && <FlagsCard flags={latest.flags} />}

                {/* CTA */}
                <button onClick={() => setTab('new')}
                  className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors">
                  Submit new assessment →
                </button>
              </>
            )}
          </div>
        )}

        {/* ── History tab ── */}
        {tab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white mb-2">Assessment History</h2>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#1E2D45] border-t-moss rounded-full animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <EmptyState onNew={() => setTab('new')} />
            ) : (
              records.map((r, i) => {
                const gr = gradeFromScore(r.total || 0)
                const isSelected = selected?.id === r.id
                return (
                  <div key={r.id} onClick={() => setSelected(isSelected ? null : r)}
                    className={`bg-[#0E1525] border rounded-2xl p-5 cursor-pointer transition-all ${
                      isSelected ? 'border-moss' : 'border-[#1E2D45] hover:border-[#2D6A4F]'
                    }`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${gr.bg} ${gr.text}`}>
                          {gr.letter}
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm">
                            Assessment #{records.length - i}
                            {i === 0 && <span className="ml-2 text-[10px] bg-moss text-forest px-2 py-0.5 rounded-full font-bold">Latest</span>}
                          </div>
                          <div className="text-gray-400 text-xs mt-0.5">
                            {r.crop} · {r.county} · {formatDate(r.submitted)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div>
                          <div className="text-2xl font-extrabold text-right" style={{ color: gr.color }}>{r.total || 0}</div>
                          <div className="text-[10px] text-gray-500 text-right font-bold uppercase">{gr.grade}</div>
                        </div>
                        <span className="text-gray-500 text-lg">{isSelected ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-[#1E2D45]">
                        <ScoreBreakdown record={r} dark />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                          {[
                            ['Loan decision', r.decision || 'Pending'],
                            ['Farm size',     `${r.size || '—'} acres`],
                            ['Seasons',       r.seasons || '—'],
                            ['Crop',          r.crop || '—'],
                            ['Advisory',      r.advisory || '—'],
                            ['Cooperative',   r.coop === 'yes-active' ? 'Active' : r.coop === 'yes-inactive' ? 'Inactive' : 'None'],
                          ].map(([label, value]) => (
                            <div key={label} className="bg-[#080D1A] rounded-xl p-3">
                              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">{label}</div>
                              <div className="text-sm font-semibold text-white mt-0.5 capitalize">{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── New Assessment tab ── */}
        {tab === 'new' && (
          <NewAssessment onSuccess={() => { loadRecords(); setTab('overview') }} />
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EmptyState({ onNew }) {
  return (
    <div className="bg-[#0E1525] border border-[#1E2D45] rounded-2xl p-12 text-center">
      <div className="text-5xl mb-4">🌱</div>
      <div className="text-white font-bold text-lg mb-2">No assessments yet</div>
      <div className="text-gray-400 text-sm mb-6">Submit your first farm assessment to generate your FarmScore.</div>
      <button onClick={onNew} className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
        Start your first assessment →
      </button>
    </div>
  )
}

function ScoreBreakdown({ record, dark = false }) {
  const cardBg  = dark ? 'bg-[#080D1A]' : 'bg-[#0E1525]'
  const labelCl = 'text-gray-400'

  const dims = [
    { label: 'Agronomic practice',    score: record.agrScore  || 0, max: 25 },
    { label: 'Production & yield',    score: record.prodScore || 0, max: 25 },
    { label: 'Advisory engagement',   score: record.advScore  || 0, max: 25 },
    { label: 'Financial reliability', score: record.finScore  || 0, max: 25 },
  ]

  return (
    <div className={`${cardBg} border border-[#1E2D45] rounded-xl p-5`}>
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Score breakdown</div>
      <div className="space-y-3">
        {dims.map(d => {
          const pct = Math.round((d.score / d.max) * 100)
          const color = pct >= 70 ? '#52B788' : pct >= 40 ? '#D4A017' : '#B91C1C'
          return (
            <div key={d.label} className="flex items-center gap-3">
              <span className={`text-xs font-semibold ${labelCl} w-44 flex-shrink-0`}>{d.label}</span>
              <div className="flex-1 h-2 bg-[#1E2D45] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="text-xs font-bold text-gray-300 w-8 text-right">{d.score}/{d.max}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FlagsCard({ flags }) {
  const iconMap = { positive: '✅', warning: '⚠️', risk: '🔴' }
  const styleMap = {
    positive: 'bg-[#1B4332]/40 text-[#A7C4B5]',
    warning:  'bg-yellow-900/20 text-yellow-300',
    risk:     'bg-red-900/20 text-red-300',
  }
  return (
    <div className="bg-[#0E1525] border border-[#1E2D45] rounded-xl p-5">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Key findings</div>
      <div className="space-y-2.5">
        {flags.map((f, i) => (
          <div key={i} className={`flex gap-3 p-3 rounded-xl text-sm ${styleMap[f.type]}`}>
            <span className="flex-shrink-0">{iconMap[f.type]}</span>
            <div><b className="block font-bold mb-0.5">{f.title}</b>{f.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Inline new assessment form ─────────────────────────────────────────────────
function NewAssessment({ onSuccess }) {
  const { user } = useAuth()
  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState({
    name: user?.name || '', county: '', crop: '', size: 2, seasons: 1,
    timing: '', inputs: [], fertRate: '', yield: '', loss: '',
    advisory: '', follow: '', coop: '', prevLoan: '', purpose: '', notes: '',
  })

  function set(key, val) { setForm(p => ({ ...p, [key]: val })) }
  function toggleInput(val) {
    setForm(p => ({ ...p, inputs: p.inputs.includes(val) ? p.inputs.filter(i => i !== val) : [...p.inputs, val] }))
  }

  async function submit() {
    setError('')
    setLoading(true)
    try {
      await api.createFarmer(form)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const COUNTIES = ['Nakuru','Nyandarua','Meru','Kirinyaga','Embu',"Murang'a",'Nyeri','Kiambu','Machakos','Makueni','Bungoma','Trans Nzoia','Uasin Gishu','Nandi','Kisii','Other']
  const CROPS    = ['Maize','Beans','Tomatoes','Potatoes','Cabbage','Kale','Coffee','Tea','Sorghum','Wheat','Other']
  const INPUTS   = [{val:'certified-seed',label:'Certified seed'},{val:'fertiliser',label:'Fertiliser'},{val:'pesticide',label:'Pesticides'},{val:'herbicide',label:'Herbicides'},{val:'irrigation',label:'Irrigation'},{val:'compost',label:'Compost'}]

  const inputCls = "w-full px-3 py-2.5 bg-[#080D1A] border border-[#1E2D45] rounded-xl text-white text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/10 transition-all placeholder:text-gray-600"
  const selectCls = "w-full px-3 py-2.5 bg-[#080D1A] border border-[#1E2D45] rounded-xl text-white text-sm outline-none focus:border-moss cursor-pointer"

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1,2,3].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              s < step ? 'bg-moss text-forest' : s === step ? 'bg-blue-500 text-white' : 'bg-[#1E2D45] text-gray-400'
            }`}>{s < step ? '✓' : s}</div>
            {i < 2 && <div className={`h-0.5 w-8 ${s < step ? 'bg-moss' : 'bg-[#1E2D45]'}`} />}
          </div>
        ))}
      </div>

      {error && <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div className="bg-[#0E1525] border border-[#1E2D45] rounded-2xl p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-base mb-4">🗺️ About your farm</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="text-sm text-gray-300 font-medium block mb-1.5">Farmer name</label><input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} /></div>
              <div><label className="text-sm text-gray-300 font-medium block mb-1.5">County *</label><select value={form.county} onChange={e => set('county', e.target.value)} className={selectCls}><option value="">Select…</option>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label className="text-sm text-gray-300 font-medium block mb-1.5">Primary crop *</label><select value={form.crop} onChange={e => set('crop', e.target.value)} className={selectCls}><option value="">Select…</option>{CROPS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div className="col-span-2"><label className="text-sm text-gray-300 font-medium block mb-1.5">Farm size: {form.size} acres</label><input type="range" min="0.5" max="20" step="0.5" value={form.size} onChange={e=>set('size',parseFloat(e.target.value))} className="w-full accent-moss" /></div>
              <div className="col-span-2"><label className="text-sm text-gray-300 font-medium block mb-1.5">Seasons farmed: {form.seasons}</label><input type="range" min="1" max="20" step="1" value={form.seasons} onChange={e=>set('seasons',parseInt(e.target.value))} className="w-full accent-moss" /></div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-base mb-4">🌦️ Season & inputs</h3>
            <div><label className="text-sm text-gray-300 font-medium block mb-2">Planting timing *</label><div className="flex flex-wrap gap-2">{[{val:'early',label:'Early'},{val:'on-time',label:'On time ✓'},{val:'late',label:'Late'},{val:'missed',label:'Missed'}].map(o=><button key={o.val} type="button" onClick={()=>set('timing',o.val)} className={`px-3 py-2 rounded-full text-sm font-medium border transition-all ${form.timing===o.val?'border-moss bg-moss/10 text-moss':'border-[#1E2D45] text-gray-400 hover:border-gray-500'}`}>{o.label}</button>)}</div></div>
            <div><label className="text-sm text-gray-300 font-medium block mb-2">Inputs used</label><div className="flex flex-wrap gap-2">{INPUTS.map(i=><button key={i.val} type="button" onClick={()=>toggleInput(i.val)} className={`px-3 py-2 rounded-full text-sm font-medium border transition-all ${form.inputs.includes(i.val)?'border-moss bg-moss/10 text-moss':'border-[#1E2D45] text-gray-400 hover:border-gray-500'}`}>{i.label}</button>)}</div></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-300 font-medium block mb-1.5">Yield *</label><select value={form.yield} onChange={e=>set('yield',e.target.value)} className={selectCls}><option value="">Select…</option><option value="poor">Poor</option><option value="fair">Fair</option><option value="good">Good</option><option value="excellent">Excellent</option></select></div>
              <div><label className="text-sm text-gray-300 font-medium block mb-1.5">Crop loss</label><select value={form.loss} onChange={e=>set('loss',e.target.value)} className={selectCls}><option value="">Select…</option><option value="none">None</option><option value="minor">Minor</option><option value="moderate">Moderate</option><option value="major">Major</option></select></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-base mb-4">📋 Advisory & financial history</h3>
            <div><label className="text-sm text-gray-300 font-medium block mb-2">Advisory access *</label><div className="flex flex-wrap gap-2">{[{val:'regular',label:'Regular'},{val:'sometimes',label:'Sometimes'},{val:'rarely',label:'Rarely'},{val:'never',label:'Never'}].map(o=><button key={o.val} type="button" onClick={()=>set('advisory',o.val)} className={`px-3 py-2 rounded-full text-sm font-medium border transition-all ${form.advisory===o.val?'border-moss bg-moss/10 text-moss':'border-[#1E2D45] text-gray-400 hover:border-gray-500'}`}>{o.label}</button>)}</div></div>
            <div><label className="text-sm text-gray-300 font-medium block mb-2">Follow advice *</label><div className="flex flex-wrap gap-2">{[{val:'always',label:'Always'},{val:'mostly',label:'Mostly'},{val:'sometimes',label:'Sometimes'},{val:'rarely',label:'Rarely'}].map(o=><button key={o.val} type="button" onClick={()=>set('follow',o.val)} className={`px-3 py-2 rounded-full text-sm font-medium border transition-all ${form.follow===o.val?'border-moss bg-moss/10 text-moss':'border-[#1E2D45] text-gray-400 hover:border-gray-500'}`}>{o.label}</button>)}</div></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-300 font-medium block mb-1.5">Cooperative</label><select value={form.coop} onChange={e=>set('coop',e.target.value)} className={selectCls}><option value="">Select…</option><option value="yes-active">Active member</option><option value="yes-inactive">Inactive</option><option value="no">Not a member</option></select></div>
              <div><label className="text-sm text-gray-300 font-medium block mb-1.5">Previous loan</label><select value={form.prevLoan} onChange={e=>set('prevLoan',e.target.value)} className={selectCls}><option value="">Select…</option><option value="yes-repaid">Fully repaid</option><option value="yes-active">Active</option><option value="yes-default">Had difficulties</option><option value="no">None</option></select></div>
            </div>
            <div><label className="text-sm text-gray-300 font-medium block mb-1.5">Notes (optional)</label><textarea value={form.notes} onChange={e=>set('notes',e.target.value)} className={`${inputCls} resize-none min-h-[70px]`} placeholder="Any additional context for the lender…" /></div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-6">
          {step > 1
            ? <button onClick={()=>setStep(s=>s-1)} className="border border-[#1E2D45] text-gray-300 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#1E2D45] transition-colors">← Back</button>
            : <div />
          }
          {step < 3
            ? <button onClick={()=>setStep(s=>s+1)} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors">Continue →</button>
            : <button onClick={submit} disabled={loading} className="bg-moss hover:bg-leaf text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-60 flex items-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                🌱 Generate FarmScore
              </button>
          }
        </div>
      </div>
    </div>
  )
}