import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'
import Swal from 'sweetalert2'

const STATUSES = ['Present', 'Absent', 'Late', 'Half Day']

const STATUS_COLORS = {
  Present:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Absent:   'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  Late:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500',
  'Half Day':'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
}

const today = () => new Date().toISOString().split('T')[0]
const thisMonth = () => today().slice(0, 7)

function getDaysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export default function AttendanceTab() {
  const [view,      setView]      = useState('daily')
  const [date,      setDate]      = useState(today())
  const [month,     setMonth]     = useState(thisMonth())
  const [staff,     setStaff]     = useState([])
  const [records,   setRecords]   = useState([])
  const [rows,      setRows]      = useState([])
  const [saving,    setSaving]    = useState(false)
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    api.get('/staff').then(r => setStaff(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (view === 'daily')   fetchDaily()
    if (view === 'monthly') fetchMonthly()
  }, [date, month, view, staff])

  const fetchDaily = async () => {
    if (!staff.length) return
    setLoading(true)
    try {
      const res = await api.get(`/attendance?date=${date}`)
      const existing = Array.isArray(res.data) ? res.data : []
      const built = staff.map(s => {
        const rec = existing.find(r => r.staffId === s._id || r.staffId?._id === s._id || r.staffName === s.name)
        return {
          staffId:   s._id,
          staffName: s.name,
          category:  s.category,
          _id:       rec?._id || null,
          status:    rec?.status    || 'Present',
          timeIn:    rec?.timeIn    || '',
          timeOut:   rec?.timeOut   || '',
          overtime:  rec?.overtime  != null ? String(rec.overtime) : '0',
          notes:     rec?.notes     || '',
          saved:     !!rec,
        }
      })
      setRows(built)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchMonthly = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/attendance?month=${month}`)
      setRecords(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const updateRow = (idx, field, val) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      await Promise.all(rows.map(row => {
        const payload = {
          staffId:   row.staffId,
          staffName: row.staffName,
          date,
          status:    row.status,
          timeIn:    row.status === 'Absent' ? '' : row.timeIn,
          timeOut:   row.status === 'Absent' ? '' : row.timeOut,
          overtime:  Number(row.overtime) || 0,
          notes:     row.notes,
        }
        return api.post('/attendance', payload)
      }))
      await fetchDaily()
      Swal.fire({ icon: 'success', title: 'Attendance saved!', timer: 1200, showConfirmButton: false })
    } catch (e) {
      Swal.fire('Error', 'Failed to save attendance', 'error')
    } finally { setSaving(false) }
  }

  const monthlyData = useMemo(() => {
    if (view !== 'monthly') return []
    return staff.map(s => {
      const sRecs = records.filter(r => r.staffId === s._id || r.staffName === s.name)
      const summary = { Present: 0, Absent: 0, Late: 0, 'Half Day': 0, overtime: 0 }
      const dayMap = {}
      sRecs.forEach(r => {
        const day = parseInt(r.date.split('-')[2])
        dayMap[day] = r
        summary[r.status] = (summary[r.status] || 0) + 1
        summary.overtime += r.overtime || 0
      })
      return { ...s, dayMap, summary }
    })
  }, [records, staff, month, view])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-0 border border-gray-200 dark:border-gray-700">
          {[['daily','📅 Daily'],['monthly','📊 Monthly Report']].map(([v,label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-bold transition-colors
                ${view===v ? 'bg-green-700 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>
        {view === 'daily'
          ? <input type="date" className="input text-sm w-44" value={date} onChange={e => setDate(e.target.value)} />
          : <input type="month" className="input text-sm w-40" value={month} onChange={e => setMonth(e.target.value)} />
        }
      </div>

      {view === 'daily' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
            <button onClick={saveAll} disabled={saving || loading}
              className="px-5 py-2 text-sm font-bold bg-green-700 text-white hover:bg-green-800 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : '💾 Save All'}
            </button>
          </div>

          {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}

          {!loading && rows.length === 0 && (
            <p className="text-center text-gray-400 py-8">No staff records found. Add staff in the Staff tab first.</p>
          )}

          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div key={row.staffId} className={`card border-l-4 ${row.saved ? 'border-l-green-500' : 'border-l-gray-300 dark:border-l-gray-600'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="sm:w-44 shrink-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{row.staffName}</p>
                    <p className="text-xs text-gray-500">{row.category}</p>
                  </div>

                  <div className="flex gap-1 flex-wrap shrink-0">
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => updateRow(idx, 'status', s)}
                        className={`text-xs px-2.5 py-1 font-bold transition-colors
                          ${row.status === s ? STATUS_COLORS[s] : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {row.status !== 'Absent' && (
                    <div className="flex gap-2 flex-wrap flex-1">
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-500 whitespace-nowrap">In</label>
                        <input type="time" className="input text-xs py-1 w-28"
                          value={row.timeIn} onChange={e => updateRow(idx, 'timeIn', e.target.value)} />
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-500 whitespace-nowrap">Out</label>
                        <input type="time" className="input text-xs py-1 w-28"
                          value={row.timeOut} onChange={e => updateRow(idx, 'timeOut', e.target.value)} />
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-500 whitespace-nowrap">OT hrs</label>
                        <input type="number" min="0" step="0.5" className="input text-xs py-1 w-16"
                          value={row.overtime} onChange={e => updateRow(idx, 'overtime', e.target.value)} />
                      </div>
                    </div>
                  )}
                  {row.status === 'Absent' && (
                    <div className="flex-1">
                      <input className="input text-xs py-1 w-full" placeholder="Reason (optional)"
                        value={row.notes} onChange={e => updateRow(idx, 'notes', e.target.value)} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'monthly' && (
        <div className="space-y-4">
          {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}

          {!loading && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Present','Absent','Late','Half Day'].map(s => {
                  const total = records.filter(r => r.status === s).length
                  return (
                    <div key={s} className={`card text-center py-3 ${STATUS_COLORS[s]}`}>
                      <p className="text-2xl font-black">{total}</p>
                      <p className="text-xs font-bold uppercase tracking-wide mt-0.5">{s}</p>
                    </div>
                  )
                })}
              </div>

              <div className="card overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 font-bold text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-900">Staff</th>
                      <th className="py-2 px-2 text-center font-bold text-green-600">✓ Present</th>
                      <th className="py-2 px-2 text-center font-bold text-red-500">✗ Absent</th>
                      <th className="py-2 px-2 text-center font-bold text-yellow-600">⏰ Late</th>
                      <th className="py-2 px-2 text-center font-bold text-blue-500">½ Half</th>
                      <th className="py-2 px-2 text-center font-bold text-green-700">OT hrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map(s => (
                      <tr key={s._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="py-2 px-3 sticky left-0 bg-white dark:bg-gray-900">
                          <p className="font-bold text-gray-900 dark:text-white">{s.name}</p>
                          <p className="text-xs text-gray-500">{s.category}</p>
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-green-600">{s.summary.Present || 0}</td>
                        <td className="py-2 px-2 text-center font-bold text-red-500">{s.summary.Absent || 0}</td>
                        <td className="py-2 px-2 text-center font-bold text-yellow-600">{s.summary.Late || 0}</td>
                        <td className="py-2 px-2 text-center font-bold text-blue-500">{s.summary['Half Day'] || 0}</td>
                        <td className="py-2 px-2 text-center font-bold text-green-700">{s.summary.overtime || 0}</td>
                      </tr>
                    ))}
                    {monthlyData.length === 0 && (
                      <tr><td colSpan="6" className="text-center text-gray-400 py-8">No records for this month.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {monthlyData.map(s => {
                const days = getDaysInMonth(month)
                const hasAny = Object.keys(s.dayMap).length > 0
                if (!hasAny) return null
                return (
                  <div key={s._id} className="card">
                    <p className="font-black text-gray-900 dark:text-white mb-3">{s.name} <span className="text-xs font-normal text-gray-500">{s.category}</span></p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: days }, (_, i) => i + 1).map(day => {
                        const rec = s.dayMap[day]
                        const color = rec ? STATUS_COLORS[rec.status] : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        const title = rec ? `${rec.status}${rec.timeIn ? ' | In: '+rec.timeIn : ''}${rec.timeOut ? ' Out: '+rec.timeOut : ''}${rec.overtime ? ' OT: '+rec.overtime+'h' : ''}` : 'No record'
                        return (
                          <div key={day} title={title}
                            className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded ${color} cursor-default`}>
                            {day}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-2 mt-2 text-xs text-gray-500 flex-wrap">
                      <span>P={Object.values(s.dayMap).filter(r=>r.status==='Present').length}</span>
                      <span>A={Object.values(s.dayMap).filter(r=>r.status==='Absent').length}</span>
                      <span>L={Object.values(s.dayMap).filter(r=>r.status==='Late').length}</span>
                      {s.summary.overtime > 0 && <span>OT={s.summary.overtime}h</span>}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
