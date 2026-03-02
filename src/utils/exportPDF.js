import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { calculateYearData } from './calculations'
import { formatNumber } from './formatters'

const BLUE = [37, 99, 235]
const GREEN = [16, 185, 129]
const GRAY = [107, 114, 128]
const DARK = [17, 24, 39]
const LIGHT_BLUE = [239, 246, 255]
const LIGHT_GREEN = [236, 253, 245]

/**
 * Export a single year's report as PDF
 */
export function exportYearPDF(person, yearData) {
  const { openingBalance, annualRate, contributions, year } = yearData
  const calc = calculateYearData(openingBalance, annualRate, contributions)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.setFont(undefined, 'bold')
  doc.text('EPF Dividend Calculator', 14, 12)

  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text('Malaysia KWSP — Monthly Rest Method', 14, 20)

  // Right side: date
  doc.setFontSize(9)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-MY')}`, pageW - 14, 20, { align: 'right' })

  // ── Sub-header ───────────────────────────────────────────────────────────────
  let y = 36

  doc.setFontSize(14)
  doc.setTextColor(...DARK)
  doc.setFont(undefined, 'bold')
  doc.text(`${person.name}  —  Year ${year}`, 14, y)

  y += 8
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.setFont(undefined, 'normal')
  doc.text(
    `Annual Dividend Rate: ${annualRate}%   |   Monthly Rate: ${(annualRate / 12).toFixed(6)}%   |   Opening Balance: RM ${formatNumber(openingBalance)}`,
    14, y
  )

  // ── Summary boxes ────────────────────────────────────────────────────────────
  y += 8
  const boxW = (pageW - 28 - 6) / 4
  const boxes = [
    { label: 'Opening Balance', value: `RM ${formatNumber(openingBalance)}`, color: BLUE },
    { label: 'Total Contributions', value: `RM ${formatNumber(calc.totalContributions)}`, color: [100, 116, 139] },
    { label: 'Total Dividend', value: `RM ${formatNumber(calc.totalDividend)}`, color: GREEN },
    { label: 'Closing Balance', value: `RM ${formatNumber(calc.yearClosingBalance)}`, color: BLUE },
  ]

  boxes.forEach((box, i) => {
    const x = 14 + i * (boxW + 2)
    doc.setFillColor(box.color[0], box.color[1], box.color[2])
    doc.roundedRect(x, y, boxW, 14, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    doc.setFont(undefined, 'normal')
    doc.text(box.label, x + boxW / 2, y + 4, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text(box.value, x + boxW / 2, y + 10, { align: 'center' })
  })

  y += 20

  // ── Monthly Table ────────────────────────────────────────────────────────────
  doc.setFontSize(11)
  doc.setTextColor(...DARK)
  doc.setFont(undefined, 'bold')
  doc.text('Monthly Breakdown', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Month', 'Opening Balance (RM)', 'Contribution (RM)', 'Dividend (RM)', 'Closing Balance (RM)']],
    body: calc.monthData.map(m => [
      m.monthName,
      formatNumber(m.openingBalance),
      formatNumber(m.contribution),
      formatNumber(m.dividend),
      formatNumber(m.closingBalance),
    ]),
    foot: [[
      'TOTAL',
      '',
      formatNumber(calc.totalContributions),
      formatNumber(calc.totalDividend),
      formatNumber(calc.yearClosingBalance),
    ]],
    headStyles: {
      fillColor: BLUE,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'right',
    },
    columnStyles: {
      0: { halign: 'left' },
    },
    bodyStyles: { fontSize: 8, halign: 'right' },
    alternateRowStyles: { fillColor: LIGHT_BLUE },
    footStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'right',
    },
    margin: { left: 14, right: 14 },
  })

  const finalY = doc.lastAutoTable.finalY + 8

  // ── Stats table ───────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: finalY,
    head: [['Statistic', 'Value']],
    body: [
      ['Average Monthly Balance', `RM ${formatNumber(calc.avgBalance)}`],
      ['Effective Annual Return', `${calc.effectiveReturn}%`],
      ['Monthly Rate Applied', `${(annualRate / 12).toFixed(6)}%`],
      ['Dividend Calculation Method', 'Monthly Rest (KWSP)'],
    ],
    headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT_GREEN },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    tableWidth: 100,
  })

  // ── Footer ────────────────────────────────────────────────────────────────────
  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.setFont(undefined, 'normal')
    doc.text('EPF Dividend Calculator — For reference only. Not official KWSP figures.', 14, 290)
    doc.text(`Page ${i} of ${pages}`, pageW - 14, 290, { align: 'right' })
  }

  doc.save(`EPF_${person.name.replace(/\s+/g, '_')}_${year}.pdf`)
}
