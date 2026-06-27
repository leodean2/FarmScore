const express = require('express');
const router = express.Router();
const { runQuery } = require('../db/neo4j');
const { calculateScore, gradeFromScore, buildFlags } = require('../services/scoring');
const { generateNarrative } = require('../services/narrative');

/**
 * GET /api/farmers
 * Returns all farmers with their scores from Neo4j.
 */
router.get('/', async (req, res) => {
  try {
    const records = await runQuery(`
      MATCH (f:Farmer)
      OPTIONAL MATCH (f)-[:HAS_SEASON]->(s:Season)
      OPTIONAL MATCH (f)-[:ENGAGED_WITH]->(a:Advisory)
      OPTIONAL MATCH (f)-[:APPLIED_FOR]->(l:Loan)
      RETURN f, s, a, l
      ORDER BY f.submittedAt DESC
    `);

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
        notes:     f.notes,
      };
    });

    return res.json({ success: true, count: farmers.length, farmers });
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

    const flags = buildFlags(farmerData);

    return res.json({
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
    });
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

    const farmerId = `farmer_${Date.now()}`;
    const submittedAt = new Date().toISOString();

    // Save to Neo4j graph
    await runQuery(`
      // Create Farmer node
      MERGE (f:Farmer { id: $farmerId })
      SET f.name        = $name,
          f.county      = $county,
          f.crop        = $crop,
          f.size        = $size,
          f.seasons     = $seasons,
          f.notes       = $notes,
          f.scoreTotal  = $total,
          f.scoreAgr    = $agrScore,
          f.scoreProd   = $prodScore,
          f.scoreAdv    = $advScore,
          f.scoreFin    = $finScore,
          f.grade       = $grade,
          f.submittedAt = $submittedAt

      // Season node
      MERGE (s:Season { id: $farmerId + '_season' })
      SET s.timing     = $timing,
          s.inputs     = $inputs,
          s.fertRate   = $fertRate,
          s.yieldLevel = $yieldLevel,
          s.cropLoss   = $loss
      MERGE (f)-[:HAS_SEASON]->(s)

      // Advisory node
      MERGE (a:Advisory { id: $farmerId + '_advisory' })
      SET a.frequency     = $advisory,
          a.followThrough = $follow,
          a.cooperative   = $coop
      MERGE (f)-[:ENGAGED_WITH]->(a)

      // Loan node
      MERGE (l:Loan { id: $farmerId + '_loan' })
      SET l.history = $prevLoan,
          l.purpose = $purpose
      MERGE (f)-[:APPLIED_FOR]->(l)

      // County node (shared across farmers in same county)
      MERGE (c:County { name: $county })
      MERGE (f)-[:LOCATED_IN]->(c)

      // Crop node (shared across farmers growing same crop)
      MERGE (cr:Crop { name: $crop })
      MERGE (f)-[:GROWS]->(cr)

      RETURN f
    `, {
      farmerId,
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
    const records = await runQuery(`
      MATCH (f:Farmer { id: $id })
      OPTIONAL MATCH (f)-[:HAS_SEASON]->(s:Season)
      OPTIONAL MATCH (f)-[:ENGAGED_WITH]->(a:Advisory)
      OPTIONAL MATCH (f)-[:APPLIED_FOR]->(l:Loan)
      OPTIONAL MATCH (f)-[:LOCATED_IN]->(c:County)
      OPTIONAL MATCH (f)-[:GROWS]->(cr:Crop)
      OPTIONAL MATCH (peer:Farmer)-[:LOCATED_IN]->(c)
      WHERE peer.id <> f.id
      OPTIONAL MATCH (peer2:Farmer)-[:GROWS]->(cr)
      WHERE peer2.id <> f.id
      RETURN f, s, a, l, c, cr,
             collect(DISTINCT peer)[..3]  AS countyPeers,
             collect(DISTINCT peer2)[..3] AS cropPeers
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

    return res.json({ success: true, nodes, edges });
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

    return res.json({ success: true, message: `Application marked as ${decision}` });
  } catch (err) {
    console.error('PATCH /farmers/:id/decision error:', err);
    return res.status(500).json({ error: 'Failed to record decision', detail: err.message });
  }
});

module.exports = router;