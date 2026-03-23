"use client";

import { useEffect, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-4 py-3 text-charcoal placeholder:text-warm-gray/60 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta";
const labelClass = "body-sm mb-1.5 block font-medium text-charcoal";

function formatPhoneNumber(digits: string): string {
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function sanitizePhone(value: string): string {
  // Strip all non-digits
  let digits = value.replace(/\D/g, "");
  // If starts with 1 and is 11 digits, strip the leading 1
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits;
}

export function SignupSection() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [utm, setUtm] = useState({ source: "", medium: "", campaign: "" });
  const [phone, setPhone] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUtm({
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
    });
  }, []);

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = sanitizePhone(e.target.value).slice(0, 10);
    setPhoneDigits(digits);
    setPhone(formatPhoneNumber(digits));
    if (phoneError && digits.length === 10) {
      setPhoneError("");
    }
  }

  function handlePhoneBlur() {
    if (phoneDigits.length > 0 && phoneDigits.length !== 10) {
      setPhoneError("Please enter a valid 10-digit US phone number");
    } else {
      setPhoneError("");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Validate phone before submitting
    if (phoneDigits.length !== 10) {
      setPhoneError("Please enter a valid 10-digit US phone number");
      return;
    }

    setStatus("submitting");

    const form = e.currentTarget;
    const data = new FormData(form);

    const body = {
      firstName: data.get("firstName"),
      lastName: data.get("lastName"),
      email: data.get("email"),
      phone: phoneDigits,
      ageRange: data.get("ageRange"),
      currentObsession: data.get("currentObsession"),
      utmSource: utm.source,
      utmMedium: utm.medium,
      utmCampaign: utm.campaign,
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
            <input type="text" id="firstName" name="firstName" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>
              Last name *
            </label>
            <input type="text" id="lastName" name="lastName" required className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email *
          </label>
          <input type="email" id="email" name="email" required className={inputClass} />
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
            value={phone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            inputMode="numeric"
            maxLength={14}
            placeholder="(555) 555-5555"
            className={inputClass}
          />
          {phoneError && (
            <p className="body-sm text-red-600 mt-1.5">{phoneError}</p>
          )}
        </div>

        <div>
          <label htmlFor="ageRange" className={labelClass}>
            Age Range *
          </label>
          <select id="ageRange" name="ageRange" required className={inputClass}>
            <option value="">Select...</option>
            <option value="Under 30">Under 30</option>
            <option value="30-39">30-39</option>
            <option value="40-49">40-49</option>
            <option value="50-59">50-59</option>
            <option value="60-69">60-69</option>
            <option value="70+">70+</option>
          </select>
        </div>

        <div>
          <label htmlFor="currentObsession" className={labelClass}>
            What's one thing about you that would hold a table of strangers for 10-20 minutes? *
          </label>
          <textarea
            id="currentObsession"
            name="currentObsession"
            rows={3}
            required
            placeholder="It doesn't have to be glamorous. A 911 dispatcher who moonlights as a beekeeper. A retired engineer who just walked 3,000km across France. A software guy who makes his own charcuterie. What's yours?"
            className={inputClass}
          />
          <p className="body-sm text-warm-gray mt-1.5">
            Con-Vive dinners are small and carefully curated. We read every response personally. This is the question that matters most.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="privacyPolicy"
            name="privacyPolicy"
            required
            className="mt-1 h-4 w-4 rounded border-border text-terracotta focus:ring-terracotta"
          />
          <label htmlFor="privacyPolicy" className="body-sm text-warm-gray">
            I have read and agree to the{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-terracotta underline hover:opacity-80"
            >
              Privacy Policy
            </a>{" "}
            *
          </label>
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
