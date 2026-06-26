/**
 * seed.js — Seeds sample farmer data into Neo4j
 * Run with: npm run seed
 */

require('dotenv').config();
const { runQuery, driver } = require('./db/neo4j');
const { calculateScore, gradeFromScore } = require('./services/scoring');

const SAMPLE_FARMERS = [
  {
    name: 'Jane Wanjiku', county: 'Nakuru', crop: 'Maize', size: 3, seasons: 8,
    timing: 'on-time', inputs: ['certified-seed', 'fertiliser', 'herbicide'],
    fertRate: 'correct', yield: 'excellent', loss: 'none',
    advisory: 'regular', follow: 'always', coop: 'yes-active',
    prevLoan: 'yes-repaid', purpose: 'inputs',
    notes: 'Active member of Nakuru Maize Cooperative. Yield records verified by extension worker.'
  },
  {
    name: 'Peter Otieno', county: 'Kisii', crop: 'Tomatoes', size: 1.5, seasons: 4,
    timing: 'on-time', inputs: ['certified-seed', 'fertiliser', 'pesticide'],
    fertRate: 'correct', yield: 'good', loss: 'minor',
    advisory: 'regular', follow: 'mostly', coop: 'yes-active',
    prevLoan: 'no', purpose: 'inputs',
    notes: 'First-time borrower. Good extension relationship with Kisii ATC.'
  },
  {
    name: 'Mary Chebet', county: 'Uasin Gishu', crop: 'Maize', size: 5, seasons: 12,
    timing: 'on-time', inputs: ['certified-seed', 'fertiliser', 'compost'],
    fertRate: 'under', yield: 'good', loss: 'minor',
    advisory: 'sometimes', follow: 'mostly', coop: 'yes-inactive',
    prevLoan: 'yes-repaid', purpose: 'equipment',
    notes: 'Experienced farmer. Advisory access is occasional due to distance from extension office.'
  },
  {
    name: 'Samuel Kamau', county: 'Nyandarua', crop: 'Potatoes', size: 2, seasons: 3,
    timing: 'late', inputs: ['fertiliser'],
    fertRate: 'under', yield: 'fair', loss: 'moderate',
    advisory: 'sometimes', follow: 'sometimes', coop: 'no',
    prevLoan: 'no', purpose: 'inputs',
    notes: 'Faced late rains last season. Planning to improve timing with input financing.'
  },
  {
    name: 'Grace Akinyi', county: 'Bungoma', crop: 'Beans', size: 1, seasons: 2,
    timing: 'late', inputs: ['certified-seed'],
    fertRate: 'na', yield: 'fair', loss: 'moderate',
    advisory: 'rarely', follow: 'sometimes', coop: 'no',
    prevLoan: 'no', purpose: 'inputs',
    notes: 'New farmer building track record. Would benefit from advisory support alongside loan.'
  },
  {
    name: 'David Mwangi', county: "Murang'a", crop: 'Kale', size: 0.5, seasons: 6,
    timing: 'on-time', inputs: ['certified-seed', 'compost', 'irrigation'],
    fertRate: 'correct', yield: 'good', loss: 'none',
    advisory: 'regular', follow: 'always', coop: 'yes-active',
    prevLoan: 'yes-active', purpose: 'irrigation',
    notes: 'Smallholder with reliable irrigation setup. Active kale supply to local market.'
  },
  {
    name: 'Fatuma Hassan', county: 'Meru', crop: 'Maize', size: 4, seasons: 9,
    timing: 'missed', inputs: ['none'],
    fertRate: 'na', yield: 'poor', loss: 'major',
    advisory: 'never', follow: 'rarely', coop: 'no',
    prevLoan: 'yes-default', purpose: 'inputs',
    notes: 'Experienced significant drought impact last two seasons.'
  },
  {
    name: 'John Kipkoech', county: 'Nandi', crop: 'Maize', size: 6, seasons: 15,
    timing: 'on-time', inputs: ['certified-seed', 'fertiliser', 'herbicide', 'pesticide'],
    fertRate: 'correct', yield: 'excellent', loss: 'none',
    advisory: 'regular', follow: 'always', coop: 'yes-active',
    prevLoan: 'yes-repaid', purpose: 'equipment',
    notes: 'Veteran farmer with strong cooperative ties. Consistent yields over 15 seasons.'
  },
];

async function seed() {
  console.log('🌱 Seeding FarmScore sample data into Neo4j...\n');

  // Clear existing data
  await runQuery('MATCH (n) DETACH DELETE n');
  console.log('🗑️  Cleared existing data\n');

  for (const data of SAMPLE_FARMERS) {
    const { total, agrScore, prodScore, advScore, finScore } = calculateScore(data);
    const { grade } = gradeFromScore(total);
    const farmerId   = `farmer_${data.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const submittedAt = new Date().toISOString();

    await runQuery(`
      MERGE (f:Farmer { id: $farmerId })
      SET f.name        = $name,
          f.county      = $county,
          f.crop        = $crop,
          f.size        = $size,
          f.seasons     = $seasons,
          f.notes       = $notes,
          f.scoreTotal  = $total,
          f.scoreAgr    = $agrScore,
          f.scoreProd   = $prodScore,
          f.scoreAdv    = $advScore,
          f.scoreFin    = $finScore,
          f.grade       = $grade,
          f.submittedAt = $submittedAt

      MERGE (s:Season { id: $farmerId + '_season' })
      SET s.timing     = $timing,
          s.inputs     = $inputs,
          s.fertRate   = $fertRate,
          s.yieldLevel = $yieldLevel,
          s.cropLoss   = $loss
      MERGE (f)-[:HAS_SEASON]->(s)

      MERGE (a:Advisory { id: $farmerId + '_advisory' })
      SET a.frequency     = $advisory,
          a.followThrough = $follow,
          a.cooperative   = $coop
      MERGE (f)-[:ENGAGED_WITH]->(a)

      MERGE (l:Loan { id: $farmerId + '_loan' })
      SET l.history = $prevLoan,
          l.purpose = $purpose
      MERGE (f)-[:APPLIED_FOR]->(l)

      MERGE (c:County { name: $county })
      MERGE (f)-[:LOCATED_IN]->(c)

      MERGE (cr:Crop { name: $crop })
      MERGE (f)-[:GROWS]->(cr)
    `, {
      farmerId, submittedAt,
      name:       data.name,
      county:     data.county,
      crop:       data.crop,
      size:       data.size,
      seasons:    data.seasons,
      notes:      data.notes || '',
      total, agrScore, prodScore, advScore, finScore, grade,
      timing:     data.timing,
      inputs:     JSON.stringify(data.inputs || []),
      fertRate:   data.fertRate || '',
      yieldLevel: data.yield,
      loss:       data.loss || 'none',
      advisory:   data.advisory,
      follow:     data.follow,
      coop:       data.coop || 'no',
      prevLoan:   data.prevLoan || 'no',
      purpose:    data.purpose || '',
    });

    console.log(`✅ ${data.name} — Score: ${total} (${grade})`);
  }

  console.log('\n🎉 Seed complete. 8 farmers loaded into Neo4j.');
  await driver.close();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});