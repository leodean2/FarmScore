const jwt = require('jsonwebtoken')

// ── Verify JWT token ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ success: false, error: 'Authentication required.' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' })
  }
}

// ── Role guards ───────────────────────────────────────────────────────────────
function requireFarmer(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ success: false, error: 'Farmer access required.' })
    }
    next()
  })
}

function requireLender(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'lender' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Lender access required.' })
    }
    next()
  })
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required.' })
    }
    next()
  })
}

module.exports = { requireAuth, requireFarmer, requireLender, requireAdmin }