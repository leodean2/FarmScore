import { useEffect } from 'react'
import { Button, GradePill, StatusBadge } from './ui'

const gradeFromScore = s =>
  s >= 80 ? { grade:'Strong', color:'#52B788', letter:'A' }
: s >= 65 ? { grade:'Good',   color:'#74C69D', letter:'B' }
: s >= 50 ? { grade:'Moderate',color:'#D4A017',letter:'C' }
: s >= 35 ? { grade:'Developing',color:'#F59E0B',letter:'D' }
:           { grade:'Needs support',color:'#B91C1C',letter:'E' }

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' })
}

function getAI(f) {
  const advPct = f.advisory === 'regular' && f.follow === 'always' ? 91
    : f.advisory === 'regular' && f.follow === 'mostly' ? 78
    : f.advisory === 'sometimes' && f.follow === 'mostly' ? 62
    : f.advisory === 'sometimes' && f.follow === 'sometimes' ? 45
    : f.advisory === 'rarely' ? 28 : 15
  const yieldVs = f.yield === 'excellent' ? '+24%' : f.yield === 'good' ? '+11%' : f.yield === 'fair' ? '0%' : '-15%'
  const seasons = parseInt(f.seasons) || 1
  const confidence = Math.min(50 + seasons * 4
    + (f.advisory === 'regular' ? 12 : 0)
    + (f.coop === 'yes-active' ? 8 : 0)
    + (f.prevLoan === 'yes-repaid' ? 10 : 0), 96)
  const advisoryStr = f.advisory === 'regular' ? 'consistent engagement with extension advice'
    : f.advisory === 'sometimes' ? 'occasional extension advisory engagement'
    : 'limited advisory engagement'
  const yieldStr = (f.yield === 'excellent' || f.yield === 'good')
    ? `Yields trend above the ${f.county || 'regional'} ${(f.crop||'crop').toLowerCase()} benchmark`
    : 'Yields are at or below the regional benchmark'
  const g = gradeFromScore(f.total || 0)
  const conclusion = f.total >= 65
    ? `${g.grade} candidate for input financing at standard terms.`
    : f.total >= 50 ? 'Moderate candidate — field verification recommended.'
    : f.total >= 35 ? 'Developing profile — smaller initial loan appropriate.'
    : 'High-risk profile — advisory support recommended before advancing.'
  const text = `${seasons}-season track record of ${advisoryStr}. ${yieldStr}, with consistent input use disclosed each season. ${conclusion}`
  return { advPct, yieldVs, confidence, text }
}

function initials(name) {
  return (name || 'XX').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
}

export default function FarmerModal({ farmer: f, onClose, onDecision, readOnly = false }) {
  const g  = gradeFromScore(f.total || 0)
  const ai = getAI(f)

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const dims = [
    { label:'Agronomic practice',    score: f.agrScore  || 0, max:25 },
    { label:'Production & yield',    score: f.prodScore || 0, max:25 },
    { label:'Advisory engagement',   score: f.advScore  || 0, max:25 },
    { label:'Financial reliability', score: f.finScore  || 0, max:25 },
  ]

  const inputs   = Array.isArray(f.inputs) ? f.inputs.filter(i=>i!=='none').join(', ') || 'None' : 'None'
  const coopStr  = f.coop === 'yes-active' ? 'Active member' : f.coop === 'yes-inactive' ? 'Inactive' : 'Not a member'
  const loanStr  = {'yes-repaid':'Previously repaid','yes-active':'Active loan','yes-default':'Previous difficulty','no':'No history'}[f.prevLoan] || '—'
  const estLoan  = ((f.size||1) * 18000 + (f.seasons||1) * 2000).toLocaleString()

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-[500px] max-w-full h-full bg-white overflow-y-auto shadow-2xl animate-[slideIn_0.25s_ease]">

        {/* Header */}
        <div className="bg-forest px-6 py-5 flex items-start justify-between gap-3 sticky top-0 z-10">
          <div>
            <div className="text-white font-extrabold text-lg leading-tight">{f.name}</div>
            <div className="text-moss text-xs mt-0.5">{f.county} · {f.crop} · {f.size} acres · Submitted {formatDate(f.submitted)}</div>
          </div>
          <button onClick={onClose} className="text-moss hover:text-white text-2xl leading-none flex-shrink-0 mt-0.5">✕</button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* ── 1. Profile card ── */}
          <div className="bg-[#0F2318] rounded-xl p-5 border border-[#1B4332]">
            <div className="text-[10px] font-bold text-moss tracking-[2px] mb-2">
              FARMSCORE PROFILE · #{initials(f.name)}-{String(f.id||'001').replace(/\D/g,'').slice(-3).padStart(3,'0')}
            </div>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#1B4332] flex items-center justify-center font-extrabold text-white text-base flex-shrink-0">
                {initials(f.name)}
              </div>
              <div>
                <div className="text-white font-extrabold text-xl leading-tight">{f.name}</div>
                <div className="text-[#A7C4B5] text-xs mt-0.5">{f.county} · {f.size} ha · {f.crop}</div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {f.coop === 'yes-active' && (
                    <span className="bg-[#1B4332] text-[#A7C4B5] px-2.5 py-0.5 rounded-full text-xs font-semibold">{f.county} Farmers SACCO</span>
                  )}
                  <StatusBadge status={f.decision || 'pending'} />
                </div>
              </div>
            </div>

            {/* Score + metrics */}
            <div className="flex items-center gap-5 pt-4 border-t border-[#1B4332]">
              {/* Dial */}
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg width="80" height="80" viewBox="0 0 80 80" style={{transform:'rotate(-90deg)'}}>
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#1B4332" strokeWidth="7"/>
                  <circle cx="40" cy="40" r="32" fill="none" stroke={g.color} strokeWidth="7"
                    strokeDasharray="201" strokeDashoffset={201 - (201 * (f.total||0) / 100)}
                    strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-white leading-none">{f.total||0}</span>
                  <span className="text-[9px] font-bold" style={{color:g.color}}>RATING {g.letter}</span>
                </div>
              </div>
              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 flex-1">
                {[
                  { label:'Loan Requested',         value:`Ksh ${estLoan}`,    color:'text-white' },
                  { label:'Model Confidence',        value:`${ai.confidence}%`, color:'text-moss' },
                  { label:'Advisory Follow-Through', value:`${ai.advPct}%`,    color:'text-blue-400' },
                  { label:'Seasons Tracked',         value:f.seasons||'—',     color:'text-white' },
                ].map(m => (
                  <div key={m.label}>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">{m.label}</div>
                    <div className={`text-base font-extrabold mt-0.5 ${m.color}`}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 2. AI Summary ── */}
          <div className="bg-[#0F2318] rounded-xl p-5 border border-[#1B4332]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-bold text-moss tracking-[2px]">AI SUMMARY</div>
                <div className="text-white font-bold text-base mt-0.5">Plain-language assessment</div>
              </div>
              <div className="w-8 h-8 bg-[#1B4332] rounded-lg flex items-center justify-center text-moss">✦</div>
            </div>
            <p className="text-[#A7C4B5] text-sm leading-relaxed mb-4">{ai.text}</p>
            <div className="grid grid-cols-4 gap-3 pt-4 border-t border-[#1B4332]">
              {[
                { label:'Advisory',          value:`${ai.advPct}%`,    color:'text-moss' },
                { label:'Yield vs Benchmark',value:ai.yieldVs,         color: ai.yieldVs.includes('-') ? 'text-red-400' : 'text-moss' },
                { label:'Seasons Tracked',   value:f.seasons||'—',     color:'text-white' },
                { label:'Confidence',        value:`${ai.confidence}%`,color:'text-moss' },
              ].map(m => (
                <div key={m.label}>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide leading-tight">{m.label}</div>
                  <div className={`text-lg font-extrabold mt-1 ${m.color}`}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 3. Score breakdown ── */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Score Breakdown</div>
            <div className="bg-cream rounded-xl p-4 space-y-3">
              {dims.map(d => {
                const pct = Math.round((d.score / d.max) * 100)
                const color = pct >= 70 ? 'bg-moss' : pct >= 40 ? 'bg-gold' : 'bg-danger'
                return (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-700 w-40 flex-shrink-0">{d.label}</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{width:`${pct}%`}} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-8 text-right">{d.score}/{d.max}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── 4. Farm details ── */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Farm Details</div>
            <div className="bg-cream rounded-xl p-4 grid grid-cols-2 gap-3">
              {[
                ['County',       f.county||'—'],
                ['Crop',         f.crop||'—'],
                ['Farm size',    `${f.size||'—'} acres`],
                ['Seasons',      f.seasons||'—'],
                ['Inputs used',  inputs],
                ['Last yield',   f.yield||'—'],
                ['Cooperative',  coopStr],
                ['Loan history', loanStr],
                ['Loan purpose', f.purpose||'—'],
                ['Submitted',    formatDate(f.submitted)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{label}</div>
                  <div className="text-sm font-semibold text-gray-800 mt-0.5 capitalize">{value}</div>
                </div>
              ))}
              {f.notes && (
                <div className="col-span-2 pt-2 border-t border-gray-200">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">Farmer note</div>
                  <div className="text-sm text-gray-600 leading-relaxed">{f.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── 5. Decision ── */}
          {!readOnly && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Loan Decision</div>
              <div className="flex gap-2.5">
                <button onClick={() => onDecision(f.id, 'approved')}
                  className="flex-1 py-3 bg-moss text-white font-bold text-sm rounded-xl hover:bg-leaf transition-colors">
                  ✓ Approve
                </button>
                <button onClick={() => onDecision(f.id, 'review')}
                  className="flex-1 py-3 bg-gold-lt text-yellow-800 border border-yellow-400 font-bold text-sm rounded-xl hover:bg-yellow-100 transition-colors">
                  ⚑ Flag for review
                </button>
                <button onClick={() => onDecision(f.id, 'declined')}
                  className="flex-1 py-3 bg-danger-lt text-danger border border-red-300 font-bold text-sm rounded-xl hover:bg-red-200 transition-colors">
                  ✕ Decline
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">FarmScore is advisory only. The loan officer makes the final decision.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}