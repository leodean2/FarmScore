const API_BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data
}

export const api = {
  // Auth
  login:    (body) => request('POST', '/auth/login',    body),
  register: (body) => request('POST', '/auth/register', body),

  // Scoring
  score:    (body) => request('POST', '/score',         body),

  // Farmers
  getFarmers:     ()         => request('GET',   '/farmers'),
  getFarmer:      (id)       => request('GET',   `/farmers/${id}`),
  createFarmer:   (body)     => request('POST',  '/farmers',              body),
  makeDecision:   (id, body) => request('PATCH', `/farmers/${id}/decision`, body),

  // Masumi
  availability:  ()     => request('GET',  '/masumi/availability'),
  startJob:      (body) => request('POST', '/masumi/start-job',       body),
  getJobStatus:  (id)   => request('GET',  `/masumi/get-job-status?jobId=${id}`),
}