// booking.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('bookingForm');

  form.addEventListener('submit', (e) => {
    const data = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      date: document.getElementById('date').value,
      time: document.getElementById('time').value,
      from: document.getElementById('from_address').value,
      to: document.getElementById('to_address').value,
      service: document.getElementById('service').value,
      notes: document.getElementById('notes').value,
    };
    localStorage.setItem('metrohaul_last_booking', JSON.stringify(data));
    // allow the form to submit to FormSubmit.co which redirects to index.html?sent=1
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('sent') === '1') {
    const raw = localStorage.getItem('metrohaul_last_booking');
    if (raw) {
      const booking = JSON.parse(raw);
      showPostSubmit(booking);
      localStorage.removeItem('metrohaul_last_booking');
    } else {
      document.getElementById('postSubmit').style.display = 'block';
      document.getElementById('bookSummary').textContent = 'We received your booking request — check your email for details.';
    }
  }
});

function showPostSubmit(booking) {
  const post = document.getElementById('postSubmit');
  post.style.display = 'block';
  const summary = `${booking.name} — ${booking.service} on ${booking.date} at ${booking.time}. From: ${booking.from || 'N/A'} — To: ${booking.to || 'N/A'}. Phone: ${booking.phone} • Email: ${booking.email}`;
  document.getElementById('bookSummary').textContent = summary;

  const gLink = createGoogleCalLink(booking);
  document.getElementById('googleCalLink').href = gLink;

  const icsBlobUrl = createICS(booking);
  const downloadA = document.getElementById('downloadIcs');
  downloadA.href = icsBlobUrl;
  downloadA.download = `MetroHaul-${booking.date}-${booking.time}.ics`;
}

function createGoogleCalLink(b) {
  const start = localDateTimeToUTCString(b.date, b.time);
  const end = addHoursToUTCString(start, 2);
  const text = encodeURIComponent(`Move: ${b.service} — ${b.name}`);
  const details = encodeURIComponent(`Phone: ${b.phone}\nEmail: ${b.email}\nFrom: ${b.from}\nTo: ${b.to}\nNotes: ${b.notes}`);
  const location = encodeURIComponent(`${b.from || ''}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}&dates=${start}/${end}`;
}
function localDateTimeToUTCString(dateStr, timeStr) {
  const [y,m,d] = dateStr.split('-').map(Number);
  const [hh,mm] = (timeStr || '09:00').split(':').map(Number);
  const dt = new Date(y, m-1, d, hh, mm, 0);
  return formatDateToICS(dt);
}
function addHoursToUTCString(utcStr, hours) {
  const year = Number(utcStr.slice(0,4));
  const month = Number(utcStr.slice(4,6)) - 1;
  const day = Number(utcStr.slice(6,8));
  const hour = Number(utcStr.slice(9,11));
  const minute = Number(utcStr.slice(11,13));
  const sec = Number(utcStr.slice(13,15));
  const dt = new Date(Date.UTC(year, month, day, hour, minute, sec));
  dt.setHours(dt.getHours() + hours);
  return formatDateToICS(dt);
}
function pad(n){ return n.toString().padStart(2,'0'); }
function formatDateToICS(dateObj) {
  const yyyy = dateObj.getUTCFullYear();
  const mm = pad(dateObj.getUTCMonth()+1);
  const dd = pad(dateObj.getUTCDate());
  const hh = pad(dateObj.getUTCHours());
  const min = pad(dateObj.getUTCMinutes());
  const ss = pad(dateObj.getUTCSeconds());
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}
function createICS(b) {
  const startUTC = localDateTimeToUTCString(b.date, b.time);
  const endUTC = addHoursToUTCString(startUTC, 2);
  const uid = 'metrohaul-' + Date.now();
  const dtstamp = formatDateToICS(new Date());
  const summary = `Move: ${b.service} — ${b.name}`;
  const description = `Phone: ${b.phone}\\nEmail: ${b.email}\\nFrom: ${b.from}\\nTo: ${b.to}\\nNotes: ${b.notes}`;
  const location = b.from || '';
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MetroHaul Movers//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${startUTC}`,
    `DTEND:${endUTC}`,
    `SUMMARY:${escapeICSText(summary)}`,
    `DESCRIPTION:${escapeICSText(description)}`,
    `LOCATION:${escapeICSText(location)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar' });
  return URL.createObjectURL(blob);
}
function escapeICSText(s){ return (s||'').replace(/\n/g,'\\n').replace(/,/g,'\\,'); }