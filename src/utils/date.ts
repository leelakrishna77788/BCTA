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
