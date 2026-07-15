import { useState, useEffect } from 'react'
import api from '../api/client'

const thisMonth = () => new Date().toISOString().slice(0, 7)

export default function LaborTab() {
  const [month,    setMonth]    = useState(thisMonth())
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(false)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { fetchSummary() }, [month])

  const fetchSummary = async () => {
    setLoading(true)
    setExpanded(null)
    try {
      const res = await api.get(`/labor-summary?month=${month}`)
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (_) {}
    finally { setLoading(false) }
  }

  const grandTotal = data.reduce((s, r) => s + r.totalLabor, 0)
  const grandJobs  = data.reduce((s, r) => s + r.jobCount, 0)

  return (
    <div className="space-y-4">

      {/* Month picker + grand totals */}
      <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Month</p>
          <input type="month" className="input text-sm py-1.5 w-44"
            value={month} onChange={e => setMonth(e.target.value)} />
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-black text-brand">AED {grandTotal.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Labor</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-gray-700 dark:text-gray-200">{grandJobs}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Jobs</p>
          </div>
        </div>
      </div>

      {loading && <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>}

      {!loading && data.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-3xl mb-2">🔧</p>
          <p className="text-gray-500 text-sm">No job cards found for {month} with a technician assigned.</p>
        </div>
      )}

      {/* Per-technician cards */}
      {!loading && data.map((row, i) => {
        const isOpen = expanded === row.name
        const pct = grandTotal > 0 ? (row.totalLabor / grandTotal * 100) : 0
        return (
          <div key={row.name} className="card overflow-hidden p-0">
            {/* Header row */}
            <button onClick={() => setExpanded(isOpen ? null : row.name)}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              {/* Rank */}
              <span className="w-7 h-7 rounded-full bg-brand/10 text-brand font-black text-xs flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-gray-900 dark:text-white text-sm">{row.name}</span>
                  <span className="text-xs text-gray-400">{row.jobCount} job{row.jobCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div className="bg-brand h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {/* Amount */}
              <div className="text-right shrink-0">
                <p className="font-black text-brand text-base">AED {row.totalLabor.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400">{pct.toFixed(1)}%</p>
              </div>
              <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Drill-down job list */}
            {isOpen && (
              <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/50">
                {row.jobs.map((j, ji) => (
                  <div key={ji} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-gray-400 w-20 shrink-0">{j.jobCardDate}</span>
                      <div>
                        <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{j.plateNumber}</p>
                        {j.jobCardNo && <p className="text-[10px] text-gray-400">{j.jobCardNo}{j.carModel ? ` · ${j.carModel}` : ''}</p>}
                      </div>
                    </div>
                    <span className={`font-black text-sm ${j.laborCharges > 0 ? 'text-brand' : 'text-gray-400'}`}>
                      {j.laborCharges > 0 ? `AED ${j.laborCharges.toLocaleString()}` : '—'}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between px-5 py-2.5 bg-brand/5">
                  <span className="text-xs font-bold text-brand uppercase tracking-wide">Subtotal</span>
                  <span className="font-black text-brand text-sm">AED {row.totalLabor.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
