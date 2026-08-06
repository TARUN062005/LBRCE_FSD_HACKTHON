/**
 * Minimal PDF 1.4 generator (no external deps) for invoice download.
 */

function escapePdfText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function buildInvoicePdf(invoice) {
  const lines = [
    'GridFleet Invoice',
    `Invoice ID: ${invoice.invoiceId || invoice.id}`,
    `Period: ${invoice.period}`,
    `Status: ${invoice.status}`,
    `Customer: ${invoice.customerName || invoice.companyName || '—'}`,
    `Email: ${invoice.customerEmail || '—'}`,
    `Generated: ${invoice.generatedAt || invoice.createdAt || ''}`,
    '',
    'Line items:',
  ]

  for (const li of invoice.lineItems || []) {
    lines.push(
      `- ${li.chargerLabel || 'Charger'} | ${li.kWh} kWh @ $${li.tariffRate}/${li.tariffBand} = $${li.amount}`,
    )
  }

  lines.push('')
  lines.push(`Total energy: ${invoice.totalKwh} kWh`)
  lines.push(`Total amount: $${invoice.totalAmount ?? invoice.amount}`)
  lines.push('')
  lines.push('Thank you for charging with GridFleet.')

  const contentLines = lines.map((line, i) => {
    const y = 750 - i * 16
    return `BT /F1 11 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`
  })

  const stream = contentLines.join('\n')
  const objects = []

  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n')
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n')
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n',
  )
  objects.push(`4 0 obj<< /Length ${Buffer.byteLength(stream)} >>stream\n${stream}\nendstream\nendobj\n`)
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n')

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += obj
  }

  const xrefPos = Buffer.byteLength(pdf)
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
