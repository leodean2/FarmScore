const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { runQuery } = require('../db/neo4j');

const router = express.Router();

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password and role are required' });
    }
    if (!['farmer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role must be farmer or admin' });
    }

    // Check if email already exists
    const existing = await runQuery('MATCH (u:User { email: $email }) RETURN u', { email });
    if (existing.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash   = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}`;

    await runQuery(`
      CREATE (u:User {
        id:        $userId,
        name:      $name,
        email:     $email,
        password:  $hash,
        role:      $role,
        createdAt: $createdAt
      })
    `, { userId, name, email, hash, role, createdAt: new Date().toISOString() });

    const token = jwt.sign({ userId, name, email, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ success: true, token, user: { userId, name, email, role } });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const records = await runQuery('MATCH (u:User { email: $email }) RETURN u', { email });
    if (!records.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const u = records[0].get('u').properties;
    const match = await bcrypt.compare(password, u.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: u.id, name: u.name, email: u.email, role: u.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({ success: true, token, user: { userId: u.id, name: u.name, email: u.email, role: u.role } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

module.exports = router;
