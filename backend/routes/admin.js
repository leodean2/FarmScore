const express = require('express')
const router  = express.Router()
const { runQuery } = require('../db/neo4j')
const { requireAdmin } = require('../middleware/auth')

// All admin routes require admin role
router.use(requireAdmin)

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [users, farmers, lenders, decisions] = await Promise.all([
      runQuery(`MATCH (u:User) RETURN count(u) as count`),
      runQuery(`MATCH (u:User { role: 'farmer' }) RETURN count(u) as count`),
      runQuery(`MATCH (u:User { role: 'lender' }) RETURN count(u) as count`),
      runQuery(`MATCH (f:Farmer) WHERE f.decision IS NOT NULL RETURN count(f) as count`),
    ])

    return res.json({
      success: true,
      stats: {
        totalUsers:     users[0]?.get('count').toNumber()     || 0,
        totalFarmers:   farmers[0]?.get('count').toNumber()   || 0,
        totalLenders:   lenders[0]?.get('count').toNumber()   || 0,
        totalDecisions: decisions[0]?.get('count').toNumber() || 0,
      }
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query
    const cypher   = role
      ? `MATCH (u:User { role: $role }) RETURN u ORDER BY u.createdAt DESC`
      : `MATCH (u:User) RETURN u ORDER BY u.createdAt DESC`

    const records = await runQuery(cypher, { role: role || '' })
    const users   = records.map(r => {
      const u = r.get('u').properties
      return {
        id:           u.id,
        name:         u.name,
        email:        u.email,
        role:         u.role,
        organization: u.organization || '',
        status:       u.status || 'active',
        createdAt:    u.createdAt,
        googleId:     u.googleId ? true : false,
      }
    })

    return res.json({ success: true, count: users.length, users })
  } catch (err) {
    console.error('Admin users error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body
    const validRoles = ['farmer', 'lender', 'admin']

    if (!validRoles.includes(role))
      return res.status(400).json({ success: false, error: `Invalid role. Must be: ${validRoles.join(', ')}` })

    if (req.params.id === req.user.id && role !== 'admin')
      return res.status(400).json({ success: false, error: 'You cannot change your own admin role.' })

    await runQuery(
      `MATCH (u:User { id: $id }) SET u.role = $role, u.roleUpdatedAt = $updatedAt, u.roleUpdatedBy = $updatedBy`,
      { id: req.params.id, role, updatedAt: new Date().toISOString(), updatedBy: req.user.id }
    )
    await logAudit(req.user.id, 'ROLE_CHANGE', `Changed user ${req.params.id} role to ${role}`)

    return res.json({ success: true, message: `User role updated to ${role}` })
  } catch (err) {
    console.error('Role update error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const validStatuses = ['active', 'suspended']

    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, error: 'Status must be: active or suspended' })

    if (req.params.id === req.user.id)
      return res.status(400).json({ success: false, error: 'You cannot change your own account status.' })

    await runQuery(
      `MATCH (u:User { id: $id }) SET u.status = $status, u.statusUpdatedAt = $updatedAt`,
      { id: req.params.id, status, updatedAt: new Date().toISOString() }
    )
    await logAudit(req.user.id, 'STATUS_CHANGE', `${status === 'suspended' ? 'Suspended' : 'Activated'} user ${req.params.id}`)

    return res.json({ success: true, message: `User ${status === 'suspended' ? 'suspended' : 'activated'}` })
  } catch (err) {
    console.error('Status update error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ success: false, error: 'You cannot delete your own account.' })

    await runQuery(`MATCH (u:User { id: $id }) DETACH DELETE u`, { id: req.params.id })
    await logAudit(req.user.id, 'USER_DELETED', `Deleted user ${req.params.id}`)

    return res.json({ success: true, message: 'User deleted.' })
  } catch (err) {
    console.error('Delete user error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/audit
router.get('/audit', async (req, res) => {
  try {
    const records = await runQuery(
      `MATCH (a:AuditLog) RETURN a ORDER BY a.timestamp DESC LIMIT 100`
    )
    const logs = records.map(r => r.get('a').properties)
    return res.json({ success: true, count: logs.length, logs })
  } catch (err) {
    console.error('Audit log error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/settings
router.get('/settings', (req, res) => {
  return res.json({
    success: true,
    settings: {
      appName:        'FarmScore',
      version:        '1.0.0',
      environment:    process.env.NODE_ENV || 'development',
      frontendUrl:    process.env.FRONTEND_URL,
      neo4jConnected: true,
      masumiEnabled:  !!process.env.MASUMI_API_KEY,
      googleOAuth:    !!process.env.GOOGLE_CLIENT_ID,
    }
  })
})

// PATCH /api/admin/settings/lender-secret
router.patch('/settings/lender-secret', async (req, res) => {
  try {
    const { newSecret } = req.body
    if (!newSecret || newSecret.length < 15)
      return res.status(400).json({ success: false, error: 'New secret must be at least 15 characters.' })

    await logAudit(req.user.id, 'SECRET_ROTATED', 'Lender secret key was rotated')
    return res.json({
      success: true,
      message: 'Lender secret updated. Update LENDER_SECRET in your .env and restart the server.'
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── Audit log helper ──────────────────────────────────────────────────────────
async function logAudit(userId, action, detail) {
  try {
    await runQuery(
      `CREATE (a:AuditLog { id: $id, userId: $userId, action: $action, detail: $detail, timestamp: $timestamp })`,
      { id: `audit_${Date.now()}`, userId, action, detail, timestamp: new Date().toISOString() }
    )
  } catch (err) {
    console.error('Audit log write failed:', err.message)
  }
}

module.exports = router
