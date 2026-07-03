import { useState, useEffect } from 'react'
import api from '../api/client'

export default function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('bodyshop_user')
    if (stored) setUser(JSON.parse(stored))
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    const { token, ...userData } = res.data
    localStorage.setItem('bodyshop_user', JSON.stringify(userData))
    if (token) localStorage.setItem('bodyshop_token', token)
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('bodyshop_user')
    localStorage.removeItem('bodyshop_token')
    setUser(null)
  }

  const hasPerm = (perm) => {
    if (!user) return false
    if (user.role === 'Admin') return true
    return user.permissions?.[perm] === true
  }

  const isAdmin  = user?.role === 'Admin'
  const isOwner  = user?.role === 'Owner'

  return { user, setUser, loading, login, logout, hasPerm, isAdmin, isOwner }
}
