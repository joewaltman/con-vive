import { ReserveButton } from "@/components/reserve/reserve-button";
import { RESERVATION_PRICE } from "@/lib/stripe";

interface ReservePageProps {
  searchParams: Promise<{ email?: string; name?: string }>;
}

export default async function ReservePage({ searchParams }: ReservePageProps) {
  const params = await searchParams;
  const { email, name } = params;
  const priceDisplay = `$${(RESERVATION_PRICE / 100).toFixed(0)}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="heading-1 text-charcoal">Reserve Your Seat</h1>

        <p className="body-lg mt-6 text-warm-gray">
          Join us for an unforgettable evening of conversation, connection, and
          carefully curated company.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-white p-6">
          <div className="text-4xl font-bold text-terracotta">{priceDisplay}</div>
          <p className="body-sm mt-1 text-warm-gray">per person</p>

          <ul className="mt-6 space-y-3 text-left">
            <li className="body-base flex items-start gap-3 text-charcoal">
              <span className="mt-1 text-terracotta">&#10003;</span>
              Multi-course dinner with wine pairings
            </li>
            <li className="body-base flex items-start gap-3 text-charcoal">
              <span className="mt-1 text-terracotta">&#10003;</span>
              Curated group of 8-10 guests
            </li>
            <li className="body-base flex items-start gap-3 text-charcoal">
              <span className="mt-1 text-terracotta">&#10003;</span>
              Intimate venue in Austin
            </li>
          </ul>
        </div>

        <div className="mt-8">
          <ReserveButton email={email} name={name} />
        </div>

        <div className="mt-8 rounded-lg bg-cream border border-border p-4">
          <p className="body-sm text-warm-gray">
            <strong className="text-charcoal">Verification required:</strong>{" "}
            For everyone&rsquo;s safety and comfort, we ask all guests to verify
            their identity with a quick ID check and selfie before completing
            their reservation.
          </p>
        </div>
      </div>
    </div>
  );
}
