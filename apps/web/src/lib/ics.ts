// Minimal iCalendar (.ics) generator for "add to calendar" — client-side only.

const pad = (n: number) => String(n).padStart(2, "0");

const icsUtc = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
  `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

const esc = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

export function buildIcs(event: {
  id: string;
  title: string;
  description?: string;
  start: Date;
  durationMin: number;
  url?: string;
}): string {
  const end = new Date(event.start.getTime() + event.durationMin * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IBILIM//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@ustoz.uz`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(event.start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${esc(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${esc(event.description)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Triggers a browser download of the given .ics content. */
export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
