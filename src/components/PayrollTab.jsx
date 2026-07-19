import { useState, useEffect } from 'react'
import api from '../api/client'

const thisMonth = () => new Date().toISOString().slice(0, 7)

export default function PayrollTab() {
  const [month,   setMonth]   = useState(thisMonth())
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchSummary() }, [month])

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/payroll-summary?month=${month}`)
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (_) {}
    finally { setLoading(false) }
  }

  const grandBase   = data.reduce((s, r) => s + r.baseSalary, 0)
  const grandAdv    = data.reduce((s, r) => s + r.advances.total, 0)
  const grandLabor  = data.reduce((s, r) => s + r.laborEarned, 0)
  const grandNet    = data.reduce((s, r) => s + r.netPay, 0)

  return (
    <div className="space-y-4">

      {/* Month picker + grand totals */}
      <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Month</p>
          <input type="month" className="input text-sm py-1.5 w-44"
            value={month} onChange={e => setMonth(e.target.value)} />
        </div>
        <div className="flex gap-5 flex-wrap">
          <div className="text-center">
            <p className="text-lg font-black text-gray-700 dark:text-gray-200">AED {grandBase.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Base Salary</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-orange-500">AED {grandAdv.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Advances</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-brand">AED {grandLabor.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Labor Earned</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-green-600">AED {grandNet.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Net Pay</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 px-1">Net Pay = Base Salary − Advances. Labor Earned is shown for reference and is not automatically added to Net Pay.</p>

      {loading && <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>}

      {!loading && data.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-3xl mb-2">💼</p>
          <p className="text-gray-500 text-sm">No staff records found.</p>
        </div>
      )}

      {/* Per-staff payslip cards */}
      {!loading && data.map((row) => (
        <div key={row.staffId} className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-black text-gray-900 dark:text-white text-sm">{row.name}</p>
              <p className="text-[10px] text-gray-400">{row.category}</p>
            </div>
            <div className="text-right">
              <p className="font-black text-green-600 text-lg">AED {row.netPay.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Net Pay</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-t border-gray-100 dark:border-gray-700 pt-3">
            <div>
              <p className="font-bold text-sm text-gray-700 dark:text-gray-200">AED {row.baseSalary.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400">Base Salary</p>
            </div>
            <div>
              <p className="font-bold text-sm text-orange-500">AED {row.advances.total.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400">{row.advances.count} Advance{row.advances.count !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <p className="font-bold text-sm text-brand">AED {row.laborEarned.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400">Labor Earned</p>
            </div>
            <div>
              <p className="font-bold text-sm text-gray-700 dark:text-gray-200">
                {row.attendance.present}P · {row.attendance.absent}A · {row.attendance.late}L
              </p>
              <p className="text-[10px] text-gray-400">Attendance{row.attendance.overtime > 0 ? ` · ${row.attendance.overtime}h OT` : ''}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
