const express  = require('express');
const cors     = require('cors');
const passport = require('./middleware/passport');
require('dotenv').config();

const { verifyConnection } = require('./db/neo4j');
const authRouter    = require('./routes/auth');
const scoreRouter   = require('./routes/score');
const farmersRouter = require('./routes/farmers');
const masumiRouter  = require('./routes/masumi');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name:    'FarmScore API',
    version: '1.0.0',
    status:  'running',
    endpoints: {
      'POST /api/auth/register':         'Register (email/password)',
      'POST /api/auth/login':            'Login (email/password)',
      'GET  /api/auth/google':           'Start Google OAuth',
      'GET  /api/auth/google/callback':  'Google OAuth callback',
      'GET  /api/auth/me':               'Get current user',
      'POST /api/score':                 'Score a farmer (no save)',
      'GET  /api/farmers':               'Get all farmers',
      'POST /api/farmers':               'Score + save farmer to Neo4j',
      'PATCH /api/farmers/:id/decision': 'Record loan decision',
      'GET  /api/masumi/availability':   'Masumi agent availability',
      'POST /api/masumi/start-job':      'Start Masumi scoring job',
      'GET  /api/masumi/get-job-status': 'Check Masumi job status',
    }
  });
});

app.use('/api/auth',    authRouter);
app.use('/api/score',   scoreRouter);
app.use('/api/farmers', farmersRouter);
app.use('/api/masumi',  masumiRouter);

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