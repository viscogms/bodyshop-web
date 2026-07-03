import { useState, useEffect } from 'react'
import api from '../api/client'
import Swal from 'sweetalert2'

const STAFF_CATEGORIES = ['Foreman','Technician','Helper','Supervisor','Accounts Clerk','Driver','Denter','Painter']

const BLANK_STAFF = () => ({ name:'', category:'Technician', birthday:'', country:'', passportNo:'', eid:'', eidExpiry:'', salary:'', mobiles:[''], email:'' })

export default function AdminPage() {
  const [tab,      setTab]      = useState('users')
  const [users,    setUsers]    = useState([])
  const [parts,    setParts]    = useState([])
  const [staff,    setStaff]    = useState([])
  const [loading,  setLoading]  = useState(true)

  // Parts state
  const [newGroup,   setNewGroup]   = useState('')
  const [selGroup,   setSelGroup]   = useState('')
  const [newItem,    setNewItem]    = useState('')

  // User modal
  const [showModal, setShowModal] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [newUser, setNewUser] = useState({ name:'', username:'', password:'', role:'User' })

  // Staff record modal
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editingStaffId, setEditingStaffId] = useState(null)
  const [staffForm, setStaffForm] = useState(BLANK_STAFF())
  const [staffSearch, setStaffSearch] = useState('')
  const [staffCatFilter, setStaffCatFilter] = useState('all')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [uRes, pRes, sRes] = await Promise.all([api.get('/users'), api.get('/parts'), api.get('/staff')])
      setUsers(uRes.data)
      setParts(pRes.data)
      setStaff(sRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const toggleActive = async (user) => {
    await api.put(`/users/${user._id}`, { isActive: !user.isActive })
    setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u))
  }

  const resetUserModal = () => { setEditingUserId(null); setNewUser({ name:'', username:'', password:'', role:'User' }) }
  const openNewUserModal  = () => { resetUserModal(); setShowModal(true) }
  const openEditUserModal = (u) => { setEditingUserId(u._id); setNewUser({ name: u.name||'', username: u.username||'', password: '', role: u.role||'User' }); setShowModal(true) }

  const saveUser = async (e) => {
    e.preventDefault()
    if (!newUser.name || !newUser.username || (!editingUserId && !newUser.password)) return
    try {
      if (editingUserId) {
        const payload = { ...newUser }
        if (!payload.password) delete payload.password
        await api.put(`/users/${editingUserId}`, payload)
        Swal.fire('Success', 'User updated!', 'success')
      } else {
        await api.post('/users', newUser)
        Swal.fire('Success', 'User created!', 'success')
      }
      setShowModal(false)
      resetUserModal()
      const res = await api.get('/users')
      setUsers(res.data)
    } catch (e) {
      Swal.fire('Error', e.response?.data?.error || 'Failed', 'error')
    }
  }

  const deleteUser = (u) => {
    Swal.fire({ title: `Delete "${u.name}"?`, text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Delete' })
      .then(async r => {
        if (r.isConfirmed) {
          try {
            await api.delete(`/users/${u._id}`)
            setUsers(prev => prev.filter(x => x._id !== u._id))
            setShowModal(false)
          } catch (e) {
            Swal.fire('Error', e.response?.data?.error || 'Failed to delete', 'error')
          }
        }
      })
  }

  const addGroup = async () => {
    if (!newGroup.trim()) return
    await api.post('/parts', { groupName: newGroup.trim(), subGroups: [], items: [] })
    setNewGroup('')
    const res = await api.get('/parts')
    setParts(res.data)
  }

  const addItem = async () => {
    if (!selGroup || !newItem.trim()) return
    const group = parts.find(g => g._id === selGroup)
    const updatedItems = [...(group.items||[]), newItem.trim()]
    await api.put(`/parts/${selGroup}`, { items: updatedItems })
    setNewItem('')
    const res = await api.get('/parts')
    setParts(res.data)
  }

  const deleteItem = async (groupId, idx) => {
    const group = parts.find(g => g._id === groupId)
    const updatedItems = [...(group.items||[])]
    updatedItems.splice(idx, 1)
    await api.put(`/parts/${groupId}`, { items: updatedItems })
    const res = await api.get('/parts')
    setParts(res.data)
  }

  const deleteGroup = (id) => {
    Swal.fire({ title:'Delete Group?', icon:'warning', showCancelButton:true, confirmButtonColor:'#dc2626' })
    .then(async r => {
      if (r.isConfirmed) {
        await api.delete(`/parts/${id}`)
        setParts(prev => prev.filter(g => g._id !== id))
        if (selGroup === id) setSelGroup('')
      }
    })
  }

  // Staff record helpers
  const openNewStaff  = () => { setEditingStaffId(null); setStaffForm(BLANK_STAFF()); setShowStaffModal(true) }
  const openEditStaff = (s) => { setEditingStaffId(s._id); setStaffForm({ ...s, mobiles: s.mobiles?.length ? [...s.mobiles,''] : [''], salary: String(s.salary||'') }); setShowStaffModal(true) }

  const saveStaff = async (e) => {
    e.preventDefault()
    if (!staffForm.name.trim()) return
    const payload = { ...staffForm, mobiles: staffForm.mobiles.filter(m => m.trim()), salary: Number(staffForm.salary)||0 }
    try {
      if (editingStaffId) {
        const res = await api.put(`/staff/${editingStaffId}`, payload)
        setStaff(prev => prev.map(s => s._id === editingStaffId ? res.data : s))
      } else {
        const res = await api.post('/staff', payload)
        setStaff(prev => [res.data, ...prev])
      }
      setShowStaffModal(false)
      Swal.fire('Saved!', '', 'success')
    } catch (e) { Swal.fire('Error', e.response?.data?.error || 'Failed', 'error') }
  }

  const deleteStaff = (s) => {
    Swal.fire({ title:`Delete "${s.name}"?`, icon:'warning', showCancelButton:true, confirmButtonColor:'#dc2626' })
    .then(async r => {
      if (r.isConfirmed) {
        await api.delete(`/staff/${s._id}`)
        setStaff(prev => prev.filter(x => x._id !== s._id))
        setShowStaffModal(false)
      }
    })
  }

  const setMobile = (idx, val) => {
    const list = [...staffForm.mobiles]
    list[idx] = val
    if (idx === list.length - 1 && val.trim()) list.push('')
    setStaffForm(f => ({ ...f, mobiles: list }))
  }

  const removeMobile = (idx) => {
    const list = staffForm.mobiles.filter((_, i) => i !== idx)
    if (list.length === 0) list.push('')
    setStaffForm(f => ({ ...f, mobiles: list }))
  }

  if (loading) return <p className="text-center text-gray-400 mt-12">Loading...</p>

  const selectedGroup = parts.find(g => g._id === selGroup)

  return (
    <div className="space-y-4">
      <h1 className="page-header">Admin Control</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 flex-wrap gap-0">
        {[['users','👥 Accounts'],['staff','🪪 Staff Records'],['parts','⚙️ Parts']].map(([t,label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-bold transition-colors border-b-2 -mb-px
              ${tab===t ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="label">Staff Accounts</p>
            <button onClick={openNewUserModal} className="btn-success text-sm px-3 py-1.5">+ Add Staff</button>
          </div>
          {users.map(u => (
            <div key={u._id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className={`font-bold text-sm ${u.isActive ? 'text-gray-900 dark:text-white' : 'text-red-500'}`}>{u.name}</p>
                <p className="text-xs text-gray-500">{u.role} • {u.username}</p>
              </div>
              {u.username !== 'admin' && (
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditUserModal(u)} className="text-xs px-3 py-1 font-bold bg-green-100 text-brand dark:bg-green-900/30">✏️ Edit</button>
                  <button onClick={() => deleteUser(u)} className="text-xs px-3 py-1 font-bold bg-red-100 text-red-600 dark:bg-red-900/30">🗑️ Delete</button>
                  <button
                    onClick={() => toggleActive(u)}
                    className={`text-xs px-3 py-1 font-bold ${u.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
                  >
                    {u.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Create/Edit user modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-black text-gray-900 dark:text-white">{editingUserId ? 'Edit Staff Account' : 'New Staff Account'}</p>
                  <button onClick={() => { setShowModal(false); resetUserModal() }} className="text-gray-400 text-xl">✕</button>
                </div>
                <form onSubmit={saveUser} className="space-y-3">
                  <div>
                    <p className="label mb-1">Full Name</p>
                    <input className="input" type="text" value={newUser.name} onChange={e => setNewUser({...newUser,name:e.target.value})} required />
                  </div>
                  <div>
                    <p className="label mb-1">Username</p>
                    <input className="input" type="text" value={newUser.username} onChange={e => setNewUser({...newUser,username:e.target.value})} required />
                  </div>
                  <div>
                    <p className="label mb-1">{editingUserId ? 'New Password (leave blank to keep current)' : 'Password'}</p>
                    <input className="input" type="password" value={newUser.password} onChange={e => setNewUser({...newUser,password:e.target.value})} required={!editingUserId} />
                  </div>
                  <div>
                    <p className="label mb-1">Role</p>
                    <select className="input" value={newUser.role} onChange={e => setNewUser({...newUser,role:e.target.value})}>
                      {['Admin','Owner','Technician','User'].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn-primary w-full py-2 mt-2">{editingUserId ? 'SAVE CHANGES' : 'CREATE ACCOUNT'}</button>
                  {editingUserId && (
                    <button type="button" onClick={() => deleteUser(users.find(u => u._id === editingUserId))} className="btn-danger w-full py-2">🗑️ DELETE THIS ACCOUNT</button>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Staff Records tab */}
      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <input className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm w-44 focus:outline-none focus:border-brand"
                placeholder="Search name, EID..." value={staffSearch} onChange={e => setStaffSearch(e.target.value)} />
              <select className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none"
                value={staffCatFilter} onChange={e => setStaffCatFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {STAFF_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={openNewStaff} className="btn-primary px-4 py-2 text-sm">+ Add Staff Record</button>
          </div>

          {/* Grid of staff cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staff.filter(s => {
              const q = staffSearch.toLowerCase()
              const matchSearch = !staffSearch || [s.name, s.eid, s.passportNo, s.email].some(f => f?.toLowerCase().includes(q))
              const matchCat = staffCatFilter === 'all' || s.category === staffCatFilter
              return matchSearch && matchCat
            }).map(s => (
              <div key={s._id} className="card border-l-4 border-l-brand space-y-1 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEditStaff(s)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-gray-900 dark:text-white">{s.name}</p>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-brand mt-0.5">{s.category}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteStaff(s) }} className="text-red-400 hover:text-red-600 text-xs font-bold px-2 py-1">🗑️</button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400 pt-1">
                  {s.country     && <p>🌍 {s.country}</p>}
                  {s.salary > 0  && <p>💰 AED {s.salary}</p>}
                  {s.eid         && <p>🪪 {s.eid}</p>}
                  {s.eidExpiry   && <p>📅 EID Exp: {s.eidExpiry}</p>}
                  {s.passportNo  && <p>📘 {s.passportNo}</p>}
                  {s.birthday    && <p>🎂 {s.birthday}</p>}
                  {s.email       && <p className="col-span-2 truncate">✉️ {s.email}</p>}
                  {(s.mobiles||[]).filter(Boolean).map((m,i) => <p key={i}>📞 {m}</p>)}
                </div>
              </div>
            ))}
            {staff.length === 0 && <p className="text-gray-400 text-sm col-span-3">No staff records yet. Click "+ Add Staff Record" to begin.</p>}
          </div>

          {/* Staff modal */}
          {showStaffModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowStaffModal(false)}>
              <div className="bg-white dark:bg-gray-900 w-full max-w-lg border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
                  <p className="font-black text-gray-900 dark:text-white text-lg">{editingStaffId ? 'Edit Staff Record' : 'New Staff Record'}</p>
                  <button onClick={() => setShowStaffModal(false)} className="text-gray-400 text-xl">✕</button>
                </div>
                <form onSubmit={saveStaff} className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="label mb-1">Full Name *</p>
                      <input className="input" value={staffForm.name} onChange={e => setStaffForm(f=>({...f,name:e.target.value}))} required />
                    </div>
                    <div className="col-span-2">
                      <p className="label mb-1">Category</p>
                      <select className="input" value={staffForm.category} onChange={e => setStaffForm(f=>({...f,category:e.target.value}))}>
                        {STAFF_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="label mb-1">Birthday</p>
                      <input className="input" type="date" value={staffForm.birthday} onChange={e => setStaffForm(f=>({...f,birthday:e.target.value}))} />
                    </div>
                    <div>
                      <p className="label mb-1">Country</p>
                      <input className="input" placeholder="e.g. Sri Lanka" value={staffForm.country} onChange={e => setStaffForm(f=>({...f,country:e.target.value}))} />
                    </div>
                    <div>
                      <p className="label mb-1">Passport No.</p>
                      <input className="input" placeholder="N12345678" value={staffForm.passportNo} onChange={e => setStaffForm(f=>({...f,passportNo:e.target.value.toUpperCase()}))} />
                    </div>
                    <div>
                      <p className="label mb-1">EID</p>
                      <input className="input" placeholder="784-xxxx-xxxxxxx-x" value={staffForm.eid} onChange={e => setStaffForm(f=>({...f,eid:e.target.value}))} />
                    </div>
                    <div>
                      <p className="label mb-1">EID Expiry</p>
                      <input className="input" type="date" value={staffForm.eidExpiry} onChange={e => setStaffForm(f=>({...f,eidExpiry:e.target.value}))} />
                    </div>
                    <div>
                      <p className="label mb-1">Salary (AED)</p>
                      <input className="input" type="number" min="0" placeholder="0" value={staffForm.salary} onChange={e => setStaffForm(f=>({...f,salary:e.target.value}))} />
                    </div>
                    <div className="col-span-2">
                      <p className="label mb-1">Email</p>
                      <input className="input" type="email" placeholder="name@example.com" value={staffForm.email} onChange={e => setStaffForm(f=>({...f,email:e.target.value}))} />
                    </div>
                    <div className="col-span-2">
                      <p className="label mb-2">Mobile Numbers</p>
                      {staffForm.mobiles.map((m, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <input className="input flex-1" type="tel" placeholder={`Mobile ${i+1}`}
                            value={m} onChange={e => setMobile(i, e.target.value)} />
                          {(staffForm.mobiles.length > 1 || m) && (
                            <button type="button" onClick={() => removeMobile(i)} className="text-red-400 hover:text-red-600 px-2 font-bold">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="btn-primary flex-1 py-2">{editingStaffId ? 'SAVE CHANGES' : 'CREATE RECORD'}</button>
                    {editingStaffId && (
                      <button type="button" onClick={() => deleteStaff(staff.find(s => s._id === editingStaffId))} className="btn-danger px-4 py-2">🗑️</button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Parts tab */}
      {tab === 'parts' && (
        <div className="space-y-4">
          {/* Create group */}
          <div className="card">
            <p className="label mb-3">1. Create New Group</p>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Group name (e.g. Brake Parts)" value={newGroup} onChange={e => setNewGroup(e.target.value)} />
              <button onClick={addGroup} className="btn-success px-4 text-sm">+ Add</button>
            </div>
          </div>

          {/* Select group + add item */}
          <div className="card">
            <p className="label mb-3">2. Select Group & Add Items</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {parts.map(g => (
                <button
                  key={g._id}
                  onClick={() => setSelGroup(prev => prev === g._id ? '' : g._id)}
                  className={`text-xs px-3 py-1.5 font-bold transition-colors
                    ${selGroup===g._id ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  {g.groupName}
                </button>
              ))}
            </div>

            {selectedGroup && (
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                  Adding to: <span className="text-brand">{selectedGroup.groupName}</span>
                </p>
                <div className="flex gap-2 mb-4">
                  <input className="input flex-1" placeholder="e.g. Front Brake Pads" value={newItem} onChange={e => setNewItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addItem()} />
                  <button onClick={addItem} className="btn-primary px-4 text-sm">+ Add Item</button>
                </div>

                {/* Items list */}
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

          {/* All groups review */}
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
    </div>
  )
}
