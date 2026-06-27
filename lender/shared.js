// ── shared.js — used across all lender pages ─────────────────────────────────

const API_BASE = 'http://localhost:3000/api';

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getToken()    { return localStorage.getItem('token'); }
function getUser()     { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }

function requireAdmin() {
  const token = getToken();
  const user  = getUser();
  if (!token || !user || user.role !== 'admin') {
    window.location.href = '../login.html';
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../login.html';
}

// ── Render nav user info ──────────────────────────────────────────────────────
function renderNavUser() {
  const user = getUser();
  const el   = document.getElementById('nav-user');
  if (el && user) el.textContent = user.name || user.email || 'Loan Officer';
}

// ── Fetch all farmers from API ────────────────────────────────────────────────
async function fetchFarmers() {
  const res  = await fetch(`${API_BASE}/farmers`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch farmers');
  return data.farmers;
}

// ── Record a loan decision ────────────────────────────────────────────────────
async function recordDecision(farmerId, decision, officerNote = '') {
  const res  = await fetch(`${API_BASE}/farmers/${farmerId}/decision`, {
    method:  'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ decision, officerNote }),
  });
  return res.json();
}

// ── Grade helpers ─────────────────────────────────────────────────────────────
function gradeFromScore(s) {
  if (s >= 80) return { grade: 'Strong',       cls: 'grade-strong',     color: '#52B788' };
  if (s >= 65) return { grade: 'Good',          cls: 'grade-good',       color: '#74C69D' };
  if (s >= 50) return { grade: 'Moderate',      cls: 'grade-moderate',   color: '#D4A017' };
  if (s >= 35) return { grade: 'Developing',    cls: 'grade-developing', color: '#F59E0B' };
  return        { grade: 'Needs support',       cls: 'grade-needs',      color: '#B91C1C' };
}

function decisionBadge(decision) {
  if (!decision || decision === 'none') return `<span class="status-badge status-pending">⏳ Pending</span>`;
  if (decision === 'approved')          return `<span class="status-badge status-approved">✓ Approved</span>`;
  if (decision === 'review')            return `<span class="status-badge status-review">⚑ Review</span>`;
  if (decision === 'declined')          return `<span class="status-badge status-declined">✕ Declined</span>`;
  return `<span class="status-badge status-pending">⏳ Pending</span>`;
}

function flagSummary(farmer) {
  // Quick flag count from score signals
  let pos = 0, warn = 0, risk = 0;
  if (farmer.timing === 'on-time') pos++;
  if (farmer.advisory === 'regular' && farmer.follow === 'always') pos++;
  if (farmer.yield === 'good' || farmer.yield === 'excellent') pos++;
  if (farmer.coop === 'yes-active') pos++;
  if (farmer.prevLoan === 'yes-repaid') pos++;
  if (farmer.advisory === 'sometimes' || farmer.advisory === 'rarely') warn++;
  if (farmer.loss === 'moderate') warn++;
  if (farmer.timing === 'late') warn++;
  if (farmer.prevLoan === 'yes-default') risk++;
  if (farmer.loss === 'major') risk++;
  if (farmer.advisory === 'never') risk++;
  let html = '';
  if (pos)  html += `<span class="flag-dot dot-green"></span>${pos} `;
  if (warn) html += `<span class="flag-dot dot-amber"></span>${warn} `;
  if (risk) html += `<span class="flag-dot dot-red"></span>${risk} `;
  return html || '—';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Shared modal builder ──────────────────────────────────────────────────────
function buildModalBody(f, { showDecision = true } = {}) {
  const g    = gradeFromScore(f.total || 0);
  const dims = [
    { label: 'Agronomic practice',    score: f.agrScore  || 0, max: 25 },
    { label: 'Production & yield',    score: f.prodScore || 0, max: 25 },
    { label: 'Advisory engagement',   score: f.advScore  || 0, max: 25 },
    { label: 'Financial reliability', score: f.finScore  || 0, max: 25 },
  ];
  const inputs   = Array.isArray(f.inputs) ? f.inputs.filter(i => i !== 'none').join(', ') || 'None' : 'None';
  const coopStr  = f.coop === 'yes-active' ? 'Active member' : f.coop === 'yes-inactive' ? 'Inactive' : 'Not a member';
  const loanStr  = { 'yes-repaid': 'Previously repaid', 'yes-active': 'Active loan', 'yes-default': 'Previous difficulty', 'no': 'No history' }[f.prevLoan] || '—';

  return `
    <div class="modal-score-hero">
      <div class="modal-score-circle" style="border:5px solid ${g.color};background:rgba(255,255,255,0.08)">
        <div class="modal-score-num">${f.total || 0}</div>
        <div class="modal-score-max">/100</div>
      </div>
      <div>
        <div class="modal-grade" style="color:${g.color}">${g.grade}</div>
        <div class="modal-tagline">${decisionBadge(f.decision)}</div>
      </div>
    </div>

    <div>
      <div class="modal-section-title">Score breakdown</div>
      <div class="modal-card">
        ${dims.map(d => {
          const pct = Math.round((d.score / d.max) * 100);
          const cls = pct >= 70 ? '' : pct >= 40 ? 'amber' : 'red';
          return `<div class="m-breakdown-row">
            <div class="m-breakdown-label">${d.label}</div>
            <div class="m-bar-bg"><div class="m-bar-fill ${cls}" style="width:${pct}%"></div></div>
            <div class="m-score-val">${d.score}/${d.max}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div>
      <div class="modal-section-title">Farm details</div>
      <div class="modal-card">
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">County</div><div class="detail-value">${f.county || '—'}</div></div>
          <div class="detail-item"><div class="detail-label">Crop</div><div class="detail-value">${f.crop || '—'}</div></div>
          <div class="detail-item"><div class="detail-label">Farm size</div><div class="detail-value">${f.size || '—'} acres</div></div>
          <div class="detail-item"><div class="detail-label">Seasons</div><div class="detail-value">${f.seasons || '—'}</div></div>
          <div class="detail-item"><div class="detail-label">Inputs used</div><div class="detail-value">${inputs}</div></div>
          <div class="detail-item"><div class="detail-label">Last yield</div><div class="detail-value" style="text-transform:capitalize">${f.yield || '—'}</div></div>
          <div class="detail-item"><div class="detail-label">Cooperative</div><div class="detail-value">${coopStr}</div></div>
          <div class="detail-item"><div class="detail-label">Loan history</div><div class="detail-value">${loanStr}</div></div>
          <div class="detail-item"><div class="detail-label">Loan purpose</div><div class="detail-value" style="text-transform:capitalize">${f.purpose || '—'}</div></div>
          <div class="detail-item"><div class="detail-label">Submitted</div><div class="detail-value">${formatDate(f.submitted)}</div></div>
        </div>
        ${f.notes ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:0.8rem;color:var(--muted);line-height:1.6"><b style="color:var(--charcoal)">Farmer note:</b> ${f.notes}</div>` : ''}
        ${f.decidedAt ? `<div style="margin-top:8px;font-size:0.78rem;color:var(--muted)">Decision recorded: ${formatDate(f.decidedAt)}</div>` : ''}
      </div>
    </div>

    ${showDecision ? `
    <div>
      <div class="modal-section-title">Loan decision</div>
      <div class="decision-row">
        <button class="btn-approve" onclick="makeDecision('approved','${f.id}')">✓ Approve</button>
        <button class="btn-review"  onclick="makeDecision('review','${f.id}')">⚑ Flag for review</button>
        <button class="btn-decline" onclick="makeDecision('declined','${f.id}')">✕ Decline</button>
      </div>
      <div class="decision-note" style="margin-top:8px">FarmScore is advisory only. The loan officer makes the final decision.</div>
    </div>` : ''}
  `;
}