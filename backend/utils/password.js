const crypto = require('crypto')
let bcrypt
try {
  // prefer native bcrypt if available for legacy fallbacks
  bcrypt = require('bcrypt')
} catch (e) {
  try { bcrypt = require('bcryptjs') } catch (e2) { bcrypt = null }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64')
  const derived = crypto.scryptSync(password, salt, 64)
  return `scrypt:v1$${salt}$${derived.toString('base64')}`
}

async function verifyPassword(password, stored) {
  if (!stored) return { valid: false }
  if (stored.startsWith('scrypt:v1$')) {
    const parts = stored.split('$')
    const salt = parts[2]
    const keyB64 = parts[3]
    const derived = crypto.scryptSync(password, salt, 64)
    const expected = Buffer.from(keyB64, 'base64')
    const valid = expected.length === derived.length && crypto.timingSafeEqual(derived, expected)
    return { valid, legacy: false }
  }

  // Fallback to bcrypt/bcryptjs for legacy hashes
  if (bcrypt) {
    try {
      const valid = await bcrypt.compare(password, stored)
      return { valid, legacy: valid ? 'bcrypt' : false }
    } catch (e) {
      return { valid: false, legacy: false }
    }
  }

  return { valid: false, legacy: false }
}

module.exports = { hashPassword, verifyPassword }
