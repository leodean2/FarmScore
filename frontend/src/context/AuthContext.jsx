import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null)
  const [token, setToken] = useState(null)
  const [ready, setReady] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser  = localStorage.getItem('user')
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch { /* invalid JSON — clear it */ }
    }
    setReady(true)
  }, [])

  function login(token, user) {
    localStorage.setItem('token', token)
    localStorage.setItem('user',  JSON.stringify(user))
    setToken(token)
    setUser(user)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const isAdmin  = user?.role === 'admin'
  const isFarmer = user?.role === 'farmer'

  return (
    <AuthContext.Provider value={{ user, token, ready, login, logout, isAdmin, isFarmer }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}