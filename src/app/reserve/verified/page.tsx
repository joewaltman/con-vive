import { redirect } from "next/navigation";
import Link from "next/link";
import { stripe, RESERVATION_PRICE, getBaseUrl } from "@/lib/stripe";

interface VerifiedPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function VerifiedPage({ searchParams }: VerifiedPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  if (!sessionId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="heading-1 text-charcoal">Something went wrong</h1>
        <p className="body-base mt-4 text-warm-gray">
          We couldn&rsquo;t find your verification session.
        </p>
        <Link
          href="/reserve"
          className="mt-8 inline-block rounded-full bg-terracotta px-8 py-3 text-cream transition-opacity hover:opacity-90"
        >
          Start over
        </Link>
      </div>
    );
  }

  let verificationSession;
  try {
    verificationSession = await stripe.identity.verificationSessions.retrieve(sessionId);
  } catch (error) {
    console.error("Failed to retrieve verification session:", error);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="heading-1 text-charcoal">Something went wrong</h1>
        <p className="body-base mt-4 text-warm-gray">
          We couldn&rsquo;t retrieve your verification status.
        </p>
        <Link
          href="/reserve"
          className="mt-8 inline-block rounded-full bg-terracotta px-8 py-3 text-cream transition-opacity hover:opacity-90"
        >
          Try again
        </Link>
      </div>
    );
  }

  const status = verificationSession.status;

  if (status === "verified") {
    const baseUrl = getBaseUrl();
    const email = verificationSession.metadata?.email || "";
    const name = verificationSession.metadata?.name || "";

    try {
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_creation: "always",
        billing_address_collection: "required",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Con-Vive Dinner Reservation" },
              unit_amount: RESERVATION_PRICE,
            },
            quantity: 1,
          },
        ],
        metadata: {
          verification_session_id: sessionId,
          guest_email: email,
          guest_name: name,
        },
        success_url: `${baseUrl}/reserve/confirmed?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/reserve/cancelled`,
      });

      if (checkoutSession.url) {
        redirect(checkoutSession.url);
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <h1 className="heading-1 text-charcoal">Payment setup failed</h1>
          <p className="body-base mt-4 text-warm-gray">
            Your identity was verified, but we couldn&rsquo;t set up the payment.
            Please try again or contact us.
          </p>
          <Link
            href="/reserve"
            className="mt-8 inline-block rounded-full bg-terracotta px-8 py-3 text-cream transition-opacity hover:opacity-90"
          >
            Try again
          </Link>
        </div>
      );
    }
  }

  if (status === "processing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="heading-1 text-charcoal">Verification in progress</h1>
        <p className="body-base mt-4 text-warm-gray">
          We&rsquo;re still reviewing your documents. This usually takes just a moment.
        </p>
        <Link
          href={`/reserve/verified?session_id=${sessionId}`}
          className="mt-8 inline-block rounded-full bg-terracotta px-8 py-3 text-cream transition-opacity hover:opacity-90"
        >
          Check status
        </Link>
      </div>
    );
  }

  if (status === "requires_input") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="heading-1 text-charcoal">Verification incomplete</h1>
        <p className="body-base mt-4 text-warm-gray">
          We need a bit more information to complete your verification.
        </p>
        {verificationSession.url && (
          <a
            href={verificationSession.url}
            className="mt-8 inline-block rounded-full bg-terracotta px-8 py-3 text-cream transition-opacity hover:opacity-90"
          >
            Continue verification
          </a>
        )}
      </div>
    );
  }

  // Status: canceled or other failure
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="heading-1 text-charcoal">Verification unsuccessful</h1>
      <p className="body-base mt-4 text-warm-gray">
        We weren&rsquo;t able to verify your identity. Please try again or contact us
        for assistance.
      </p>
      <Link
        href="/reserve"
        className="mt-8 inline-block rounded-full bg-terracotta px-8 py-3 text-cream transition-opacity hover:opacity-90"
      >
        Try again
      </Link>
      <a
        href="mailto:joe@con-vive.com"
        className="mt-4 body-sm text-terracotta underline hover:opacity-80"
      >
        Contact support
      </a>
    </div>
  );
}
