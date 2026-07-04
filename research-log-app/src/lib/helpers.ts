export function parseDate(d: string): Date {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(y, m - 1, dd);
}

export function fullDate(d: string): string {
  return parseDate(d).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function monthLabel(mk: string): string {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function weekday(d: string): string {
  return parseDate(d).toLocaleDateString('en-GB', { weekday: 'long' });
}

export function dayNum(d: string): string {
  return String(Number(d.slice(8, 10)));
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderMd(str: string): string {
  let h = esc(str);
  h = h.replace(/`([^`]+)`/g, '<code style="font-family:\'JetBrains Mono\',monospace;font-size:0.86em;background:#F1F1F4;padding:1px 5px;border-radius:5px;color:#4338CA;">$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight:600;color:#111827;">$1</strong>');
  h = h.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#4F46E5;text-decoration:underline;">$1</a>');
  h = h.replace(/\n/g, '<br>');
  return h;
}

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function genRef(): string {
  return 'REF-' + LETTERS[Math.floor(Math.random() * LETTERS.length)] + String(Math.floor(Math.random() * 900) + 100);
}

export function genProjectRef(): string {
  return (
    'PRJ-' +
    LETTERS[Math.floor(Math.random() * LETTERS.length)] +
    LETTERS[Math.floor(Math.random() * LETTERS.length)] +
    String(Math.floor(Math.random() * 90) + 10)
  );
}

export function todayISO(): string {
  const now = new Date();
  return (
    now.getFullYear() +
    '-' +
    String(now.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(now.getDate()).padStart(2, '0')
  );
}

export function currentTime(): string {
  const now = new Date();
  return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}

export function editStamp(date: string, time: string): string {
  return time + ' · ' + parseDate(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function projectInitial(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w[0].toUpperCase())
      .slice(0, 2)
      .join('') || name[0]?.toUpperCase() || '?'
  );
}
