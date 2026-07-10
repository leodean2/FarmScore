const metrics = { hits: 0, misses: 0, sets: 0, invalidations: 0 }

// ── In-memory fallback ────────────────────────────────────────────────────────
const store = new Map()

const memory = {
  get(key) {
    const entry = store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) { store.delete(key); return null }
    return entry.value
  },
  set(key, value, ttlMs) {
    store.set(key, { value, expiresAt: Date.now() + ttlMs })
  },
  del(...keys) {
    keys.forEach(k => store.delete(k))
  },
  keys() {
    return store.keys()
  },
}

// ── Redis client (optional) ───────────────────────────────────────────────────
let redis = null

if (process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis')
    redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, enableOfflineQueue: false })
    redis.on('error', err => {
      console.warn('Redis error — falling back to memory cache:', err.message)
      redis = null
    })
    redis.connect().then(() => console.log('✅ Redis cache connected')).catch(() => { redis = null })
  } catch {
    console.warn('ioredis not installed — using in-memory cache')
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
async function get(key) {
  try {
    if (redis) {
      const raw = await redis.get(key)
      if (raw) { metrics.hits++; return JSON.parse(raw) }
      metrics.misses++; return null
    }
  } catch { /* fall through */ }

  const val = memory.get(key)
  val ? metrics.hits++ : metrics.misses++
  return val
}

async function set(key, value, ttlMs = 60_000) {
  metrics.sets++
  try {
    if (redis) {
      await redis.set(key, JSON.stringify(value), 'PX', ttlMs)
      return
    }
  } catch { /* fall through */ }
  memory.set(key, value, ttlMs)
}

async function del(...keys) {
  metrics.invalidations += keys.length
  try {
    if (redis) { await redis.del(...keys); return }
  } catch { /* fall through */ }
  memory.del(...keys)
}

async function invalidatePrefix(prefix) {
  try {
    if (redis) {
      const keys = await redis.keys(`${prefix}*`)
      if (keys.length) { metrics.invalidations += keys.length; await redis.del(...keys) }
      return
    }
  } catch { /* fall through */ }

  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) { memory.del(key); metrics.invalidations++ }
  }
}

function getMetrics() {
  const total = metrics.hits + metrics.misses
  return {
    ...metrics,
    hitRate: total ? `${((metrics.hits / total) * 100).toFixed(1)}%` : 'n/a',
    backend: redis ? 'redis' : 'memory',
  }
}

module.exports = { get, set, del, invalidatePrefix, getMetrics }
