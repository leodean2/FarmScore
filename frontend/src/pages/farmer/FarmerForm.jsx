import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api/client'

const gradeFromScore = s =>
  s >= 80 ? { grade:'Strong',       color:'#52B788', tagline:'Consistent practice and strong engagement. Strong candidate for input financing.' }
: s >= 65 ? { grade:'Good',          color:'#74C69D', tagline:'Solid farm management with minor gaps. Suitable for standard loan review.' }
: s >= 50 ? { grade:'Moderate',      color:'#D4A017', tagline:'Reasonable practice with some gaps. Field verification recommended.' }
: s >= 35 ? { grade:'Developing',    color:'#F59E0B', tagline:'Building track record. Smaller initial loan appropriate.' }
:           { grade:'Needs support', color:'#B91C1C', tagline:'Advisory support recommended before advancing application.' }

export default function FarmerForm() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState({
    name: user?.name || '', county: '', crop: '', crop2: '', size: 2, seasons: 3,
    timing: '', inputs: [], fertRate: '', yield: '', loss: '',
    advisory: '', follow: '', coop: '', prevLoan: '', purpose: '', notes: '',
  })

  function set(key, value) { setForm(p => ({ ...p, [key]: value })) }

  function toggleInput(val) {
    setForm(p => ({
      ...p,
      inputs: p.inputs.includes(val) ? p.inputs.filter(i => i !== val) : [...p.inputs, val]
    }))
  }

  async function handleSubmit() {
    setError('')
    if (!form.name || !form.county || !form.crop) { setError('Please fill in all required fields.'); return }
    setLoading(true)
    try {
      const data = await api.createFarmer(form)
      setResult(data.score)
      setStep(4)
    } catch (err) {
      setError(err.message || 'Scoring failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const COUNTIES = ['Nakuru','Nyandarua','Meru','Kirinyaga','Embu',"Murang'a",'Nyeri','Kiambu','Machakos','Makueni','Bungoma','Trans Nzoia','Uasin Gishu','Nandi','Kisii','Other']
  const CROPS    = ['Maize','Beans','Tomatoes','Potatoes','Cabbage','Kale (sukuma wiki)','Coffee','Tea','Sorghum','Wheat','Sunflower','Other']
  const INPUTS   = [
    { val:'certified-seed', label:'Certified seed' },
    { val:'fertiliser',     label:'Fertiliser' },
    { val:'pesticide',      label:'Pesticides' },
    { val:'herbicide',      label:'Herbicides' },
    { val:'irrigation',     label:'Irrigation' },
    { val:'compost',        label:'Compost / manure' },
  ]

  const g = result ? gradeFromScore(result.total) : null

  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <nav className="bg-forest px-6 py-0 flex items-center justify-between h-14 sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-white text-lg">
          🌱 Farm<span className="text-moss">Score</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#A7C4B5] font-semibold">{user?.name}</span>
          <span className="text-xs bg-moss text-forest px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Farmer View</span>
          <button onClick={() => { logout(); navigate('/login') }}
            className="text-xs text-[#A7C4B5] border border-leaf px-3 py-1.5 rounded-lg hover:bg-leaf hover:text-white transition-colors">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Step indicator */}
        {step < 4 && (
          <div className="flex items-center mb-8">
            {[
              { n:1, label:'Farm details' },
              { n:2, label:'Season & inputs' },
              { n:3, label:'Advisory history' },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    s.n < step ? 'bg-moss text-white' : s.n === step ? 'bg-forest text-white' : 'bg-gray-200 text-gray-400'
                  }`}>{s.n < step ? '✓' : s.n}</div>
                  <span className={`text-sm font-semibold hidden sm:block ${s.n === step ? 'text-forest' : s.n < step ? 'text-moss' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && <div className={`h-0.5 w-8 mx-2 flex-shrink-0 ${s.n < step ? 'bg-moss' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-5">{error}</div>
        )}

        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-7">
            <h2 className="text-lg font-bold text-forest mb-5 flex items-center gap-2">🗺️ About your farm</h2>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Farmer name *" className="col-span-2">
                <FInput value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Jane Wanjiku" />
              </FormField>
              <FormField label="County *">
                <FSelect value={form.county} onChange={e => set('county', e.target.value)}>
                  <option value="">Select county…</option>
                  {COUNTIES.map(c => <option key={c}>{c}</option>)}
                </FSelect>
              </FormField>
              <FormField label="Primary crop *">
                <FSelect value={form.crop} onChange={e => set('crop', e.target.value)}>
                  <option value="">Select crop…</option>
                  {CROPS.map(c => <option key={c}>{c}</option>)}
                </FSelect>
              </FormField>
              <FormField label={`Farm size: ${form.size} acres`} className="col-span-2">
                <input type="range" min="0.5" max="20" step="0.5" value={form.size}
                  onChange={e => set('size', parseFloat(e.target.value))}
                  className="w-full accent-moss" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0.5</span><span>10</span><span>20+</span></div>
              </FormField>
              <FormField label={`Seasons farmed: ${form.seasons}`} className="col-span-2">
                <input type="range" min="1" max="20" step="1" value={form.seasons}
                  onChange={e => set('seasons', parseInt(e.target.value))}
                  className="w-full accent-moss" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>10</span><span>20+</span></div>
              </FormField>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setStep(2)} className="bg-forest text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-leaf transition-colors">
                Continue → Season & inputs
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-7">
            <h2 className="text-lg font-bold text-forest mb-5 flex items-center gap-2">🌦️ Last season — inputs & yield</h2>
            <div className="space-y-5">
              <FormField label="Did you plant within the recommended window? *">
                <RadioGroup options={[
                  {val:'early',label:'Early (before rains)'},{val:'on-time',label:'On time ✓'},
                  {val:'late',label:'Late'},{val:'missed',label:'Missed season'}
                ]} value={form.timing} onChange={v => set('timing', v)} />
              </FormField>
              <FormField label="Which inputs did you use? *">
                <div className="flex flex-wrap gap-2">
                  {INPUTS.map(i => (
                    <button key={i.val} type="button" onClick={() => toggleInput(i.val)}
                      className={`px-3 py-2 rounded-full text-sm font-medium border transition-all ${
                        form.inputs.includes(i.val)
                          ? 'border-moss bg-moss-lt text-forest font-bold'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {i.label}
                    </button>
                  ))}
                </div>
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Fertiliser application rate">
                  <FSelect value={form.fertRate} onChange={e => set('fertRate', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="correct">Correct rate</option>
                    <option value="under">Under-applied</option>
                    <option value="over">Over-applied</option>
                    <option value="na">Did not use fertiliser</option>
                  </FSelect>
                </FormField>
                <FormField label="Estimated yield last season *">
                  <FSelect value={form.yield} onChange={e => set('yield', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="poor">Poor (below average)</option>
                    <option value="fair">Fair (average)</option>
                    <option value="good">Good (above average)</option>
                    <option value="excellent">Excellent</option>
                  </FSelect>
                </FormField>
              </div>
              <FormField label="Crop loss in the last two seasons?">
                <RadioGroup options={[
                  {val:'none',label:'No loss'},{val:'minor',label:'Minor (<20%)'},
                  {val:'moderate',label:'Moderate (20–50%)'},{val:'major',label:'Major (>50%)'}
                ]} value={form.loss} onChange={v => set('loss', v)} />
              </FormField>
            </div>
            <div className="flex gap-3 justify-between mt-6">
              <button onClick={() => setStep(1)} className="border-2 border-forest text-forest px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-moss-lt transition-colors">← Back</button>
              <button onClick={() => setStep(3)} className="bg-forest text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-leaf transition-colors">Continue → Advisory history</button>
            </div>
          </div>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm p-7">
            <h2 className="text-lg font-bold text-forest mb-5 flex items-center gap-2">📋 Advisory & financial history</h2>
            <div className="space-y-5">
              <FormField label="Do you receive extension advice? *">
                <RadioGroup options={[
                  {val:'regular',label:'Yes, regularly'},{val:'sometimes',label:'Sometimes'},
                  {val:'rarely',label:'Rarely'},{val:'never',label:'Never'}
                ]} value={form.advisory} onChange={v => set('advisory', v)} />
              </FormField>
              <FormField label="When you receive advice, do you follow it? *">
                <RadioGroup options={[
                  {val:'always',label:'Always'},{val:'mostly',label:'Mostly'},
                  {val:'sometimes',label:'Sometimes'},{val:'rarely',label:'Rarely'}
                ]} value={form.follow} onChange={v => set('follow', v)} />
              </FormField>
              <FormField label="Are you a cooperative member?">
                <RadioGroup options={[
                  {val:'yes-active',label:'Yes, active'},{val:'yes-inactive',label:'Member (inactive)'},
                  {val:'no',label:'Not a member'}
                ]} value={form.coop} onChange={v => set('coop', v)} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Previous agricultural loan?">
                  <FSelect value={form.prevLoan} onChange={e => set('prevLoan', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="yes-repaid">Yes, fully repaid</option>
                    <option value="yes-active">Yes, currently active</option>
                    <option value="yes-default">Yes, had difficulties</option>
                    <option value="no">No previous loan</option>
                  </FSelect>
                </FormField>
                <FormField label="Loan purpose">
                  <FSelect value={form.purpose} onChange={e => set('purpose', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="inputs">Buy inputs (seed, fertiliser)</option>
                    <option value="equipment">Equipment or tools</option>
                    <option value="irrigation">Irrigation setup</option>
                    <option value="storage">Post-harvest storage</option>
                    <option value="other">Other</option>
                  </FSelect>
                </FormField>
              </div>
              <FormField label="Any additional context for the lender? (optional)">
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="e.g. I faced drought last season but have since adopted irrigation…"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/10 resize-y min-h-[80px]" />
              </FormField>
            </div>
            <div className="flex gap-3 justify-between mt-6">
              <button onClick={() => setStep(2)} className="border-2 border-forest text-forest px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-moss-lt transition-colors">← Back</button>
              <button onClick={handleSubmit} disabled={loading}
                className="bg-forest text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-leaf transition-colors disabled:opacity-60 flex items-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                🌱 Generate my FarmScore
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Result ── */}
        {step === 4 && result && (
          <div className="space-y-5">
            {/* Score hero */}
            <div className="bg-forest rounded-2xl p-6 flex items-center gap-6 flex-wrap shadow-lg">
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg width="112" height="112" viewBox="0 0 112 112" style={{transform:'rotate(-90deg)'}}>
                  <circle cx="56" cy="56" r="46" fill="none" stroke="#2D6A4F" strokeWidth="10"/>
                  <circle cx="56" cy="56" r="46" fill="none" stroke={g.color} strokeWidth="10"
                    strokeDasharray="289" strokeDashoffset={289 - (289 * result.total / 100)}
                    strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-white leading-none">{result.total}</span>
                  <span className="text-xs text-moss font-bold">/100</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-extrabold text-white mb-1" style={{color:g.color}}>{g.grade}</div>
                <div className="text-[#A7C4B5] text-sm leading-relaxed">{g.tagline}</div>
                <div className="text-moss text-xs mt-2 font-semibold">📍 {form.name} · {form.county} · {form.crop}</div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Score breakdown</div>
              {[
                {label:'Agronomic practice',    score:result.breakdown.agrScore,  max:25},
                {label:'Production & yield',    score:result.breakdown.prodScore, max:25},
                {label:'Advisory engagement',   score:result.breakdown.advScore,  max:25},
                {label:'Financial reliability', score:result.breakdown.finScore,  max:25},
              ].map(d => {
                const pct = Math.round((d.score/d.max)*100)
                const col = pct>=70?'bg-moss':pct>=40?'bg-gold':'bg-danger'
                return (
                  <div key={d.label} className="flex items-center gap-3 mb-3 last:mb-0">
                    <span className="text-sm font-semibold text-gray-700 w-44 flex-shrink-0">{d.label}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${col}`} style={{width:`${pct}%`}} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-10 text-right">{d.score}/{d.max}</span>
                  </div>
                )
              })}
            </div>

            {/* Flags */}
            {result.flags?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Key findings</div>
                <div className="space-y-2.5">
                  {result.flags.map((f, i) => (
                    <div key={i} className={`flex gap-3 p-3 rounded-xl text-sm ${
                      f.type==='positive'?'bg-moss-lt text-forest':f.type==='warning'?'bg-gold-lt text-yellow-800':'bg-danger-lt text-danger'
                    }`}>
                      <span className="flex-shrink-0">{f.type==='positive'?'✅':f.type==='warning'?'⚠️':'🔴'}</span>
                      <div><b className="block font-bold mb-0.5">{f.title}</b>{f.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share bar */}
            <div className="bg-moss-lt border border-moss rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-bold text-forest text-sm">Ready to share with a lender or cooperative?</div>
                <div className="text-xs text-leaf mt-1">The farmer must consent before this score is shared.</div>
              </div>
              <button onClick={() => alert('In the live product, this generates a secure shareable link for the lender.')}
                className="bg-forest text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-leaf transition-colors whitespace-nowrap">
                Share FarmScore →
              </button>
            </div>

            <button onClick={() => { setStep(1); setResult(null); setForm(p => ({...p, timing:'',inputs:[],fertRate:'',yield:'',loss:'',advisory:'',follow:'',coop:'',prevLoan:'',purpose:'',notes:''})) }}
              className="border-2 border-forest text-forest px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-moss-lt transition-colors">
              ← Start new assessment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Small field helpers ───────────────────────────────────────────────────────
function FormField({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  )
}
function FInput(props) {
  return <input className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/10 transition-all" {...props} />
}
function FSelect({ children, ...props }) {
  return (
    <select className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-moss cursor-pointer bg-white" {...props}>
      {children}
    </select>
  )
}
function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.val} type="button" onClick={() => onChange(o.val)}
          className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
            value === o.val
              ? 'border-moss bg-moss-lt text-forest font-bold'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}