export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = String(dateStr).split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(timeStr) {
  if (!timeStr) return '—';
  const parts = String(timeStr).split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function toTimeInput(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  return `${String(parts[0]).padStart(2, '0')}:${String(parts[1] ?? '00').padStart(2, '0')}`;
}

export function toApiTime(timeStr) {
  if (!timeStr) return null;
  const parts = String(timeStr).trim().split(':');
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  }
  return timeStr;
}

export function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function extractErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  if (err.friendlyMessage) return err.friendlyMessage;
  const data = err.response?.data;
  if (data) {
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.errors && typeof data.errors === 'object') {
      const firstKey = Object.keys(data.errors)[0];
      if (firstKey && Array.isArray(data.errors[firstKey]) && data.errors[firstKey].length > 0) {
        return data.errors[firstKey][0];
      }
    }
    if (data.title) return data.title;
  }
  return err.message || fallback;
}

