const faqs = [
  {
    question: "How much does it cost?",
    answer:
      "$40 per person for the evening. You\u2019ll also bring a contribution to the meal \u2014 usually a bottle of wine, an appetizer, or a dessert. Think of it as a dinner party, not a restaurant.",
  },
  {
    question: "Who are the other guests?",
    answer:
      "Interesting people from North County \u2014 professionals, creatives, parents, retirees, transplants, locals. We curate each table to create a good mix of backgrounds and personalities. Groups are small: 6\u20138 people.",
  },
  {
    question: "What about dietary restrictions?",
    answer:
      "We ask about dietary needs during the 5-minute welcome call and make sure the menu works for everyone at the table. Just let us know.",
  },
  {
    question: "Is it safe?",
    answer:
      "We have a welcome call with every guest before their first dinner. Our hosts are vetted and verified. And once we launch our full platform, all guests will complete identity verification.",
  },
  {
    question: "Where are the dinners?",
    answer:
      "For now, in Encinitas. As we grow, we\u2019ll expand to other North County neighborhoods \u2014 Carlsbad, Solana Beach, Del Mar, Cardiff, and beyond.",
  },
  {
    question: "Can I come with a friend or partner?",
    answer:
      "Yes \u2014 you can sign up together. But part of the magic is coming solo. You\u2019ll be surprised how quickly a table of strangers starts to feel like friends.",
  },
];

export function DetailsSection() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h2 className="heading-1 fade-in-up text-center">A few things you should know</h2>
      <div className="mt-12 divide-y divide-border">
        {faqs.map((faq) => (
          <details key={faq.question} className="fade-in-up stagger-child group py-6">
            <summary className="heading-3 cursor-pointer list-none text-charcoal">
              <span className="flex items-center justify-between">
                {faq.question}
                <span className="ml-4 text-warm-gray transition-transform group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="body-base mt-4 text-warm-gray">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
