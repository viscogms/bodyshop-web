import { useState, useEffect } from 'react'
import api from '../api/client'
import { STATUS_OPTIONS, getCleanModel, getCustomerName, parseImages } from '../utils/helpers'
import Swal from 'sweetalert2'

const BLANK = () => ({
  jobCardNo: '', plateNumber: '', carModel: '', companyName: '',
  customerPrefix: 'Mr.', customerName: '', customerContact: '', customerContacts: [''],
  vin: '', odoKM: '', inspectionTech: '', jobDoneBy: '', located: 'Main Body Shop',
  status: 'Inspection', carNotStart: false, quoteDone: false, approvalDone: false,
  jobCardDate: today(), receiveDate: today(), deliveryDate: today(), reminderTime: '',
  customerVoice: [''], invoiceNo: '', invoiceAmount: '', paidAmount: '', laborCharges: '',
  rearImage: '', vinImage: '', odoImage: '', inspectionPhotos: '',
  referToMechanical: false,
})

function today() { return new Date().toISOString().split('T')[0] }

export default function JobCardForm({ initial, onSave, onCancel }) {
  const isEditing = !!initial?._id
  const [form,    setForm]    = useState(() => {
    if (!initial) return BLANK()
    return {
      ...BLANK(),
      ...initial,
      customerName:    getCustomerName(initial.carModel) || '',
      carModel:        getCleanModel(initial.carModel)   || '',
      customerContacts: initial.customerContacts?.length ? initial.customerContacts : [initial.customerContact || ''],
      customerVoice:   initial.customerVoice?.length
        ? [...initial.customerVoice.map(v => typeof v === 'object' ? v.text : v), '']
        : [''],
      invoiceAmount: String(initial.invoiceAmount || ''),
      laborCharges:  String(initial.laborCharges  || ''),
      paidAmount:    String(initial.paidAmount || ''),
      rearImage:     parseImages(initial.rearImage)[0] || '',
      vinImage:      parseImages(initial.vinImage)[0]  || '',
      odoImage:      parseImages(initial.odoImage)[0]  || '',
    }
  })
  const [saving,              setSaving]              = useState(false)
  const [uploading,           setUploading]           = useState({})
  const [tab,                 setTab]                 = useState('info')
  const [users,               setUsers]               = useState([])
  const [referToMechanical,   setReferToMechanical]   = useState(initial?.referToMechanical || false)
  const [alreadyReferred,     setAlreadyReferred]     = useState(!!(initial?.linkedJobId))

  useEffect(() => {
    api.get('/staff').then(r => setUsers(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }, [])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const uploadImage = async (file, field) => {
    setUploading(u => ({ ...u, [field]: true }))
    try {
      const fd = new FormData(); fd.append('image', file)
      const res = await api.post('/upload', fd)
      set(field, res.data.imageUrl)
    } catch { Swal.fire('Error', 'Image upload failed', 'error') }
    finally { setUploading(u => ({ ...u, [field]: false })) }
  }

  const handleVoice = (i, val) => {
    const v = [...form.customerVoice]
    v[i] = val
    if (i === v.length - 1 && val !== '') v.push('')
    set('customerVoice', v)
  }

  const handleContact = (i, val) => {
    const c = [...form.customerContacts]
    c[i] = val
    if (i === c.length - 1 && val !== '') c.push('')
    set('customerContacts', c)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.plateNumber.trim()) return Swal.fire('Error', 'Plate number is required', 'error')
    setSaving(true)
    try {
      const customerName = form.customerName.trim()
      let carModel = form.carModel.trim()
      if (customerName) carModel = `${carModel} [Cust: ${form.customerPrefix} ${customerName}]`

      const pStatus = Number(form.paidAmount) >= Number(form.invoiceAmount) && Number(form.invoiceAmount) > 0
        ? 'Paid' : Number(form.paidAmount) > 0 ? 'Partial' : 'Pending'

      const payload = {
        ...form,
        carModel,
        customerContacts: form.customerContacts.filter(c => c.trim()),
        customerVoice: form.customerVoice.filter(t => t.trim()).map(t => ({ text: t, completed: false })),
        invoiceAmount: Number(form.invoiceAmount || 0),
        paidAmount:    Number(form.paidAmount || 0),
        laborCharges:  Number(form.laborCharges || 0),
        paymentStatus: pStatus,
        plateNumber:   form.plateNumber.toUpperCase(),
      }
      delete payload._id; delete payload.__v; delete payload.createdAt; delete payload.updatedAt
      payload.referToMechanical = referToMechanical

      let savedCard
      if (isEditing) {
        const res = await api.put(`/jobcards/${initial._id}`, payload)
        savedCard = res.data
      } else {
        const res = await api.post('/jobcards', payload)
        savedCard = res.data
      }

      onSave()
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Save failed', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 w-full max-w-3xl my-4 border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="font-black text-gray-900 dark:text-white">{isEditing ? '✏️ Edit Job Card' : '🆕 New Job Card'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {[['info','📝 Details'],['images','📷 Photos']].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-bold border-b-2 -mb-px transition-colors
                ${tab===t ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">

            {tab === 'info' && <>
              {/* Basic info */}
              <Section title="Vehicle Info">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Job Card No"><input className="input" value={form.jobCardNo} onChange={e => set('jobCardNo', e.target.value)} placeholder="JC-2026-001" /></Field>
                  <Field label="Plate Number *"><input className="input font-black tracking-wider" value={form.plateNumber} onChange={e => set('plateNumber', e.target.value.toUpperCase())} placeholder="DXB Q 12345" required /></Field>
                  <Field label="Car Model"><input className="input" value={form.carModel} onChange={e => set('carModel', e.target.value)} placeholder="Toyota Camry" /></Field>
                  <Field label="VIN / Chassis"><input className="input" value={form.vin} onChange={e => set('vin', e.target.value.toUpperCase())} /></Field>
                  <Field label="Odometer KM"><input className="input" type="number" value={form.odoKM} onChange={e => set('odoKM', e.target.value)} /></Field>
                  <Field label="Status">
                    <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="flex gap-6 mt-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.carNotStart} onChange={e => set('carNotStart', e.target.checked)} className="accent-brand" />
                    <span className="text-gray-700 dark:text-gray-300">Car did not start on arrival</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.quoteDone} onChange={e => set('quoteDone', e.target.checked)} className="accent-brand" />
                    <span className="text-gray-700 dark:text-gray-300">Quotation done</span>
                  </label>
                </div>
              </Section>

              {/* Customer */}
              <Section title="Customer Info">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Company Name"><input className="input" value={form.companyName} onChange={e => set('companyName', e.target.value)} /></Field>
                  <Field label="Customer Name">
                    <div className="flex gap-2">
                      <select className="input w-20 flex-shrink-0" value={form.customerPrefix} onChange={e => set('customerPrefix', e.target.value)}>
                        {['Mr.','Mrs.','Miss'].map(p => <option key={p}>{p}</option>)}
                      </select>
                      <input className="input flex-1" value={form.customerName} onChange={e => set('customerName', e.target.value)} />
                    </div>
                  </Field>
                  <Field label="Phone Numbers">
                    {form.customerContacts.map((c, i) => (
                      <input key={i} className="input mb-1" type="tel" value={c} onChange={e => handleContact(i, e.target.value)} placeholder="+971..." />
                    ))}
                  </Field>
                </div>
              </Section>

              {/* Dates */}
              <Section title="Dates">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Job Card Date"><input type="date" className="input" value={form.jobCardDate?.split(' ')[0]||''} onChange={e => set('jobCardDate', e.target.value)} /></Field>
                  <Field label="Receive Date"><input type="date" className="input" value={form.receiveDate?.split(' ')[0]||''} onChange={e => set('receiveDate', e.target.value)} /></Field>
                  <Field label="Delivery Date"><input type="date" className="input" value={form.deliveryDate?.split(' ')[0]||''} onChange={e => set('deliveryDate', e.target.value)} /></Field>
                </div>
              </Section>

              {/* Staff */}
              <Section title="Staff">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Inspection Tech">
                    <select className="input" value={form.inspectionTech} onChange={e => set('inspectionTech', e.target.value)}>
                      <option value="">— Unassigned —</option>
                      {users.filter(u => u.isActive !== false).map(u => (
                        <option key={u._id} value={u.name}>{u.name} ({u.category})</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="🔧 Assigned Mechanic">
                    <select className="input" value={form.jobDoneBy} onChange={e => set('jobDoneBy', e.target.value)}>
                      <option value="">— Unassigned —</option>
                      {users.filter(u => u.isActive !== false).map(u => (
                        <option key={u._id} value={u.name}>{u.name} ({u.category})</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </Section>

              {/* Mechanical Referral */}
              <Section title="Cross-App Referral">
                {alreadyReferred ? (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                    <span className="text-purple-600 text-lg">🔗</span>
                    <div>
                      <p className="text-sm font-bold text-purple-700 dark:text-purple-400">Already referred to Visco Mechanical</p>
                      {initial?.linkedJobCardNo && <p className="text-xs text-purple-600">Mechanical Job: {initial.linkedJobCardNo}</p>}
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-dashed border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors">
                    <input type="checkbox" checked={referToMechanical} onChange={e => setReferToMechanical(e.target.checked)} className="w-4 h-4 accent-purple-600" />
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">🔧 Refer to Visco Mechanical Workshop</p>
                      <p className="text-xs text-gray-500">A linked job card will be created in the Mechanical app</p>
                    </div>
                  </label>
                )}
              </Section>

              {/* Customer Voice */}
              <Section title="Customer Complaints">
                {form.customerVoice.map((v, i) => (
                  <input key={i} className="input mb-2" value={v} onChange={e => handleVoice(i, e.target.value)} placeholder="Enter complaint..." />
                ))}
              </Section>

              {/* Billing */}
              <Section title="Billing & Payment">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Invoice No"><input className="input" value={form.invoiceNo} onChange={e => set('invoiceNo', e.target.value)} /></Field>
                  <Field label="Invoice Amount (AED)"><input className="input" type="number" step="0.01" value={form.invoiceAmount} onChange={e => set('invoiceAmount', e.target.value)} /></Field>
                  <Field label="Paid Amount (AED)"><input className="input" type="number" step="0.01" value={form.paidAmount} onChange={e => set('paidAmount', e.target.value)} /></Field>
                  <Field label="🔧 Labor Charges (AED)"><input className="input" type="number" step="0.01" placeholder="0.00" value={form.laborCharges||''} onChange={e => set('laborCharges', e.target.value)} style={{borderColor:'#f97316'}} /></Field>
                </div>
              </Section>
            </>}

            {tab === 'images' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  ['rearImage',  '🚗 Rear View Photo'],
                  ['vinImage',   '🔢 VIN / Chassis Photo'],
                  ['odoImage',   '📏 Odometer Photo'],
                ].map(([field, label]) => (
                  <div key={field} className="border border-gray-200 dark:border-gray-800 p-3">
                    <p className="label mb-2">{label}</p>
                    {form[field] && (
                      <div className="relative mb-2">
                        <img src={form[field]} alt="" className="w-full h-40 object-cover" />
                        <button type="button" onClick={() => set(field, '')}
                          className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 font-bold">✕ Remove</button>
                      </div>
                    )}
                    <input
                      type="file" accept="image/*"
                      onChange={e => e.target.files[0] && uploadImage(e.target.files[0], field)}
                      className="text-xs text-gray-500 w-full"
                    />
                    {uploading[field] && <p className="text-xs text-brand mt-1">Uploading...</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900">
            <button type="button" onClick={onCancel} className="flex-1 py-3 border border-gray-300 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              CANCEL
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 text-sm">
              {saving ? 'SAVING...' : isEditing ? 'SAVE CHANGES' : 'CREATE JOB CARD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="label mb-3 pb-1 border-b border-gray-100 dark:border-gray-800">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <p className="label mb-1">{label}</p>
      {children}
    </div>
  )
}
