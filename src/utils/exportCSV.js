import { calculateYearData } from './calculations'
import { formatNumber } from './formatters'

/**
 * Export a year's data as a CSV file
 */
export function exportYearCSV(person, yearData) {
  const { openingBalance, annualRate, contributions, year } = yearData
  const calc = calculateYearData(openingBalance, annualRate, contributions)

  const rows = []

  // Header info
  rows.push([`EPF Dividend Calculator`])
  rows.push([`Profile: ${person.name}`])
  rows.push([`Year: ${year}`])
  rows.push([`Annual Dividend Rate: ${annualRate}%`])
  rows.push([`Opening Balance: RM ${formatNumber(openingBalance)}`])
  rows.push([`Generated: ${new Date().toLocaleDateString('en-MY')}`])
  rows.push([])

  // Table header
  rows.push(['Month', 'Opening Balance (RM)', 'Contribution (RM)', 'Dividend (RM)', 'Closing Balance (RM)'])

  // Monthly data
  calc.monthData.forEach(m => {
    rows.push([
      m.monthName,
      formatNumber(m.openingBalance),
      formatNumber(m.contribution),
      formatNumber(m.dividend),
      formatNumber(m.closingBalance),
    ])
  })

  rows.push([])

  // Summary
  rows.push(['--- Summary ---'])
  rows.push(['Total Contributions', `RM ${formatNumber(calc.totalContributions)}`])
  rows.push(['Total Annual Dividend', `RM ${formatNumber(calc.totalDividend)}`])
  rows.push(['Year Closing Balance', `RM ${formatNumber(calc.yearClosingBalance)}`])
  rows.push(['Average Monthly Balance', `RM ${formatNumber(calc.avgBalance)}`])
  rows.push(['Effective Return', `${calc.effectiveReturn}%`])
  rows.push(['Monthly Rate Used', `${(annualRate / 12).toFixed(6)}%`])

  const csvContent = rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  downloadFile(
    csvContent,
    `EPF_${person.name.replace(/\s+/g, '_')}_${year}.csv`,
    'text/csv;charset=utf-8;'
  )
}

/**
 * Export all years for a person as a summary CSV
 */
export function exportAllYearsCSV(person) {
  const rows = []

  rows.push([`EPF Dividend Calculator - All Years Summary`])
  rows.push([`Profile: ${person.name}`])
  rows.push([`Generated: ${new Date().toLocaleDateString('en-MY')}`])
  rows.push([])
  rows.push(['Year', 'Rate (%)', 'Opening Balance (RM)', 'Total Contributions (RM)', 'Total Dividend (RM)', 'Closing Balance (RM)', 'Effective Return (%)'])

  person.years.forEach(y => {
    const calc = calculateYearData(y.openingBalance, y.annualRate, y.contributions)
    rows.push([
      y.year,
      y.annualRate,
      formatNumber(y.openingBalance),
      formatNumber(calc.totalContributions),
      formatNumber(calc.totalDividend),
      formatNumber(calc.yearClosingBalance),
      calc.effectiveReturn,
    ])
  })

  const csvContent = rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  downloadFile(
    csvContent,
    `EPF_${person.name.replace(/\s+/g, '_')}_AllYears.csv`,
    'text/csv;charset=utf-8;'
  )
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob(['\ufeff' + content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
