"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-4 py-3 text-charcoal placeholder:text-warm-gray/60 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta";
const labelClass = "body-sm mb-1.5 block font-medium text-charcoal";

export function SignupSection() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const form = e.currentTarget;
    const data = new FormData(form);

    const body = {
      firstName: data.get("firstName"),
      lastName: data.get("lastName"),
      email: data.get("email"),
      phone: data.get("phone"),
      socialHandle: data.get("socialHandle"),
    };

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Signup failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section id="signup" className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h2 className="heading-1 text-charcoal">You&rsquo;re in!</h2>
        <p className="body-lg mt-6 text-warm-gray">
          I&rsquo;ll reach out in the next day or two to say hello and tell you about upcoming
          dinners. In the meantime, feel free to reply to my email or text me any questions.
        </p>
        <p className="body-base mt-4 text-charcoal">&mdash; Joe</p>
      </section>
    );
  }

  return (
    <section id="signup" className="mx-auto max-w-2xl px-6 py-24">
      <h2 className="heading-1 fade-in-up text-center">Join our next dinner</h2>
      <p className="fade-in-up body-base mt-4 text-center text-warm-gray">
        Fill this out and I&rsquo;ll reach out within a day or two to welcome you and tell you about
        upcoming dinners.
      </p>

      <form onSubmit={handleSubmit} className="fade-in-up mt-12 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={labelClass}>
              First name *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>
              Last name *
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone number *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="socialHandle" className={labelClass}>
            Social media account
          </label>
          <input
            type="text"
            id="socialHandle"
            name="socialHandle"
            placeholder="Facebook, Instagram, or LinkedIn handle"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-full bg-terracotta py-4 text-lg font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === "submitting" ? "Sending..." : "Count Me In"}
        </button>

        {status === "error" && (
          <p className="body-sm text-center text-red-600">
            Something went wrong. Please try again, or email{" "}
            <a href="mailto:joe@con-vive.com" className="underline">
              joe@con-vive.com
            </a>
            .
          </p>
        )}
      </form>
    </section>
  );
}
