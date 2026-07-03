import { useState } from 'react'
import api from '../api/client'

// ── Constants ─────────────────────────────────────────────────────
const WHEEL_POS   = ['FL','FR','RL','RR','ST']
const BRAKE_POS   = ['FL','FR','RL','RR']
const SUSP_POS    = [
  { key:'frontLeft', label:'Front Left' }, { key:'frontRight', label:'Front Right' },
  { key:'rearLeft',  label:'Rear Left'  }, { key:'rearRight',  label:'Rear Right'  },
]
const INTERIOR_ITEMS = [
  'Roof Lining','Rear View Mirror','Steering Wheel Upholstery','Seats Upholstery',
  'Gear Lever','Trunk Lining','Armrest & Side Pockets','Dashboard','Floor Mats',
  'Doors','Front Windscreen','Rear Windscreen','Side Windows','Hood','Trunk',
  'Front Bumper','Back Bumper',
]
const ELECTRICAL_ITEMS = [
  'Gear Lever','Doors','Steering','Key','Infotainment','Windows Operation',
  'Seats Adjustment','Door Lock','A/C Control & Cooling','Center Console Buttons',
  'Cameras','Gauges','Rear View / Side Mirror','A/C Grilles','Ignition System',
  'Brake Lights','Headlights','Fog Lights','Reverse Lights','Number Plate Lights',
  'Indicators & Hazards','Wipers','Soft Closing Doors','Sunroof / Moonroof',
  'Interior Lights','Cruise Control','Horn','Parking Sensors',
]
const ENGINE_ITEMS = [
  'Engine Upper Cover','Engine Shield Cover','Engine Mounts','Bonnet Hinge & Holder',
  'Turbo / Supercharger','Fender Liners','Drive Belt / Pulleys','Engine Idle',
  'Engine Oil Filler Cap','Radiator','Engine Oil Leaks','Engine Oil Condition',
  'Coolant Condition','Hoses & Pipes','Coolant Cap','Exhaust System','4 Wheel Drive',
]
const TRANSMISSION_ITEMS = [
  'Transmission Fluid Level & Condition','Transmission Fluid Leaks',
  'Gear Selector','Unusual Noise','Gear Shifting','Differential',
]
const CHASSIS_ITEMS = [
  'Core Support','Frame Rail','Wheel House','Right Fender Apron',
  'Shock Tower / Shock Mount','Radiator Side Support','Left Fender Apron',
  'Front Body Hinge Pillar','Front Floor Board','Left Door Sill',
  'Center Pillar (B Pillar)','Mid Floor Board','Body Quarter Panel','C Pillar',
  'Seat Frame','Rear Floor Panel','Left A Pillar','Roof Panel','Right A Pillar',
]
const BODY_CONDITIONS = ['Original Paint','Cosmetic Paint','Re-Painted','Faded Paint','Replaced']

function makeDefault() {
  const wp = () => Object.fromEntries(WHEEL_POS.map(p => [p, { status:'PASS', mfgYear:'', notes:'' }]))
  const bp = () => Object.fromEntries(BRAKE_POS.map(p => [p, { type:'DISC', pads:'PASS', disc:'PASS', notes:'' }]))
  const sp = () => Object.fromEntries(SUSP_POS.map(p => [p.key, { status:'PASS', notes:'' }]))
  const lp = (items) => items.map(label => ({ label, status:'PASS', notes:'' }))
  return {
    inspectorName:'', inspectionDate: new Date().toISOString().split('T')[0],
    tyres: wp(), rims: wp(), brakes: bp(), suspension: sp(),
    interiorExterior: lp(INTERIOR_ITEMS), electrical: lp(ELECTRICAL_ITEMS),
    engine: lp(ENGINE_ITEMS), transmission: lp(TRANSMISSION_ITEMS), chassis: lp(CHASSIS_ITEMS),
    bodyCondition:'Original Paint', bodyNotes:'', comments:'',
  }
}

// ── Sub-components ────────────────────────────────────────────────
function StatusBtn({ value, onChange, disabled }) {
  return (
    <div className="flex gap-1">
      {['PASS','FAIL','N/A'].map(s => (
        <button key={s} disabled={disabled} onClick={() => !disabled && onChange(s)}
          className={`text-[10px] font-black px-2 py-0.5 transition-colors border ${
            value === s
              ? s==='PASS' ? 'bg-green-600 border-green-600 text-white'
              : s==='FAIL' ? 'bg-red-600 border-red-600 text-white'
              : 'bg-gray-500 border-gray-500 text-white'
              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-400 hover:border-gray-400'
          }`}>
          {s}
        </button>
      ))}
    </div>
  )
}

function SectionHeader({ title, open, onToggle, failCount }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
      <span className="font-bold text-sm text-gray-900 dark:text-white">{title}</span>
      <div className="flex items-center gap-2">
        {failCount > 0 && <span className="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5">{failCount} FAIL</span>}
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </div>
    </button>
  )
}

// ── PDF Generator ─────────────────────────────────────────────────
function generatePDF(report, card) {
  const sc = (s) => `<span class="badge ${s==='PASS'?'pass':s==='FAIL'?'fail':'na'}">${s}</span>`

  const wheelRow = (obj, extra='') => WHEEL_POS.map(p => `
    <td class="cell"><b>${p}</b><br/>${sc(obj[p]?.status||'PASS')}${extra==='tyre'?`<br/><small>${obj[p]?.mfgYear||'-'}</small>`:''}<br/><small style="color:#666">${obj[p]?.notes||''}</small></td>`).join('')

  const brakeRows = BRAKE_POS.map(p => `
    <tr>
      <td class="cell"><b>${p}</b></td>
      <td class="cell">${report.brakes[p]?.type||'DISC'}</td>
      <td class="cell">${sc(report.brakes[p]?.pads||'PASS')}</td>
      <td class="cell">${sc(report.brakes[p]?.disc||'PASS')}</td>
      <td class="cell" style="color:#666;font-size:10px">${report.brakes[p]?.notes||''}</td>
    </tr>`).join('')

  const checklistRows = (items) => items.map(it => `
    <tr style="${it.status==='FAIL'?'background:#fff5f5':''}">
      <td class="cell" style="font-size:11px">${it.label}</td>
      <td class="cell">${sc(it.status)}</td>
      <td class="cell" style="color:#666;font-size:10px">${it.notes||''}</td>
    </tr>`).join('')

  // stats
  const all = []
  WHEEL_POS.forEach(p => all.push(report.tyres[p]?.status, report.rims[p]?.status))
  BRAKE_POS.forEach(p => all.push(report.brakes[p]?.pads, report.brakes[p]?.disc))
  SUSP_POS.forEach(p => all.push(report.suspension[p.key]?.status))
  ;['interiorExterior','electrical','engine','transmission','chassis'].forEach(s => (report[s]||[]).forEach(i => all.push(i.status)))
  const pass = all.filter(s=>s==='PASS').length
  const fail = all.filter(s=>s==='FAIL').length
  const tot  = pass + fail
  const pct  = tot > 0 ? Math.round((pass/tot)*100) : 100

  const customerName = card.customerName || (card.carModel||'').split('[Cust:')[1]?.replace(']','')?.trim() || '-'

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Inspection Report – ${card.plateNumber}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size:12px; color:#1a1a1a; background:#fff; }
  .page { max-width:210mm; margin:0 auto; padding:12mm; }
  /* Header */
  .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #16a34a; padding-bottom:12px; margin-bottom:16px; }
  .garage-name { font-size:22px; font-weight:900; color:#16a34a; letter-spacing:1px; }
  .garage-sub  { font-size:10px; color:#6b7280; margin-top:2px; }
  .report-title { text-align:right; }
  .report-title h2 { font-size:14px; font-weight:900; color:#1a1a1a; }
  .report-title p  { font-size:10px; color:#6b7280; }
  /* Vehicle summary */
  .summary-box { background:#f5f3ff; border:1px solid #c4b5fd; padding:12px; margin-bottom:16px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
  .summary-item .lbl { font-size:9px; text-transform:uppercase; color:#16a34a; font-weight:700; }
  .summary-item .val { font-size:12px; font-weight:800; color:#1a1a1a; }
  /* Score */
  .score-box { display:flex; gap:16px; align-items:center; background:#1a1a1a; color:#fff; padding:12px 16px; margin-bottom:16px; }
  .score-circle { width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:900; }
  .score-pass { background:#16a34a; } .score-fail { background:#dc2626; }
  .score-text h3 { font-size:14px; font-weight:900; }
  .score-text p  { font-size:10px; color:#9ca3af; }
  /* Sections */
  .section { margin-bottom:16px; }
  .section-title { background:#16a34a; color:#fff; font-size:11px; font-weight:900; padding:6px 10px; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:6px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  .cell { border:1px solid #e5e7eb; padding:5px 8px; vertical-align:top; }
  th.cell { background:#f9fafb; font-weight:700; font-size:10px; text-transform:uppercase; color:#6b7280; }
  .badge { font-size:9px; font-weight:900; padding:2px 6px; border-radius:2px; }
  .pass { background:#dcfce7; color:#15803d; }
  .fail { background:#fee2e2; color:#dc2626; }
  .na   { background:#f3f4f6; color:#6b7280; }
  /* Footer */
  .footer { border-top:2px solid #16a34a; margin-top:20px; padding-top:10px; display:flex; justify-content:space-between; font-size:9px; color:#9ca3af; }
  .sig-box { border-top:1px solid #d1d5db; width:160px; text-align:center; padding-top:4px; margin-top:30px; font-size:9px; color:#6b7280; }
  @media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
</style></head><body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="garage-name">🔧 VISCO BODY SHOP</div>
      <div class="garage-sub">Professional Vehicle Inspection Report</div>
      <div class="garage-sub">Tel: +971 XX XXX XXXX | Dubai, UAE</div>
    </div>
    <div class="report-title">
      <h2>INSPECTION REPORT</h2>
      <p>Date: ${report.inspectionDate}</p>
      <p>Inspector: ${report.inspectorName || '-'}</p>
    </div>
  </div>

  <!-- Vehicle Summary -->
  <div class="summary-box">
    <div class="summary-item"><div class="lbl">Plate Number</div><div class="val">${card.plateNumber}</div></div>
    <div class="summary-item"><div class="lbl">Make / Model</div><div class="val">${card.carModel||'-'}</div></div>
    <div class="summary-item"><div class="lbl">VIN / Chassis</div><div class="val">${card.vin||'-'}</div></div>
    <div class="summary-item"><div class="lbl">Odometer</div><div class="val">${card.odoKM||'-'} KM</div></div>
    <div class="summary-item"><div class="lbl">Customer</div><div class="val">${customerName}</div></div>
    <div class="summary-item"><div class="lbl">Job Card No</div><div class="val">${card.jobCardNo||'-'}</div></div>
  </div>

  <!-- Score -->
  <div class="score-box">
    <div class="score-circle ${pct>=60?'score-pass':'score-fail'}">${pct}%</div>
    <div class="score-text">
      <h3>${pct>=60?'OVERALL PASS':'OVERALL FAIL'}</h3>
      <p>${pass} checks passed &nbsp;|&nbsp; ${fail} checks failed &nbsp;|&nbsp; ${tot} total checks</p>
    </div>
  </div>

  <!-- Tyres -->
  <div class="section">
    <div class="section-title">Tyres</div>
    <table><tr><th class="cell">Position</th>${WHEEL_POS.map(p=>`<th class="cell">${p}</th>`).join('')}</tr>
    <tr><td class="cell"><b>Status</b></td>${WHEEL_POS.map(p=>`<td class="cell">${sc(report.tyres[p]?.status)}</td>`).join('')}</tr>
    <tr><td class="cell"><b>Mfg Year</b></td>${WHEEL_POS.map(p=>`<td class="cell">${report.tyres[p]?.mfgYear||'-'}</td>`).join('')}</tr>
    <tr><td class="cell"><b>Notes</b></td>${WHEEL_POS.map(p=>`<td class="cell" style="color:#666;font-size:10px">${report.tyres[p]?.notes||'-'}</td>`).join('')}</tr>
    </table>
  </div>

  <!-- Rims -->
  <div class="section">
    <div class="section-title">Rims</div>
    <table><tr><th class="cell">Position</th>${WHEEL_POS.map(p=>`<th class="cell">${p}</th>`).join('')}</tr>
    <tr><td class="cell"><b>Status</b></td>${WHEEL_POS.map(p=>`<td class="cell">${sc(report.rims[p]?.status)}</td>`).join('')}</tr>
    <tr><td class="cell"><b>Notes</b></td>${WHEEL_POS.map(p=>`<td class="cell" style="color:#666;font-size:10px">${report.rims[p]?.notes||'-'}</td>`).join('')}</tr>
    </table>
  </div>

  <!-- Brakes -->
  <div class="section">
    <div class="section-title">Brakes</div>
    <table>
      <tr><th class="cell">Position</th><th class="cell">Type</th><th class="cell">Pads</th><th class="cell">Disc</th><th class="cell">Notes</th></tr>
      ${brakeRows}
    </table>
  </div>

  <!-- Suspension -->
  <div class="section">
    <div class="section-title">Suspension</div>
    <table>
      <tr><th class="cell">Position</th><th class="cell">Status</th><th class="cell">Notes</th></tr>
      ${SUSP_POS.map(p=>`<tr><td class="cell">${p.label}</td><td class="cell">${sc(report.suspension[p.key]?.status)}</td><td class="cell" style="color:#666;font-size:10px">${report.suspension[p.key]?.notes||''}</td></tr>`).join('')}
    </table>
  </div>

  <!-- Interior & Exterior -->
  <div class="section">
    <div class="section-title">Interior &amp; Exterior</div>
    <table>
      <tr><th class="cell">Item</th><th class="cell">Status</th><th class="cell">Notes</th></tr>
      ${checklistRows(report.interiorExterior||[])}
    </table>
  </div>

  <!-- Electrical -->
  <div class="section">
    <div class="section-title">Electrical</div>
    <table>
      <tr><th class="cell">Item</th><th class="cell">Status</th><th class="cell">Notes</th></tr>
      ${checklistRows(report.electrical||[])}
    </table>
  </div>

  <!-- Body -->
  <div class="section">
    <div class="section-title">Body Condition</div>
    <table>
      <tr><th class="cell">Condition</th><th class="cell">Notes</th></tr>
      <tr><td class="cell"><b>${report.bodyCondition||'Original Paint'}</b></td><td class="cell">${report.bodyNotes||'-'}</td></tr>
    </table>
  </div>

  <!-- Engine -->
  <div class="section">
    <div class="section-title">Engine</div>
    <table>
      <tr><th class="cell">Item</th><th class="cell">Status</th><th class="cell">Notes</th></tr>
      ${checklistRows(report.engine||[])}
    </table>
  </div>

  <!-- Transmission -->
  <div class="section">
    <div class="section-title">Transmission</div>
    <table>
      <tr><th class="cell">Item</th><th class="cell">Status</th><th class="cell">Notes</th></tr>
      ${checklistRows(report.transmission||[])}
    </table>
  </div>

  <!-- Chassis -->
  <div class="section">
    <div class="section-title">Chassis &amp; Subframe</div>
    <table>
      <tr><th class="cell">Item</th><th class="cell">Status</th><th class="cell">Notes</th></tr>
      ${checklistRows(report.chassis||[])}
    </table>
  </div>

  <!-- Inspector Comments -->
  <div class="section">
    <div class="section-title">Inspector Comments</div>
    <div style="border:1px solid #e5e7eb; padding:12px; min-height:60px; font-size:12px; line-height:1.6;">
      ${report.comments || 'No additional comments.'}
    </div>
  </div>

  <!-- Signatures -->
  <div style="display:flex; justify-content:space-between; margin-top:24px;">
    <div class="sig-box">Inspector Signature</div>
    <div class="sig-box">Customer Signature</div>
    <div class="sig-box">Authorized By</div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>VISCO BODY SHOP — Professional Vehicle Inspection</span>
    <span>Generated: ${new Date().toLocaleString()}</span>
  </div>

</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}

// ── Main Component ────────────────────────────────────────────────
export default function InspectionReportTab({ card, onCardUpdate, canEdit }) {
  const [report, setReport] = useState(() => {
    const def = makeDefault()
    if (!card.inspectionReport) return def
    // Merge saved data over defaults (preserves new items added to constants)
    return {
      ...def,
      ...card.inspectionReport,
      interiorExterior: card.inspectionReport.interiorExterior || def.interiorExterior,
      electrical:       card.inspectionReport.electrical       || def.electrical,
      engine:           card.inspectionReport.engine           || def.engine,
      transmission:     card.inspectionReport.transmission     || def.transmission,
      chassis:          card.inspectionReport.chassis          || def.chassis,
    }
  })
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [openSec, setOpenSec] = useState('tyres')

  const toggle = (sec) => setOpenSec(o => o === sec ? null : sec)

  const updWheel = (type, pos, field, val) =>
    setReport(r => ({ ...r, [type]: { ...r[type], [pos]: { ...r[type][pos], [field]: val } } }))
  const updBrake = (pos, field, val) =>
    setReport(r => ({ ...r, brakes: { ...r.brakes, [pos]: { ...r.brakes[pos], [field]: val } } }))
  const updSusp  = (pos, field, val) =>
    setReport(r => ({ ...r, suspension: { ...r.suspension, [pos]: { ...r.suspension[pos], [field]: val } } }))
  const updList  = (sec, idx, field, val) =>
    setReport(r => { const l=[...r[sec]]; l[idx]={...l[idx],[field]:val}; return {...r,[sec]:l} })

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/jobcards/${card._id}`, { inspectionReport: report })
      onCardUpdate({ ...card, inspectionReport: report })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch(e) { alert('Save failed') }
    finally { setSaving(false) }
  }

  const printReport = () => {
    const win = window.open('', '_blank')
    win.document.write(generatePDF(report, card))
    win.document.close()
  }

  // Count FAILs per section for section headers
  const failIn = (sec) => (report[sec]||[]).filter(i=>i.status==='FAIL').length
  const wheelFail = (type) => WHEEL_POS.filter(p=>report[type][p]?.status==='FAIL').length +
    (type==='rims' ? 0 : 0)
  const brakeFail = () => BRAKE_POS.filter(p=>report.brakes[p]?.pads==='FAIL'||report.brakes[p]?.disc==='FAIL').length
  const suspFail  = () => SUSP_POS.filter(p=>report.suspension[p.key]?.status==='FAIL').length

  // Overall stats
  const allS = []
  WHEEL_POS.forEach(p=>{allS.push(report.tyres[p]?.status);allS.push(report.rims[p]?.status)})
  BRAKE_POS.forEach(p=>{allS.push(report.brakes[p]?.pads);allS.push(report.brakes[p]?.disc)})
  SUSP_POS.forEach(p=>allS.push(report.suspension[p.key]?.status))
  ;['interiorExterior','electrical','engine','transmission','chassis'].forEach(s=>(report[s]||[]).forEach(i=>allS.push(i.status)))
  const passN = allS.filter(s=>s==='PASS').length
  const failN = allS.filter(s=>s==='FAIL').length
  const pct   = passN+failN>0 ? Math.round((passN/(passN+failN))*100) : 100

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-black ${pct>=60?'text-green-600':'text-red-600'}`}>{pct}%</div>
          <div>
            <p className="text-xs font-black text-gray-900 dark:text-white">{pct>=60?'OVERALL PASS':'OVERALL FAIL'}</p>
            <p className="text-[10px] text-gray-500">{passN} pass · {failN} fail</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={printReport} className="text-xs px-3 py-1.5 font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200">
            🖨️ Print Report
          </button>
          {canEdit && (
            <button onClick={save} disabled={saving}
              className={`text-xs px-4 py-1.5 font-bold text-white transition-colors ${saved?'bg-green-600':saving?'bg-gray-400':'bg-brand hover:bg-green-700'}`}>
              {saved?'✓ Saved':saving?'Saving...':'💾 Save'}
            </button>
          )}
        </div>
      </div>

      {/* Inspector info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="label mb-1">Inspector Name</p>
          <input className="input text-sm" value={report.inspectorName} disabled={!canEdit}
            onChange={e=>setReport(r=>({...r,inspectorName:e.target.value}))} placeholder="Inspector name" />
        </div>
        <div>
          <p className="label mb-1">Inspection Date</p>
          <input className="input text-sm" type="date" value={report.inspectionDate} disabled={!canEdit}
            onChange={e=>setReport(r=>({...r,inspectionDate:e.target.value}))} />
        </div>
      </div>

      {/* ── TYRES ── */}
      <div>
        <SectionHeader title="🔵 Tyres" open={openSec==='tyres'} onToggle={()=>toggle('tyres')} failCount={wheelFail('tyres')} />
        {openSec==='tyres' && (
          <div className="border border-t-0 border-gray-200 dark:border-gray-700 p-3 space-y-3">
            <div className="grid grid-cols-5 gap-2">
              {WHEEL_POS.map(p=>(
                <div key={p} className="space-y-1">
                  <p className="text-[10px] font-black text-gray-500 text-center">{p}</p>
                  <StatusBtn value={report.tyres[p]?.status} disabled={!canEdit} onChange={v=>updWheel('tyres',p,'status',v)} />
                  <input className="input text-[10px] py-1" placeholder="Mfg Year" disabled={!canEdit}
                    value={report.tyres[p]?.mfgYear||''} onChange={e=>updWheel('tyres',p,'mfgYear',e.target.value)} />
                  {report.tyres[p]?.status==='FAIL' && (
                    <input className="input text-[10px] py-1 border-red-300" placeholder="Notes" disabled={!canEdit}
                      value={report.tyres[p]?.notes||''} onChange={e=>updWheel('tyres',p,'notes',e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RIMS ── */}
      <div>
        <SectionHeader title="⭕ Rims" open={openSec==='rims'} onToggle={()=>toggle('rims')} failCount={wheelFail('rims')} />
        {openSec==='rims' && (
          <div className="border border-t-0 border-gray-200 dark:border-gray-700 p-3">
            <div className="grid grid-cols-5 gap-2">
              {WHEEL_POS.map(p=>(
                <div key={p} className="space-y-1">
                  <p className="text-[10px] font-black text-gray-500 text-center">{p}</p>
                  <StatusBtn value={report.rims[p]?.status} disabled={!canEdit} onChange={v=>updWheel('rims',p,'status',v)} />
                  {report.rims[p]?.status==='FAIL' && (
                    <input className="input text-[10px] py-1 border-red-300" placeholder="Notes" disabled={!canEdit}
                      value={report.rims[p]?.notes||''} onChange={e=>updWheel('rims',p,'notes',e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── BRAKES ── */}
      <div>
        <SectionHeader title="🛑 Brakes" open={openSec==='brakes'} onToggle={()=>toggle('brakes')} failCount={brakeFail()} />
        {openSec==='brakes' && (
          <div className="border border-t-0 border-gray-200 dark:border-gray-700 p-3 space-y-3">
            {BRAKE_POS.map(p=>(
              <div key={p} className="border border-gray-100 dark:border-gray-800 p-2 space-y-2">
                <p className="text-xs font-black text-gray-700 dark:text-white">{p}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="label mb-1">Type</p>
                    <select className="input text-xs py-1" value={report.brakes[p]?.type||'DISC'} disabled={!canEdit}
                      onChange={e=>updBrake(p,'type',e.target.value)}>
                      <option>DISC</option><option>DRUM</option>
                    </select>
                  </div>
                  <div>
                    <p className="label mb-1">Pads</p>
                    <StatusBtn value={report.brakes[p]?.pads||'PASS'} disabled={!canEdit} onChange={v=>updBrake(p,'pads',v)} />
                  </div>
                  <div>
                    <p className="label mb-1">Disc</p>
                    <StatusBtn value={report.brakes[p]?.disc||'PASS'} disabled={!canEdit} onChange={v=>updBrake(p,'disc',v)} />
                  </div>
                </div>
                {(report.brakes[p]?.pads==='FAIL'||report.brakes[p]?.disc==='FAIL') && (
                  <input className="input text-xs border-red-300" placeholder="Notes..." disabled={!canEdit}
                    value={report.brakes[p]?.notes||''} onChange={e=>updBrake(p,'notes',e.target.value)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SUSPENSION ── */}
      <div>
        <SectionHeader title="🔩 Suspension" open={openSec==='suspension'} onToggle={()=>toggle('suspension')} failCount={suspFail()} />
        {openSec==='suspension' && (
          <div className="border border-t-0 border-gray-200 dark:border-gray-700 p-3 grid grid-cols-2 gap-3">
            {SUSP_POS.map(p=>(
              <div key={p.key} className="space-y-1">
                <p className="text-xs font-bold text-gray-700 dark:text-white">{p.label}</p>
                <StatusBtn value={report.suspension[p.key]?.status} disabled={!canEdit} onChange={v=>updSusp(p.key,'status',v)} />
                {report.suspension[p.key]?.status==='FAIL' && (
                  <input className="input text-xs border-red-300" placeholder="Notes..." disabled={!canEdit}
                    value={report.suspension[p.key]?.notes||''} onChange={e=>updSusp(p.key,'notes',e.target.value)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CHECKLIST SECTIONS ── */}
      {[
        { key:'interiorExterior', title:'🚪 Interior & Exterior' },
        { key:'electrical',       title:'⚡ Electrical' },
        { key:'engine',           title:'🔧 Engine' },
        { key:'transmission',     title:'⚙️ Transmission' },
        { key:'chassis',          title:'🏗️ Chassis & Subframe' },
      ].map(({key,title})=>(
        <div key={key}>
          <SectionHeader title={title} open={openSec===key} onToggle={()=>toggle(key)} failCount={failIn(key)} />
          {openSec===key && (
            <div className="border border-t-0 border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
              {(report[key]||[]).map((item,idx)=>(
                <div key={idx} className={`flex items-start justify-between gap-3 px-3 py-2 ${item.status==='FAIL'?'bg-red-50 dark:bg-red-900/10':''}`}>
                  <p className="text-xs text-gray-700 dark:text-gray-300 flex-1">{item.label}</p>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBtn value={item.status} disabled={!canEdit} onChange={v=>updList(key,idx,'status',v)} />
                    {item.status==='FAIL' && (
                      <input className="input text-[10px] py-0.5 border-red-300 w-40" placeholder="Notes..." disabled={!canEdit}
                        value={item.notes||''} onChange={e=>updList(key,idx,'notes',e.target.value)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* ── BODY ── */}
      <div>
        <SectionHeader title="🎨 Body Condition" open={openSec==='body'} onToggle={()=>toggle('body')} failCount={0} />
        {openSec==='body' && (
          <div className="border border-t-0 border-gray-200 dark:border-gray-700 p-3 space-y-3">
            <div>
              <p className="label mb-2">Paint Condition</p>
              <div className="flex flex-wrap gap-2">
                {BODY_CONDITIONS.map(c=>(
                  <button key={c} disabled={!canEdit} onClick={()=>setReport(r=>({...r,bodyCondition:c}))}
                    className={`text-xs font-bold px-3 py-1.5 border transition-colors ${report.bodyCondition===c?'bg-brand border-brand text-white':'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label mb-1">Body Notes</p>
              <textarea className="input text-sm" rows={3} disabled={!canEdit} placeholder="Describe any body damage, rust, scratches..."
                value={report.bodyNotes||''} onChange={e=>setReport(r=>({...r,bodyNotes:e.target.value}))} />
            </div>
          </div>
        )}
      </div>

      {/* ── COMMENTS ── */}
      <div>
        <SectionHeader title="💬 Inspector Comments" open={openSec==='comments'} onToggle={()=>toggle('comments')} failCount={0} />
        {openSec==='comments' && (
          <div className="border border-t-0 border-gray-200 dark:border-gray-700 p-3">
            <textarea className="input text-sm w-full" rows={5} disabled={!canEdit}
              placeholder="Overall inspection comments, recommendations, observations..."
              value={report.comments||''} onChange={e=>setReport(r=>({...r,comments:e.target.value}))} />
          </div>
        )}
      </div>

      {/* Bottom save */}
      {canEdit && (
        <div className="flex gap-2 pt-2">
          <button onClick={printReport} className="flex-1 py-2 text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200">
            🖨️ Print / Download PDF
          </button>
          <button onClick={save} disabled={saving}
            className={`flex-1 py-2 text-sm font-bold text-white transition-colors ${saved?'bg-green-600':saving?'bg-gray-400':'bg-brand hover:bg-green-700'}`}>
            {saved?'✓ Saved':saving?'Saving...':'💾 Save Inspection'}
          </button>
        </div>
      )}
    </div>
  )
}
