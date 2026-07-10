function buildAuthRedirect(frontendUrl, { token, user, googleProfile } = {}) {
  const baseUrl = (frontendUrl || process.env.FRONTEND_URL || 'https://farm-score.vercel.app').replace(/\/$/, '')
  const params = new URLSearchParams()

  if (token) params.set('token', token)
  if (user) {
    params.set('id', user.id || '')
    params.set('name', user.name || '')
    params.set('email', user.email || '')
    params.set('role', user.role || '')
  }
  if (googleProfile) {
    params.set('mode', 'complete-profile')
    params.set('googleId', googleProfile.googleId || '')
    params.set('name', googleProfile.name || '')
    params.set('email', googleProfile.email || '')
    params.set('avatar', googleProfile.avatar || '')
  }

  return `${baseUrl}/auth/callback${params.toString() ? `?${params.toString()}` : ''}`
}

module.exports = { buildAuthRedirect }
