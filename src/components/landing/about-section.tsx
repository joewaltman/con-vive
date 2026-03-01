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
            I started Con-Vive because I believe the best conversations happen around a dinner table
            &mdash; and that most of us don&rsquo;t have enough of them. I moved to Encinitas a few
            years ago and found that making real friends as an adult is surprisingly hard. So I
            started hosting dinners for strangers. The first one was a little awkward for about
            fifteen minutes. Then it was one of the best nights I&rsquo;d had in months. I&rsquo;ve
            been doing it ever since.
          </p>
          <p>
            Con-Vive is my attempt to make this happen for more people. I personally host many of the
            dinners (I make a mean ribeye with chimichurri), and I hand-pick every table. This isn&rsquo;t
            an algorithm &mdash; it&rsquo;s a dinner party, and I take it seriously.
          </p>
        </div>
      </div>
    </section>
  );
}
