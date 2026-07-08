import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthCallback() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')
    const user   = params.get('user')

    if (!token || !user) { navigate('/login?error=google', { replace: true }); return }

    try {
      login(token, JSON.parse(decodeURIComponent(user)))
      const parsed = JSON.parse(decodeURIComponent(user))
      const dest = parsed.role === 'admin' || parsed.role === 'lender' ? '/lender' : '/farmer'
      navigate(dest, { replace: true })
    } catch {
      navigate('/login?error=google', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center text-white text-sm">
      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
      Signing you in…
    </div>
  )
}
