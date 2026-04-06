import type { Metadata } from "next";
import Link from "next/link";
import { ScrollSection } from "@/components/scroll-animation";
import { guests } from "@/components/april7/guest-data";

export const metadata: Metadata = {
  title: "April 7th Dinner | Con-Vive",
  description: "Join us for an evening of great food and conversation. Tuesday, April 7th at 6pm in Encinitas.",
};

function HeroSection() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="hero-animate font-serif text-sm uppercase tracking-[0.2em] text-terracotta">
        Con-Vive
      </p>
      <h1 className="heading-display hero-animate hero-animate-delay-1 mt-4 text-charcoal">
        April 7th Dinner
      </h1>
      <p className="hero-animate hero-animate-delay-2 body-lg mt-6 text-warm-gray">
        Tuesday, April 7th at 6:00pm
      </p>
      <p className="hero-animate hero-animate-delay-2 body-base mt-2 text-warm-gray">
        412 Hillcrest Drive, Encinitas 92024
      </p>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <div className="fade-in-up rounded-lg border border-border bg-white/50 p-8 text-center">
        <h2 className="heading-2 text-charcoal">About This Dinner</h2>
        <p className="body-base mt-6 text-warm-gray">
          The response to Con-Vive has been way bigger than expected — hundreds of signups and only
          so many tables to go around. This dinner is a little different. We&apos;ve invited a larger
          group of people who are interested in hosting their own Con-Vive dinners, so instead of the
          usual intimate table of 6-8, you&apos;ll be part of a bigger gathering — two tables, food you
          can eat standing or moving around, and a chance to mingle with everyone.
        </p>
        <p className="body-base mt-4 text-warm-gray">
          Think of it less as a seated dinner and more as a dinner party. The goal is the same as
          always: good food, real conversation, and meeting people you wouldn&apos;t have met otherwise.
        </p>
        <p className="body-base mt-4 text-warm-gray">
          If hosting feels right after tonight, we&apos;ll talk about what that looks like. No pressure.
        </p>
      </div>
    </section>
  );
}

function EventDetailsSection() {
  const details = [
    {
      title: "Menu",
      content: "Fish & steak tacos with all the fixings",
    },
    {
      title: "Bring",
      content: "A bottle of wine, finger food appetizer, or finger food dessert",
    },
    {
      title: "When & Where",
      content: "Tuesday, April 7th at 6pm\n412 Hillcrest Drive, Encinitas",
    },
  ];

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <h2 className="heading-1 fade-in-up text-center">Event Details</h2>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {details.map((detail) => (
          <div key={detail.title} className="fade-in-up stagger-child text-center">
            <h3 className="heading-3 text-terracotta">{detail.title}</h3>
            <p className="body-base mt-3 whitespace-pre-line text-warm-gray">{detail.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GuestsSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="heading-1 fade-in-up text-center">Meet Your Fellow Guests</h2>
      <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {guests.map((guest) => (
          <div
            key={guest.name}
            className="fade-in-up stagger-child rounded-lg border border-border bg-white/50 p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta/10 font-serif text-lg font-bold text-terracotta">
                {guest.name[0]}
              </div>
              <div className="min-w-0">
                <h3 className="heading-3 text-base text-charcoal">{guest.name}</h3>
                <p className="body-sm mt-1 text-warm-gray">{guest.bio}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function GuidePreviewSection() {
  const highlights = [
    "Bring a bottle of wine, appetizer, or dessert — finger food to minimize dishes",
    "Introduce yourself like a human, not a LinkedIn profile",
    "The 60-second rule: if you've been talking for a minute, ask someone a question",
  ];

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <div className="fade-in-up rounded-lg border border-border bg-white/50 p-8">
        <h2 className="heading-2 text-center text-charcoal">Guest Dinner Guide</h2>
        <p className="body-base mt-4 text-center text-warm-gray">
          A few things to know before the evening:
        </p>
        <ul className="mt-6 space-y-3">
          {highlights.map((highlight, index) => (
            <li key={index} className="body-base flex items-start gap-3 text-warm-gray">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta/60" />
              {highlight}
            </li>
          ))}
        </ul>
        <div className="mt-8 text-center">
          <Link
            href="/guide"
            className="inline-block rounded-full bg-terracotta px-8 py-3 text-base font-medium text-cream transition-opacity hover:opacity-90"
          >
            Read the Full Guide
          </Link>
        </div>
      </div>
    </section>
  );
}

function SignoffSection() {
  return (
    <section className="px-6 py-16">
      <p className="fade-in-up text-center font-serif text-xl italic text-terracotta md:text-2xl">
        See you then! — Joe
      </p>
    </section>
  );
}

export default function April7Page() {
  return (
    <main>
      <HeroSection />
      <ScrollSection>
        <AboutSection />
      </ScrollSection>
      <ScrollSection>
        <EventDetailsSection />
      </ScrollSection>
      <ScrollSection>
        <GuestsSection />
      </ScrollSection>
      <ScrollSection>
        <GuidePreviewSection />
      </ScrollSection>
      <ScrollSection>
        <SignoffSection />
      </ScrollSection>
    </main>
  );
}
