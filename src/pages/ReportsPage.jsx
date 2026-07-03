import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'
import Swal from 'sweetalert2'
import { getCleanModel, getCustomerName, formatDate } from '../utils/helpers'

const TEST_STATUS = 'Test Job'

export default function ReportsPage() {
  const [cards,   setCards]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const res = await api.get('/jobcards?page=1&limit=2000')
      setCards(res.data || [])
    } catch (e) {
      console.error(e)
      Swal.fire('Error', 'Failed to load report data.', 'error')
    } finally { setLoading(false) }
  }

  const partCostOf = (c) => (c.partCosts || []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const profitOf    = (c) => Number(c.invoiceAmount || 0) - partCostOf(c)

  const testJobCards = useMemo(() => cards.filter(c => c.status === TEST_STATUS), [cards])
  const earningCards = useMemo(() => cards.filter(c => c.status !== TEST_STATUS), [cards])

  const totals = useMemo(() => {
    const totalInvoice  = earningCards.reduce((s, c) => s + Number(c.invoiceAmount || 0), 0)
    const totalPartCost = earningCards.reduce((s, c) => s + partCostOf(c), 0)
    return { totalInvoice, totalPartCost, totalProfit: totalInvoice - totalPartCost }
  }, [earningCards])

  const filtered = useMemo(() => {
    if (!search.trim()) return earningCards
    const q = search.toLowerCase()
    return earningCards.filter(c =>
      c.plateNumber?.toLowerCase().includes(q) ||
      getCleanModel(c.carModel).toLowerCase().includes(q) ||
      getCustomerName(c.carModel).toLowerCase().includes(q) ||
      c.jobCardNo?.toLowerCase().includes(q)
    )
  }, [earningCards, search])

  const sorted = useMemo(() => [...filtered].sort((a, b) => profitOf(b) - profitOf(a)), [filtered])

  if (loading) return <p className="text-center text-gray-400 mt-12">Loading...</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="page-header">Earnings Report</h1>
        <input
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm w-64 focus:outline-none focus:border-brand"
          placeholder="Search plate, model, customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card border-l-4 border-l-green-600">
          <p className="text-[10px] text-green-600 uppercase font-bold tracking-wide">Total Earned</p>
          <p className="text-2xl font-black text-green-600 mt-1">AED {totals.totalProfit.toFixed(0)}</p>
        </div>
        <div className="card border-l-4 border-l-brand">
          <p className="text-[10px] text-brand uppercase font-bold tracking-wide">Total Invoiced</p>
          <p className="text-2xl font-black text-brand mt-1">AED {totals.totalInvoice.toFixed(0)}</p>
        </div>
        <div className="card border-l-4 border-l-red-500">
          <p className="text-[10px] text-red-500 uppercase font-bold tracking-wide">Part Costs</p>
          <p className="text-2xl font-black text-red-500 mt-1">AED {totals.totalPartCost.toFixed(0)}</p>
        </div>
        <div className="card border-l-4 border-l-amber-500">
          <p className="text-[10px] text-amber-500 uppercase font-bold tracking-wide">Test Jobs</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{testJobCards.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-950 text-gray-400 text-left">
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider">Plate</th>
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider hidden sm:table-cell">Model</th>
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider hidden md:table-cell">Customer</th>
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider hidden lg:table-cell">Date</th>
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider text-right">Invoice</th>
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider text-right">Parts</th>
              <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const pc = partCostOf(c)
              const profit = profitOf(c)
              return (
                <tr key={c._id} className={`border-b border-gray-100 dark:border-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/20'}`}>
                  <td className="px-4 py-3 font-black text-gray-900 dark:text-white">{c.plateNumber}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{getCleanModel(c.carModel)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{getCustomerName(c.carModel) || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatDate(c.receiveDate)}</td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">AED {Number(c.invoiceAmount || 0).toFixed(0)}</td>
                  <td className="px-4 py-3 text-right text-red-500">AED {pc.toFixed(0)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>AED {profit.toFixed(0)}</td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No results found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
