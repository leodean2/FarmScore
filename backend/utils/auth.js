const DEFAULT_FRONTEND = 'https://farm-score.vercel.app'

/**
 * Builds the frontend redirect URL after Google OAuth.
 *
 * @param {string} frontendUrl  - Base frontend URL (falls back to DEFAULT_FRONTEND if empty)
 * @param {object} opts
 * @param {object} [opts.googleProfile] - Present for new users needing profile completion
 * @param {object} [opts.user]          - Present for existing users
 * @param {string} [opts.token]         - JWT token for existing users
 */
function buildAuthRedirect(frontendUrl, { googleProfile, user, token } = {}) {
  const base = (frontendUrl || DEFAULT_FRONTEND).replace(/\/$/, '')
  const params = new URLSearchParams()

  if (googleProfile) {
    params.set('mode', 'complete-profile')
    params.set('googleId', googleProfile.googleId)
    params.set('name',     googleProfile.name)
    params.set('email',    googleProfile.email)
    if (googleProfile.avatar) params.set('avatar', googleProfile.avatar)
  } else {
    if (token)      params.set('token', token)
    if (user.id)    params.set('id',    user.id)
    if (user.name)  params.set('name',  user.name)
    if (user.email) params.set('email', user.email)
    if (user.role)  params.set('role',  user.role)
  }

  return `${base}/auth/callback?${params.toString()}`
}

module.exports = { buildAuthRedirect }
