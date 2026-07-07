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

      let user

      if (existing.length > 0) {
        // Update existing user with Google ID if not set
        await runQuery(
          `MATCH (u:User { email: $email })
           SET u.googleId = $googleId, u.avatar = $avatar
           RETURN u`,
          { email, googleId, avatar: avatar || '' }
        )
        user = existing[0].get('u').properties
      } else {
        // Create new user — default role is farmer
        const records = await runQuery(
          `CREATE (u:User {
            id:        $id,
            name:      $name,
            email:     $email,
            googleId:  $googleId,
            avatar:    $avatar,
            role:      'farmer',
            createdAt: $createdAt
          }) RETURN u`,
          {
            id:        `user_${Date.now()}`,
            name,
            email,
            googleId,
            avatar:    avatar || '',
            createdAt: new Date().toISOString(),
          }
        )
        user = records[0].get('u').properties
      }

      return done(null, user)
    } catch (err) {
      return done(err, null)
    }
  }
))

passport.serializeUser((user, done)   => done(null, user.id))
passport.deserializeUser((id, done)   => done(null, id))

module.exports = passport