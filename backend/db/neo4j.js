const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
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

// Run a Cypher query and return results
async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try {
    console.log('📝 Running query with params:', Object.keys(params))
    const result = await session.run(cypher, params);
    console.log('✅ Query successful, records:', result.records.length)
    return result.records;
  } catch (err) {
    console.error('❌ Query failed:', err.message)
    console.error('Cypher:', cypher)
    throw err;
  } finally {
    await session.close();
  }
}

module.exports = { driver, verifyConnection, runQuery };