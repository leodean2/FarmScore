const BASE = 'http://localhost:3000';
const TEST_EMAIL = `perf-bench-${Date.now()}@example.com`;
const TEST_PASSWORD = 'Password123!';

const scoreBody = {
  name: 'Benchmark Farmer',
  county: 'Nakuru',
  crop: 'Maize',
  timing: 'planting',
  yield: 'good',
  advisory: 'monthly',
  follow: 'yes',
  size: '2.5',
  seasons: 1,
  notes: 'benchmark test',
  fertRate: 'medium',
  loss: 'low',
  prevLoan: 'no',
  purpose: 'expansion',
  coop: 'yes'
};

async function request(name, url, options) {
  const start = process.hrtime.bigint();
  const res = await fetch(url, options);
  const end = process.hrtime.bigint();
  const durMs = Number(end - start) / 1e6;
  let body;
  try { body = await res.text(); } catch(e) { body = '<failed to read body>'; }
  console.log(`\n=== ${name} ===`);
  console.log(`status: ${res.status}`);
  console.log(`duration: ${durMs.toFixed(1)}ms`);
  console.log(`body: ${body.substring(0, 1000)}`);
  return { res, body };
}

async function run() {
  console.log('Benchmarking backend endpoints...');

  const register = await request('POST /api/auth/register', `${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bench Tester', email: TEST_EMAIL, password: TEST_PASSWORD, role: 'farmer' })
  });

  if (register.res.status !== 201) return;
  const registerJson = JSON.parse(register.body);
  const token = registerJson.token;

  await request('POST /api/auth/login', `${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });

  const postFarmer = await request('POST /api/farmers', `${BASE}/api/farmers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(scoreBody)
  });

  if (postFarmer.res.status !== 201) return;
  const farmerJson = JSON.parse(postFarmer.body);
  const farmerId = farmerJson.farmerId;

  await request('GET /api/farmers', `${BASE}/api/farmers`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  await request('GET /api/farmers/:id', `${BASE}/api/farmers/${encodeURIComponent(farmerId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  await request('GET /api/farmers/:id/graph', `${BASE}/api/farmers/${encodeURIComponent(farmerId)}/graph`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

run().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});