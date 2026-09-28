export function formatAttendanceDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  } catch (e) {
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }
}

export function formatAttendanceTime(d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
  } catch (e) {
    const hh = d.getHours();
    const mm = String(d.getMinutes()).padStart(2, '0');
    const hour12 = hh % 12 === 0 ? 12 : hh % 12;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    return `${String(hour12).padStart(2,'0')}:${mm} ${ampm}`;
  }
}

/** Coerce a Firestore Timestamp / Date / ISO string into a Date, or null. */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Human readable date + time for a Firestore Timestamp / Date / ISO string. */
export function formatDateTime(value: unknown): string {
  const d = toDate(value);
  if (!d) return '—';
  return `${formatAttendanceDate(d)}, ${formatAttendanceTime(d)}`;
}

/** Human readable date only. */
export function formatDateOnly(value: unknown): string {
  const d = toDate(value);
  return d ? formatAttendanceDate(d) : '—';
}
