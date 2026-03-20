const testimonials = [
  {
    quote:
      "I recently attended an intimate dinner gathering—six guests, a gracious host, and a beautifully appointed home—and it was genuinely one of the more memorable evenings I've had in a while. The atmosphere struck a perfect balance between relaxed and refined, with fresh, flavorful food served in a casual, shareable style that made everything feel warm rather than formal. What made it truly special was that every guest arrived as a stranger, yet conversation flowed so naturally that by the end of the night it felt like we'd shared something real. If you're looking for something more personal and engaging than a typical night out, this is absolutely worth it.",
    name: "Katherine Sauerborn",
    instagram: "PoshPetsEncinitas",
  },
  {
    quote:
      "I've tried other dinner-with-strangers apps and they always felt surface-level. Con-Vive is completely different. Joe personally called me beforehand, learned what I'm into, and put me at a table with people I genuinely wouldn't have met otherwise — an actress who went to pastry school, a Techstars director. The ages ranged from 30s to 79 and somehow it just worked. I left thinking, this is what community is supposed to feel like. I'm already looking forward to my next one.",
    name: "Jess Lev",
    instagram: "jessssence",
  },
];

export function SocialProofSection() {
  return (
    <section className="bg-[#F3EBE1] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <blockquote key={testimonial.instagram} className="fade-in-up stagger-child">
              <p className="body-lg italic text-charcoal">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <footer className="mt-6">
                <p className="font-medium text-charcoal">{testimonial.name}</p>
                <a
                  href={`https://instagram.com/${testimonial.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="body-sm text-terracotta hover:underline"
                >
                  @{testimonial.instagram}
                </a>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
