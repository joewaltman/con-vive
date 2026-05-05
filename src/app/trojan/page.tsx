import { getTrojanDinner, getTrojanRemainingSeats } from "@/lib/trojan-dinner";
import { TrojanCoBrandHeader } from "@/components/trojan/TrojanCoBrandHeader";
import { TrojanSignupFormWrapper } from "@/components/trojan/TrojanSignupFormWrapper";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";

export const dynamic = "force-dynamic";

export default async function TrojanPage() {
  const dinner = await getTrojanDinner();

  if (!dinner) {
    return (
      <main>
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="heading-1 text-charcoal">Dinner Not Found</h1>
          <p className="body-lg mt-4 text-warm-gray">
            The Trojan Alumni dinner is not currently available.
          </p>
        </div>
        <Footer />
      </main>
    );
  }

  const remainingSeats = await getTrojanRemainingSeats(dinner.id);
  const isWaitlistMode = remainingSeats <= 0;

  // Format date for display
  const dinnerDate = new Date(dinner.dinner_date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const dinnerTime = dinner.dinner_time || "7:00 PM";
  const priceDisplay = (dinner.price_cents / 100).toFixed(0);

  // Parse bring_items
  const bringItems = Array.isArray(dinner.bring_items) ? dinner.bring_items : [];

  return (
    <main>
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-24">
        <TrojanCoBrandHeader />

        <h1 className="heading-1 text-center text-charcoal">
          Trojan Alumni Dinner
        </h1>
        <p className="body-lg mt-4 text-center text-warm-gray">
          Join fellow USC alumni for an evening of great food and conversation.
        </p>

        {/* Dinner Details Card */}
        <div className="mt-8 bg-cream rounded-2xl p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-warm-gray uppercase tracking-wide">
                Date
              </p>
              <p className="text-charcoal font-medium mt-1">{dinnerDate}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-warm-gray uppercase tracking-wide">
                Time
              </p>
              <p className="text-charcoal font-medium mt-1">{dinnerTime}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-warm-gray uppercase tracking-wide">
                Location
              </p>
              <p className="text-charcoal font-medium mt-1">Encinitas, CA</p>
              <p className="text-sm text-warm-gray">
                Full address provided after booking
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-warm-gray uppercase tracking-wide">
                Price
              </p>
              <p className="text-charcoal font-medium mt-1">${priceDisplay}</p>
              <p className="text-sm text-warm-gray">per person</p>
            </div>
          </div>

          {dinner.menu && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm font-medium text-warm-gray uppercase tracking-wide">
                Menu
              </p>
              <p className="text-charcoal mt-2 whitespace-pre-wrap">
                {dinner.menu}
              </p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border">
            {isWaitlistMode ? (
              <div className="text-center">
                <p className="text-terracotta font-semibold">
                  This dinner is fully booked
                </p>
                <p className="text-sm text-warm-gray mt-1">
                  Join the waitlist below and we&rsquo;ll reach out if a spot opens up.
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-terracotta font-semibold">
                  {remainingSeats} {remainingSeats === 1 ? "seat" : "seats"} remaining
                </p>
                <p className="text-sm text-warm-gray mt-1">First come, first served</p>
              </div>
            )}
          </div>
        </div>

        {/* Signup Form */}
        <div className="mt-12">
          <h2 className="heading-2 text-center text-charcoal mb-8">
            {isWaitlistMode ? "Join the Waitlist" : "Reserve Your Spot"}
          </h2>
          <TrojanSignupFormWrapper
            bringItems={bringItems}
            isWaitlistMode={isWaitlistMode}
          />

        </div>
      </div>
      <Footer />
    </main>
  );
}
