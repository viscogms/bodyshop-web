import { useState, useEffect } from 'react'
import api from '../api/client'
import { getStatusColor, STATUS_OPTIONS, INACTIVE_STATUSES, parseImages } from '../utils/helpers'

const COLUMNS = STATUS_OPTIONS.filter(s => !INACTIVE_STATUSES.includes(s))

export default function KanbanPage() {
  const [cards,   setCards]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [dragId,  setDragId]  = useState(null)

  useEffect(() => { fetchCards() }, [])

  const fetchCards = async () => {
    try {
      setLoading(true)
      const res = await api.get('/jobcards?page=1&limit=100')
      setCards(res.data.filter(c => !INACTIVE_STATUSES.includes(c.status)))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleDrop = async (newStatus) => {
    if (!dragId) return
    const card = cards.find(c => c._id === dragId)
    if (!card || card.status === newStatus) { setDragId(null); return }
    setCards(prev => prev.map(c => c._id === dragId ? { ...c, status: newStatus } : c))
    try { await api.put(`/jobcards/${dragId}`, { status: newStatus }) }
    catch (e) { fetchCards() }
    setDragId(null)
  }

  const filtered = cards.filter(c =>
    !search || c.plateNumber?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <p className="text-center text-gray-400 mt-12">Loading...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-header">Kanban Board</h1>
        <input
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm w-40 focus:outline-none focus:border-brand"
          placeholder="Search plate..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 kanban-col">
        {COLUMNS.map(col => {
          const colCards = filtered.filter(c => c.status === col)
          return (
            <div
              key={col}
              className="flex-shrink-0 w-44 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(col)}
            >
              {/* Column header */}
              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-gray-100 dark:bg-gray-900">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{col}</span>
                <span className="text-xs font-black ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {colCards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-24">
                {colCards.map(card => {
                  const img = parseImages(card.rearImage)[0]
                  return (
                    <div
                      key={card._id}
                      draggable
                      onDragStart={() => setDragId(card._id)}
                      onDragEnd={() => setDragId(null)}
                      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow
                        ${dragId === card._id ? 'opacity-40' : ''}`}
                    >
                      <div className="h-20 bg-gray-100 dark:bg-gray-700 relative">
                        {img
                          ? <img src={img} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">🚗</div>
                        }
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                          <p className="text-white font-black text-xs tracking-wide">{card.plateNumber}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {colCards.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 h-12 flex items-center justify-center text-gray-400 text-xs">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
