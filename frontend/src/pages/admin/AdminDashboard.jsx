import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { StatCard } from '../../components/ui'

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await api.request('GET', '/admin/stats')
      setStats(data.stats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-extrabold text-forest mb-0.5">Admin Dashboard</h1>
      <p className="text-sm text-gray-400 mb-6">System overview — manage users, lenders, and settings.</p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-moss-lt border-t-moss rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatCard label="Total users"     value={stats?.totalUsers     || 0} sub="registered accounts" />
            <StatCard label="Farmers"         value={stats?.totalFarmers   || 0} sub="farmer accounts"  color="green" />
            <StatCard label="Lenders"         value={stats?.totalLenders   || 0} sub="lender accounts"  color="gold" />
            <StatCard label="Decisions made"  value={stats?.totalDecisions || 0} sub="loan decisions"   color="blue" />
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: '👥', title: 'User Management',    desc: 'View all users, change roles, suspend accounts.', href: '/admin/users' },
              { icon: '🏦', title: 'Lender Management',  desc: 'Approve or revoke lender access to the platform.', href: '/admin/lenders' },
              { icon: '⚙️', title: 'System Settings',    desc: 'Rotate secrets, view audit log, configure the app.', href: '/admin/settings' },
            ].map(card => (
              <a key={card.href} href={card.href}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer block">
                <div className="text-3xl mb-3">{card.icon}</div>
                <div className="font-bold text-forest text-base mb-1">{card.title}</div>
                <div className="text-sm text-gray-400">{card.desc}</div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}