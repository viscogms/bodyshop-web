export const STATUS_OPTIONS = [
  'Inspection','Quote','Approval','Parts','WIP',
  'Wheel Alignment','Road Test','Final Check','Cleaning','Ready',
  'Delivered','Test Job',
]

export const INACTIVE_STATUSES = ['Delivered', 'Test Job']

export const getStatusColor = (status) => {
  const map = {
    'Inspection':     '#f39c12',
    'Quote':          '#e67e22',
    'Approval':       '#3498db',
    'Parts':          '#9b59b6',
    'WIP':            '#e74c3c',
    'Wheel Alignment':'#1abc9c',
    'Road Test':      '#f1c40f',
    'Final Check':    '#2ecc71',
    'Cleaning':       '#00bcd4',
    'Ready':          '#27ae60',
    'Delivered':      '#7f8c8d',
    'Test Job':       '#95a5a6',
  }
  return map[status] || '#16a34a'
}

export const getCleanModel = (raw) =>
  raw?.includes(' [Cust: ') ? raw.split(' [Cust: ')[0] : (raw || '')

export const getCustomerName = (raw) =>
  raw?.includes(' [Cust: ') ? raw.split(' [Cust: ')[1]?.replace(']', '') : ''

export const formatDate = (d) => {
  if (!d) return '—'
  // "YYYY-MM-DD HH:mm" (space-separated) parses unreliably on Safari/iOS — normalize to ISO first
  const t = new Date(String(d).replace(' ', 'T'))
  return isNaN(t) ? String(d).split(' ')[0].split('T')[0] : t.toISOString().split('T')[0]
}

export const parseImages = (str) => {
  if (!str) return []
  if (Array.isArray(str)) return str.filter(Boolean)
  return String(str).split(',').map(s => s.trim()).filter(Boolean)
}

export const decodePart = (part) => {
  if (!part) return { name: '', received: false }
  if (typeof part === 'object') return { name: part.name || '', received: !!part.received }
  try {
    const parsed = JSON.parse(part)
    if (parsed && typeof parsed === 'object' && parsed.name !== undefined) {
      return { name: String(parsed.name), received: !!parsed.received }
    }
  } catch (e) {}
  return { name: String(part), received: false }
}
