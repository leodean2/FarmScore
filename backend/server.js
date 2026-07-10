const express  = require('express')
const cors     = require('cors')
const helmet   = require('helmet')
const passport = require('./middleware/passport')
require('dotenv').config()

const { requireAuth }      = require('./middleware/auth')
const { verifyConnection, ensureSchema, verifyUserEmailConstraint } = require('./db/neo4j')
const authRouter    = require('./routes/auth')
const scoreRouter   = require('./routes/score')
const farmersRouter = require('./routes/farmers')
const masumiRouter  = require('./routes/masumi')
const adminRouter   = require('./routes/admin')

const app  = express()
const PORT = process.env.PORT || 3000

const FRONTEND = process.env.FRONTEND_URL || 'https://farm-score.vercel.app'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'none'"],
      scriptSrc:      ["'self'"],
      connectSrc:     ["'self'", FRONTEND],
      imgSrc:         ["'self'", 'data:', 'https://lh3.googleusercontent.com'],
      frameSrc:       ["'none'"],
      frameAncestors: ["'none'"],
      formAction:     ["'self'"],
    },
  },
  crossOriginResourcePolicy:  { policy: 'same-origin' },
  crossOriginEmbedderPolicy:  false,
  referrerPolicy:             { policy: 'strict-origin-when-cross-origin' },
  xFrameOptions:              { action: 'deny' },
  xContentTypeOptions:        true,
  strictTransportSecurity:    { maxAge: 31536000, includeSubDomains: true },
}))

// Simple request timing middleware for profiling
const REQUEST_SLOW_MS = parseInt(process.env.REQUEST_SLOW_MS || '200', 10)
app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    try {
      const durNs = Number(process.hrtime.bigint() - start)
      const durMs = Math.round(durNs / 1e6)
      const meta = `${req.method} ${req.path} ${res.statusCode} ${durMs}ms`
      if (durMs >= REQUEST_SLOW_MS) {
        console.warn('⚠️ Slow request:', meta)
      } else {
        console.debug('Request:', meta)
      }
    } catch (e) {
      // ignore timing errors
    }
  })
  next()
})
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(passport.initialize())

app.get('/', (req, res) => {
  res.json({
    name: 'FarmScore API', version: '1.0.0', status: 'running',
    endpoints: {
      'POST /api/auth/register':              'Register',
      'POST /api/auth/login':                 'Login',
      'GET  /api/auth/google':                'Google OAuth',
      'GET  /api/auth/google/callback':       'Google OAuth callback',
      'POST /api/auth/complete-google-signup':'Complete Google signup',
      'GET  /api/auth/me':                    'Get current user',
      'GET  /api/farmers':                    'Get all farmers',
      'POST /api/farmers':                    'Score + save farmer',
      'PATCH /api/farmers/:id/decision':      'Record loan decision',
      'GET  /api/admin/stats':                'Admin stats',
      'GET  /api/admin/users':                'Manage users',
    }
  })
})

app.use('/api/auth',    authRouter)
app.use('/api/score',   requireAuth, scoreRouter)
app.use('/api/farmers', requireAuth, farmersRouter)
app.use('/api/masumi',  masumiRouter)
app.use('/api/admin',   requireAuth, adminRouter)

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }))
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ error: 'Internal server error', detail: err.message })
})

async function start() {
  await verifyConnection()
  await ensureSchema()
  await verifyUserEmailConstraint()
  app.listen(PORT, () => console.log(`🌱 FarmScore API running on http://localhost:${PORT}`))
}

start()
