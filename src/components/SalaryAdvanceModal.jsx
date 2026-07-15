import { useState, useEffect } from 'react'
import api from '../api/client'
import Swal from 'sweetalert2'

const today = () => new Date().toISOString().split('T')[0]

export default function SalaryAdvanceModal({ staff, onClose, brandColor = 'brand' }) {
  const [advances, setAdvances] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState({ amount: '', date: today(), notes: '' })

  useEffect(() => { fetchAdvances() }, [])

  const fetchAdvances = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/salary-advances?staffId=${staff._id}`)
      setAdvances(Array.isArray(res.data) ? res.data : [])
    } catch (_) {}
    finally { setLoading(false) }
  }

  const addAdvance = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      Swal.fire('Required', 'Enter a valid amount', 'warning'); return
    }
    setSaving(true)
    try {
      await api.post('/salary-advances', {
        staffId:   staff._id,
        staffName: staff.name,
        amount:    Number(form.amount),
        date:      form.date,
        notes:     form.notes,
        status:    'Pending',
      })
      setForm({ amount: '', date: today(), notes: '' })
      await fetchAdvances()
    } catch (_) {
      Swal.fire('Error', 'Failed to save advance', 'error')
    } finally { setSaving(false) }
  }

  const markPaid = async (id) => {
    try {
      await api.put(`/salary-advances/${id}`, { status: 'Paid' })
      setAdvances(prev => prev.map(a => a._id === id ? { ...a, status: 'Paid' } : a))
    } catch (_) {}
  }

  const deleteAdvance = async (id) => {
    const { isConfirmed } = await Swal.fire({
      title: 'Delete this record?', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Delete',
    })
    if (!isConfirmed) return
    try {
      await api.delete(`/salary-advances/${id}`)
      setAdvances(prev => prev.filter(a => a._id !== id))
    } catch (_) {}
  }

  const totalPending = advances.filter(a => a.status === 'Pending').reduce((s, a) => s + a.amount, 0)
  const totalPaid    = advances.filter(a => a.status === 'Paid').reduce((s, a) => s + a.amount, 0)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-2xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-brand px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-white font-black text-lg">💰 Salary Advances</p>
            <p className="text-white/75 text-xs mt-0.5">{staff.name} · {staff.category}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl font-bold">✕</button>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="py-3 text-center">
            <p className="text-lg font-black text-orange-500">AED {totalPending.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending</p>
          </div>
          <div className="py-3 text-center">
            <p className="text-lg font-black text-green-600">AED {totalPaid.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Paid</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Add form */}
          <form onSubmit={addAdvance} className="card border border-brand/30 bg-purple-50/50 dark:bg-purple-900/10 space-y-3">
            <p className="text-xs font-black text-brand uppercase tracking-widest">+ New Advance</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-semibold block mb-1">Amount (AED) *</label>
                <input type="number" min="1" step="0.01" className="input text-sm py-2 w-full" placeholder="500"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold block mb-1">Date</label>
                <input type="date" className="input text-sm py-2 w-full"
                  value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">Notes (optional)</label>
              <input className="input text-sm py-2 w-full" placeholder="Reason or reference"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button type="submit" disabled={saving}
              className="btn-primary w-full py-2 text-sm disabled:opacity-50">
              {saving ? 'Saving...' : '💾 Record Advance'}
            </button>
          </form>

          {/* History */}
          {loading && <p className="text-center text-gray-400 py-4 text-sm">Loading...</p>}
          {!loading && advances.length === 0 && (
            <p className="text-center text-gray-400 py-6 text-sm">No advances recorded yet.</p>
          )}
          {!loading && advances.map(a => (
            <div key={a._id} className={`card border-l-4 ${a.status === 'Paid' ? 'border-l-green-500 opacity-75' : 'border-l-orange-400'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-gray-900 dark:text-white text-base">AED {a.amount.toLocaleString()}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 ${a.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{a.date}{a.notes ? ` · ${a.notes}` : ''}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {a.status === 'Pending' && (
                    <button onClick={() => markPaid(a._id)}
                      className="text-xs px-2.5 py-1.5 bg-green-100 text-green-700 font-bold hover:bg-green-200">
                      ✓ Paid
                    </button>
                  )}
                  <button onClick={() => deleteAdvance(a._id)}
                    className="text-xs px-2 py-1.5 text-red-400 hover:text-red-600 font-bold">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
