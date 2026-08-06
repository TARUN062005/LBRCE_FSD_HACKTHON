/**
 * Professional GridFleet charging invoice PDF (no external deps).
 * Letter page 612×792, Helvetica + Helvetica-Bold.
 */

function escapePdfText(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function money(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0.00'
  return v.toFixed(2)
}

function kwh(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0.000'
  return v.toFixed(3)
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortId(id) {
  const s = String(id || '')
  if (s.length <= 10) return s.toUpperCase() || '—'
  return s.slice(-10).toUpperCase()
}

function truncate(str, max) {
  const s = String(str || '')
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

/** Build drawing commands */
function buildContentStream(invoice) {
  const ops = []
  const push = (...parts) => ops.push(parts.join(' '))

  const gstPct = Math.round((invoice.gstRate || 0.18) * 100)
  const payment = String(invoice.paymentStatus || invoice.status || 'unpaid').toUpperCase()
  const invoiceNo = shortId(invoice.invoiceId || invoice.id)
  const customer = invoice.userName || invoice.customerName || 'EV Customer'
  const email = invoice.customerEmail || '—'
  const station = invoice.stationName || invoice.companyName || 'Charging Station'
  const company = invoice.companyName || 'GridFleet Host'
  const charger =
    invoice.chargerId ||
    invoice.lineItems?.[0]?.chargerLabel ||
    invoice.lineItems?.[0]?.chargerId ||
    '—'
  const duration = invoice.chargingDuration || invoice.durationMinutes || 0
  const energy = invoice.energyConsumed ?? invoice.totalKwh ?? 0
  const rate = invoice.pricePerKwh ?? invoice.tariffRate ?? 0
  const subtotal = invoice.subtotal || 0
  const gstAmount = invoice.gstAmount || invoice.gst || 0
  const total = invoice.totalAmount ?? invoice.amount ?? 0
  const issued = formatDate(invoice.dateTime || invoice.generatedAt || invoice.createdAt)

  // —— Teal header band ——
  push('0.06 0.46 0.43', 'rg')
  push('0 732 612 60', 're', 'f')

  // Brand
  push('1 1 1', 'rg')
  push('BT', '/F2', '22', 'Tf', '40', '758', 'Td', `(${escapePdfText('GridFleet')})`, 'Tj', 'ET')
  push('BT', '/F1', '9', 'Tf', '40', '742', 'Td', `(${escapePdfText('EV Charging Marketplace')})`, 'Tj', 'ET')

  // INVOICE title (right)
  push('BT', '/F2', '18', 'Tf', '430', '758', 'Td', '(INVOICE)', 'Tj', 'ET')
  push(
    'BT',
    '/F1',
    '9',
    'Tf',
    '430',
    '742',
    'Td',
    `(${escapePdfText(`No. ${invoiceNo}`)})`,
    'Tj',
    'ET',
  )

  // —— Meta strip ——
  push('0.96 0.97 0.98', 'rg')
  push('40 688 532 32', 're', 'f')
  push('0.85 0.88 0.90', 'RG')
  push('0.5', 'w')
  push('40 688 532 32', 're', 'S')

  push('0.15 0.18 0.22', 'rg')
  push('BT', '/F1', '8', 'Tf', '48', '708', 'Td', '(Issued)', 'Tj', 'ET')
  push('BT', '/F2', '9', 'Tf', '48', '696', 'Td', `(${escapePdfText(issued)})`, 'Tj', 'ET')

  push('BT', '/F1', '8', 'Tf', '240', '708', 'Td', '(Period)', 'Tj', 'ET')
  push(
    'BT',
    '/F2',
    '9',
    'Tf',
    '240',
    '696',
    'Td',
    `(${escapePdfText(invoice.period || '—')})`,
    'Tj',
    'ET',
  )

  push('BT', '/F1', '8', 'Tf', '360', '708', 'Td', '(Payment)', 'Tj', 'ET')
  if (payment === 'PAID') {
    push('0.02 0.55 0.35', 'rg')
  } else {
    push('0.75 0.35 0.05', 'rg')
  }
  push('BT', '/F2', '9', 'Tf', '360', '696', 'Td', `(${escapePdfText(payment)})`, 'Tj', 'ET')

  const payId = invoice.paymentId || ''
  if (payId) {
    push('0.40 0.45 0.50', 'rg')
    push(
      'BT',
      '/F1',
      '7',
      'Tf',
      '40',
      '678',
      'Td',
      `(${escapePdfText(`Payment ID: ${truncate(payId, 42)}`)})`,
      'Tj',
      'ET',
    )
  }

  // —— Bill from / Bill to ——
  push('0.15 0.18 0.22', 'rg')
  push('BT', '/F2', '10', 'Tf', '40', '665', 'Td', '(FROM)', 'Tj', 'ET')
  push('BT', '/F1', '10', 'Tf', '40', '650', 'Td', `(${escapePdfText(truncate(company, 36))})`, 'Tj', 'ET')
  push('0.40 0.45 0.50', 'rg')
  push(
    'BT',
    '/F1',
    '8',
    'Tf',
    '40',
    '637',
    'Td',
    `(${escapePdfText(truncate(station, 42))})`,
    'Tj',
    'ET',
  )
  push(
    'BT',
    '/F1',
    '8',
    'Tf',
    '40',
    '625',
    'Td',
    `(${escapePdfText(`Charger: ${truncate(String(charger), 34)}`)})`,
    'Tj',
    'ET',
  )

  push('0.15 0.18 0.22', 'rg')
  push('BT', '/F2', '10', 'Tf', '320', '665', 'Td', '(BILL TO)', 'Tj', 'ET')
  push('BT', '/F1', '10', 'Tf', '320', '650', 'Td', `(${escapePdfText(truncate(customer, 34))})`, 'Tj', 'ET')
  push('0.40 0.45 0.50', 'rg')
  push('BT', '/F1', '8', 'Tf', '320', '637', 'Td', `(${escapePdfText(truncate(email, 40))})`, 'Tj', 'ET')
  push(
    'BT',
    '/F1',
    '8',
    'Tf',
    '320',
    '625',
    'Td',
    `(${escapePdfText('Customer · EV charging session')})`,
    'Tj',
    'ET',
  )

  // —— Session summary cards ——
  const cards = [
    { label: 'Duration', value: `${duration} min`, x: 40 },
    { label: 'Energy', value: `${kwh(energy)} kWh`, x: 178 },
    { label: 'Rate', value: `₹${money(rate)}/kWh`, x: 316 },
    { label: 'Items', value: String((invoice.lineItems || []).length || 1), x: 454 },
  ]
  for (const c of cards) {
    push('0.95 0.97 0.96', 'rg')
    push(`${c.x} 575 118 36`, 're', 'f')
    push('0.78 0.86 0.84', 'RG')
    push('0.6', 'w')
    push(`${c.x} 575 118 36`, 're', 'S')
    push('0.40 0.45 0.50', 'rg')
    push('BT', '/F1', '7', 'Tf', `${c.x + 8}`, '600', 'Td', `(${escapePdfText(c.label)})`, 'Tj', 'ET')
    push('0.10 0.14 0.18', 'rg')
    push('BT', '/F2', '11', 'Tf', `${c.x + 8}`, '584', 'Td', `(${escapePdfText(c.value)})`, 'Tj', 'ET')
  }

  // —— Table header ——
  const tableTop = 555
  push('0.06 0.46 0.43', 'rg')
  push(`40 ${tableTop - 22} 532 22`, 're', 'f')
  push('1 1 1', 'rg')
  push('BT', '/F2', '8', 'Tf', '48', `${tableTop - 15}`, 'Td', '(DESCRIPTION)', 'Tj', 'ET')
  push('BT', '/F2', '8', 'Tf', '268', `${tableTop - 15}`, 'Td', '(ENERGY)', 'Tj', 'ET')
  push('BT', '/F2', '8', 'Tf', '340', `${tableTop - 15}`, 'Td', '(DURATION)', 'Tj', 'ET')
  push('BT', '/F2', '8', 'Tf', '420', `${tableTop - 15}`, 'Td', '(RATE)', 'Tj', 'ET')
  push('BT', '/F2', '8', 'Tf', '500', `${tableTop - 15}`, 'Td', '(AMOUNT)', 'Tj', 'ET')

  let y = tableTop - 22
  const items = invoice.lineItems?.length
    ? invoice.lineItems
    : [
        {
          chargerLabel: charger,
          stationName: station,
          kWh: energy,
          durationMinutes: duration,
          tariffRate: rate,
          amount: subtotal || total,
          deliveredAt: invoice.generatedAt,
        },
      ]

  items.slice(0, 8).forEach((li, idx) => {
    y -= 28
    if (idx % 2 === 0) {
      push('0.98 0.99 0.99', 'rg')
      push(`40 ${y} 532 28`, 're', 'f')
    }
    push('0.88 0.90 0.92', 'RG')
    push('0.4', 'w')
    push(`40 ${y}`, 'm', `572 ${y}`, 'l', 'S')

    const desc = truncate(
      li.chargerLabel || li.stationName || 'EV charging session',
      28,
    )
    const when = li.deliveredAt ? formatDate(li.deliveredAt) : ''
    push('0.15 0.18 0.22', 'rg')
    push('BT', '/F1', '9', 'Tf', '48', `${y + 14}`, 'Td', `(${escapePdfText(desc)})`, 'Tj', 'ET')
    if (when) {
      push('0.45 0.50 0.55', 'rg')
      push(
        'BT',
        '/F1',
        '7',
        'Tf',
        '48',
        `${y + 4}`,
        'Td',
        `(${escapePdfText(truncate(when, 32))})`,
        'Tj',
        'ET',
      )
    }
    push('0.15 0.18 0.22', 'rg')
    push(
      'BT',
      '/F1',
      '9',
      'Tf',
      '268',
      `${y + 10}`,
      'Td',
      `(${escapePdfText(`${kwh(li.kWh)} kWh`)})`,
      'Tj',
      'ET',
    )
    push(
      'BT',
      '/F1',
      '9',
      'Tf',
      '340',
      `${y + 10}`,
      'Td',
      `(${escapePdfText(`${li.durationMinutes || duration || 0} min`)})`,
      'Tj',
      'ET',
    )
    push(
      'BT',
      '/F1',
      '9',
      'Tf',
      '420',
      `${y + 10}`,
      'Td',
      `(${escapePdfText(`₹${money(li.tariffRate ?? rate)}`)})`,
      'Tj',
      'ET',
    )
    push(
      'BT',
      '/F2',
      '9',
      'Tf',
      '500',
      `${y + 10}`,
      'Td',
      `(${escapePdfText(`₹${money(li.amount)}`)})`,
      'Tj',
      'ET',
    )
  })

  // bottom table border
  push('0.75 0.78 0.82', 'RG')
  push('1', 'w')
  push(`40 ${y}`, 'm', `572 ${y}`, 'l', 'S')

  // —— Totals box ——
  const boxY = Math.min(y - 20, 280)
  push('0.96 0.98 0.97', 'rg')
  push(`340 ${boxY - 90} 232 100`, 're', 'f')
  push('0.06 0.46 0.43', 'RG')
  push('1.2', 'w')
  push(`340 ${boxY - 90} 232 100`, 're', 'S')

  push('0.35 0.40 0.45', 'rg')
  push('BT', '/F1', '9', 'Tf', '352', `${boxY - 8}`, 'Td', '(Subtotal)', 'Tj', 'ET')
  push(
    'BT',
    '/F1',
    '9',
    'Tf',
    '500',
    `${boxY - 8}`,
    'Td',
    `(${escapePdfText(`₹${money(subtotal)}`)})`,
    'Tj',
    'ET',
  )

  push(
    'BT',
    '/F1',
    '9',
    'Tf',
    '352',
    `${boxY - 26}`,
    'Td',
    `(${escapePdfText(`GST (${gstPct}%)`)})`,
    'Tj',
    'ET',
  )
  push(
    'BT',
    '/F1',
    '9',
    'Tf',
    '500',
    `${boxY - 26}`,
    'Td',
    `(${escapePdfText(`₹${money(gstAmount)}`)})`,
    'Tj',
    'ET',
  )

  push('0.85 0.88 0.90', 'RG')
  push('0.5', 'w')
  push(`352 ${boxY - 40}`, 'm', `560 ${boxY - 40}`, 'l', 'S')

  push('0.06 0.46 0.43', 'rg')
  push('BT', '/F2', '11', 'Tf', '352', `${boxY - 58}`, 'Td', '(Total due)', 'Tj', 'ET')
  push(
    'BT',
    '/F2',
    '14',
    'Tf',
    '480',
    `${boxY - 58}`,
    'Td',
    `(${escapePdfText(`₹${money(total)}`)})`,
    'Tj',
    'ET',
  )

  push('0.40 0.45 0.50', 'rg')
  push(
    'BT',
    '/F1',
    '8',
    'Tf',
    '352',
    `${boxY - 76}`,
    'Td',
    `(${escapePdfText(`Status: ${payment}`)})`,
    'Tj',
    'ET',
  )

  // —— Notes ——
  push('0.15 0.18 0.22', 'rg')
  push('BT', '/F2', '9', 'Tf', '40', `${boxY - 20}`, 'Td', '(Notes)', 'Tj', 'ET')
  push('0.40 0.45 0.50', 'rg')
  const notes = [
    'Energy is metered from the charging session.',
    `GST ${gstPct}% included in the total.`,
    'This is a computer-generated invoice.',
  ]
  notes.forEach((line, i) => {
    push(
      'BT',
      '/F1',
      '8',
      'Tf',
      '40',
      `${boxY - 36 - i * 12}`,
      'Td',
      `(${escapePdfText(line)})`,
      'Tj',
      'ET',
    )
  })

  // —— Footer ——
  push('0.06 0.46 0.43', 'rg')
  push('0 0 612 48', 're', 'f')
  push('1 1 1', 'rg')
  push(
    'BT',
    '/F2',
    '10',
    'Tf',
    '40',
    '28',
    'Td',
    '(Thank you for charging with GridFleet)',
    'Tj',
    'ET',
  )
  push(
    'BT',
    '/F1',
    '8',
    'Tf',
    '40',
    '14',
    'Td',
    '(gridfleet · EV charging marketplace · support via in-app notifications)',
    'Tj',
    'ET',
  )

  return ops.join('\n')
}

function buildInvoicePdf(invoice) {
  const stream = buildContentStream(invoice || {})
  const objects = []

  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n')
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n')
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R /F2 6 0 R >> >> >>endobj\n',
  )
  objects.push(
    `4 0 obj<< /Length ${Buffer.byteLength(stream, 'utf8')} >>stream\n${stream}\nendstream\nendobj\n`,
  )
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n')
  objects.push('6 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n')

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += obj
  }

  const xrefPos = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  pdf += `startxref\n${xrefPos}\n%%EOF`

  return Buffer.from(pdf, 'utf8')
}

module.exports = { buildInvoicePdf }
