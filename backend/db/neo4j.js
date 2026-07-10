const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
  {
    database: process.env.NEO4J_DATABASE,
  }
);

// Verify connectivity on startup
async function verifyConnection() {
  try {
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected successfully');
  } catch (err) {
    console.error('❌ Neo4j connection failed:', err.message);
    process.exit(1);
  }
}

async function ensureSchema() {
  const session = driver.session();
  const statements = [
    `CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE`,
    `CREATE INDEX IF NOT EXISTS FOR (u:User) ON (u.role)`,
    `CREATE CONSTRAINT IF NOT EXISTS FOR (f:Farmer) REQUIRE f.id IS UNIQUE`,
    `CREATE INDEX IF NOT EXISTS FOR (f:Farmer) ON (f.userId)`,
    `CREATE INDEX IF NOT EXISTS FOR (c:County) ON (c.name)`,
    `CREATE INDEX IF NOT EXISTS FOR (cr:Crop) ON (cr.name)`,
    `CREATE CONSTRAINT IF NOT EXISTS FOR (s:Season) REQUIRE s.id IS UNIQUE`,
    `CREATE CONSTRAINT IF NOT EXISTS FOR (a:Advisory) REQUIRE a.id IS UNIQUE`,
    `CREATE CONSTRAINT IF NOT EXISTS FOR (l:Loan) REQUIRE l.id IS UNIQUE`
  ];

  try {
    for (const statement of statements) {
      await session.run(statement);
    }
    console.log('✅ Neo4j schema constraints/indexes ensured');
  } catch (err) {
    console.error('❌ Neo4j schema ensure failed:', err.message);
    throw err;
  } finally {
    await session.close();
  }
}

async function verifyUserEmailConstraint() {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.run(`
      SHOW CONSTRAINTS YIELD labelsOrTypes, properties, type
      WHERE labelsOrTypes = ['User'] AND properties = ['email']
      RETURN type, labelsOrTypes, properties
    `);
    const exists = result.records.length > 0;
    if (exists) {
      console.log('✅ Verified Neo4j constraint on User.email');
    } else {
      console.warn('⚠️ Neo4j constraint on User.email is missing. Ensure the schema helper has run.');
    }
    return exists;
  } catch (err) {
    console.error('❌ Neo4j email constraint verification failed:', err.message);
    return false;
  } finally {
    await session.close();
  }
}

// Run a Cypher query and return results
async function runQuery(cypher, params = {}, options = {}) {
  const defaultAccessMode = options.accessMode === 'READ'
    ? neo4j.session.READ
    : options.accessMode === 'WRITE'
      ? neo4j.session.WRITE
      : options.accessMode || neo4j.session.WRITE

  const session = driver.session({
    defaultAccessMode
  });
  const SLOW_MS = parseInt(process.env.NEO4J_SLOW_MS || '100', 10)
  const start = process.hrtime.bigint()
  try {
    console.log('📝 Running query with params:', Object.keys(params))
    const result = await session.run(cypher, params);
    const durMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6)
    if (durMs >= SLOW_MS) {
      console.warn(`⚠️ Slow query ${durMs}ms — Cypher:`, cypher)
    } else {
      console.debug(`Query ${durMs}ms — records: ${result.records.length}`)
    }
    return result.records;
  } catch (err) {
    const durMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6)
    console.error('❌ Query failed:', err.message)
    console.error('Duration:', `${durMs}ms`)
    console.error('Cypher:', cypher)
    throw err;
  } finally {
    await session.close();
  }
}

module.exports = { driver, verifyConnection, ensureSchema, verifyUserEmailConstraint, runQuery };