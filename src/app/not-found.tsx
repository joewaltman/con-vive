import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="heading-1 text-charcoal">Page not found</h1>
      <p className="body-base mt-4 text-warm-gray">
        This page doesn&rsquo;t exist. Let&rsquo;s get you back to the table.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-terracotta px-8 py-3 text-cream transition-opacity hover:opacity-90"
      >
        Back home
      </Link>
    </div>
  );
}
