"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="heading-1 text-charcoal">Something went wrong</h1>
      <p className="body-base mt-4 text-warm-gray">
        We hit a snag. Please try again or reach out to{" "}
        <a href="mailto:joe@con-vive.com" className="text-terracotta underline">
          joe@con-vive.com
        </a>
        .
      </p>
      <button
        onClick={reset}
        className="mt-8 rounded-full bg-terracotta px-8 py-3 text-cream transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
