const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.MASUMI_API_KEY = 'test-key';
const { router } = require('../routes/masumi');

async function request(path, options = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api/masumi', router);

  const server = app.listen(0);
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'test-key',
        ...(options.headers || {})
      },
      ...options
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('availability endpoint reports FarmScore as available', async () => {
  const { status, body } = await request('/api/masumi/availability');
  assert.equal(status, 200);
  assert.equal(body.available, true);
  assert.equal(body.service, 'FarmScore');
});

test('start-job stores a job and returns a score payload', async () => {
  const { status, body } = await request('/api/masumi/start-job', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Amina',
      county: 'Kakamega',
      crop: 'maize',
      timing: 'on-time',
      yield: 'good',
      advisory: 'regular',
      follow: 'always',
      fertRate: 'correct',
      loss: 'none',
      coop: 'yes-active',
      prevLoan: 'yes-repaid',
      inputs: ['certified-seed', 'fertiliser'],
      seasons: 4
    })
  });

  assert.equal(status, 202);
  assert.equal(body.success, true);
  assert.match(body.jobId, /^job-/);
  assert.equal(body.status, 'completed');
  assert.equal(body.result.score.total >= 0, true);
});
