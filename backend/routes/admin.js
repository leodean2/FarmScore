const express = require('express')
const router  = express.Router()
const { runQuery } = require('../db/neo4j')

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const records = await runQuery(`
      MATCH (u:User)
      RETURN u.id AS id, u.name AS name, u.email AS email,
             u.role AS role, u.organization AS organization,
             u.createdAt AS createdAt, u.status AS status
      ORDER BY u.createdAt DESC
    `)
    const users = records.map(r => ({
      id:           r.get('id'),
      name:         r.get('name'),
      email:        r.get('email'),
      role:         r.get('role'),
      organization: r.get('organization') || '',
      createdAt:    r.get('createdAt'),
      status:       r.get('status') || 'active',
    }))
    return res.json({ success: true, count: users.length, users })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users', detail: err.message })
  }
})

// ── PATCH /api/admin/users/:id ────────────────────────────────────────────────
router.patch('/users/:id', async (req, res) => {
  try {
    const { role, status } = req.body
    const allowed = { roles: ['farmer', 'lender', 'admin'], statuses: ['active', 'suspended'] }
    if (role   && !allowed.roles.includes(role))     return res.status(400).json({ error: 'Invalid role' })
    if (status && !allowed.statuses.includes(status)) return res.status(400).json({ error: 'Invalid status' })

    await runQuery(`
      MATCH (u:User { id: $id })
      SET u.role   = COALESCE($role,   u.role),
          u.status = COALESCE($status, u.status)
    `, { id: req.params.id, role: role || null, status: status || null })

    // Write audit log
    await runQuery(`
      CREATE (a:AuditLog {
        id:         $logId,
        action:     'user_updated',
        targetId:   $targetId,
        actorId:    $actorId,
        detail:     $detail,
        createdAt:  $createdAt
      })
    `, {
      logId:    `audit_${Date.now()}`,
      targetId: req.params.id,
      actorId:  req.user.id,
      detail:   JSON.stringify({ role, status }),
      createdAt: new Date().toISOString(),
    })

    return res.json({ success: true, message: 'User updated' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user', detail: err.message })
  }
})

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' })
    await runQuery(`MATCH (u:User { id: $id }) DETACH DELETE u`, { id: req.params.id })
    return res.json({ success: true, message: 'User deleted' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user', detail: err.message })
  }
})

// ── GET /api/admin/audit ──────────────────────────────────────────────────────
router.get('/audit', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50
    const records = await runQuery(`
      MATCH (a:AuditLog)
      RETURN a ORDER BY a.createdAt DESC LIMIT $limit
    `, { limit })
    const logs = records.map(r => r.get('a').properties)
    return res.json({ success: true, count: logs.length, logs })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch audit log', detail: err.message })
  }
})

// ── GET /api/admin/settings ───────────────────────────────────────────────────
router.get('/settings', async (req, res) => {
  try {
    const records = await runQuery(`MATCH (s:Settings { id: 'global' }) RETURN s`)
    const settings = records.length
      ? records[0].get('s').properties
      : { id: 'global', allowRegistration: true, requireLenderSecret: true, maxFarmersPerUser: 10 }
    return res.json({ success: true, settings })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch settings', detail: err.message })
  }
})

// ── PATCH /api/admin/settings ─────────────────────────────────────────────────
router.patch('/settings', async (req, res) => {
  try {
    const { allowRegistration, requireLenderSecret, maxFarmersPerUser } = req.body
    await runQuery(`
      MERGE (s:Settings { id: 'global' })
      SET s.allowRegistration   = COALESCE($allowRegistration,   s.allowRegistration),
          s.requireLenderSecret = COALESCE($requireLenderSecret, s.requireLenderSecret),
          s.maxFarmersPerUser   = COALESCE($maxFarmersPerUser,   s.maxFarmersPerUser),
          s.updatedAt           = $updatedAt
    `, {
      allowRegistration:   allowRegistration   ?? null,
      requireLenderSecret: requireLenderSecret ?? null,
      maxFarmersPerUser:   maxFarmersPerUser   ?? null,
      updatedAt: new Date().toISOString(),
    })
    return res.json({ success: true, message: 'Settings updated' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update settings', detail: err.message })
  }
})

module.exports = router
