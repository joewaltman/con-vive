import Link from "next/link";
import { stripe } from "@/lib/stripe";

interface ConfirmedPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function ConfirmedPage({ searchParams }: ConfirmedPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  let customerName = "";

  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      customerName = session.customer_details?.name || session.metadata?.guest_name || "";
    } catch (error) {
      console.error("Failed to retrieve checkout session:", error);
    }
  }

  const firstName = customerName.split(" ")[0] || "there";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mx-auto max-w-lg">
        <div className="text-6xl">&#127881;</div>

        <h1 className="heading-1 mt-6 text-charcoal">
          You&rsquo;re in, <span className="text-terracotta">{firstName}</span>!
        </h1>

        <p className="body-lg mt-6 text-warm-gray">
          Your reservation is confirmed. We&rsquo;re excited to have you at the table.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-white p-6 text-left">
          <h2 className="heading-2 text-charcoal">What happens next?</h2>

          <ul className="mt-4 space-y-4">
            <li className="body-base flex items-start gap-3 text-charcoal">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-sm font-medium text-terracotta">
                1
              </span>
              <span>
                You&rsquo;ll receive a confirmation email with your receipt shortly.
              </span>
            </li>
            <li className="body-base flex items-start gap-3 text-charcoal">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-sm font-medium text-terracotta">
                2
              </span>
              <span>
                A few days before the dinner, we&rsquo;ll send you the exact location and
                any details you need to know.
              </span>
            </li>
            <li className="body-base flex items-start gap-3 text-charcoal">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-sm font-medium text-terracotta">
                3
              </span>
              <span>
                Show up hungry and ready for great conversation!
              </span>
            </li>
          </ul>
        </div>

        <p className="body-sm mt-8 text-warm-gray">
          Questions? Email us at{" "}
          <a href="mailto:joe@con-vive.com" className="text-terracotta underline hover:opacity-80">
            joe@con-vive.com
          </a>
        </p>

        <Link
          href="/"
          className="mt-8 inline-block rounded-full border border-border bg-white px-8 py-3 text-charcoal transition-colors hover:bg-cream"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
