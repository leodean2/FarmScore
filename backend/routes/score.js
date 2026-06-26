const express = require('express');
const router = express.Router();
const { calculateScore, gradeFromScore, buildFlags } = require('../services/scoring');

/**
 * POST /api/score
 * Takes farmer form data, returns a FarmScore result.
 * Does NOT save to the database — use POST /api/farmers for that.
 */
router.post('/', (req, res) => {
  try {
    const data = req.body;

    // Basic validation
    const required = ['name', 'county', 'crop', 'timing', 'yield', 'advisory', 'follow'];
    const missing = required.filter(f => !data[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing
      });
    }

    // Calculate score
    const { total, agrScore, prodScore, advScore, finScore } = calculateScore(data);
    const { grade, tagline } = gradeFromScore(total);
    const flags = buildFlags(data);

    return res.json({
      success: true,
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
    });
  } catch (err) {
    console.error('Scoring error:', err);
    return res.status(500).json({ error: 'Scoring failed', detail: err.message });
  }
});

module.exports = router;