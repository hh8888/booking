/**
 * Format a date as YYYY-MM-DD in the browser's local timezone.
 * (toISOString() would give the UTC date, which is the previous day
 * for morning times in timezones ahead of UTC such as Sydney.)
 */
export default function toLocalDateString(value) {
  const d = value instanceof Date ? value : new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
