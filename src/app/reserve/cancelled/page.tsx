import Link from "next/link";

export default function CancelledPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="heading-1 text-charcoal">Payment cancelled</h1>
      <p className="body-base mt-4 text-warm-gray">
        No worries - your card wasn&rsquo;t charged. Ready to try again?
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
