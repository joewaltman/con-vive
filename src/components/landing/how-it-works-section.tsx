const steps = [
  {
    number: "1",
    title: "Sign up and say hello",
    description:
      "Fill out a quick profile and hop on a 5-minute welcome call with Joe, our founder. We want to know what makes you interesting \u2014 not just your dietary restrictions.",
  },
  {
    number: "2",
    title: "Get invited to dinner",
    description:
      "We\u2019ll match you with 5\u20137 other guests for an evening at a host\u2019s home. You\u2019ll get the details \u2014 who\u2019s coming, what\u2019s on the menu, and what to bring \u2014 a few days before.",
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
      <div className="fade-in-up mx-auto mt-10 mb-16 max-w-sm overflow-hidden rounded-2xl">
        <img
          src="/table-setting.jpg"
          alt="A warm table setting with candles"
          className="warm-image w-full object-cover"
        />
      </div>
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
