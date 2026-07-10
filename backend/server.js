const express  = require('express')
const cors     = require('cors')
const passport = require('./middleware/passport')
require('dotenv').config()

const { requireAuth }      = require('./middleware/auth')
const { verifyConnection } = require('./db/neo4j')
const authRouter    = require('./routes/auth')
const scoreRouter   = require('./routes/score')
const farmersRouter = require('./routes/farmers')
const masumiRouter  = require('./routes/masumi')
const adminRouter   = require('./routes/admin')

const app  = express()
const PORT = process.env.PORT || 3000

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
  app.listen(PORT, () => console.log(`🌱 FarmScore API running on http://localhost:${PORT}`))
}

start()
