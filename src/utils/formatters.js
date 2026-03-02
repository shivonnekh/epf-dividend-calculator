/**
 * Format a number as Malaysian Ringgit
 * e.g. 12345.6 → "RM 12,345.60"
 */
export function formatRM(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'RM 0.00'
  const num = parseFloat(amount)
  return `RM ${num.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Format as plain number with 2 decimal places
 */
export function formatNumber(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0.00'
  return parseFloat(amount).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Format as percentage
 */
export function formatPercent(value, decimals = 2) {
  if (isNaN(value)) return '0.00%'
  return `${parseFloat(value).toFixed(decimals)}%`
}

/**
 * Parse a string/number to a safe float, defaulting to 0
 */
export function safeFloat(value, fallback = 0) {
  const n = parseFloat(value)
  return isNaN(n) ? fallback : n
}
