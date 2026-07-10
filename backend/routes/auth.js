const express  = require('express')
const router   = express.Router()
const { hashPassword, verifyPassword } = require('../utils/password')
const jwt      = require('jsonwebtoken')
const passport = require('../middleware/passport')
const { runQuery } = require('../db/neo4j')

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, organization, adminSecret } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ success: false, error: 'Name, email and password are required.' })

    const requestedRole = role || 'farmer'

    if (requestedRole === 'admin') {
      if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET)
        return res.status(403).json({ success: false, error: 'Invalid admin secret key.' })
    }
    if (requestedRole === 'lender') {
      if (!organization || !organization.trim())
        return res.status(400).json({ success: false, error: 'Organization is required for lender accounts.' })
      if (!adminSecret || adminSecret !== process.env.LENDER_SECRET)
        return res.status(403).json({ success: false, error: 'Invalid lender secret key. Contact your administrator.' })
    }

    const hashedPassword = hashPassword(password)
    const existing = await runQuery(`MATCH (u:User { email: $email }) RETURN u LIMIT 1`, { email }, { accessMode: 'READ' })
    if (existing.length > 0)
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' })
    const records = await runQuery(
      `CREATE (u:User {
        id: $id, name: $name, email: $email, password: $password,
        role: $role, organization: $organization, status: 'active', createdAt: $createdAt
      }) RETURN u`,
      {
        id: `user_${Date.now()}`, name, email, password: hashedPassword,
        role: requestedRole, organization: organization || '', createdAt: new Date().toISOString()
      }
    )

    const user  = records[0].get('u').properties
    const token = generateToken(user)
    return res.status(201).json({
      success: true, token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })
  } catch (err) {
    console.error('Register error:', err)
    return res.status(500).json({ success: false, error: 'Registration failed.' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ success: false, error: 'Email and password are required.' })

    const records = await runQuery(`MATCH (u:User { email: $email }) RETURN u LIMIT 1`, { email }, { accessMode: 'READ' })
    if (!records.length)
      return res.status(401).json({ success: false, error: 'Invalid email or password.' })

    const user = records[0].get('u').properties

    if (user.status === 'suspended')
      return res.status(403).json({ success: false, error: 'Your account has been suspended. Contact the administrator.' })

    if (!user.password)
      return res.status(401).json({ success: false, error: 'This account uses Google sign-in. Please continue with Google.' })

    const { valid, legacy } = await verifyPassword(password, user.password)
    if (!valid) return res.status(401).json({ success: false, error: 'Invalid email or password.' })

    // If the account used a legacy bcrypt hash, migrate to scrypt on successful login
    if (legacy === 'bcrypt') {
      try {
        const newHash = hashPassword(password)
        runQuery(`MATCH (u:User { id: $id }) SET u.password = $password`, { id: user.id, password: newHash })
      } catch (e) {
        console.warn('Password migration failed:', e.message)
      }
    }

    const token = generateToken(user)
    return res.json({
      success: true, token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, organization: user.organization }
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ success: false, error: 'Login failed.' })
  }
})

// GET /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }))

// GET /api/auth/google/callback
router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'https://farm-score.vercel.app'}/login?error=google_failed`,
  }),
  (req, res) => {
    try {
      const user      = req.user
      const FRONTEND  = process.env.FRONTEND_URL || 'https://farm-score.vercel.app'

      if (user.isNewUser) {
        const params = new URLSearchParams({ googleId: user.googleId, name: user.name, email: user.email, avatar: user.avatar || '' })
        return res.redirect(`${FRONTEND}/complete-profile?${params.toString()}`)
      }

      const token  = generateToken(user)
      const params = new URLSearchParams({ token, id: user.id, name: user.name, email: user.email, role: user.role })
      const dest   = user.role === 'admin' ? '/admin' : user.role === 'lender' ? '/lender' : '/farmer'
      res.redirect(`${FRONTEND}${dest}?${params.toString()}`)
    } catch (err) {
      console.error('Google callback error:', err)
      res.redirect(`${process.env.FRONTEND_URL || 'https://farm-score.vercel.app'}/login?error=callback_failed`)
    }
  }
)

// POST /api/auth/complete-google-signup
router.post('/complete-google-signup', async (req, res) => {
  try {
    const { googleId, name, email, avatar, role, organization, adminSecret } = req.body
    if (!googleId || !email || !role)
      return res.status(400).json({ success: false, error: 'Missing required fields.' })

    if (role === 'admin') {
      if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET)
        return res.status(403).json({ success: false, error: 'Invalid admin secret key.' })
    }
    if (role === 'lender') {
      if (!organization || !organization.trim())
        return res.status(400).json({ success: false, error: 'Organization is required for lender accounts.' })
      if (!adminSecret || adminSecret !== process.env.LENDER_SECRET)
        return res.status(403).json({ success: false, error: 'Invalid lender secret key. Contact your administrator.' })
    }

    const existing = await runQuery(`MATCH (u:User { email: $email }) RETURN u`, { email })
    if (existing.length > 0) {
      const user  = existing[0].get('u').properties
      const token = generateToken(user)
      return res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
    }

    const records = await runQuery(
      `CREATE (u:User {
        id: $id, name: $name, email: $email, googleId: $googleId, avatar: $avatar,
        role: $role, organization: $organization, status: 'active', createdAt: $createdAt
      }) RETURN u`,
      {
        id: `user_${Date.now()}`, name, email, googleId, avatar: avatar || '',
        role, organization: organization || '', createdAt: new Date().toISOString()
      }
    )

    const user  = records[0].get('u').properties
    const token = generateToken(user)
    return res.status(201).json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    console.error('Complete Google signup error:', err)
    return res.status(500).json({ success: false, error: 'Signup failed.' })
  }
})

// GET /api/auth/me
router.get('/me', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ success: false, error: 'No token.' })
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return res.json({ success: true, user: decoded })
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token.' })
  }
})

module.exports = router
