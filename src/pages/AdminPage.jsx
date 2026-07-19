import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'
import Swal from 'sweetalert2'
import AttendanceTab from '../components/AttendanceTab'
import SalaryAdvanceModal from '../components/SalaryAdvanceModal'
import LaborTab from '../components/LaborTab'
import PayrollTab from '../components/PayrollTab'

const STAFF_CATEGORIES = ['Foreman','Technician','Helper','Supervisor','Accounts Clerk','Driver','Denter','Painter']
const ROLES = ['Admin','Owner','Technician','User']

const BLANK = () => ({
  // HR
  name: '', category: 'Technician', birthday: '', country: '', passportNo: '',
  eid: '', eidExpiry: '', salary: '', email: '', mobiles: [''],
  // Account
  username: '', password: '', role: 'User', isActive: true,
})

export default function AdminPage() {
  const [tab,     setTab]     = useState('staff')
  const [users,   setUsers]   = useState([])
  const [staff,   setStaff]   = useState([])
  const [parts,   setParts]   = useState([])
  const [loading, setLoading] = useState(true)

  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('all')

  const [showModal,     setShowModal]     = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [editingStaffId,setEditingStaffId]= useState(null)
  const [form, setForm] = useState(BLANK())
  const [expandedStaff, setExpandedStaff] = useState(null)
  const [advanceStaff,  setAdvanceStaff]  = useState(null)

  // Parts state
  const [newGroup,  setNewGroup]  = useState('')
  const [selGroup,  setSelGroup]  = useState('')
  const [newItem,   setNewItem]   = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [uRes, sRes, pRes] = await Promise.all([api.get('/users'), api.get('/staff'), api.get('/parts')])
      setUsers(Array.isArray(uRes.data) ? uRes.data : [])
      setStaff(Array.isArray(sRes.data) ? sRes.data : [])
      setParts(Array.isArray(pRes.data) ? pRes.data : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const merged = useMemo(() => {
    const map = new Map()
    staff.forEach(s => map.set(s.name.toLowerCase().trim(), { staff: s, user: null }))
    users.forEach(u => {
      if (u.username === 'admin') return
      const key = u.name.toLowerCase().trim()
      if (map.has(key)) map.get(key).user = u
      else map.set(key, { staff: null, user: u })
    })
    return [...map.values()].sort((a, b) =>
      (a.staff?.name || a.user?.name || '').localeCompare(b.staff?.name || b.user?.name || '')
    )
  }, [users, staff])

  const filtered = useMemo(() => merged.filter(({ staff: s, user: u }) => {
    const name = (s?.name || u?.name || '').toLowerCase()
    const q = search.toLowerCase()
    const matchSearch = !search || name.includes(q) ||
      s?.eid?.toLowerCase().includes(q) ||
      s?.passportNo?.toLowerCase().includes(q) ||
      u?.username?.toLowerCase().includes(q)
    const matchCat = catFilter === 'all' || s?.category === catFilter
    return matchSearch && matchCat
  }), [merged, search, catFilter])

  const openNew = () => {
    setEditingUserId(null); setEditingStaffId(null); setForm(BLANK()); setShowModal(true)
  }

  const openEdit = ({ staff: s, user: u }) => {
    setEditingStaffId(s?._id || null)
    setEditingUserId(u?._id || null)
    setForm({
      name:       s?.name       || u?.name       || '',
      category:   s?.category   || 'Technician',
      birthday:   s?.birthday   || '',
      country:    s?.country    || '',
      passportNo: s?.passportNo || '',
      eid:        s?.eid        || '',
      eidExpiry:  s?.eidExpiry  || '',
      salary:     String(s?.salary || ''),
      email:      s?.email      || '',
      mobiles:    s?.mobiles?.length ? [...s.mobiles, ''] : [''],
      username:   u?.username   || '',
      password:   '',
      role:       u?.role       || 'User',
      isActive:   u?.isActive   !== false,
    })
    setShowModal(true)
  }

  const setMobile = (idx, val) => {
    const list = [...form.mobiles]; list[idx] = val
    if (idx === list.length - 1 && val.trim()) list.push('')
    setForm(f => ({ ...f, mobiles: list }))
  }
  const removeMobile = (idx) => {
    const list = form.mobiles.filter((_, i) => i !== idx)
    setForm(f => ({ ...f, mobiles: list.length ? list : [''] }))
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const hrPayload = {
      name: form.name.trim(), category: form.category, birthday: form.birthday,
      country: form.country, passportNo: form.passportNo, eid: form.eid,
      eidExpiry: form.eidExpiry, salary: Number(form.salary)||0,
      email: form.email, mobiles: form.mobiles.filter(m => m.trim()),
    }
    try {
      if (editingStaffId) {
        const r = await api.put(`/staff/${editingStaffId}`, hrPayload)
        setStaff(prev => prev.map(s => s._id === editingStaffId ? r.data : s))
      } else {
        const r = await api.post('/staff', hrPayload)
        setStaff(prev => [r.data, ...prev])
      }
      if (form.username.trim()) {
        const acctPayload = { name: form.name.trim(), username: form.username.trim(), role: form.role, isActive: form.isActive }
        if (form.password) acctPayload.password = form.password
        if (editingUserId) {
          const r = await api.put(`/users/${editingUserId}`, acctPayload)
          setUsers(prev => prev.map(u => u._id === editingUserId ? r.data : u))
        } else {
          if (!form.password) { Swal.fire('Error', 'Password required for new account', 'error'); return }
          const r = await api.post('/users', { ...acctPayload, password: form.password })
          setUsers(prev => [...prev, r.data])
        }
      }
      setShowModal(false)
      Swal.fire('Saved!', '', 'success')
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Failed to save', 'error')
    }
  }

  const deletePerson = ({ staff: s, user: u }) => {
    const name = s?.name || u?.name
    Swal.fire({ title: `Delete "${name}"?`, text: 'Removes HR record and account.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Delete' })
      .then(async r => {
        if (!r.isConfirmed) return
        try {
          if (s) { await api.delete(`/staff/${s._id}`); setStaff(prev => prev.filter(x => x._id !== s._id)) }
          if (u) { await api.delete(`/users/${u._id}`); setUsers(prev => prev.filter(x => x._id !== u._id)) }
          setShowModal(false)
        } catch (e) { Swal.fire('Error', e.response?.data?.error || 'Failed', 'error') }
      })
  }

  const addGroup = async () => {
    if (!newGroup.trim()) return
    await api.post('/parts', { groupName: newGroup.trim(), items: [] })
    setNewGroup('')
    const r = await api.get('/parts'); setParts(r.data)
  }
  const addItem = async () => {
    if (!selGroup || !newItem.trim()) return
    const group = parts.find(g => g._id === selGroup)
    await api.put(`/parts/${selGroup}`, { items: [...(group.items||[]), newItem.trim()] })
    setNewItem('')
    const r = await api.get('/parts'); setParts(r.data)
  }
  const deleteItem = async (groupId, idx) => {
    const group = parts.find(g => g._id === groupId)
    const items = [...(group.items||[])]; items.splice(idx,1)
    await api.put(`/parts/${groupId}`, { items })
    const r = await api.get('/parts'); setParts(r.data)
  }
  const deleteGroup = (id) => {
    Swal.fire({ title:'Delete Group?', icon:'warning', showCancelButton:true, confirmButtonColor:'#dc2626' })
    .then(async r => {
      if (r.isConfirmed) { await api.delete(`/parts/${id}`); setParts(prev => prev.filter(g => g._id !== id)); if (selGroup===id) setSelGroup('') }
    })
  }

  if (loading) return <p className="text-center text-gray-400 mt-12">Loading...</p>

  const selectedGroup = parts.find(g => g._id === selGroup)

  return (
    <div className="space-y-4">
      <h1 className="page-header">Staff & Settings</h1>

      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {[['staff','👥 Staff'],['attendance','📅 Attendance'],['labor','💼 Labor'],['payroll','🧾 Payroll'],['parts','⚙️ Parts']].map(([t,label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-bold transition-colors border-b-2 -mb-px
              ${tab===t ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <input className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm w-44 focus:outline-none focus:border-green-500"
                placeholder="Search name, EID, username..." value={search} onChange={e => setSearch(e.target.value)} />
              <select className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none"
                value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {STAFF_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={openNew} className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 text-sm font-bold">+ Add Staff</button>
          </div>

          <div className="space-y-2">
            {filtered.map(({ staff: s, user: u }) => {
              const name = s?.name || u?.name
              const isOpen = expandedStaff === name
              return (
                <div key={name} className="card border-l-4 border-l-green-600">
                  <button className="w-full flex items-center justify-between gap-3 text-left"
                    onClick={() => setExpandedStaff(isOpen ? null : name)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 font-black text-sm shrink-0">
                        {name?.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-black text-gray-900 dark:text-white truncate">{name}</span>
                      {s && <span className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700">{s.category}</span>}
                    </div>
                    <span className="text-gray-400 text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {s && <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700">{s.category}</span>}
                        {u && <span className={`text-[10px] font-bold px-2 py-0.5 ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{u.role} {u.isActive ? '✓' : '✗'}</span>}
                        {!s && <span className="text-[10px] text-gray-400 italic">No HR record</span>}
                        {!u && <span className="text-[10px] text-gray-400 italic">No account</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                        {u?.username    && <p>🔑 {u.username}</p>}
                        {s?.country     && <p>🌍 {s.country}</p>}
                        {s?.salary > 0  && <p>💰 AED {s.salary}</p>}
                        {s?.eid         && <p>🪪 {s.eid}</p>}
                        {s?.eidExpiry   && <p>📅 EID exp: {s.eidExpiry}</p>}
                        {s?.passportNo  && <p>📘 {s.passportNo}</p>}
                        {s?.birthday    && <p>🎂 {s.birthday}</p>}
                        {s?.email       && <p className="col-span-2 truncate">✉️ {s.email}</p>}
                        {(s?.mobiles||[]).filter(Boolean).map((m,i) => <p key={i}>📞 {m}</p>)}
                      </div>
                      <div className="flex gap-2 pt-1 flex-wrap">
                        <button onClick={() => openEdit({ staff: s, user: u })}
                          className="text-xs px-3 py-1.5 bg-green-700 text-white font-bold">✏️ Edit</button>
                        {s && (
                          <button onClick={() => setAdvanceStaff(s)}
                            className="text-xs px-3 py-1.5 bg-orange-100 text-orange-700 font-bold hover:bg-orange-200">
                            💰 Advance
                          </button>
                        )}
                        <button onClick={() => deletePerson({ staff: s, user: u })}
                          className="text-xs px-3 py-1.5 border border-red-300 text-red-500 hover:bg-red-50">🗑️ Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && <p className="text-gray-400 text-sm">No staff found.</p>}
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
              <div className="bg-white dark:bg-gray-900 w-full max-w-lg border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
                  <p className="font-black text-gray-900 dark:text-white text-lg">
                    {editingStaffId || editingUserId ? 'Edit Staff Member' : 'Add Staff Member'}
                  </p>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
                </div>
                <form onSubmit={save} className="p-5 space-y-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-green-600 mb-3">Basic Info</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <p className="label mb-1">Full Name *</p>
                        <input className="input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required />
                      </div>
                      <div className="col-span-2">
                        <p className="label mb-1">Category</p>
                        <select className="input" value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>
                          {STAFF_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="label mb-1">Birthday</p>
                        <input className="input" type="date" value={form.birthday} onChange={e => setForm(f=>({...f,birthday:e.target.value}))} />
                      </div>
                      <div>
                        <p className="label mb-1">Country</p>
                        <input className="input" placeholder="e.g. Sri Lanka" value={form.country} onChange={e => setForm(f=>({...f,country:e.target.value}))} />
                      </div>
                      <div>
                        <p className="label mb-1">Passport No.</p>
                        <input className="input" placeholder="N12345678" value={form.passportNo} onChange={e => setForm(f=>({...f,passportNo:e.target.value.toUpperCase()}))} />
                      </div>
                      <div>
                        <p className="label mb-1">EID</p>
                        <input className="input" placeholder="784-xxxx-xxxxxxx-x" value={form.eid} onChange={e => setForm(f=>({...f,eid:e.target.value}))} />
                      </div>
                      <div>
                        <p className="label mb-1">EID Expiry</p>
                        <input className="input" type="date" value={form.eidExpiry} onChange={e => setForm(f=>({...f,eidExpiry:e.target.value}))} />
                      </div>
                      <div>
                        <p className="label mb-1">Salary (AED)</p>
                        <input className="input" type="number" min="0" placeholder="0" value={form.salary} onChange={e => setForm(f=>({...f,salary:e.target.value}))} />
                      </div>
                      <div className="col-span-2">
                        <p className="label mb-1">Email</p>
                        <input className="input" type="email" placeholder="name@example.com" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
                      </div>
                      <div className="col-span-2">
                        <p className="label mb-2">Mobile Numbers</p>
                        {form.mobiles.map((m, i) => (
                          <div key={i} className="flex gap-2 mb-2">
                            <input className="input flex-1" type="tel" placeholder={`Mobile ${i+1}`}
                              value={m} onChange={e => setMobile(i, e.target.value)} />
                            {(form.mobiles.length > 1 || m) && (
                              <button type="button" onClick={() => removeMobile(i)} className="text-red-400 hover:text-red-600 px-2 font-bold">✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                    <p className="text-xs font-black uppercase tracking-widest text-green-600 mb-3">System Account <span className="font-normal text-gray-400 normal-case">(leave username blank to skip)</span></p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="label mb-1">Username</p>
                        <input className="input" value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value}))} placeholder="login username" />
                      </div>
                      <div>
                        <p className="label mb-1">{editingUserId ? 'New Password' : 'Password'}</p>
                        <input className="input" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))}
                          placeholder={editingUserId ? 'leave blank to keep' : 'required'} required={!editingUserId && !!form.username.trim()} />
                      </div>
                      <div>
                        <p className="label mb-1">Role</p>
                        <select className="input" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
                          {ROLES.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-3 pt-5">
                        <button type="button" onClick={() => setForm(f=>({...f,isActive:!f.isActive}))}
                          className={`text-xs px-3 py-1.5 font-bold ${form.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {form.isActive ? '✓ Active' : '✗ Inactive'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="submit" className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 flex-1">
                      {editingStaffId || editingUserId ? 'SAVE CHANGES' : 'CREATE STAFF MEMBER'}
                    </button>
                    {(editingStaffId || editingUserId) && (
                      <button type="button"
                        onClick={() => deletePerson({ staff: staff.find(s=>s._id===editingStaffId)||null, user: users.find(u=>u._id===editingUserId)||null })}
                        className="btn-danger px-4 py-2">🗑️</button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'attendance' && <AttendanceTab />}

      {tab === 'labor' && <LaborTab />}

      {tab === 'payroll' && <PayrollTab />}

      {tab === 'parts' && (
        <div className="space-y-4">
          <div className="card">
            <p className="label mb-3">1. Create New Group</p>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Group name (e.g. Brake Parts)" value={newGroup} onChange={e => setNewGroup(e.target.value)} />
              <button onClick={addGroup} className="btn-success px-4 text-sm">+ Add</button>
            </div>
          </div>
          <div className="card">
            <p className="label mb-3">2. Select Group & Add Items</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {parts.map(g => (
                <button key={g._id} onClick={() => setSelGroup(prev => prev === g._id ? '' : g._id)}
                  className={`text-xs px-3 py-1.5 font-bold transition-colors
                    ${selGroup===g._id ? 'bg-green-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                  {g.groupName}
                </button>
              ))}
            </div>
            {selectedGroup && (
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                  Adding to: <span className="text-green-600">{selectedGroup.groupName}</span>
                </p>
                <div className="flex gap-2 mb-4">
                  <input className="input flex-1" placeholder="e.g. Front Brake Pads" value={newItem} onChange={e => setNewItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addItem()} />
                  <button onClick={addItem} className="bg-green-700 hover:bg-green-800 text-white font-bold px-4 text-sm">+ Add Item</button>
                </div>
                <div className="space-y-1">
                  {(selectedGroup.items||[]).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-sm text-gray-700 dark:text-gray-300">• {item}</span>
                      <button onClick={() => deleteItem(selGroup, idx)} className="text-xs text-red-500 hover:text-red-700 font-bold px-2">✕</button>
                    </div>
                  ))}
                  {(selectedGroup.items||[]).length === 0 && <p className="text-xs text-gray-400">No items yet</p>}
                </div>
              </div>
            )}
          </div>
          <div className="card">
            <p className="label mb-3">All Groups</p>
            <div className="space-y-3">
              {parts.map(g => (
                <div key={g._id} className="border border-gray-200 dark:border-gray-800 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{g.groupName}</p>
                    <button onClick={() => deleteGroup(g._id)} className="text-xs text-red-500 hover:text-red-700 font-bold">Delete Group</button>
                  </div>
                  <p className="text-xs text-gray-500">{(g.items||[]).join(', ') || 'No items'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {advanceStaff && (
        <SalaryAdvanceModal staff={advanceStaff} onClose={() => setAdvanceStaff(null)} />
      )}
    </div>
  )
}
