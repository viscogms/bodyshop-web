import { useState, useEffect } from 'react'
import api from '../api/client'

const COMPANY = {
  name:        'VISCO AUTO REPAIRS LLC',
  poBox:       'PO Box 10977',
  location:    'Dubai, UAE',
  phones:      '+971 50 751 4754 | +971 56 919 6759',
  trn:         'TRN 100544863200003',
  emails:      'khanajmimohd@gmail.com | lathika.visco@gmail.com',
  bank:        'Abu Dhabi Commercial Bank - ADCB',
  accountName: 'Visco Auto Repairs',
  accountNo:   '11863073820001',
  iban:        'AE090030011863073820001',
  logoUrl:     'https://bodyshop-web-three.vercel.app/icon-192.png',
  thankYou:    'Thank You for Trusting Us with Your Vehicle!',
  footer:      'We appreciate your business and the opportunity to serve you. At Visco Auto Repairs, we are committed to delivering quality service and ensuring your vehicle is running at its best. If you have any questions or need further assistance, please don\'t hesitate to reach out.\n\nSafe travels, and we look forward to serving you again!',
}

function today() { return new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).replace(/ /g,'-') }

function parseMake(carModel) {
  const clean = (carModel || '').replace(/\[.*?\]/g, '').trim()
  const brands = ['Mercedes-Benz','Mercedes','Toyota','Nissan','Honda','Hyundai','Kia','Ford','BMW','Audi','Lexus','Jeep','Mitsubishi','Mazda','Range Rover','Land Rover','Chevrolet','Dodge','GMC','Volkswagen','Porsche','Infiniti','Volvo','Cadillac','Jaguar','Suzuki','Subaru']
  for (const b of brands) {
    if (clean.toLowerCase().startsWith(b.toLowerCase())) {
      return { make: b, model: clean.slice(b.length).trim() }
    }
  }
  const parts = clean.split(' ')
  return { make: parts[0] || '', model: parts.slice(1).join(' ') }
}

export function buildInvoiceHTML(invoice, card) {
  const lines    = invoice.lines || []
  const subTotal = lines.reduce((s, l) => s + (Number(l.qty||0) * Number(l.rate||0)), 0)
  const discount = Number(invoice.discount || 0)
  const taxable  = subTotal - discount
  const tax      = Math.round(taxable * 0.05 * 100) / 100
  const total    = taxable + tax
  const paid     = Number(invoice.paidAmount ?? card.paidAmount ?? 0)
  const balance  = Math.max(0, total - paid)
  const { make, model } = parseMake(card.carModel)
  const odoKM    = invoice.odoKM || card.odoKM || ''
  const notes    = invoice.notes || ''

  const rowsHTML = lines.map(l => {
    const amt = (Number(l.qty||0) * Number(l.rate||0)).toFixed(2)
    return `<tr>
      <td style="border:1px solid #ccc;padding:6px 8px;font-size:11px">${l.description || ''}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;font-size:11px;text-align:center">${Number(l.qty||0).toFixed(2)}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;font-size:11px;text-align:right">AED ${Number(l.rate||0).toFixed(2)}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;font-size:11px;text-align:right">${amt}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:12px;color:#000;padding:28px 32px}
  @page{margin:12mm 14mm}
  @media print{body{padding:0}}
</style>
</head><body>

<!-- HEADER -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
  <div>
    <div style="font-size:30px;font-weight:900;letter-spacing:-1px">TAX INVOICE</div>
    <div style="font-size:14px;margin:4px 0 12px">Invoice # ${invoice.invoiceNo || 'INV-0001'}</div>
    <div style="font-size:12px;font-weight:bold">Balance Due</div>
    <div style="font-size:20px;font-weight:900">AED ${balance.toFixed(2)}</div>
  </div>
  <div style="text-align:right">
    <img src="${COMPANY.logoUrl}" style="width:80px;height:80px;object-fit:contain;margin-bottom:6px;display:block;margin-left:auto"/>
    <div style="font-size:15px;font-weight:900">${COMPANY.name}</div>
    <div style="font-size:11px;color:#333;margin-top:2px">${COMPANY.poBox}</div>
    <div style="font-size:11px;color:#333">${COMPANY.location}</div>
    <div style="font-size:11px;color:#333">${COMPANY.phones}</div>
    <div style="font-size:11px;color:#333">${COMPANY.trn}</div>
    <div style="font-size:11px;color:#333">${COMPANY.emails}</div>
  </div>
</div>

<table style="width:48%;border-collapse:collapse;margin-bottom:16px">
  <tr><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;background:#f9f9f9;color:#555;width:42%">Order Reference</td><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px">${invoice.orderRef || ''}</td></tr>
  <tr><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;background:#f9f9f9;color:#555">Invoice Date</td><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px">${invoice.invoiceDate || today()}</td></tr>
  <tr><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;background:#f9f9f9;color:#555">Terms</td><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px">${invoice.terms || 'Due on Receipt'}</td></tr>
  <tr><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;background:#f9f9f9;color:#555">Due Date</td><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px">${invoice.dueDate || today()}</td></tr>
  <tr><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;background:#f9f9f9;color:#555">Job Reference</td><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px">${card.jobCardNo || card._id}</td></tr>
  <tr><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;background:#f9f9f9;color:#555">Plate Number</td><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;font-weight:bold">${card.plateNumber || ''}</td></tr>
  <tr><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;background:#f9f9f9;color:#555">Vehicle Make</td><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px">${invoice.vehicleMake || make}</td></tr>
  <tr><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;background:#f9f9f9;color:#555">Vehicle Model</td><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px">${invoice.vehicleModel || model}</td></tr>
  <tr><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px;background:#f9f9f9;color:#555">Odometer (KM)</td><td style="border:1px solid #ccc;padding:5px 8px;font-size:11px">${odoKM}</td></tr>
</table>

<div style="margin-bottom:16px">
  <span style="font-size:12px">Bill to : </span>
  <span style="color:#c0392b;font-weight:bold;font-size:13px">${invoice.customerName || ''}</span>
  ${invoice.customerTRN ? `<div style="color:#c0392b;font-size:12px;margin-top:4px">${invoice.customerTRN}</div>` : ''}
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:12px">
  <thead>
    <tr>
      <th style="border:1px solid #000;padding:8px;font-size:12px;font-weight:bold;text-align:left">Description</th>
      <th style="border:1px solid #000;padding:8px;font-size:12px;font-weight:bold;text-align:center">Quantity</th>
      <th style="border:1px solid #000;padding:8px;font-size:12px;font-weight:bold;text-align:center">Rate</th>
      <th style="border:1px solid #000;padding:8px;font-size:12px;font-weight:bold;text-align:right">Amount</th>
    </tr>
  </thead>
  <tbody>${rowsHTML}</tbody>
</table>

<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:8px">
  <div style="width:45%">
    <div style="font-size:10px;color:#333;margin-bottom:12px">
      <div style="font-size:11px;font-weight:bold;margin-bottom:4px">Bank Details</div>
      Bank : ${COMPANY.bank}<br/>
      Account Name : ${COMPANY.accountName}<br/>
      Account No : ${COMPANY.accountNo}<br/>
      IBAN : ${COMPANY.iban}
    </div>
    ${notes ? `<div style="font-size:10px;color:#333;border:1px solid #ddd;padding:8px;background:#fafafa"><div style="font-size:11px;font-weight:bold;margin-bottom:4px">Notes</div>${notes.replace(/\n/g,'<br/>')}</div>` : ''}
  </div>
  <table style="width:50%;border-collapse:collapse">
    <tr><td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee">Sub-Total</td><td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">AED ${subTotal.toFixed(2)}</td></tr>
    <tr><td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee">Discount</td><td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">AED ${discount.toFixed(2)}</td></tr>
    <tr><td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee">Tax @ 5%</td><td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">AED ${tax.toFixed(2)}</td></tr>
    <tr><td style="padding:5px 8px;font-size:13px;font-weight:900;border-top:2px solid #000">Total (AED)</td><td style="padding:5px 8px;font-size:13px;font-weight:900;border-top:2px solid #000;text-align:right">AED ${total.toFixed(2)}</td></tr>
    <tr><td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee">Payment Received</td><td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">AED ${paid.toFixed(2)}</td></tr>
    <tr><td style="padding:5px 8px;font-size:12px;font-weight:900">Balance Due</td><td style="padding:5px 8px;font-size:12px;font-weight:900;text-align:right">AED ${balance.toFixed(2)}</td></tr>
  </table>
</div>

<div style="margin-top:24px;font-size:11px;font-weight:bold;font-style:italic;text-align:center">${COMPANY.thankYou}</div>

<div style="margin-top:20px;padding-top:16px;border-top:1px solid #ddd;font-size:10px;line-height:1.7;color:#555">
  ${COMPANY.footer.replace(/\n/g,'<br/>')}
</div>

<script>window.onload=()=>{window.print()}</script>
</body></html>`
}

export default function InvoiceTab({ card, onCardUpdate }) {
  const { make, model } = parseMake(card.carModel)

  const defaultMeta = {
    invoiceNo:    card.invoiceNo || `INV-${String(Date.now()).slice(-4)}`,
    invoiceDate:  today(),
    dueDate:      today(),
    terms:        'Due on Receipt',
    orderRef:     '',
    customerName: (card.customerContacts || [card.customerContact]).filter(Boolean)[0] || '',
    customerTRN:  '',
    vehicleMake:  make,
    vehicleModel: model,
    odoKM:        card.odoKM || '',
    discount:     0,
    paidAmount:   card.paidAmount || 0,
    notes:        '',
  }

  const defaultLines = () => {
    const lines = []
    if (card.laborCharges > 0) lines.push({ description: 'Labor Charges', qty: '1.00', rate: String(card.laborCharges) })
    return lines.length ? lines : [{ description: '', qty: '1.00', rate: '0.00' }]
  }

  const [meta,    setMeta]    = useState(() => ({ ...defaultMeta, ...(card.invoiceMeta || {}) }))
  const [lines,   setLines]   = useState(() => card.invoiceLines?.length ? card.invoiceLines : defaultLines())
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    setMeta({ ...defaultMeta, ...(card.invoiceMeta || {}) })
    setLines(card.invoiceLines?.length ? card.invoiceLines : defaultLines())
  }, [card._id])

  const subTotal = lines.reduce((s, l) => s + (Number(l.qty||0) * Number(l.rate||0)), 0)
  const discount = Number(meta.discount || 0)
  const taxable  = subTotal - discount
  const tax      = Math.round(taxable * 0.05 * 100) / 100
  const total    = taxable + tax
  const paid     = Number(meta.paidAmount || 0)
  const balance  = Math.max(0, total - paid)

  const addLine    = () => setLines(l => [...l, { description: '', qty: '1.00', rate: '0.00' }])
  const removeLine = (i) => setLines(l => l.filter((_, idx) => idx !== i))
  const updateLine = (i, field, val) => setLines(l => l.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  const updateMeta = (field, val) => setMeta(m => ({ ...m, [field]: val }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.put(`/jobcards/${card._id}`, { invoiceMeta: meta, invoiceLines: lines, invoiceNo: meta.invoiceNo })
      onCardUpdate?.(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const generatePDF = () => {
    const invoice = { ...meta, lines, discount, paidAmount: paid }
    const html = buildInvoiceHTML(invoice, card)
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  const sendWhatsApp = () => {
    generatePDF()
    const phone = (card.customerContacts || [card.customerContact]).filter(Boolean)[0]?.replace(/\D/g,'')
    const msg = encodeURIComponent(`Dear Customer,\n\nPlease find your invoice ${meta.invoiceNo} from Visco Auto Repairs.\nVehicle: ${card.plateNumber}\nTotal: AED ${total.toFixed(2)}\nBalance Due: AED ${balance.toFixed(2)}\n\nThank you for your trust!`)
    if (phone) window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
  }

  const inputCls = 'w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-green-400 rounded'
  const labelCls = 'text-[10px] text-gray-400 uppercase font-bold mb-1'

  return (
    <div className="space-y-4 p-1">

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={generatePDF} className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-white text-xs font-bold rounded hover:bg-gray-700 transition-colors">
          🖨️ Generate PDF
        </button>
        <button onClick={sendWhatsApp} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 transition-colors">
          📤 Send to Customer
        </button>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-green-700 text-white text-xs font-bold rounded hover:bg-green-800 transition-colors disabled:opacity-50 ml-auto">
          {saving ? '...' : saved ? '✅ Saved' : '💾 Save Invoice'}
        </button>
      </div>

      {/* Invoice Meta */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-4">
        <p className="text-xs font-black text-gray-700 dark:text-white uppercase tracking-wider mb-3">Invoice Details</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            ['Invoice #',      'invoiceNo'],
            ['Invoice Date',   'invoiceDate'],
            ['Due Date',       'dueDate'],
            ['Terms',          'terms'],
            ['Order Ref',      'orderRef'],
            ['Vehicle Make',   'vehicleMake'],
            ['Vehicle Model',  'vehicleModel'],
            ['Odometer (KM)',  'odoKM'],
          ].map(([label, field]) => (
            <div key={field}>
              <p className={labelCls}>{label}</p>
              <input className={inputCls} value={meta[field] || ''} onChange={e => updateMeta(field, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* Bill To */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-4">
        <p className="text-xs font-black text-gray-700 dark:text-white uppercase tracking-wider mb-3">Bill To</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls}>Customer Name / Company</p>
            <input className={inputCls} value={meta.customerName || ''} onChange={e => updateMeta('customerName', e.target.value)} />
          </div>
          <div>
            <p className={labelCls}>Customer TRN</p>
            <input className={inputCls} value={meta.customerTRN || ''} onChange={e => updateMeta('customerTRN', e.target.value)} placeholder="optional" />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black text-gray-700 dark:text-white uppercase tracking-wider">Line Items</p>
          <button onClick={addLine} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded font-bold hover:bg-green-200 transition-colors">
            + Add Row
          </button>
        </div>
        <div className="grid grid-cols-12 gap-1 mb-1 px-1">
          <div className="col-span-6 text-[10px] text-gray-400 font-bold uppercase">Description</div>
          <div className="col-span-2 text-[10px] text-gray-400 font-bold uppercase text-center">Qty</div>
          <div className="col-span-2 text-[10px] text-gray-400 font-bold uppercase text-center">Rate (AED)</div>
          <div className="col-span-1 text-[10px] text-gray-400 font-bold uppercase text-right">Amount</div>
          <div className="col-span-1" />
        </div>
        <div className="space-y-1">
          {lines.map((line, i) => {
            const amt = (Number(line.qty||0) * Number(line.rate||0))
            return (
              <div key={i} className="grid grid-cols-12 gap-1 items-center">
                <input className={`col-span-6 ${inputCls}`} value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" />
                <input className={`col-span-2 ${inputCls} text-center`} value={line.qty} onChange={e => updateLine(i, 'qty', e.target.value)} />
                <input className={`col-span-2 ${inputCls} text-center`} value={line.rate} onChange={e => updateLine(i, 'rate', e.target.value)} />
                <div className="col-span-1 text-xs font-bold text-gray-700 dark:text-gray-300 text-right">{amt.toFixed(2)}</div>
                <button onClick={() => removeLine(i)} className="col-span-1 text-red-400 hover:text-red-600 text-xs text-center">✕</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Totals + Notes */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-4 flex flex-col md:flex-row gap-4">
        {/* Notes */}
        <div className="flex-1">
          <p className={labelCls}>Special Notes</p>
          <textarea
            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-green-400 rounded resize-none"
            rows={5}
            placeholder="Any special notes for the customer..."
            value={meta.notes || ''}
            onChange={e => updateMeta('notes', e.target.value)}
          />
        </div>
        {/* Totals */}
        <div className="min-w-[220px] space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Sub-Total</span><span className="font-bold">AED {subTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <span>Discount</span>
            <input className="w-24 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-0.5 text-sm text-right rounded focus:outline-none focus:border-green-400" value={meta.discount} onChange={e => updateMeta('discount', e.target.value)} />
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Tax @ 5%</span><span className="font-bold">AED {tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-black text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
            <span>Total (AED)</span><span>AED {total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <span>Payment Received</span>
            <input className="w-24 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-0.5 text-sm text-right rounded focus:outline-none focus:border-green-400" value={meta.paidAmount} onChange={e => updateMeta('paidAmount', e.target.value)} />
          </div>
          <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
            <span>Balance Due</span><span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>AED {balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

    </div>
  )
}
