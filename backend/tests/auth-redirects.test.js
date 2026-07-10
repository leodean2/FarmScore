const test = require('node:test')
const assert = require('node:assert/strict')
const { buildAuthRedirect } = require('../utils/auth')

test('buildAuthRedirect sends new Google users to the completion callback', () => {
  const url = buildAuthRedirect('https://farm-score.vercel.app', {
    googleProfile: {
      googleId: '12345',
      name: 'Asha Mwangi',
      email: 'asha@example.com',
      avatar: 'https://example.com/avatar.png',
    },
  })

  const parsed = new URL(url)
  assert.equal(parsed.origin + parsed.pathname, 'https://farm-score.vercel.app/auth/callback')
  assert.equal(parsed.searchParams.get('mode'), 'complete-profile')
  assert.equal(parsed.searchParams.get('googleId'), '12345')
  assert.equal(parsed.searchParams.get('name'), 'Asha Mwangi')
  assert.equal(parsed.searchParams.get('email'), 'asha@example.com')
})

test('buildAuthRedirect falls back to the production frontend URL when none is provided', () => {
  delete process.env.FRONTEND_URL
  const url = buildAuthRedirect('', {
    user: { id: 'user_2', name: 'Grace', email: 'grace@example.com', role: 'farmer' },
  })

  const parsed = new URL(url)
  assert.equal(parsed.origin + parsed.pathname, 'https://farm-score.vercel.app/auth/callback')
})

test('buildAuthRedirect sends existing Google users to the dashboard callback', () => {
  const url = buildAuthRedirect('https://farm-score.vercel.app', {
    token: 'demo-token',
    user: { id: 'user_1', name: 'Asha Mwangi', email: 'asha@example.com', role: 'lender' },
  })

  const parsed = new URL(url)
  assert.equal(parsed.origin + parsed.pathname, 'https://farm-score.vercel.app/auth/callback')
  assert.equal(parsed.searchParams.get('token'), 'demo-token')
  assert.equal(parsed.searchParams.get('role'), 'lender')
  assert.equal(parsed.searchParams.get('email'), 'asha@example.com')
})
