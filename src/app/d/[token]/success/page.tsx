"use client";

import { useEffect, useState, use } from "react";

interface BringItem {
  slot: number;
  name: string;
  claimed_by_guest_id: number | null;
  claimed_by_name: string | null;
}

interface BookingData {
  invitation: {
    id: number;
    status: string;
    bring_item_slot: number | null;
    booked_at: string | null;
  };
  dinner: {
    id: number;
    name: string;
    date: string;
    time: string;
    price_cents: number;
    address: string | null;
    google_maps_link: string | null;
    parking_instructions: string | null;
    what_to_bring: string | null;
    host_name: string;
    bring_items: BringItem[];
    menu: string | null;
  };
  guest: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    gender: string | null;
  };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function BookingSuccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/booking/${token}`);
        if (!response.ok) {
          setError("error");
          return;
        }
        const result = await response.json();
        setData(result);
      } catch {
        setError("error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="body-lg text-warm-gray">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mx-auto max-w-lg">
          <h1 className="heading-1 text-charcoal">Something Went Wrong</h1>
          <p className="body-lg mt-6 text-warm-gray">
            We couldn&rsquo;t load your booking details. Check your email for
            confirmation.
          </p>
          <p className="body-base mt-6 text-charcoal">
            Questions? Text Joe at{" "}
            <a href="sms:+17602748830" className="text-terracotta underline">
              (760) 274-8830
            </a>
          </p>
        </div>
      </div>
    );
  }

  const { dinner, guest, invitation } = data;

  // Find bring item assignment
  let bringItemName: string | null = null;
  if (invitation.bring_item_slot && dinner.bring_items) {
    const item = dinner.bring_items.find(
      (i) => i.slot === invitation.bring_item_slot
    );
    bringItemName = item?.name || null;
  }

  // Generate calendar URLs
  const calendarParams = new URLSearchParams({
    action: "TEMPLATE",
    text: `Con-Vive Dinner at ${dinner.host_name}'s`,
    dates: buildGoogleCalendarDates(dinner.date, dinner.time),
    details: `You're attending a Con-Vive dinner hosted by ${dinner.host_name}.\n\nAddress: ${dinner.address}\n\nQuestions? Text Joe at (760) 274-8830`,
    location: dinner.address || "",
  });
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?${calendarParams.toString()}`;

  return (
    <div className="flex min-h-screen flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-lg">
        {/* Success Header */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="heading-1 text-charcoal">
            You&rsquo;re In, {guest.first_name}!
          </h1>
          <p className="body-lg mt-4 text-warm-gray">
            Your spot at {dinner.host_name}&rsquo;s dinner is confirmed.
          </p>
        </div>

        {/* Dinner Details Card */}
        <div className="mt-8 rounded-xl border border-border bg-white p-6">
          <div className="space-y-4">
            <div>
              <p className="body-sm font-medium uppercase tracking-wide text-warm-gray">
                Date
              </p>
              <p className="heading-2 mt-1 text-charcoal">
                {formatDate(dinner.date)}
              </p>
            </div>
            <div>
              <p className="body-sm font-medium uppercase tracking-wide text-warm-gray">
                Time
              </p>
              <p className="body-base mt-1 text-charcoal">{dinner.time}</p>
            </div>
            {dinner.address && (
              <div>
                <p className="body-sm font-medium uppercase tracking-wide text-warm-gray">
                  Location
                </p>
                <p className="body-base mt-1 text-charcoal">{dinner.address}</p>
                {dinner.google_maps_link && (
                  <a
                    href={dinner.google_maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="body-sm mt-1 inline-block text-terracotta underline"
                  >
                    View on Google Maps
                  </a>
                )}
              </div>
            )}
            {dinner.parking_instructions && (
              <div>
                <p className="body-sm font-medium uppercase tracking-wide text-warm-gray">
                  Parking
                </p>
                <p className="body-base mt-1 text-charcoal">
                  {dinner.parking_instructions}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bring Item Assignment */}
        {bringItemName && (
          <div className="mt-6 rounded-xl border-2 border-terracotta bg-terracotta/5 p-6">
            <p className="body-sm font-medium uppercase tracking-wide text-terracotta">
              You&rsquo;re Bringing
            </p>
            <p className="heading-2 mt-1 text-charcoal">{bringItemName}</p>
          </div>
        )}

        {/* What to Bring */}
        {dinner.what_to_bring && (
          <div className="mt-6 rounded-xl border border-border bg-white p-6">
            <p className="body-sm font-medium uppercase tracking-wide text-warm-gray">
              What to Bring
            </p>
            <p className="body-base mt-2 text-charcoal">
              {dinner.what_to_bring}
            </p>
          </div>
        )}

        {/* Calendar Buttons */}
        <div className="mt-8">
          <p className="body-sm mb-3 text-center font-medium uppercase tracking-wide text-warm-gray">
            Add to Calendar
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-charcoal transition-colors hover:bg-cream/50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V8.25h15v11.25zM4.5 6.75V4.5h15v2.25h-15zm6 4.5H9v1.5h1.5v-1.5zm3 0h-1.5v1.5H15v-1.5zm3 0h-1.5v1.5H18v-1.5zm-6 3H9v1.5h1.5v-1.5zm3 0h-1.5v1.5H15v-1.5zm3 0h-1.5v1.5H18v-1.5z" />
              </svg>
              Google
            </a>
            <a
              href={`/api/calendar/${token}`}
              download
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-charcoal transition-colors hover:bg-cream/50"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download .ics
            </a>
          </div>
        </div>

        {/* Confirmation Email Notice */}
        <div className="mt-8 rounded-xl bg-cream/50 p-6 text-center">
          <p className="body-base text-charcoal">
            We&rsquo;ve sent a confirmation email to{" "}
            <span className="font-medium">{guest.email}</span> with all the
            details.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="body-sm text-warm-gray">
            Questions? Text Joe at{" "}
            <a href="sms:+17602748830" className="text-terracotta underline">
              (760) 274-8830
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function buildGoogleCalendarDates(date: string, time: string): string {
  // Handle both ISO strings and date-only strings
  const dateOnly = date.split("T")[0];
  const dateObj = new Date(dateOnly + "T00:00:00Z");

  // Parse time (e.g., "7:00 PM")
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

  const endObj = new Date(dateObj.getTime() + 3 * 60 * 60 * 1000);

  const format = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  return `${format(dateObj)}/${format(endObj)}`;
}
