import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'
import Swal from 'sweetalert2'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [expanded,  setExpanded]  = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const res = await api.get('/customers')
      setCustomers(res.data || [])
    } catch (e) {
      console.error(e)
      Swal.fire('Error', 'Failed to load customers.', 'error')
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return customers
    const q = search.toLowerCase()
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.contact?.includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.vehicles?.some(v => v.toLowerCase().includes(q))
    )
  }, [customers, search])

  if (loading) return <p className="text-center text-gray-400 mt-12">Loading...</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="page-header">Customers</h1>
        <input
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm w-64 focus:outline-none focus:border-brand"
          placeholder="Search name, phone, vehicle..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <p className="text-xs text-gray-400">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-3xl mb-2">👤</p>
          <p className="text-gray-500 text-sm">No customers found.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((c, i) => {
          const isOpen = expanded === i
          return (
            <div key={i} className="card overflow-hidden p-0">
              <button onClick={() => setExpanded(isOpen ? null : i)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-gray-900 dark:text-white text-sm">{c.name || 'Unnamed Customer'}</span>
                    {c.company && <span className="text-[10px] text-gray-400">· {c.company}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{c.contact || 'No contact on file'}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{c.vehicles.join(', ') || 'No vehicle on file'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-brand text-base">AED {c.totalSpent.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">{c.jobCount} job{c.jobCount !== 1 ? 's' : ''} · last {c.lastVisit || '—'}</p>
                </div>
                <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/50">
                  {c.jobs.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((j, ji) => (
                    <div key={ji} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-gray-400 w-20 shrink-0">{j.date}</span>
                        <div>
                          <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{j.plateNumber} {j.carModel ? `· ${j.carModel}` : ''}</p>
                          <p className="text-[10px] text-gray-400">{j.jobCardNo || '—'} · {j.status}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm text-gray-700 dark:text-gray-200">AED {j.invoiceAmount.toLocaleString()}</p>
                        <p className={`text-[10px] ${j.paymentStatus === 'Paid' ? 'text-green-600' : 'text-orange-500'}`}>{j.paymentStatus}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
