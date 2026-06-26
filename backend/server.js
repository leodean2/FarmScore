const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const { verifyConnection } = require('./db/neo4j');
const scoreRouter   = require('./routes/score');
const farmersRouter = require('./routes/farmers');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name:    'FarmScore API',
    version: '1.0.0',
    status:  'running',
    endpoints: {
      'POST /api/score':                 'Score a farmer (no save)',
      'GET  /api/farmers':               'Get all farmers',
      'GET  /api/farmers/:id':           'Get one farmer',
      'POST /api/farmers':               'Score + save farmer to Neo4j',
      'PATCH /api/farmers/:id/decision': 'Record loan decision',
    }
  });
});

app.use('/api/score',   scoreRouter);
app.use('/api/farmers', farmersRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  await verifyConnection();
  app.listen(PORT, () => {
    console.log(`🌱 FarmScore API running on http://localhost:${PORT}`);
  });
}

start();