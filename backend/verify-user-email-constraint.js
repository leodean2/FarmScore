const { verifyConnection, verifyUserEmailConstraint } = require('./db/neo4j')

async function run() {
  try {
    await verifyConnection()
    const ok = await verifyUserEmailConstraint()
    process.exit(ok ? 0 : 1)
  } catch (err) {
    console.error('Verification failed:', err)
    process.exit(1)
  }
}

run()
