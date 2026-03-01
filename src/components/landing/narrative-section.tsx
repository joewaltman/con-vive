export function NarrativeSection() {
  return (
    <section className="bg-[#F5EDE4] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="heading-1 fade-in-up text-center">What a dinner looks like</h2>
        <div className="mt-12 flex flex-col gap-10 md:flex-row md:items-center">
          <div className="fade-in-left body-lg flex-1 space-y-6 text-warm-gray">
            <p>
              You arrive at a home in Encinitas on a Saturday evening. The kitchen smells incredible
              &mdash; your host has been slow-braising lamb all afternoon. You don&rsquo;t know
              anyone yet, but within ten minutes you&rsquo;re deep in conversation with a marine
              biologist who just moved from Boston and a couple who run a surf shop in Leucadia.
            </p>
            <p>
              Someone brought an incredible bottle of Syrah from a Paso Robles winery they visited
              last month. Someone else made a charcuterie board that belongs in a magazine. Your host
              brings out platters family-style, and suddenly you&rsquo;re sharing food with people
              who were strangers an hour ago but don&rsquo;t feel like it.
            </p>
            <p className="font-serif text-xl italic text-charcoal md:text-2xl">
              You stay later than you planned. You exchange numbers. You drive home thinking &mdash;
              why don&rsquo;t I do this more often?
            </p>
          </div>
          <div className="fade-in-right flex-shrink-0 md:-ml-8 md:w-[45%]">
            <img
              src="/table-setting.jpg"
              alt="Friends sharing a meal around a candlelit dinner table"
              className="warm-image warm-shadow w-full rounded-2xl object-cover md:-mr-12 md:max-h-[500px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
