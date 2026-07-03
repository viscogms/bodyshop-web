import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'
import Swal from 'sweetalert2'
import { getCleanModel, getCustomerName, formatDate } from '../utils/helpers'

export default function FinancePage() {
  const [vehicles,  setVehicles]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [expanded,  setExpanded]  = useState(null)

  useEffect(() => { fetchUnpaid() }, [])

  const fetchUnpaid = async () => {
    try {
      setLoading(true)
      const res = await api.get('/jobcards/unpaid')
      setVehicles(res.data)
    } catch (e) {
      console.error(e)
      Swal.fire('Error', 'Failed to load finance data. Please try again.', 'error')
    } finally { setLoading(false) }
  }

  const total = vehicles.reduce((s, v) => s + (Number(v.invoiceAmount||0) - Number(v.paidAmount||0)), 0)

  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles
    const q = search.toLowerCase()
    return vehicles.filter(v =>
      v.plateNumber?.toLowerCase().includes(q) ||
      getCleanModel(v.carModel).toLowerCase().includes(q) ||
      getCustomerName(v.carModel).toLowerCase().includes(q) ||
      v.jobCardNo?.toLowerCase().includes(q) ||
      v.customerContact?.includes(q)
    )
  }, [vehicles, search])

  // Group by phone (skip entries with no valid phone)
  const phoneGroups = useMemo(() => {
    const g = {}
    filtered.forEach(v => {
      const p = (v.customerContacts?.[0] || v.customerContact || '').trim()
      if (!p) return
      if (!g[p]) g[p] = []
      g[p].push(v)
    })
    return Object.entries(g).filter(([, cards]) => cards.length >= 2)
  }, [filtered])

  const getLabel = (v) => {
    const b = Number(v.invoiceAmount||0) - Number(v.paidAmount||0)
    if (b <= 0) return { label: 'PAID', color: 'bg-green-600' }
    if (Number(v.paidAmount) > 0) return { label: 'PARTIAL', color: 'bg-yellow-500' }
    return { label: 'UNPAID', color: 'bg-red-600' }
  }

  const Row = ({ v, i }) => {
    const balance = (Number(v.invoiceAmount||0) - Number(v.paidAmount||0)).toFixed(2)
    const { label, color } = getLabel(v)
    return (
      <tr className={`border-b border-gray-100 dark:border-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 ${i%2===0?'':'bg-gray-50/50 dark:bg-gray-800/20'}`}>
        <td className="px-4 py-3 font-black text-gray-900 dark:text-white">{v.plateNumber}</td>
        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{getCleanModel(v.carModel)}</td>
        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{getCustomerName(v.carModel)||'—'}</td>
        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{v.jobCardNo||'—'}</td>
        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatDate(v.receiveDate)}</td>
        <td className="px-4 py-3 text-red-600 font-bold text-right">AED {balance}</td>
        <td className="px-4 py-3 text-center">
          <span className={`badge text-[10px] ${color}`}>{label}</span>
        </td>
      </tr>
    )
  }

  if (loading) return <p className="text-center text-gray-400 mt-12">Loading...</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="page-header">Finance Report</h1>
        <input
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm w-64 focus:outline-none focus:border-brand"
          placeholder="Search plate, customer, phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Summary */}
      <div className="card border-l-4 border-l-brand flex items-center justify-between">
        <div>
          <p className="label">Total Outstanding</p>
          <p className="text-3xl font-black text-red-500 mt-1">AED {total.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black text-gray-900 dark:text-white">{vehicles.length}</p>
          <p className="label mt-1">Unpaid Vehicles</p>
        </div>
      </div>

      {/* Phone groups */}
      {phoneGroups.length > 0 && !search && (
        <div className="space-y-2">
          <p className="label">Same Customer — Multiple Vehicles</p>
          {phoneGroups.map(([phone, cards]) => {
            const groupTotal = cards.reduce((s, v) => s + (Number(v.invoiceAmount||0) - Number(v.paidAmount||0)), 0)
            const open = expanded === phone
            return (
              <div key={phone} className="card border-l-4 border-l-red-500 p-0 overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? null : phone)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">📞 {phone}</p>
                    <p className="text-xs text-gray-500">{cards.length} vehicles</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-red-500">AED {groupTotal.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{open ? '▲' : '▼'}</p>
                  </div>
                </button>
                {open && (
                  <table className="w-full text-sm border-t border-gray-100 dark:border-gray-800">
                    <tbody>{cards.map((v, i) => <Row key={v._id} v={v} i={i} />)}</tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Main table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-950 text-gray-400 text-left">
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider">Plate</th>
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider hidden sm:table-cell">Model</th>
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider hidden md:table-cell">Customer</th>
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider hidden lg:table-cell">JC No</th>
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider hidden lg:table-cell">Date</th>
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider text-right">Balance</th>
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, i) => <Row key={v._id} v={v} i={i} />)}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No outstanding vehicles</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
