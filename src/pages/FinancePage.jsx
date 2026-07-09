import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'
import Swal from 'sweetalert2'
import { getCleanModel, getCustomerName, formatDate } from '../utils/helpers'
import InvoiceTab, { buildInvoiceHTML } from '../components/InvoiceTab'

export default function FinancePage() {
  const [tab,        setTab]        = useState('outstanding')
  const [vehicles,   setVehicles]   = useState([])
  const [allCards,   setAllCards]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [invSearch,  setInvSearch]  = useState('')
  const [expanded,   setExpanded]   = useState(null)
  const [invModal,   setInvModal]   = useState(null)

  useEffect(() => { fetchUnpaid(); fetchAllForInvoices() }, [])

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

  const fetchAllForInvoices = async () => {
    try {
      const res = await api.get('/jobcards?page=1&limit=500')
      setAllCards(Array.isArray(res.data) ? res.data : res.data.data || [])
    } catch (e) { console.error(e) }
  }

  const invoiceCards = useMemo(() =>
    allCards.filter(c => c.invoiceMeta && c.invoiceMeta.invoiceNo),
  [allCards])

  const filteredInvoices = useMemo(() => {
    if (!invSearch.trim()) return invoiceCards
    const q = invSearch.toLowerCase()
    return invoiceCards.filter(c =>
      c.invoiceMeta?.invoiceNo?.toLowerCase().includes(q) ||
      c.plateNumber?.toLowerCase().includes(q) ||
      c.invoiceMeta?.customerName?.toLowerCase().includes(q) ||
      c.jobCardNo?.toLowerCase().includes(q)
    )
  }, [invoiceCards, invSearch])

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

  const deleteInvoice = async (card) => {
    const r = await Swal.fire({ title: 'Delete Invoice?', text: 'Invoice data will be removed from this job card.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Delete' })
    if (!r.isConfirmed) return
    try {
      await api.put(`/jobcards/${card._id}`, { invoiceMeta: {}, invoiceLines: [], invoiceNo: '' })
      setAllCards(prev => prev.map(c => c._id === card._id ? { ...c, invoiceMeta: {}, invoiceLines: [], invoiceNo: '' } : c))
      Swal.fire('Deleted', 'Invoice removed.', 'success')
    } catch { Swal.fire('Error', 'Failed to delete invoice.', 'error') }
  }

  const sendWhatsApp = (card) => {
    const meta   = card.invoiceMeta || {}
    const lines  = card.invoiceLines || []
    const invoice = { ...meta, lines }
    const html = buildInvoiceHTML(invoice, card)
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    const subTotal = lines.reduce((s, l) => s + (Number(l.qty||0) * Number(l.rate||0)), 0)
    const discount = Number(meta.discount || 0)
    const tax      = Math.round((subTotal - discount) * 0.05 * 100) / 100
    const total    = (subTotal - discount) + tax
    const paid     = Number(meta.paidAmount || card.paidAmount || 0)
    const balance  = Math.max(0, total - paid)
    const phone = (card.customerContacts || [card.customerContact]).filter(Boolean)[0]?.replace(/\D/g,'')
    const msg = encodeURIComponent(`Dear Customer,\n\nPlease find your invoice ${meta.invoiceNo} from Visco Auto Repairs.\nVehicle: ${card.plateNumber}\nTotal: AED ${total.toFixed(2)}\nBalance Due: AED ${balance.toFixed(2)}\n\nThank you for your trust!`)
    if (phone) window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
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
        <h1 className="page-header">Finance</h1>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {[['outstanding','💰 Outstanding'],['invoices','🧾 Invoices']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-bold transition-colors ${tab === key ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {label} {key === 'invoices' && invoiceCards.length > 0 && <span className="ml-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[10px] px-1.5 py-0.5 rounded-full">{invoiceCards.length}</span>}
          </button>
        ))}
      </div>

      {/* ── OUTSTANDING TAB ── */}
      {tab === 'outstanding' && <>
        <div className="flex justify-end">
          <input
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm w-64 focus:outline-none focus:border-brand"
            placeholder="Search plate, customer, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

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
      </>}

      {/* ── INVOICES TAB ── */}
      {tab === 'invoices' && <>
        <div className="flex justify-end">
          <input
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm w-64 focus:outline-none focus:border-brand"
            placeholder="Search invoice #, plate, customer..."
            value={invSearch}
            onChange={e => setInvSearch(e.target.value)}
          />
        </div>

        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-950 text-gray-400 text-left">
                <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider">Invoice #</th>
                <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider">Date</th>
                <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider">Plate</th>
                <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider hidden md:table-cell">Customer</th>
                <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider text-right">Total</th>
                <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider text-right">Balance</th>
                <th className="px-4 py-3 font-bold uppercase text-xs tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((card, i) => {
                const meta   = card.invoiceMeta || {}
                const lines  = card.invoiceLines || []
                const sub    = lines.reduce((s, l) => s + (Number(l.qty||0) * Number(l.rate||0)), 0)
                const disc   = Number(meta.discount || 0)
                const tax    = Math.round((sub - disc) * 0.05 * 100) / 100
                const tot    = (sub - disc) + tax
                const paid   = Number(meta.paidAmount || card.paidAmount || 0)
                const bal    = Math.max(0, tot - paid)
                return (
                  <tr
                    key={card._id}
                    onClick={() => setInvModal(card)}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-green-50 dark:hover:bg-green-900/10 cursor-pointer ${i%2===0?'':'bg-gray-50/50 dark:bg-gray-800/20'}`}
                  >
                    <td className="px-4 py-3 font-black text-green-700 dark:text-green-400">{meta.invoiceNo}</td>
                    <td className="px-4 py-3 text-gray-500">{meta.invoiceDate || '—'}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{card.plateNumber}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{meta.customerName || getCustomerName(card.carModel) || '—'}</td>
                    <td className="px-4 py-3 font-bold text-right">AED {tot.toFixed(2)}</td>
                    <td className={`px-4 py-3 font-bold text-right ${bal > 0 ? 'text-red-600' : 'text-green-600'}`}>AED {bal.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setInvModal(card)}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded font-bold text-gray-700 dark:text-gray-300"
                          title="Edit Invoice"
                        >✏️</button>
                        <button
                          onClick={() => sendWhatsApp(card)}
                          className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 rounded font-bold text-green-700 dark:text-green-400"
                          title="Send WhatsApp"
                        >📤</button>
                        <button
                          onClick={() => deleteInvoice(card)}
                          className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 rounded font-bold text-red-600"
                          title="Delete Invoice"
                        >🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredInvoices.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No invoices found. Create invoices from the Job Cards page.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>}

      {/* Invoice Edit Modal */}
      {invModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setInvModal(null)}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">{invModal.plateNumber} — Invoice</h2>
                <p className="text-xs text-gray-400">{invModal.invoiceMeta?.invoiceNo} · {getCleanModel(invModal.carModel)}</p>
              </div>
              <button onClick={() => setInvModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <div className="p-4">
              <InvoiceTab
                card={invModal}
                onCardUpdate={(updated) => {
                  setInvModal(updated)
                  setAllCards(prev => prev.map(c => c._id === updated._id ? updated : c))
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
