interface CalendarDinner {
  name: string;
  date: string;
  time: string;
  hostName: string;
  address: string;
}

function parseDateTime(date: string, time: string): Date {
  // Parse date (YYYY-MM-DD or ISO string) and time (e.g., "7:00 PM")
  const dateOnly = date.split("T")[0];
  const dateObj = new Date(dateOnly + "T00:00:00Z");

  // Parse time
  const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3]?.toUpperCase();

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    dateObj.setUTCHours(hours, minutes, 0, 0);
  }

  return dateObj;
}

function formatDateTimeForICS(date: Date): string {
  // Format: YYYYMMDDTHHMMSSZ
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function formatDateTimeForGoogle(date: Date): string {
  // Format: YYYYMMDDTHHMMSSZ
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function generateGoogleCalendarUrl(dinner: CalendarDinner): string {
  const start = parseDateTime(dinner.date, dinner.time);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // 3 hours later

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Con-Vive Dinner at ${dinner.hostName}'s`,
    dates: `${formatDateTimeForGoogle(start)}/${formatDateTimeForGoogle(end)}`,
    details: `You're attending a Con-Vive dinner hosted by ${dinner.hostName}.\n\nAddress: ${dinner.address}\n\nQuestions? Text Joe at (760) 274-8830`,
    location: dinner.address,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateOutlookUrl(dinner: CalendarDinner): string {
  const start = parseDateTime(dinner.date, dinner.time);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // 3 hours later

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: `Con-Vive Dinner at ${dinner.hostName}'s`,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: `You're attending a Con-Vive dinner hosted by ${dinner.hostName}.\n\nAddress: ${dinner.address}\n\nQuestions? Text Joe at (760) 274-8830`,
    location: dinner.address,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function generateICSContent(dinner: CalendarDinner): string {
  const start = parseDateTime(dinner.date, dinner.time);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // 3 hours later
  const now = new Date();

  // Escape special characters for ICS
  const escapeICS = (str: string) =>
    str.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");

  const uid = `${start.getTime()}-${Math.random().toString(36).substring(2, 9)}@con-vive.com`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Con-Vive//Dinner Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDateTimeForICS(now)}`,
    `DTSTART:${formatDateTimeForICS(start)}`,
    `DTEND:${formatDateTimeForICS(end)}`,
    `SUMMARY:${escapeICS(`Con-Vive Dinner at ${dinner.hostName}'s`)}`,
    `DESCRIPTION:${escapeICS(`You're attending a Con-Vive dinner hosted by ${dinner.hostName}.\\n\\nAddress: ${dinner.address}\\n\\nQuestions? Text Joe at (760) 274-8830`)}`,
    `LOCATION:${escapeICS(dinner.address)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
