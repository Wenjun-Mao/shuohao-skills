// Plotloom-owned report display helper, 2026-10-09. Raw parameters stay unchanged.
/** Format minute-valued targets at millisecond display precision, not as repetends. */
export function formatReportDuration(minutes, lang) {
  const milliseconds = Math.round(minutes * 60_000);
  const wholeMinutes = Math.floor(milliseconds / 60_000);
  const seconds = (milliseconds % 60_000) / 1_000;
  const parts = [];
  if (wholeMinutes) parts.push(lang === 'en' ? `${wholeMinutes} min` : `${wholeMinutes} 分钟`);
  if (seconds || !wholeMinutes) parts.push(lang === 'en' ? `${seconds} s` : `${seconds} 秒`);
  return parts.join(' ');
}
