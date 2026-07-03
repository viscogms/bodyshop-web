import { useState, useEffect } from 'react'
import api from '../api/client'
import { getStatusColor, INACTIVE_STATUSES, formatDate, getCleanModel, getCustomerName, parseImages, decodePart, STATUS_OPTIONS } from '../utils/helpers'
import { useAuthContext } from '../api/AuthContext'
import JobCardForm from '../components/JobCardForm'
import InspectionReportTab from '../components/InspectionReportTab'
import Swal from 'sweetalert2'

export default function JobCardsPage() {
  const { hasPerm, isAdmin, isOwner } = useAuthContext()
  const [cards,    setCards]    = useState([])
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const [filter,   setFilter]   = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState(null)

  useEffect(() => { fetchCards(); fetchUsers() }, [])

  const fetchCards = async () => {
    try {
      setLoading(true)
      const res = await api.get('/jobcards?page=1&limit=100')
      setCards(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users')
      setUsers(res.data)
    } catch (e) {}
  }

  const handleDelete = (id) => {
    Swal.fire({ title:'Delete Job Card?', text:"This can't be undone.", icon:'warning',
      showCancelButton:true, confirmButtonColor:'#dc2626', confirmButtonText:'Delete' })
    .then(async r => {
      if (r.isConfirmed) {
        await api.delete(`/jobcards/${id}`)
        setSelected(null)
        fetchCards()
      }
    })
  }

  const handleStatusChange = async (card, newStatus) => {
    await api.put(`/jobcards/${card._id}`, { status: newStatus })
    setCards(prev => prev.map(c => c._id === card._id ? { ...c, status: newStatus } : c))
    if (selected?._id === card._id) setSelected(s => ({ ...s, status: newStatus }))
  }

  const openNew  = () => { setEditCard(null); setShowForm(true) }
  const openEdit = (card) => { setEditCard(card); setSelected(null); setShowForm(true) }
  const onSaved  = () => { setShowForm(false); setEditCard(null); fetchCards() }

  const filtered = cards.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !search || [c.plateNumber, c.carModel, c.jobCardNo, c.customerContact]
      .some(f => f?.toLowerCase().includes(q))
    const matchFilter = filter === 'all' ? true
      : filter === 'active' ? !INACTIVE_STATUSES.includes(c.status)
      : INACTIVE_STATUSES.includes(c.status)
    return matchSearch && matchFilter
  })

  // "YYYY-MM-DD HH:mm" (space-separated) parses inconsistently across browsers — normalize to ISO first
  const getSortDate = (c) => {
    const d = c.receiveDate || c.jobCardDate || c.createdAt
    if (!d) return 0
    const t = new Date(String(d).replace(' ', 'T')).getTime()
    return isNaN(t) ? 0 : t
  }

  const sorted = [...filtered].sort((a, b) => {
    const aI = INACTIVE_STATUSES.includes(a.status) ? 1 : 0
    const bI = INACTIVE_STATUSES.includes(b.status) ? 1 : 0
    if (aI !== bI) return aI - bI
    return getSortDate(b) - getSortDate(a)
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="page-header">Job Cards <span className="text-gray-400 font-normal text-base">({sorted.length})</span></h1>
        <div className="flex gap-2 flex-wrap">
          <input className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm w-48 focus:outline-none focus:border-brand"
            placeholder="Search plate, model..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none"
            value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {hasPerm('canCreateCard') && (
            <button onClick={openNew} className="btn-primary px-4 py-2 text-sm">+ New Card</button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="p-6 text-center text-gray-400">Loading...</p>
      ) : sorted.length === 0 ? (
        <div className="card text-center text-gray-400 py-10">No job cards found</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sorted.map(card => {
            const inactive = INACTIVE_STATUSES.includes(card.status)
            const pendingTodos = (card.todos||[]).filter(t => !t.completed).length
            const img = parseImages(card.rearImage)[0]
            const statusColor = getStatusColor(card.status)
            return (
              <div
                key={card._id}
                onClick={() => setSelected(card)}
                className={`card p-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${inactive ? 'opacity-50' : ''}`}
              >
                <div className="h-28 bg-green-50 dark:bg-gray-800 relative">
                  {img
                    ? <img src={img} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">🚗</div>}
                  <span className="absolute top-1.5 left-1.5 badge text-[9px]" style={{ backgroundColor: statusColor }}>{card.status}</span>
                  {pendingTodos > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 badge bg-green-600 text-[9px] rounded-full w-5 h-5 flex items-center justify-center p-0">{pendingTodos}</span>
                  )}
                </div>
                <div className="h-[3px]" style={{ backgroundColor: inactive ? '#e2e8f0' : statusColor }} />
                <div className="p-2">
                  <p className="font-black text-xs text-gray-900 dark:text-white truncate">{card.plateNumber}</p>
                  <p className="text-[10px] text-brand truncate mt-0.5">{getCleanModel(card.carModel) || '—'}</p>
                  <p className="text-[10px] text-gray-500 truncate">{getCustomerName(card.carModel) || '—'}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{formatDate(card.receiveDate)}</p>
                  {card.jobDoneBy && <p className="text-[9px] text-green-500 font-bold truncate mt-0.5">🔧 {card.jobDoneBy}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <DetailPanel card={selected} onClose={() => setSelected(null)}
          onEdit={hasPerm('canEditCard') ? openEdit : null}
          onDelete={hasPerm('canDeleteCard') ? handleDelete : null}
          onStatusChange={hasPerm('canUpdateStatus') ? handleStatusChange : null}
          onCardUpdate={(updated) => { setSelected(updated); setCards(prev => prev.map(c => c._id === updated._id ? updated : c)) }}
          canEditCard={hasPerm('canEditCard')}
          isAdmin={isAdmin}
          isOwner={isOwner}
          users={users} />
      )}

      {showForm && (
        <JobCardForm initial={editCard} onSave={onSaved} onCancel={() => { setShowForm(false); setEditCard(null) }} />
      )}
    </div>
  )
}

function DetailPanel({ card, onClose, onEdit, onDelete, onStatusChange, onCardUpdate, canEditCard, isAdmin, isOwner, users = [] }) {
  const images    = parseImages(card.rearImage)
  const vinImages = parseImages(card.vinImage)
  const odoImages = parseImages(card.odoImage)
  const parts     = (card.inspectionDetails || []).map(decodePart).filter(p => p.name.trim())
  const todos     = card.todos || []
  const balance   = (Number(card.invoiceAmount||0) - Number(card.paidAmount||0)).toFixed(2)

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">{card.plateNumber}</h2>
          <div className="flex items-center gap-2">
            {onEdit && <button onClick={() => onEdit(card)} className="btn-primary text-xs px-3 py-1.5">✏️ Edit</button>}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl ml-2">✕</button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {images[0] && <img src={images[0]} alt="" className="w-full h-48 object-cover" />}
          {(vinImages[0] || odoImages[0]) && (
            <div className="grid grid-cols-2 gap-2">
              {vinImages[0] && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Chassis / VIN Photo</p>
                  <a href={vinImages[0]} target="_blank" rel="noreferrer"><img src={vinImages[0]} alt="" className="w-full h-32 object-cover" /></a>
                </div>
              )}
              {odoImages[0] && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Odometer Photo</p>
                  <a href={odoImages[0]} target="_blank" rel="noreferrer"><img src={odoImages[0]} alt="" className="w-full h-32 object-cover" /></a>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="badge px-3 py-1" style={{ backgroundColor: getStatusColor(card.status) }}>{card.status}</span>
            {onStatusChange && (
              <select className="text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1"
                value={card.status} onChange={e => onStatusChange(card, e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[['Job Card No',card.jobCardNo],['Model',getCleanModel(card.carModel)],['Customer',getCustomerName(card.carModel)],
              ['Contact',(card.customerContacts||[card.customerContact]).filter(Boolean).join(', ')],
              ['VIN',card.vin],['ODO KM',card.odoKM],['Received',formatDate(card.receiveDate)],
              ['Delivery',formatDate(card.deliveryDate)],['Tech',card.inspectionTech]
            ].map(([l,v]) => v ? (
              <div key={l} className="border-b border-gray-100 dark:border-gray-800 pb-1">
                <p className="text-[10px] text-gray-400 uppercase font-bold">{l}</p>
                <p className="font-semibold text-gray-900 dark:text-white">{v}</p>
              </div>
            ) : null)}
            {/* Mechanic assignment */}
            <div className="border-b border-gray-100 dark:border-gray-800 pb-1 col-span-2">
              <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">🔧 Assigned Mechanic</p>
              {canEditCard ? (
                <select
                  className="w-full text-sm border border-green-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 focus:outline-none focus:border-brand"
                  value={card.jobDoneBy || ''}
                  onChange={async e => {
                    const jobDoneBy = e.target.value
                    await api.put(`/jobcards/${card._id}`, { jobDoneBy })
                    onCardUpdate({ ...card, jobDoneBy })
                  }}
                >
                  <option value="">— Unassigned —</option>
                  {users.filter(u => u.isActive !== false).map(u => (
                    <option key={u._id} value={u.name}>{u.name} ({u.role})</option>
                  ))}
                </select>
              ) : (
                <p className="font-semibold text-green-600">{card.jobDoneBy || '—'}</p>
              )}
            </div>
          </div>
          {(canEditCard || isOwner) && <PartCostsSection card={card} onCardUpdate={onCardUpdate} readOnly={isOwner} />}

          {(isAdmin || isOwner) && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3">
              <p className="label mb-2">Billing</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-[10px] text-gray-400 uppercase font-bold">Invoice</p><p className="font-bold">AED {card.invoiceAmount||0}</p></div>
                <div><p className="text-[10px] text-gray-400 uppercase font-bold">Paid</p><p className="font-bold text-green-600">AED {card.paidAmount||0}</p></div>
                {Number(card.laborCharges||0) > 0 && <div><p className="text-[10px] text-orange-500 uppercase font-bold">🔧 Labor</p><p className="font-bold text-orange-500">AED {card.laborCharges}</p></div>}
                <div><p className="text-[10px] text-gray-400 uppercase font-bold">Balance</p><p className="font-bold text-red-500">AED {balance}</p></div>
              </div>
            </div>
          )}
          {parts.length > 0 && (
            <div>
              <p className="label mb-2">Inspection Report & Parts</p>
              {parts.map((p, i) => (
                <p key={i} className="text-sm py-1 border-b border-gray-100 dark:border-gray-800">
                  {p.received ? '✅' : '⬜'} {p.name}
                </p>
              ))}
            </div>
          )}
          {card.customerVoice?.filter(v => typeof v==='object' ? v.text : v).length > 0 && (
            <div>
              <p className="label mb-2">Customer Complaints</p>
              {card.customerVoice.filter(v => typeof v==='object' ? v.text : v).map((v,i) => {
                const text = typeof v==='object' ? v.text : v
                const done = typeof v==='object' ? v.completed : false
                return <p key={i} className="text-sm py-1 border-b border-gray-100 dark:border-gray-800">{done?'✅':'⬜'} {text}</p>
              })}
            </div>
          )}
          {todos.length > 0 && (
            <div>
              <p className="label mb-2">To-Do's</p>
              {todos.map((t,i) => <p key={i} className="text-sm py-1 border-b border-gray-100 dark:border-gray-800">{t.completed?'✅':'⬜'} {t.text}</p>)}
            </div>
          )}
          {onDelete && <button onClick={() => onDelete(card._id)} className="btn-danger w-full py-2 text-sm mt-2">🗑️ DELETE JOB CARD</button>}
        </div>
      </div>
    </div>
  )
}

function PartCostsSection({ card, onCardUpdate, readOnly }) {
  const [supplierName, setSupplierName] = useState('')
  const [amount, setAmount] = useState('')
  const [billImage, setBillImage] = useState('')
  const [uploading, setUploading] = useState(false)
  const partCosts = card.partCosts || []
  const total = partCosts.reduce((s, p) => s + Number(p.amount || 0), 0)

  const uploadBillImage = async (file) => {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('image', file)
      const res = await api.post('/upload', fd)
      setBillImage(res.data.imageUrl)
    } catch { Swal.fire('Error', 'Bill image upload failed', 'error') }
    finally { setUploading(false) }
  }

  const addBill = async () => {
    if (!supplierName.trim() || !amount) return Swal.fire('Error', 'Enter supplier name and amount', 'error')
    const updated = [...partCosts, { supplierName: supplierName.trim(), amount: Number(amount), billImage }]
    try {
      const res = await api.put(`/jobcards/${card._id}`, { partCosts: updated })
      onCardUpdate(res.data)
      setSupplierName(''); setAmount(''); setBillImage('')
    } catch { Swal.fire('Error', 'Failed to save bill', 'error') }
  }

  const deleteBill = async (idx) => {
    const updated = [...partCosts]; updated.splice(idx, 1)
    try {
      const res = await api.put(`/jobcards/${card._id}`, { partCosts: updated })
      onCardUpdate(res.data)
    } catch { Swal.fire('Error', 'Failed to delete bill', 'error') }
  }

  return (
    <div className="bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-gray-700 p-3">
      <p className="label mb-2 text-brand">🧾 Part Purchase Costs</p>

      {partCosts.length === 0 && <p className="text-xs text-gray-400 mb-2">No bills added yet.</p>}

      {partCosts.map((pc, idx) => (
        <div key={idx} className="flex items-center justify-between py-1.5 border-b border-green-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {pc.billImage
              ? <a href={pc.billImage} target="_blank" rel="noreferrer"><img src={pc.billImage} alt="" className="w-9 h-9 object-cover" /></a>
              : <span className="text-lg">🧾</span>}
            <div>
              <p className="text-sm font-semibold">{pc.supplierName}</p>
              <p className="text-xs text-gray-400">AED {Number(pc.amount || 0).toFixed(2)}</p>
            </div>
          </div>
          {!readOnly && <button onClick={() => deleteBill(idx)} className="text-red-500 font-bold px-2">✕</button>}
        </div>
      ))}

      {partCosts.length > 0 && (
        <p className="text-sm font-bold mt-2 pt-2 border-t border-green-200 dark:border-gray-700">Total Parts Cost: AED {total.toFixed(2)}</p>
      )}

      {!readOnly && (
        <>
          <div className="flex gap-2 mt-3">
            <input className="input flex-1" placeholder="Supplier Name" value={supplierName} onChange={e => setSupplierName(e.target.value)} />
            <input className="input flex-1" placeholder="Amount AED" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <label className="text-xs bg-white dark:bg-gray-900 border border-green-200 dark:border-gray-700 px-3 py-1.5 cursor-pointer">
              📷 {billImage ? 'Change Bill Photo' : 'Add Bill Photo'}
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadBillImage(e.target.files[0])} />
            </label>
            {uploading && <span className="text-xs text-gray-400">Uploading...</span>}
            {!uploading && billImage && <img src={billImage} alt="" className="w-8 h-8 object-cover" />}
          </div>
          <button onClick={addBill} className="btn-primary w-full py-2 text-sm mt-3">+ Add Bill</button>
        </>
      )}
    </div>
  )
}
