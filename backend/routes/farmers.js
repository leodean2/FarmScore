const express = require('express');
const router = express.Router();
const { runQuery } = require('../db/neo4j');
const { calculateScore, gradeFromScore, buildFlags } = require('../services/scoring');
const { generateNarrative } = require('../services/narrative');
const cache = require('../utils/cache');

/**
 * GET /api/farmers
 * Returns all farmers with their scores from Neo4j.
 */
router.get('/', async (req, res) => {
  try {
    const { role, id: userId } = req.user || {}
    const isPrivileged = role === 'admin' || role === 'lender'
    const cacheKey = isPrivileged ? 'farmers:all' : `farmers:user:${userId}`

    const cached = await cache.get(cacheKey)
    if (cached) return res.json(cached)

    const records = await runQuery(`
      MATCH (f:Farmer)
      ${isPrivileged ? '' : 'WHERE f.userId = $userId'}
      OPTIONAL MATCH (f)-[:HAS_SEASON]->(s:Season)
      OPTIONAL MATCH (f)-[:ENGAGED_WITH]->(a:Advisory)
      OPTIONAL MATCH (f)-[:APPLIED_FOR]->(l:Loan)
      RETURN f, s, a, l
      ORDER BY f.submittedAt DESC
    `, { userId: userId || '' });

    const farmers = records.map(record => {
      const f = record.get('f').properties;
      const s = record.get('s') ? record.get('s').properties : {};
      const a = record.get('a') ? record.get('a').properties : {};
      const l = record.get('l') ? record.get('l').properties : {};

      return {
        id:        f.id,
        name:      f.name,
        county:    f.county,
        crop:      f.crop,
        size:      f.size,
        seasons:   f.seasons,
        submitted: f.submittedAt,
        total:     f.scoreTotal,
        agrScore:  f.scoreAgr,
        prodScore: f.scoreProd,
        advScore:  f.scoreAdv,
        finScore:  f.scoreFin,
        grade:     f.grade,
        // Season data
        timing:    s.timing,
        inputs:    s.inputs ? JSON.parse(s.inputs) : [],
        fertRate:  s.fertRate,
        yield:     s.yieldLevel,
        loss:      s.cropLoss,
        // Advisory data
        advisory:  a.frequency,
        follow:    a.followThrough,
        coop:      a.cooperative,
        // Loan history
        prevLoan:  l.history,
        purpose:   l.purpose,
        notes:       f.notes,
        decision:    f.decision    || null,
        officerNote: f.officerNote || '',
        decidedAt:   f.decidedAt   || null,
      };
    });

    const payload = { success: true, count: farmers.length, farmers }
    await cache.set(cacheKey, payload, isPrivileged ? 60_000 : 30_000)
    return res.json(payload);
  } catch (err) {
    console.error('GET /farmers error:', err);
    return res.status(500).json({ error: 'Failed to fetch farmers', detail: err.message });
  }
});

/**
 * GET /api/farmers/:id
 * Returns a single farmer by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `farmers:id:${req.params.id}`
    const cached = await cache.get(cacheKey)
    if (cached) return res.json(cached)

    const records = await runQuery(`
      MATCH (f:Farmer { id: $id })
      OPTIONAL MATCH (f)-[:HAS_SEASON]->(s:Season)
      OPTIONAL MATCH (f)-[:ENGAGED_WITH]->(a:Advisory)
      OPTIONAL MATCH (f)-[:APPLIED_FOR]->(l:Loan)
      RETURN f, s, a, l
    `, { id: req.params.id });

    if (!records.length) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const record = records[0];
    const f = record.get('f').properties;
    const s = record.get('s') ? record.get('s').properties : {};
    const a = record.get('a') ? record.get('a').properties : {};
    const l = record.get('l') ? record.get('l').properties : {};

    const farmerData = {
      timing:   s.timing,
      inputs:   s.inputs ? JSON.parse(s.inputs) : [],
      fertRate: s.fertRate,
      yield:    s.yieldLevel,
      loss:     s.cropLoss,
      advisory: a.frequency,
      follow:   a.followThrough,
      coop:     a.cooperative,
      prevLoan: l.history,
      seasons:  f.seasons,
    };

    const payload = {
      success: true,
      farmer: {
        id:        f.id,
        name:      f.name,
        county:    f.county,
        crop:      f.crop,
        size:      f.size,
        seasons:   f.seasons,
        submitted: f.submittedAt,
        total:     f.scoreTotal,
        agrScore:  f.scoreAgr,
        prodScore: f.scoreProd,
        advScore:  f.scoreAdv,
        finScore:  f.scoreFin,
        grade:     f.grade,
        notes:     f.notes,
        ...farmerData,
        flags,
      }
    };

    await cache.set(cacheKey, payload, 30_000);
    return res.json(payload);
  } catch (err) {
    console.error('GET /farmers/:id error:', err);
    return res.status(500).json({ error: 'Failed to fetch farmer', detail: err.message });
  }
});

/**
 * POST /api/farmers
 * Scores a farmer and saves the full graph to Neo4j.
 *
 * Graph structure created:
 * (Farmer)-[:HAS_SEASON]->(Season)
 * (Farmer)-[:ENGAGED_WITH]->(Advisory)
 * (Farmer)-[:APPLIED_FOR]->(Loan)
 * (Farmer)-[:LOCATED_IN]->(County)
 * (Farmer)-[:GROWS]->(Crop)
 */
router.post('/', async (req, res) => {
  try {
    const data = req.body;

    // Basic validation
    const required = ['name', 'county', 'crop', 'timing', 'yield', 'advisory', 'follow'];
    const missing = required.filter(f => !data[f]);
    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', missing });
    }

    // Calculate score
    const { total, agrScore, prodScore, advScore, finScore } = calculateScore(data);
    const { grade, tagline } = gradeFromScore(total);
    const flags = buildFlags(data);

    // Generate AI narrative (non-blocking — falls back gracefully if API key missing)
    let narrative = null;
    try {
      if (process.env.FEATHERLESS_API_KEY && process.env.FEATHERLESS_API_KEY !== 'your_featherless_api_key_here') {
        narrative = await generateNarrative(data, { total, grade, flags });
      }
    } catch (narrativeErr) {
      console.warn('Narrative generation failed (non-fatal):', narrativeErr.message);
    }

    const farmerId   = `farmer_${Date.now()}`;
    const seasonId   = `${farmerId}_season`;
    const advisoryId = `${farmerId}_advisory`;
    const loanId     = `${farmerId}_loan`;
    const submittedAt = new Date().toISOString();
    const userId      = req.user?.id || '';

    // Save to Neo4j graph
    await runQuery(`
      CREATE (f:Farmer {
        id: $farmerId,
        name: $name,
        county: $county,
        crop: $crop,
        size: $size,
        seasons: $seasons,
        notes: $notes,
        userId: $userId,
        scoreTotal: $total,
        scoreAgr: $agrScore,
        scoreProd: $prodScore,
        scoreAdv: $advScore,
        scoreFin: $finScore,
        grade: $grade,
        submittedAt: $submittedAt
      })

      CREATE (s:Season {
        id: $seasonId,
        timing: $timing,
        inputs: $inputs,
        fertRate: $fertRate,
        yieldLevel: $yieldLevel,
        cropLoss: $loss
      })
      CREATE (f)-[:HAS_SEASON]->(s)

      CREATE (a:Advisory {
        id: $advisoryId,
        frequency: $advisory,
        followThrough: $follow,
        cooperative: $coop
      })
      CREATE (f)-[:ENGAGED_WITH]->(a)

      CREATE (l:Loan {
        id: $loanId,
        history: $prevLoan,
        purpose: $purpose
      })
      CREATE (f)-[:APPLIED_FOR]->(l)

      MERGE (c:County { name: $county })
      CREATE (f)-[:LOCATED_IN]->(c)

      MERGE (cr:Crop { name: $crop })
      CREATE (f)-[:GROWS]->(cr)

      RETURN f
    `, {
      farmerId,
      seasonId,
      advisoryId,
      loanId,
      userId,
      name:       data.name,
      county:     data.county,
      crop:       data.crop,
      size:       parseFloat(data.size) || 0,
      seasons:    parseInt(data.seasons) || 1,
      notes:      data.notes || '',
      total, agrScore, prodScore, advScore, finScore, grade,
      submittedAt,
      timing:     data.timing,
      inputs:     JSON.stringify(data.inputs || []),
      fertRate:   data.fertRate || '',
      yieldLevel: data.yield,
      loss:       data.loss || 'none',
      advisory:   data.advisory,
      follow:     data.follow,
      coop:       data.coop || 'no',
      prevLoan:   data.prevLoan || 'no',
      purpose:    data.purpose || '',
    });

    await cache.invalidatePrefix('farmers:')
    return res.status(201).json({
      success: true,
      message: 'Farmer scored and saved to graph',
      farmerId,
      score: { total, agrScore, prodScore, advScore, finScore, grade, tagline, flags },
      narrative,
    });
  } catch (err) {
    console.error('POST /farmers error:', err);
    return res.status(500).json({ error: 'Failed to save farmer', detail: err.message });
  }
});

/**
 * GET /api/farmers/:id/graph
 * Returns nodes and edges for the farmer's knowledge graph.
 */
router.get('/:id/graph', async (req, res) => {
  try {
    const cacheKey = `farmers:graph:${req.params.id}`
    const cached = await cache.get(cacheKey)
    if (cached) return res.json(cached)

    const records = await runQuery(`
      MATCH (f:Farmer { id: $id })
      OPTIONAL MATCH (f)-[:HAS_SEASON]->(s:Season)
      OPTIONAL MATCH (f)-[:ENGAGED_WITH]->(a:Advisory)
      OPTIONAL MATCH (f)-[:APPLIED_FOR]->(l:Loan)
      OPTIONAL MATCH (f)-[:LOCATED_IN]->(c:County)
      OPTIONAL MATCH (f)-[:GROWS]->(cr:Crop)
      WITH f, s, a, l, c, cr
      CALL {
        WITH c, f
        OPTIONAL MATCH (peer:Farmer)-[:LOCATED_IN]->(c)
        WHERE peer.id <> f.id
        RETURN collect({ id: peer.id, name: peer.name, score: peer.scoreTotal })[0..3] AS countyPeers
      }
      CALL {
        WITH cr, f
        OPTIONAL MATCH (peer2:Farmer)-[:GROWS]->(cr)
        WHERE peer2.id <> f.id
        RETURN collect({ id: peer2.id, name: peer2.name, score: peer2.scoreTotal })[0..3] AS cropPeers
      }
      RETURN f, s, a, l, c, cr, countyPeers, cropPeers
    `, { id: req.params.id });

    if (!records.length) return res.status(404).json({ error: 'Farmer not found' });

    const rec        = records[0];
    const f          = rec.get('f').properties;
    const s          = rec.get('s')  ? rec.get('s').properties  : null;
    const a          = rec.get('a')  ? rec.get('a').properties  : null;
    const l          = rec.get('l')  ? rec.get('l').properties  : null;
    const c          = rec.get('c')  ? rec.get('c').properties  : null;
    const cr         = rec.get('cr') ? rec.get('cr').properties : null;
    const countyPeers = rec.get('countyPeers').map(n => n.properties);
    const cropPeers   = rec.get('cropPeers').map(n => n.properties);

    const nodes = [];
    const edges = [];

    // Central farmer node
    nodes.push({ id: f.id, label: f.name, type: 'farmer', score: f.scoreTotal, grade: f.grade });

    if (s) {
      nodes.push({ id: s.id, label: `Season\n${s.yieldLevel || ''} yield`, type: 'season' });
      edges.push({ source: f.id, target: s.id, label: 'HAS_SEASON' });
    }
    if (a) {
      nodes.push({ id: a.id, label: `Advisory\n${a.frequency || ''}`, type: 'advisory' });
      edges.push({ source: f.id, target: a.id, label: 'ENGAGED_WITH' });
    }
    if (l) {
      nodes.push({ id: l.id, label: `Loan\n${l.purpose || ''}`, type: 'loan' });
      edges.push({ source: f.id, target: l.id, label: 'APPLIED_FOR' });
    }
    if (c) {
      nodes.push({ id: `county_${c.name}`, label: c.name, type: 'county' });
      edges.push({ source: f.id, target: `county_${c.name}`, label: 'LOCATED_IN' });
    }
    if (cr) {
      nodes.push({ id: `crop_${cr.name}`, label: cr.name, type: 'crop' });
      edges.push({ source: f.id, target: `crop_${cr.name}`, label: 'GROWS' });
    }

    // County peers
    countyPeers.forEach(p => {
      if (!nodes.find(n => n.id === p.id)) {
        nodes.push({ id: p.id, label: p.name, type: 'peer', score: p.scoreTotal });
      }
      if (c) edges.push({ source: p.id, target: `county_${c.name}`, label: 'LOCATED_IN' });
    });

    // Crop peers
    cropPeers.forEach(p => {
      if (!nodes.find(n => n.id === p.id)) {
        nodes.push({ id: p.id, label: p.name, type: 'peer', score: p.scoreTotal });
      }
      if (cr) edges.push({ source: p.id, target: `crop_${cr.name}`, label: 'GROWS' });
    });

    const payload = { success: true, nodes, edges }
    await cache.set(cacheKey, payload, 60_000)
    return res.json(payload);
  } catch (err) {
    console.error('GET /farmers/:id/graph error:', err);
    return res.status(500).json({ error: 'Failed to fetch graph', detail: err.message });
  }
});

/**
 * PATCH /api/farmers/:id/decision
 * Records a loan officer decision on a farmer application.
 */
router.patch('/:id/decision', async (req, res) => {
  try {
    const { decision, officerNote } = req.body;
    const validDecisions = ['approved', 'review', 'declined'];

    if (!validDecisions.includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision. Must be: approved, review, or declined.' });
    }

    await runQuery(`
      MATCH (f:Farmer { id: $id })
      SET f.decision    = $decision,
          f.officerNote = $officerNote,
          f.decidedAt   = $decidedAt
    `, {
      id:          req.params.id,
      decision,
      officerNote: officerNote || '',
      decidedAt:   new Date().toISOString(),
    });

    await cache.invalidatePrefix('farmers:')
    await cache.del(`farmers:id:${req.params.id}`, `farmers:graph:${req.params.id}`)
    return res.json({ success: true, message: `Application marked as ${decision}` });
  } catch (err) {
    console.error('PATCH /farmers/:id/decision error:', err);
    return res.status(500).json({ error: 'Failed to record decision', detail: err.message });
  }
});

module.exports = router;