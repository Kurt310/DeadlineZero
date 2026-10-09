export function formatLongDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDueLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${formatTime(d)}`;
}

export function timeRemainingLabel(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'overdue';
  const h = Math.floor(ms / 3600000);
  const days = Math.floor(h / 24);
  if (days >= 1) return `in ${days}d ${h % 24}h`;
  if (h >= 1) return `in ${h}h`;
  return `in ${Math.max(1, Math.round(ms / 60000))}m`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
