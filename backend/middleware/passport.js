const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const { runQuery } = require('../db/neo4j')
const jwt = require('jsonwebtoken')

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email    = profile.emails?.[0]?.value
      const name     = profile.displayName
      const googleId = profile.id
      const avatar   = profile.photos?.[0]?.value

      if (!email) return done(new Error('No email from Google'), null)

      // Check if user already exists
      const existing = await runQuery(
        `MATCH (u:User { email: $email }) RETURN u`,
        { email }
      )

      if (existing.length > 0) {
        // Existing user — update Google ID and return
        await runQuery(
          `MATCH (u:User { email: $email })
           SET u.googleId = $googleId, u.avatar = $avatar`,
          { email, googleId, avatar: avatar || '' }
        )
        const user = existing[0].get('u').properties
        return done(null, { ...user, isNewUser: false })
      } else {
        // New user — don't create account yet, send to complete-profile
        return done(null, {
          isNewUser: true,
          googleId,
          name,
          email,
          avatar: avatar || '',
        })
      }
    } catch (err) {
      return done(err, null)
    }
  }
))

passport.serializeUser((user, done) => done(null, user.id || user.googleId))
passport.deserializeUser((id, done) => done(null, id))

module.exports = passport