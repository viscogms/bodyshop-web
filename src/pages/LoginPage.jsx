import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../api/AuthContext'

export default function LoginPage() {
  const { login } = useAuthContext()
  const navigate  = useNavigate()
  const [form,    setForm]    = useState({ username: '', password: '' })
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username || !form.password) return setError('Please enter username and password.')
    setLoading(true)
    try {
      const user = await login(form.username.trim().toLowerCase(), form.password)
      navigate(user.role === 'Owner' ? '/jobcards' : '/')
    } catch (err) {
      setError(err.response?.data?.error || 'Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8">
        <div className="text-center mb-8">
          <p className="text-2xl font-black tracking-widest text-gray-900 dark:text-white">VISCO</p>
          <p className="text-xs text-gray-500 mt-1 tracking-wider">BODY SHOP — GMS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Username</label>
            <input
              className="input mt-1"
              autoComplete="username"
              autoCapitalize="none"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="flex items-center border-b border-gray-300 dark:border-gray-600 focus-within:border-brand">
              <input
                className="flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" onClick={() => setShowPw(s => !s)} className="px-2 text-gray-400 hover:text-gray-600">
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
            {loading ? 'CONNECTING...' : 'LOGIN TO SYSTEM'}
          </button>
        </form>
      </div>
    </div>
  )
}
