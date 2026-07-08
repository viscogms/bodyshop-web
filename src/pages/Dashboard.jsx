import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuthContext } from '../api/AuthContext'
import { getStatusColor, INACTIVE_STATUSES, formatDate, getCleanModel, getCustomerName } from '../utils/helpers'

export default function Dashboard() {
  const { isAdmin } = useAuthContext()
  const navigate    = useNavigate()
  const [cards,    setCards]    = useState([])
  const [finance,  setFinance]  = useState({ totalOutstanding: 0, unpaidCount: 0 })
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [cardsRes] = await Promise.all([
        api.get('/jobcards?page=1&limit=50'),
        isAdmin && api.get('/finances/summary').then(r => setFinance(r.data)).catch(() => {}),
      ])
      setCards(cardsRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const activeCards = cards.filter(c => !INACTIVE_STATUSES.includes(c.status))
  const todoCards   = cards.filter(c => (c.todos||[]).some(t => !t.completed))
  const getSortDate = (c) => {
    const d = c.receiveDate || c.jobCardDate || c.createdAt
    if (!d) return 0
    const t = new Date(String(d).replace(' ', 'T')).getTime()
    return isNaN(t) ? 0 : t
  }
  const recentCards  = [...activeCards].sort((a,b) => getSortDate(b) - getSortDate(a)).slice(0, 8)
  const statusGroups = activeCards.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 p-1">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Visco Body Shop — Overview</p>
        </div>
        <button
          onClick={() => navigate('/jobcards')}
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
        >
          + New Card
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Vehicles"
          value={activeCards.length}
          icon="🚗"
          gradient="from-green-500 to-green-700"
          onClick={() => navigate('/jobcards')}
        />
        <StatCard
          label="Pending To-Do's"
          value={todoCards.length}
          icon="📋"
          gradient="from-teal-500 to-teal-700"
          onClick={() => navigate('/todos')}
        />
        {isAdmin && <>
          <StatCard
            label="Outstanding"
            value={`AED ${Number(finance.totalOutstanding||0).toLocaleString()}`}
            icon="💰"
            gradient="from-red-500 to-red-600"
            onClick={() => navigate('/finance')}
          />
          <StatCard
            label="Unpaid Vehicles"
            value={finance.unpaidCount||0}
            icon="⚠️"
            gradient="from-orange-400 to-orange-500"
            onClick={() => navigate('/finance')}
          />
        </>}
      </div>

      {/* Status Breakdown */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status Breakdown</p>
          <span className="text-xs text-gray-400">{activeCards.length} active vehicles</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusGroups)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
            <button
              key={status}
              onClick={() => navigate('/jobcards')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
              style={{ backgroundColor: getStatusColor(status) }}
            >
              <span>{status}</span>
              <span className="bg-white/25 rounded-full px-1.5 py-0.5 text-[10px]">{count}</span>
            </button>
          ))}
          {Object.keys(statusGroups).length === 0 && (
            <p className="text-gray-400 text-sm">No active vehicles</p>
          )}
        </div>
        {Object.keys(statusGroups).length > 0 && (
          <div className="mt-4 space-y-2">
            {Object.entries(statusGroups)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 w-20 truncate">{status}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.round((count / activeCards.length) * 100)}%`,
                      backgroundColor: getStatusColor(status)
                    }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Job Cards */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">Recent Job Cards</p>
          <button onClick={() => navigate('/jobcards')} className="text-xs text-green-600 font-bold hover:underline">
            View All →
          </button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {recentCards.map(card => (
            <JobCardMini key={card._id} card={card} onClick={() => navigate('/jobcards')} />
          ))}
          {recentCards.length === 0 && (
            <p className="text-gray-400 text-sm col-span-8">No job cards yet</p>
          )}
        </div>
      </div>

    </div>
  )
}

function StatCard({ label, value, icon, gradient, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${gradient} rounded-xl p-4 text-white text-left hover:opacity-90 hover:shadow-lg transition-all w-full shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-black mt-2 leading-none">{value}</p>
        </div>
        <span className="text-2xl opacity-80">{icon}</span>
      </div>
    </button>
  )
}

function JobCardMini({ card, onClick }) {
  const img = card.rearImage ? String(card.rearImage).split(',')[0] : null
  return (
    <div
      onClick={onClick}
      className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="h-20 bg-gray-100 dark:bg-gray-800 relative">
        {img
          ? <img src={img} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">🚗</div>
        }
        <span
          className="absolute top-1 left-1 text-white text-[8px] font-bold px-1 py-0.5 rounded"
          style={{ backgroundColor: getStatusColor(card.status) }}
        >
          {card.status}
        </span>
      </div>
      <div className="p-1.5 bg-white dark:bg-gray-900">
        <p className="font-black text-[9px] text-gray-900 dark:text-white truncate">{card.plateNumber}</p>
        <p className="text-[8px] text-gray-400 truncate">{getCleanModel(card.carModel) || '—'}</p>
      </div>
    </div>
  )
}
