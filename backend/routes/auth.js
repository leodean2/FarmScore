const express  = require('express')
const router   = express.Router()
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const passport = require('../middleware/passport')
const { runQuery } = require('../db/neo4j')

// ── Token generator ───────────────────────────────────────────────────────────
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, organization, adminSecret } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required.' })
    }

    // Validate admin secret for lender/admin registration
    if (role === 'admin') {
      if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ success: false, error: 'Invalid admin secret key.' })
      }
    }

    // Check for existing user
    const existing = await runQuery(`MATCH (u:User { email: $email }) RETURN u`, { email })
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const userId         = `user_${Date.now()}`

    const records = await runQuery(
      `CREATE (u:User {
        id:           $id,
        name:         $name,
        email:        $email,
        password:     $password,
        role:         $role,
        organization: $organization,
        createdAt:    $createdAt
      }) RETURN u`,
      {
        id:           userId,
        name,
        email,
        password:     hashedPassword,
        role:         role || 'farmer',
        organization: organization || '',
        createdAt:    new Date().toISOString(),
      }
    )

    const user  = records[0].get('u').properties
    const token = generateToken(user)

    return res.status(201).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch (err) {
    console.error('Register error:', err)
    return res.status(500).json({ success: false, error: 'Registration failed.' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' })
    }

    const records = await runQuery(`MATCH (u:User { email: $email }) RETURN u`, { email })

    if (!records.length) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' })
    }

    const user = records[0].get('u').properties

    // Google-only accounts have no password
    if (!user.password) {
      return res.status(401).json({ success: false, error: 'This account uses Google sign-in. Please continue with Google.' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' })
    }

    const token = generateToken(user)

    return res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ success: false, error: 'Login failed.' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/google
// Redirects user to Google consent screen
// ─────────────────────────────────────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
)

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/google/callback
// Google redirects here after user consents
// ─────────────────────────────────────────────────────────────────────────────
router.get('/google/callback',
  passport.authenticate('google', {
    session:  false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed`,
  }),
  (req, res) => {
    try {
      const user  = req.user
      const token = generateToken(user)

      // Redirect to frontend with token + user in query params
      // Frontend reads these and stores them in localStorage
      const params = new URLSearchParams({
        token,
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      })

      const redirectTo = user.role === 'admin'
        ? `${process.env.FRONTEND_URL}/lender`
        : `${process.env.FRONTEND_URL}/farmer`

      res.redirect(`${redirectTo}?${params.toString()}`)
    } catch (err) {
      console.error('Google callback error:', err)
      res.redirect(`${process.env.FRONTEND_URL}/login?error=callback_failed`)
    }
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Returns current user from JWT
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ success: false, error: 'No token provided.' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return res.json({ success: true, user: decoded })
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' })
  }
})

module.exports = router