export function HeroSection() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-6 py-24 text-center">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/hero-dinner.jpg')" }}
      />
      <div className="absolute inset-0 bg-cream/80" />
      <div className="relative z-10">
        <h1 className="heading-display hero-animate max-w-3xl text-charcoal">
          Dinner parties with people you haven&rsquo;t met yet.
        </h1>
        <p className="hero-animate hero-animate-delay-1 body-lg mt-6 max-w-xl mx-auto text-warm-gray">
          Intimate, home-hosted dinners in North County San Diego. Great food. Interesting people.
          Real connection.
        </p>
        <a
          href="#signup"
          className="hero-animate hero-animate-delay-2 mt-10 inline-block rounded-full bg-terracotta px-10 py-4 text-lg font-medium text-cream transition-opacity hover:opacity-90"
        >
          Join Our Next Dinner
        </a>
        <p className="hero-animate hero-animate-delay-2 body-sm mt-4 text-warm-gray">
          $40 per person &middot; Encinitas &middot; Small groups of 6&ndash;8
        </p>
      </div>
    </section>
  );
}
