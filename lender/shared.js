// ── shared.js — used across all lender pages ─────────────────────────────────

const API_BASE = 'https://farmscore.onrender.com/api';

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('fs_token'); }
function getUser()  { try { return JSON.parse(localStorage.getItem('fs_user')); } catch { return null; } }

function requireAdmin() {
  const token = getToken();
  const user  = getUser();
  if (!token || !user || user.role !== 'admin') {
    window.location.href = '../login.html';
  }
}

function logout() {
  localStorage.removeItem('fs_token');
  localStorage.removeItem('fs_user');
  window.location.href = '../login.html';
}

function renderNavUser() {
  const user = getUser();
  const el   = document.getElementById('nav-user');
  if (el && user) el.textContent = user.name || user.email || 'Loan Officer';
}

// ── Fetch all farmers ─────────────────────────────────────────────────────────
async function fetchFarmers() {
  const res  = await fetch(`${API_BASE}/farmers`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch farmers');
  return data.farmers;
}

// ── Fetch farmer graph ────────────────────────────────────────────────────────
async function fetchFarmerGraph(farmerId) {
  const res  = await fetch(`${API_BASE}/farmers/${farmerId}/graph`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch graph');
  return data;
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
  if (!decision || decision === 'none') return `<span class="status-badge status-pending">&#9203; Pending</span>`;
  if (decision === 'approved')          return `<span class="status-badge status-approved">&#10003; Approved</span>`;
  if (decision === 'review')            return `<span class="status-badge status-review">&#9873; Review</span>`;
  if (decision === 'declined')          return `<span class="status-badge status-declined">&#10005; Declined</span>`;
  return `<span class="status-badge status-pending">&#9203; Pending</span>`;
}

function flagSummary(farmer) {
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
  const inputs  = Array.isArray(f.inputs) ? f.inputs.filter(i => i !== 'none').join(', ') || 'None' : 'None';
  const coopStr = f.coop === 'yes-active' ? 'Active member' : f.coop === 'yes-inactive' ? 'Inactive' : 'Not a member';
  const loanStr = { 'yes-repaid': 'Previously repaid', 'yes-active': 'Active loan', 'yes-default': 'Previous difficulty', 'no': 'No history' }[f.prevLoan] || '—';

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

    <div class="modal-tabs">
      <button class="modal-tab active" onclick="switchTab('details','${f.id}')">Details</button>
      <button class="modal-tab" onclick="switchTab('graph','${f.id}')">&#127760; Knowledge Graph</button>
    </div>

    <div id="tab-details-${f.id}" class="tab-panel">
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
          <button class="btn-approve" onclick="makeDecision('approved','${f.id}')">&#10003; Approve</button>
          <button class="btn-review"  onclick="makeDecision('review','${f.id}')">&#9873; Flag for review</button>
          <button class="btn-decline" onclick="makeDecision('declined','${f.id}')">&#10005; Decline</button>
        </div>
        <div class="decision-note" style="margin-top:8px">FarmScore is advisory only. The loan officer makes the final decision.</div>
      </div>` : ''}
    </div>

    <div id="tab-graph-${f.id}" class="tab-panel" style="display:none">
      <div id="graph-container-${f.id}" style="width:100%;height:400px;background:var(--cream);border-radius:10px;position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:0.875rem" id="graph-loading-${f.id}">
          Loading graph&#8230;
        </div>
      </div>
      <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:12px;font-size:0.72rem;color:var(--muted)">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#1B4332;margin-right:4px"></span>Farmer</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3B82F6;margin-right:4px"></span>Peer farmers</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#52B788;margin-right:4px"></span>Season</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#D4A017;margin-right:4px"></span>Advisory</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#9333EA;margin-right:4px"></span>Loan</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#0EA5E9;margin-right:4px"></span>County</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#F97316;margin-right:4px"></span>Crop</span>
      </div>
      <div style="font-size:0.72rem;color:var(--muted);margin-top:4px;text-align:center">Drag nodes to explore the knowledge graph</div>
    </div>
  `;
}

// ── Tab switcher ──────────────────────────────────────────────────────────────
function switchTab(tab, farmerId) {
  const tabs    = document.querySelectorAll('.modal-tab');
  const details = document.getElementById(`tab-details-${farmerId}`);
  const graph   = document.getElementById(`tab-graph-${farmerId}`);
  tabs.forEach((t, i) => t.classList.toggle('active', i === (tab === 'details' ? 0 : 1)));
  details.style.display = tab === 'details' ? 'flex' : 'none';
  graph.style.display   = tab === 'graph'   ? 'block' : 'none';
  if (tab === 'graph') renderGraph(farmerId);
}

// ── D3 graph renderer ─────────────────────────────────────────────────────────
const _graphCache = {};

async function renderGraph(farmerId) {
  const container = document.getElementById(`graph-container-${farmerId}`);
  if (!container) return;
  if (_graphCache[farmerId]) { drawGraph(container, _graphCache[farmerId], farmerId); return; }
  try {
    const data = await fetchFarmerGraph(farmerId);
    _graphCache[farmerId] = data;
    drawGraph(container, data, farmerId);
  } catch (err) {
    container.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--red)">Failed to load graph: ${err.message}</div>`;
  }
}

function drawGraph(container, { nodes, edges }, farmerId) {
  document.getElementById(`graph-loading-${farmerId}`)?.remove();
  container.innerHTML = '';

  const W = container.clientWidth  || 420;
  const H = container.clientHeight || 400;

  const colorMap = {
    farmer:   '#1B4332',
    peer:     '#3B82F6',
    season:   '#52B788',
    advisory: '#D4A017',
    loan:     '#9333EA',
    county:   '#0EA5E9',
    crop:     '#F97316',
  };

  const svg = d3.select(container).append('svg')
    .attr('width', W).attr('height', H);

  svg.append('defs').append('marker')
    .attr('id', 'arrow').attr('viewBox', '0 -5 10 10')
    .attr('refX', 22).attr('refY', 0)
    .attr('markerWidth', 6).attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#9CA3AF');

  const simulation = d3.forceSimulation(nodes)
    .force('link',      d3.forceLink(edges).id(d => d.id).distance(110))
    .force('charge',    d3.forceManyBody().strength(-320))
    .force('center',    d3.forceCenter(W / 2, H / 2))
    .force('collision', d3.forceCollide(36));

  const link = svg.append('g').selectAll('line')
    .data(edges).enter().append('line')
    .attr('stroke', '#D1D5DB').attr('stroke-width', 1.5)
    .attr('marker-end', 'url(#arrow)');

  const linkLabel = svg.append('g').selectAll('text')
    .data(edges).enter().append('text')
    .attr('font-size', 8).attr('fill', '#9CA3AF')
    .attr('text-anchor', 'middle').text(d => d.label);

  const node = svg.append('g').selectAll('g')
    .data(nodes).enter().append('g')
    .style('cursor', 'grab')
    .call(d3.drag()
      .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end',   (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
    );

  node.append('circle')
    .attr('r', d => d.type === 'farmer' ? 28 : 20)
    .attr('fill', d => colorMap[d.type] || '#6B7280')
    .attr('stroke', '#fff').attr('stroke-width', 2);

  node.filter(d => d.type === 'farmer' || d.type === 'peer')
    .append('text')
    .attr('text-anchor', 'middle').attr('dy', '0.35em')
    .attr('font-size', d => d.type === 'farmer' ? 11 : 9)
    .attr('font-weight', '700').attr('fill', '#fff')
    .text(d => d.score || '');

  node.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', d => (d.type === 'farmer' ? 42 : 34))
    .attr('font-size', 10).attr('fill', '#374151')
    .attr('font-weight', d => d.type === 'farmer' ? '700' : '400')
    .each(function(d) {
      const lines = d.label.split('\n');
      lines.forEach((line, i) => {
        d3.select(this).append('tspan')
          .attr('x', 0).attr('dy', i === 0 ? 0 : 13)
          .text(line);
      });
    });

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    linkLabel
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });
}
