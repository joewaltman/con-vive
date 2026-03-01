export function AboutSection() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h2 className="heading-1 fade-in-up text-center">Meet Joe</h2>
      <div className="fade-in-up mt-12 flex flex-col items-center gap-8 md:flex-row md:items-start">
        <img
          src="/familyphoto.jpg"
          alt="Joe"
          className="warm-image warm-shadow h-48 w-48 flex-shrink-0 rounded-full object-cover"
        />
        <div className="body-base space-y-4 text-warm-gray">
          <p>
            I started Con-Vive because I noticed something: everyone I know in North County is
            interesting, generous, and loves a good meal &mdash; but most of us eat dinner with the
            same five people every week. I wanted to fix that. So I started hosting dinners and
            filling the table with people who didn&rsquo;t know each other yet. The first one was a
            little awkward for about fifteen minutes. Then it was one of the best nights I&rsquo;d
            had in months. I&rsquo;ve been doing it ever since.
          </p>
        </div>
      </div>
    </section>
  );
}
