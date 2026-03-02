export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

/**
 * EPF Monthly Rest Dividend Calculation
 *
 * Rules:
 * - Each month's dividend = opening balance for that month × (annual rate / 12 / 100)
 * - A month's contribution does NOT affect the same month's dividend
 * - Contribution in month M counts as opening balance for month M+1
 * - January opening balance = the year's opening balance
 * - Total dividend is credited at year-end
 * - Year closing balance = December closing balance (before dividend) + total annual dividend
 *
 * @param {number} openingBalance - Balance at start of year
 * @param {number} annualRate     - Annual dividend rate in % (e.g. 5.50)
 * @param {object} contributions  - { 1: num, 2: num, ..., 12: num }
 * @returns {object} Calculated year data
 */
export function calculateYearData(openingBalance, annualRate, contributions) {
  const ob = Math.max(0, parseFloat(openingBalance) || 0)
  const rate = Math.max(0, parseFloat(annualRate) || 0)
  const monthlyRate = rate / 100 / 12

  const monthData = []
  let prevBalance = ob

  for (let m = 1; m <= 12; m++) {
    const openBal = round2(prevBalance)
    const contribution = round2(Math.max(0, parseFloat(contributions?.[m]) || 0))

    // Dividend is based on opening balance only (contribution this month doesn't count)
    const dividend = round2(openBal * monthlyRate)

    // Month-end balance (before year-end dividend credit)
    const closeBal = round2(openBal + contribution)

    monthData.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      monthNameShort: MONTH_NAMES_SHORT[m - 1],
      openingBalance: openBal,
      contribution,
      dividend,
      closingBalance: closeBal,
    })

    prevBalance = closeBal
  }

  // Sum dividends without intermediate rounding to reduce accumulation error
  const totalDividendRaw = monthData.reduce((sum, m) => sum + m.dividend, 0)
  const totalDividend = round2(totalDividendRaw)
  const totalContributions = round2(monthData.reduce((sum, m) => sum + m.contribution, 0))

  // Year closing balance = December month-end balance + total annual dividend
  const yearClosingBalance = round2(prevBalance + totalDividend)

  const avgBalance = round2(monthData.reduce((sum, m) => sum + m.openingBalance, 0) / 12)
  const effectiveReturn = ob > 0 ? round4((totalDividend / ob) * 100) : 0

  return {
    monthData,
    totalDividend,
    totalContributions,
    yearClosingBalance,
    avgBalance,
    effectiveReturn,
  }
}

/**
 * Calculate the same year data across multiple rate scenarios
 */
export function calculateScenarios(openingBalance, contributions, rates = [5.50, 6.00, 6.30]) {
  return rates.map(rate => ({
    rate,
    ...calculateYearData(openingBalance, rate, contributions),
  }))
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function round4(n) {
  return Math.round((n + Number.EPSILON) * 10000) / 10000
}
