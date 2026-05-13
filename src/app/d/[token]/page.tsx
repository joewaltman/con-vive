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
    venue_type: string;
    restaurant_name: string | null;
  };
  guest: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    gender: string | null;
  };
  genderCounts: {
    male: number;
    female: number;
    other: number;
  };
  canBook: boolean;
  blockReason: string | null;
  dinnerAllowsCouples: boolean;
  couplePrice: number;
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

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function BookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [settingGender, setSettingGender] = useState(false);
  const [selectedBringSlot, setSelectedBringSlot] = useState<number | null>(
    null
  );
  const [isCoupleBooking, setIsCoupleBooking] = useState(false);
  const [companionFirstName, setCompanionFirstName] = useState("");
  const [companionLastName, setCompanionLastName] = useState("");
  const [companionEmail, setCompanionEmail] = useState("");
  const [companionGender, setCompanionGender] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/booking/${token}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("invalid");
          } else {
            setError("error");
          }
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

  async function handleSetGender() {
    if (!selectedGender || settingGender) return;
    setSettingGender(true);

    try {
      const response = await fetch(`/api/booking/${token}/set-gender`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender: selectedGender }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || "Failed to set gender");
        return;
      }

      // Refresh data
      const refreshResponse = await fetch(`/api/booking/${token}`);
      if (refreshResponse.ok) {
        setData(await refreshResponse.json());
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setSettingGender(false);
    }
  }

  async function handleCheckout() {
    if (checkingOut) return;
    setCheckingOut(true);

    try {
      const requestBody: Record<string, unknown> = {
        bring_item_slot: selectedBringSlot,
      };

      if (isCoupleBooking) {
        requestBody.is_couple_booking = true;
        if (companionFirstName) requestBody.companion_first_name = companionFirstName;
        if (companionLastName) requestBody.companion_last_name = companionLastName;
        if (companionEmail) requestBody.companion_email = companionEmail;
        if (companionGender) requestBody.companion_gender = companionGender;
      }

      const response = await fetch(`/api/booking/${token}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Failed to start checkout");
        setCheckingOut(false);
        return;
      }

      // Redirect to Stripe checkout
      if (result.url) {
        window.location.href = result.url;
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="body-lg text-warm-gray">Loading...</div>
      </div>
    );
  }

  if (error === "invalid") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mx-auto max-w-lg">
          <h1 className="heading-1 text-charcoal">Link Not Found</h1>
          <p className="body-lg mt-6 text-warm-gray">
            This link doesn&rsquo;t seem to be valid. It may have expired or
            been entered incorrectly.
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

  if (error === "error" || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mx-auto max-w-lg">
          <h1 className="heading-1 text-charcoal">Something Went Wrong</h1>
          <p className="body-lg mt-6 text-warm-gray">
            We couldn&rsquo;t load the page. Please try again later.
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

  const { invitation, dinner, guest, canBook, blockReason, dinnerAllowsCouples, couplePrice } = data;

  // Calculate the booking price based on couple booking selection
  const bookingPrice = isCoupleBooking ? couplePrice : dinner.price_cents;

  // Already booked
  if (invitation.status === "booked") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mx-auto max-w-lg">
          <h1 className="heading-1 text-charcoal">
            You&rsquo;re Already Booked!
          </h1>
          <p className="body-lg mt-6 text-warm-gray">
            Your spot for the {formatDate(dinner.date)} dinner is confirmed.
          </p>
          <p className="body-base mt-6 text-charcoal">
            Check your email for all the details, or text Joe at{" "}
            <a href="sms:+17602748830" className="text-terracotta underline">
              (760) 274-8830
            </a>{" "}
            with questions.
          </p>
        </div>
      </div>
    );
  }

  // Need gender selection first
  if (!guest.gender) {
    return (
      <div className="flex min-h-screen flex-col px-6 py-12">
        <div className="mx-auto w-full max-w-lg">
          <div className="text-center">
            <h1 className="heading-1 text-charcoal">
              Hey {guest.first_name}!
            </h1>
            <p className="body-lg mt-4 text-warm-gray">
              Before you book, we need one quick detail to help us balance the
              dinner group.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-white p-6">
            <h2 className="heading-2 text-charcoal">How do you identify?</h2>
            <p className="body-sm mt-2 text-warm-gray">
              We aim to have a balanced mix of guests at each dinner.
            </p>
            <div className="mt-4 space-y-3">
              {["male", "female", "other"].map((gender) => (
                <button
                  key={gender}
                  onClick={() => setSelectedGender(gender)}
                  className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                    selectedGender === gender
                      ? "border-terracotta bg-terracotta/5"
                      : "border-border hover:border-charcoal/30"
                  }`}
                >
                  <span className="body-base font-medium capitalize text-charcoal">
                    {gender === "other" ? "Other / Non-binary" : gender}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={handleSetGender}
              disabled={!selectedGender || settingGender}
              className="mt-6 w-full rounded-full bg-terracotta px-6 py-3 text-center font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {settingGender ? "Saving..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Available bring item slots
  const availableBringSlots = dinner.bring_items.filter(
    (item) => !item.claimed_by_guest_id
  );

  return (
    <div className="flex min-h-screen flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div className="text-center">
          <h1 className="heading-1 text-charcoal">Hey {guest.first_name}!</h1>
          <p className="body-lg mt-4 text-warm-gray">
            {dinner.venue_type === 'restaurant'
              ? `You're invited to a Con-Vive dinner at ${dinner.restaurant_name}`
              : `You're invited to ${dinner.host_name}'s dinner`}
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
            <div className="border-t border-border pt-4">
              <p className="body-sm font-medium uppercase tracking-wide text-warm-gray">
                Cost
              </p>
              <p className="heading-2 mt-1 text-charcoal">
                {formatPrice(dinner.price_cents)}
              </p>
              <p className="body-sm mt-1 text-warm-gray">
                {dinner.venue_type === 'restaurant'
                  ? 'Covers food, service, and tax. Drinks paid separately at the restaurant.'
                  : 'Covers dinner, drinks & the experience'}
              </p>
            </div>
          </div>
        </div>

        {/* Menu (if set) */}
        {dinner.menu && (
          <div className="mt-6 rounded-xl border border-border bg-white p-6">
            <h2 className="heading-2 text-charcoal">Menu</h2>
            <p className="body-base mt-3 whitespace-pre-wrap text-warm-gray">
              {dinner.menu}
            </p>
          </div>
        )}

        {/* Couple Booking Section - only if dinner allows couples */}
        {dinnerAllowsCouples && (
          <div className="mt-6 rounded-xl border border-border bg-white p-6">
            <h2 className="heading-2 text-charcoal">Booking for Two?</h2>
            <p className="body-sm mt-2 text-warm-gray">
              Want to bring a +1? Toggle this on to book for both of you.
            </p>

            {/* Toggle */}
            <div className="mt-4">
              <button
                onClick={() => setIsCoupleBooking(!isCoupleBooking)}
                className={`flex w-full items-center justify-between rounded-lg border-2 p-4 transition-colors ${
                  isCoupleBooking
                    ? "border-terracotta bg-terracotta/5"
                    : "border-border hover:border-charcoal/30"
                }`}
              >
                <span className="body-base font-medium text-charcoal">
                  Yes, add a +1
                </span>
                <div
                  className={`h-6 w-11 rounded-full transition-colors ${
                    isCoupleBooking ? "bg-terracotta" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      isCoupleBooking ? "translate-x-5" : "translate-x-0.5"
                    } mt-0.5`}
                  />
                </div>
              </button>
            </div>

            {/* Companion Details Form - shown when couple booking is enabled */}
            {isCoupleBooking && (
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                <p className="body-sm text-warm-gray">
                  Optional: Help us know your +1
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="body-sm font-medium text-charcoal">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={companionFirstName}
                      onChange={(e) => setCompanionFirstName(e.target.value)}
                      placeholder="Optional"
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-charcoal placeholder:text-warm-gray/50 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
                    />
                  </div>
                  <div>
                    <label className="body-sm font-medium text-charcoal">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={companionLastName}
                      onChange={(e) => setCompanionLastName(e.target.value)}
                      placeholder="Optional"
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-charcoal placeholder:text-warm-gray/50 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
                    />
                  </div>
                </div>

                <div>
                  <label className="body-sm font-medium text-charcoal">
                    Email
                  </label>
                  <input
                    type="email"
                    value={companionEmail}
                    onChange={(e) => setCompanionEmail(e.target.value)}
                    placeholder="Optional - they'll receive a confirmation email"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-charcoal placeholder:text-warm-gray/50 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
                  />
                </div>

                <div>
                  <label className="body-sm font-medium text-charcoal">
                    Gender
                  </label>
                  <select
                    value={companionGender}
                    onChange={(e) => setCompanionGender(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-charcoal focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
                  >
                    <option value="">Optional</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Non-binary</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bring Items Selection - only for home dinners */}
        {dinner.venue_type !== 'restaurant' && availableBringSlots.length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-white p-6">
            <h2 className="heading-2 text-charcoal">
              Want to bring something?
            </h2>
            <p className="body-sm mt-2 text-warm-gray">
              Optional! Select an item to contribute.
            </p>
            <div className="mt-4 space-y-2">
              {availableBringSlots.map((item) => (
                <button
                  key={item.slot}
                  onClick={() =>
                    setSelectedBringSlot(
                      selectedBringSlot === item.slot ? null : item.slot
                    )
                  }
                  className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                    selectedBringSlot === item.slot
                      ? "border-terracotta bg-terracotta/5"
                      : "border-border hover:border-charcoal/30"
                  }`}
                >
                  <span className="body-base text-charcoal">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Gender constraint warning */}
        {!canBook && blockReason && (
          <div className="mt-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-6">
            <p className="body-base text-amber-800">{blockReason}</p>
          </div>
        )}

        {/* Book Button */}
        <div className="mt-8">
          <button
            onClick={handleCheckout}
            disabled={!canBook || checkingOut}
            className="w-full rounded-full bg-terracotta px-6 py-4 text-center text-lg font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {checkingOut
              ? "Redirecting..."
              : isCoupleBooking
                ? `Book for Two - ${formatPrice(bookingPrice)}`
                : `Book My Spot - ${formatPrice(bookingPrice)}`}
          </button>
          {!canBook && (
            <p className="body-sm mt-3 text-center text-warm-gray">
              Booking is temporarily unavailable
            </p>
          )}
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
