import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_BASE || 'https://visco-api.onrender.com/api'
export const API_KEY  = import.meta.env.VITE_API_KEY

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'x-api-key': API_KEY, 'x-branch': 'bodyshop' },
})

// Send JWT Bearer token on every request; fall back to API key if no token yet
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('bodyshop_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
      delete config.headers['x-api-key']
    }
  } catch {}
  return config
})

export default api
