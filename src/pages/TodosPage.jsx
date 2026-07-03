import { useState, useEffect } from 'react'
import api from '../api/client'
import Swal from 'sweetalert2'
import { getCleanModel, formatDate } from '../utils/helpers'

export default function TodosPage() {
  const [cards,   setCards]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchTodos() }, [])

  const fetchTodos = async () => {
    try {
      setLoading(true)
      const res = await api.get('/jobcards/todos')
      setCards(res.data.filter(c => (c.todos||[]).some(t => !t.completed)))
    } catch (e) {
      console.error(e)
      Swal.fire('Error', 'Failed to load to-dos. Please try again.', 'error')
    } finally { setLoading(false) }
  }

  const toggleTodo = async (card, idx) => {
    const updatedTodos = [...(card.todos||[])]
    updatedTodos[idx] = { ...updatedTodos[idx], completed: !updatedTodos[idx].completed }
    const prevCards = cards
    setCards(prev => prev.map(c => c._id === card._id ? { ...c, todos: updatedTodos } : c).filter(c => (c.todos||[]).some(t => !t.completed)))
    try {
      await api.put(`/jobcards/${card._id}`, { todos: updatedTodos })
    } catch (e) {
      setCards(prevCards)
      Swal.fire('Error', 'Failed to save. Please try again.', 'error')
    }
  }

  if (loading) return <p className="text-center text-gray-400 mt-12">Loading...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Pending To-Do's</h1>
        <span className="badge bg-green-600 px-3 py-1">{cards.length} vehicles</span>
      </div>

      {cards.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-400 font-bold">No pending to-do's!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map(card => {
            const pending = (card.todos||[]).filter(t => !t.completed)
            return (
              <div key={card._id} className="card border-l-4 border-l-green-500">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-black text-gray-900 dark:text-white">{card.plateNumber}</p>
                    <p className="text-xs text-gray-500">{getCleanModel(card.carModel)} • {formatDate(card.receiveDate)}</p>
                  </div>
                  <span className="badge bg-green-600">{pending.length} pending</span>
                </div>
                <div className="space-y-1">
                  {(card.todos||[]).map((todo, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleTodo(card, idx)}
                      className={`flex items-center gap-3 w-full text-left px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors
                        ${todo.completed ? 'opacity-50' : ''}`}
                    >
                      <span className="text-base">{todo.completed ? '✅' : '⬜'}</span>
                      <span className={todo.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}>
                        {todo.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
