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

  const activeCards  = cards.filter(c => !INACTIVE_STATUSES.includes(c.status))
  const todoCards    = cards.filter(c => (c.todos||[]).some(t => !t.completed))
  // receiveDate is the business date staff edits — must match the sort used on JobCardsPage/mobile/backend
  const getSortDate = (c) => {
    const d = c.receiveDate || c.jobCardDate || c.createdAt
    if (!d) return 0
    const t = new Date(String(d).replace(' ', 'T')).getTime()
    return isNaN(t) ? 0 : t
  }
  const recentCards  = [...activeCards].sort((a,b) => getSortDate(b) - getSortDate(a)).slice(0, 6)

  const statusGroups = activeCards.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="page-header">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Vehicles" value={activeCards.length} color="blue" onClick={() => navigate('/jobcards')} />
        <StatCard label="Pending To-Do's" value={todoCards.length} color="purple" onClick={() => navigate('/todos')} />
        {isAdmin && <>
          <StatCard label="Outstanding" value={`AED ${finance.totalOutstanding?.toFixed(0)||0}`} color="red" onClick={() => navigate('/finance')} />
          <StatCard label="Unpaid Vehicles" value={finance.unpaidCount||0} color="orange" onClick={() => navigate('/finance')} />
        </>}
      </div>

      {/* Status breakdown */}
      <div className="card">
        <p className="label mb-3">Status Breakdown</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(statusGroups).map(([status, count]) => (
            <span key={status} className="badge" style={{ backgroundColor: getStatusColor(status) }}>
              {status} ({count})
            </span>
          ))}
          {Object.keys(statusGroups).length === 0 && <p className="text-gray-400 text-sm">No active vehicles</p>}
        </div>
      </div>

      {/* Recent job cards */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="label">Recent Job Cards</p>
          <button onClick={() => navigate('/jobcards')} className="text-xs text-brand font-bold hover:underline">View All</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {recentCards.map(card => (
            <JobCardMini key={card._id} card={card} />
          ))}
          {recentCards.length === 0 && <p className="text-gray-400 text-sm col-span-3">No job cards yet</p>}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, onClick }) {
  const colors = {
    blue:   'border-l-blue-500',
    purple: 'border-l-green-500',
    red:    'border-l-red-500',
    orange: 'border-l-orange-500',
  }
  return (
    <button onClick={onClick} className={`card border-l-4 ${colors[color]} text-left hover:shadow-md transition-shadow w-full`}>
      <p className="label">{label}</p>
      <p className="text-2xl font-black mt-1 text-gray-900 dark:text-white">{value}</p>
    </button>
  )
}

function JobCardMini({ card }) {
  const img = card.rearImage ? String(card.rearImage).split(',')[0] : null
  return (
    <div className="border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="h-24 bg-gray-100 dark:bg-gray-800 relative">
        {img
          ? <img src={img} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">🚗</div>
        }
        <span className="absolute top-1 right-1 badge text-[10px]" style={{ backgroundColor: getStatusColor(card.status) }}>
          {card.status}
        </span>
      </div>
      <div className="p-2">
        <p className="font-black text-xs text-gray-900 dark:text-white">{card.plateNumber}</p>
        <p className="text-[10px] text-gray-500">{formatDate(card.receiveDate)}</p>
        <p className="text-[10px] text-gray-500 truncate">{getCustomerName(card.carModel) || getCleanModel(card.carModel)}</p>
      </div>
    </div>
  )
}
