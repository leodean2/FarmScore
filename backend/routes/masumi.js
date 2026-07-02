const express = require('express');
const router = express.Router();
const { calculateScore, gradeFromScore, buildFlags } = require('../services/scoring');

const jobs = new Map();

function validateApiKey(req, res, next) {
  const provided = req.get('x-api-key') || req.get('authorization') || '';
  const expected = process.env.MASUMI_API_KEY || '';

  if (!expected) {
    return next();
  }

  const token = provided.startsWith('Bearer ') ? provided.slice(7) : provided;
  if (token && token === expected) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized', detail: 'Valid x-api-key or Bearer token is required' });
}

function buildScorePayload(data) {
  const { total, agrScore, prodScore, advScore, finScore } = calculateScore(data);
  const { grade, tagline } = gradeFromScore(total);
  const flags = buildFlags(data);

  return {
    score: {
      total,
      breakdown: { agrScore, prodScore, advScore, finScore },
      grade,
      tagline,
      flags,
      farmer: {
        name: data.name,
        county: data.county,
        crop: data.crop,
        size: data.size,
        seasons: data.seasons
      }
    }
  };
}

router.get('/availability', validateApiKey, (req, res) => {
  res.json({
    available: true,
    service: 'FarmScore',
    type: 'credit-readiness-scoring',
    capabilities: ['score-farmer', 'job-status']
  });
});

router.post('/start-job', validateApiKey, (req, res) => {
  try {
    const data = req.body || {};
    const required = ['name', 'county', 'crop', 'timing', 'yield', 'advisory', 'follow'];
    const missing = required.filter(field => !data[field]);

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', missing });
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = buildScorePayload(data);
    const job = {
      id: jobId,
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      input: data,
      result: payload
    };

    jobs.set(jobId, job);

    return res.status(202).json({
      success: true,
      jobId,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      result: payload
    });
  } catch (err) {
    console.error('Masumi start-job error:', err);
    return res.status(500).json({ error: 'Failed to start FarmScore job', detail: err.message });
  }
});

router.get('/get-job-status', validateApiKey, (req, res) => {
  const jobId = req.query.jobId || req.query.id;
  if (!jobId) {
    return res.status(400).json({ error: 'Missing jobId query parameter' });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found', jobId });
  }

  return res.json({
    success: true,
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    result: job.result
  });
});

module.exports = router;
module.exports.router = router;
module.exports.jobs = jobs;
