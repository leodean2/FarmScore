const API_BASE = '/api'

function getToken() { return localStorage.getItem('token') }

export async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res  = await fetch(`${API_BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data
}

export const api = {
  request,
  // Auth
  login:                (body) => request('POST', '/auth/login',                   body),
  register:             (body) => request('POST', '/auth/register',                body),
  completeGoogleSignup: (body) => request('POST', '/auth/complete-google-signup',  body),
  // Scoring
  score:    (body) => request('POST', '/score',         body),
  // Farmers
  getFarmers:   ()         => request('GET',   '/farmers'),
  getFarmer:    (id)       => request('GET',   `/farmers/${id}`),
  createFarmer: (body)     => request('POST',  '/farmers',               body),
  makeDecision: (id, body) => request('PATCH', `/farmers/${id}/decision`, body),
  // Admin
  getStats:     ()         => request('GET',   '/admin/stats'),
  getUsers:     ()         => request('GET',   '/admin/users'),
  changeRole:   (id, role) => request('PATCH', `/admin/users/${id}/role`,   { role }),
  changeStatus: (id, s)    => request('PATCH', `/admin/users/${id}/status`, { status: s }),
  deleteUser:   (id)       => request('DELETE',`/admin/users/${id}`),
  getAudit:     ()         => request('GET',   '/admin/audit'),
  getSettings:  ()         => request('GET',   '/admin/settings'),
  // Masumi
  availability: ()     => request('GET',  '/masumi/availability'),
  startJob:     (body) => request('POST', '/masumi/start-job',       body),
  getJobStatus: (id)   => request('GET',  `/masumi/get-job-status?jobId=${id}`),
}