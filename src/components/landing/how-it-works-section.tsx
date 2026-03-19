const steps = [
  {
    number: "1",
    title: "Sign up and say hello",
    description:
      "Fill out a short profile and hop on a quick 5-10 minute welcome call with Joe, our founder. We ask a couple of real questions so we can put you at the right table. Not everyone makes the cut, but that's what makes the dinners good.",
  },
  {
    number: "2",
    title: "Get invited to dinner",
    description:
      "We\u2019ll match you with 5\u20137 other neighbors for an evening at a host\u2019s home. You\u2019ll get the details \u2014 who\u2019s coming, what\u2019s on the menu, and what to bring \u2014 a few days before.",
  },
  {
    number: "3",
    title: "Show up with a bottle of wine",
    description:
      "That\u2019s it. Come hungry, come curious. Enjoy a home-cooked meal, meet people you wouldn\u2019t have met otherwise, and leave with a few new friends.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <h2 className="heading-1 fade-in-up text-center">How it works</h2>
      <div className="mt-16 grid gap-12 md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.number} className="fade-in-up stagger-child text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-terracotta font-serif text-xl font-bold text-terracotta">
              {step.number}
            </span>
            <h3 className="heading-3 mt-4">{step.title}</h3>
            <p className="body-base mt-3 text-warm-gray">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
