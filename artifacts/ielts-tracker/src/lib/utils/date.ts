const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '–';
  try {
    const parts = d.split('-');
    if (parts.length < 3) return d;
    const [y, m, day] = parts.map(Number);
    return `${MONTHS[m - 1]} ${day}, ${y}`;
  } catch { return d; }
}

export function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  try {
    const parts = d.split('-');
    if (parts.length < 3) return null;
    const [y, m, day] = parts.map(Number);
    const target = new Date(y, m - 1, day);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / 86400000);
  } catch { return null; }
}

export function daysUntilLabel(d: string | null | undefined): { text: string; urgent: boolean } {
  const days = daysUntil(d);
  if (days === null) return { text: '–', urgent: false };
  if (days < 0) return { text: 'Past', urgent: false };
  if (days === 0) return { text: 'Today!', urgent: true };
  if (days <= 7) return { text: `${days}d left`, urgent: true };
  if (days <= 30) return { text: `${days}d left`, urgent: false };
  return { text: `${days}d`, urgent: false };
}
