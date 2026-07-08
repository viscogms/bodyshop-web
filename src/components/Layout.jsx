import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../api/AuthContext'

const NAV = [
  { to: '/',         label: 'Dashboard',    icon: '📊', exact: true },
  { to: '/jobcards', label: 'Job Cards',    icon: '🚗' },
  { to: '/kanban',   label: 'Kanban',       icon: '📋' },
  { to: '/finance',  label: 'Finance',      icon: '💵', adminOnly: true },
  { to: '/reports',  label: 'Reports',      icon: '📊', adminOnly: true },
  { to: '/todos',    label: "To-Do's",      icon: '📋' },
  { to: '/admin',    label: 'Admin',        icon: '🛡️', adminOnly: true },
]

// Owner is a read-only viewer — only the Job Cards link, nothing else
const OWNER_NAV = [
  { to: '/jobcards', label: 'Job Cards', icon: '🚗', exact: true },
]

export default function Layout() {
  const { user, logout, isAdmin, isOwner } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [dark,    setDark]    = useState(() => localStorage.getItem('bodyshop_theme') === 'dark')
  const [sidebar, setSidebar] = useState(false) // mobile sidebar

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('bodyshop_theme', dark ? 'dark' : 'light')
  }, [dark])

  // Owner is view-only and restricted to /jobcards — catches direct links, back/forward nav, etc.
  useEffect(() => {
    if (isOwner && location.pathname !== '/jobcards') navigate('/jobcards', { replace: true })
  }, [isOwner, location.pathname])

  const handleLogout = () => { logout(); navigate('/login') }

  const links = isOwner ? OWNER_NAV : NAV.filter(n => !n.adminOnly || isAdmin)

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0fdf4] dark:bg-gray-950">

      {/* Mobile overlay */}
      {sidebar && <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setSidebar(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-30 h-full w-60 flex-shrink-0 flex flex-col
        bg-green-950 border-r border-green-900
        transition-transform duration-300
        ${sidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-5 py-4 border-b border-green-900">
          <p className="text-white font-black text-sm tracking-widest">VISCO BODY SHOP</p>
          <p className="text-green-400/60 text-xs mt-0.5">Digital ERP</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {links.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.exact}
              onClick={() => setSidebar(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm font-semibold transition-colors
                 ${isActive
                   ? 'bg-green-900 text-white border-l-2 border-green-400'
                   : 'text-green-300/60 hover:text-white hover:bg-green-900/60'}`
              }
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-5 py-4 border-t border-green-900" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <p className="text-white text-xs font-bold">{user?.name}</p>
          <p className="text-green-400/60 text-xs">{user?.role}</p>
          <button onClick={handleLogout} className="mt-3 w-full text-xs bg-red-700 text-white py-2 font-bold hover:bg-red-600 transition-colors">
            LOGOUT
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 py-3 bg-green-950 border-b border-green-900 flex-shrink-0">
          <button className="md:hidden text-white text-xl" onClick={() => setSidebar(true)}>☰</button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            <button
              onClick={() => setDark(d => !d)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-sm hover:bg-gray-700 transition-colors"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Watermark */}
      <div className="fixed bottom-3 right-3 text-[10px] text-gray-400/50 font-semibold select-none pointer-events-none z-50">
        by EC
      </div>
    </div>
  )
}
