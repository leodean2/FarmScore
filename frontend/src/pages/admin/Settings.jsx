import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { showToast } from '../../components/ui'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [logs,     setLogs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [secret,   setSecret]   = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [sRes, aRes] = await Promise.all([
        api.request('GET', '/admin/settings'),
        api.request('GET', '/admin/audit'),
      ])
      setSettings(sRes.settings)
      setLogs(aRes.logs || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function rotateSecret() {
    if (!secret || secret.length < 15) { alert('Secret must be at least 15 characters.'); return }
    setSaving(true)
    try {
      await api.request('PATCH', '/admin/settings/lender-secret', { newSecret: secret })
      showToast('Lender secret updated — restart your server to apply.')
      setSecret('')
    } catch (err) { alert('Failed: ' + err.message) }
    finally { setSaving(false) }
  }

  const ACTION_ICONS = {
    ROLE_CHANGE:    '👤',
    STATUS_CHANGE:  '🔄',
    USER_DELETED:   '🗑️',
    SECRET_ROTATED: '🔑',
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-forest mb-0.5">System Settings</h1>
        <p className="text-sm text-gray-400">Configure FarmScore, rotate secrets, and review the audit log.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-moss-lt border-t-moss rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* System info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-forest text-base mb-4">System Information</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {settings && Object.entries({
                'App name':       settings.appName,
                'Version':        settings.version,
                'Environment':    settings.environment,
                'Neo4j':          settings.neo4jConnected ? '✅ Connected' : '❌ Disconnected',
                'Masumi':         settings.masumiEnabled  ? '✅ Enabled'   : '⚠️ Not configured',
                'Google OAuth':   settings.googleOAuth    ? '✅ Enabled'   : '⚠️ Not configured',
              }).map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wide">{label}</div>
                  <div className="text-sm font-semibold text-gray-700 mt-0.5">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rotate lender secret */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-forest text-base mb-1">Rotate Lender Secret Key</h2>
            <p className="text-xs text-gray-400 mb-4">
              The lender secret is required when registering a new Lender / SACCO account.
              After rotating, update <code className="bg-gray-100 px-1 rounded">LENDER_SECRET</code> in your backend <code className="bg-gray-100 px-1 rounded">.env</code> and restart the server.
            </p>
            <div className="flex gap-3">
              <input type="password" value={secret} onChange={e => setSecret(e.target.value)}
                placeholder="New lender secret (min 15 chars)"
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/10" />
              <button onClick={rotateSecret} disabled={saving}
                className="bg-forest text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-leaf transition-colors disabled:opacity-60 whitespace-nowrap">
                {saving ? 'Saving…' : 'Rotate secret'}
              </button>
            </div>
          </div>

          {/* Audit log */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-forest text-base">Audit Log</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 100 admin actions</p>
            </div>
            {logs.length === 0 ? (
              <div className="p-10 text-center text-gray-400">No audit entries yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {['Action','Detail','Time'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id || i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <span>{ACTION_ICONS[log.action] || '📝'}</span>
                          {log.action?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{log.detail}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}