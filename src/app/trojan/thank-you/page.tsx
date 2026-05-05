import { getTrojanDinner } from "@/lib/trojan-dinner";
import { query } from "@/lib/db";
import { generateGoogleCalendarUrl, generateOutlookUrl } from "@/lib/calendar";
import { TrojanCoBrandHeader } from "@/components/trojan/TrojanCoBrandHeader";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { getBaseUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

interface InvitationDetails {
  id: number;
  guest_first_name: string;
  bring_item_slot: number | null;
}

export default async function TrojanThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; session_id?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  const dinner = await getTrojanDinner();

  if (!dinner) {
    return (
      <main>
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="heading-1 text-charcoal">Dinner Not Found</h1>
          <p className="body-lg mt-4 text-warm-gray">
            Unable to find dinner details.
          </p>
        </div>
        <Footer />
      </main>
    );
  }

  // Get invitation details if token provided
  let invitation: InvitationDetails | null = null;
  if (token) {
    const result = await query<InvitationDetails>(
      `SELECT i.id, g.first_name as guest_first_name, i.bring_item_slot
       FROM invitations i
       JOIN guests g ON g.id = i.guest_id
       WHERE i.token = $1`,
      [token]
    );
    invitation = result?.[0] || null;
  }

  const guestName = invitation?.guest_first_name || "there";

  // Format date for display
  const dinnerDate = new Date(dinner.dinner_date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const dinnerTime = dinner.dinner_time || "7:00 PM";

  // Get bring item assignment if any
  let bringItemName: string | null = null;
  if (invitation?.bring_item_slot && Array.isArray(dinner.bring_items)) {
    const item = dinner.bring_items.find(
      (i) => i.slot === invitation.bring_item_slot
    );
    bringItemName = item?.name || null;
  }

  // Generate calendar URLs
  const calendarDinner = {
    name: "Trojan Alumni Dinner",
    date:
      typeof dinner.dinner_date === "string"
        ? dinner.dinner_date
        : new Date(dinner.dinner_date).toISOString().split("T")[0],
    time: dinnerTime,
    hostName: "Con-Vive",
    address: dinner.address || "",
  };

  const googleCalendarUrl = generateGoogleCalendarUrl(calendarDinner);
  const outlookCalendarUrl = generateOutlookUrl(calendarDinner);
  const baseUrl = getBaseUrl();
  const icsDownloadUrl = token ? `${baseUrl}/api/calendar/${token}` : null;

  return (
    <main>
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-24">
        <TrojanCoBrandHeader />

        <div className="text-center">
          <h1 className="heading-1 text-charcoal">
            You&rsquo;re In, <span className="text-terracotta">{guestName}</span>!
          </h1>
          <p className="body-lg mt-4 text-warm-gray">
            Your spot at the Trojan Alumni dinner is confirmed.
          </p>
        </div>

        {/* Confirmation Details */}
        <div className="mt-12 bg-cream rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-charcoal mb-6">
            Dinner Details
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-warm-gray uppercase tracking-wide">
                Date & Time
              </p>
              <p className="text-charcoal font-medium mt-1">
                {dinnerDate} at {dinnerTime}
              </p>
            </div>

            {dinner.address && (
              <div>
                <p className="text-sm font-medium text-warm-gray uppercase tracking-wide">
                  Address
                </p>
                <p className="text-charcoal font-medium mt-1">{dinner.address}</p>
                {dinner.google_maps_link && (
                  <a
                    href={dinner.google_maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-terracotta hover:underline"
                  >
                    View on Google Maps
                  </a>
                )}
              </div>
            )}

            {dinner.parking_instructions && (
              <div>
                <p className="text-sm font-medium text-warm-gray uppercase tracking-wide">
                  Parking
                </p>
                <p className="text-charcoal mt-1">{dinner.parking_instructions}</p>
              </div>
            )}

            {bringItemName && (
              <div>
                <p className="text-sm font-medium text-warm-gray uppercase tracking-wide">
                  You&rsquo;re Bringing
                </p>
                <p className="text-terracotta font-medium mt-1">{bringItemName}</p>
              </div>
            )}
          </div>

          {/* Calendar Links */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm font-medium text-warm-gray uppercase tracking-wide mb-4">
              Add to Calendar
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-charcoal hover:bg-white transition-colors"
              >
                Google Calendar
              </a>
              <a
                href={outlookCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-charcoal hover:bg-white transition-colors"
              >
                Outlook
              </a>
              {icsDownloadUrl && (
                <a
                  href={icsDownloadUrl}
                  className="inline-flex items-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-charcoal hover:bg-white transition-colors"
                >
                  Download .ics
                </a>
              )}
            </div>
          </div>
        </div>

        {/* What to Expect */}
        <div className="mt-8 text-center">
          <p className="body-base text-warm-gray">
            You&rsquo;ll receive a confirmation email with all the details shortly.
            <br />
            Questions? Email{" "}
            <a
              href="mailto:joe@con-vive.com"
              className="text-terracotta hover:underline"
            >
              joe@con-vive.com
            </a>{" "}
            or text Joe at (760) 274-8830.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
