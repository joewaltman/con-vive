"use client";

import { useEffect, useRef, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-4 py-3 text-charcoal placeholder:text-warm-gray/60 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta";
const labelClass = "body-sm mb-1.5 block font-medium text-charcoal";
const errorClass = "body-sm text-red-600 mt-1.5";

function formatPhoneNumber(digits: string): string {
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function sanitizePhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SignupSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [currentPage, setCurrentPage] = useState<1 | 2 | 3>(1);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [utm, setUtm] = useState({ source: "", medium: "", campaign: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // Page 1
    firstName: "",
    lastName: "",
    email: "",
    // Page 2
    phone: "",
    phoneDigits: "",
    ageRange: "",
    soloOrCouple: "",
    dietaryRestrictions: "",
    availableDays: [...DAYS], // All checked by default
    // Page 3
    curiousAbout: "",
    surprisingKnowledge: "",
    privacyAccepted: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUtm({
      source: params.get("utm_source") || "",
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
    });
  }, []);

  function updateField<K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = sanitizePhone(e.target.value).slice(0, 10);
    updateField("phoneDigits", digits);
    updateField("phone", formatPhoneNumber(digits));
    if (errors.phone && digits.length === 10) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  }

  function toggleDay(day: string) {
    setFormData((prev) => {
      const days = prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day];
      return { ...prev, availableDays: days };
    });
  }

  function scrollToForm() {
    setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function validatePage1(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validatePage2(): boolean {
    const newErrors: Record<string, string> = {};
    if (formData.phoneDigits.length !== 10) {
      newErrors.phone = "Please enter a valid 10-digit US phone number";
    }
    if (!formData.ageRange) newErrors.ageRange = "Please select your age range";
    if (!formData.soloOrCouple) newErrors.soloOrCouple = "Please select an option";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validatePage3(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.curiousAbout.trim()) newErrors.curiousAbout = "This field is required";
    if (!formData.surprisingKnowledge.trim()) newErrors.surprisingKnowledge = "This field is required";
    if (!formData.privacyAccepted) newErrors.privacyAccepted = "You must accept the privacy policy";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handlePage1Submit() {
    if (!validatePage1()) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          utmSource: utm.source,
          utmMedium: utm.medium,
          utmCampaign: utm.campaign,
        }),
      });

      if (!res.ok) throw new Error("Signup failed");

      const data = await res.json();
      setRecordId(data.recordId);
      setStatus("idle");
      setCurrentPage(2);
      scrollToForm();
    } catch {
      setStatus("error");
    }
  }

  async function handlePage2Submit() {
    if (!validatePage2()) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/signup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          phone: formData.phoneDigits,
          ageRange: formData.ageRange,
          soloOrCouple: formData.soloOrCouple,
          dietaryRestrictions: formData.dietaryRestrictions,
          availableDays: formData.availableDays.join(", "),
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      setStatus("idle");
      setCurrentPage(3);
      scrollToForm();
    } catch {
      setStatus("error");
    }
  }

  async function handlePage3Submit() {
    if (!validatePage3()) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/signup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          curiousAbout: formData.curiousAbout,
          surprisingKnowledge: formData.surprisingKnowledge,
          funnelStage: "New",
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (currentPage === 1) handlePage1Submit();
    else if (currentPage === 2) handlePage2Submit();
    else handlePage3Submit();
  }

  function goBack() {
    setErrors({});
    setStatus("idle");
    if (currentPage === 2) setCurrentPage(1);
    else if (currentPage === 3) setCurrentPage(2);
    scrollToForm();
  }

  if (status === "success") {
    return (
      <section id="signup" className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h2 className="heading-1 text-charcoal">
          Thanks, <span className="text-terracotta">{formData.firstName}</span>!
        </h2>
        <p className="body-lg mt-6 text-warm-gray">
          We read every response personally. If we think you&rsquo;d be a great fit for an upcoming dinner,
          we&rsquo;ll reach out soon.
        </p>
      </section>
    );
  }

  return (
    <section ref={sectionRef} id="signup" className="mx-auto max-w-2xl px-6 py-24">
      <h2 className="heading-1 fade-in-up text-center">
        {currentPage === 3 ? "Help us find your perfect table" : "Join our next dinner"}
      </h2>
      <p className="fade-in-up body-base mt-4 text-center text-warm-gray">
        {currentPage === 3
          ? "Every Con-Vive dinner is different. These two questions help us match you with people you'll genuinely enjoy talking to."
          : "Fill this out and I'll reach out within a day or two to welcome you and tell you about upcoming dinners."}
      </p>

      <form onSubmit={handleSubmit} className="fade-in-up mt-12 space-y-6">
        {/* Progress Bar */}
        <div className="mb-8">
          <p className="body-sm text-charcoal font-medium mb-2">Step {currentPage} of 3</p>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-terracotta transition-all duration-500"
              style={{ width: `${(currentPage / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Page 1: Get Started */}
        {currentPage === 1 && (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className={labelClass}>
                  First name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className={inputClass}
                />
                {errors.firstName && <p className={errorClass}>{errors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className={labelClass}>
                  Last name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className={inputClass}
                />
                {errors.lastName && <p className={errorClass}>{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                className={inputClass}
              />
              {errors.email && <p className={errorClass}>{errors.email}</p>}
            </div>
          </div>
        )}

        {/* Page 2: A Bit More */}
        {currentPage === 2 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone number *
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                inputMode="numeric"
                maxLength={14}
                placeholder="(555) 555-5555"
                className={inputClass}
              />
              <p className="body-sm text-warm-gray mt-1.5">
                We&rsquo;ll text you about upcoming dinners - no spam, ever.
              </p>
              {errors.phone && <p className={errorClass}>{errors.phone}</p>}
            </div>

            <div>
              <label htmlFor="ageRange" className={labelClass}>
                Age Range *
              </label>
              <select
                id="ageRange"
                value={formData.ageRange}
                onChange={(e) => updateField("ageRange", e.target.value)}
                className={inputClass}
              >
                <option value="">Select...</option>
                <option value="Under 30">Under 30</option>
                <option value="30-39">30-39</option>
                <option value="40-49">40-49</option>
                <option value="50-59">50-59</option>
                <option value="60-69">60-69</option>
                <option value="70+">70+</option>
              </select>
              {errors.ageRange && <p className={errorClass}>{errors.ageRange}</p>}
            </div>

            <div>
              <label className={labelClass}>Who&rsquo;s coming to dinner? *</label>
              <div className="mt-2 space-y-2">
                {["Just me", "Me + my partner", "Me + a friend"].map((option) => (
                  <label key={option} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="soloOrCouple"
                      value={option}
                      checked={formData.soloOrCouple === option}
                      onChange={(e) => updateField("soloOrCouple", e.target.value)}
                      className="h-4 w-4 border-border text-terracotta focus:ring-terracotta"
                    />
                    <span className="body-base text-charcoal">{option}</span>
                  </label>
                ))}
              </div>
              {errors.soloOrCouple && <p className={errorClass}>{errors.soloOrCouple}</p>}
            </div>

            <div>
              <label htmlFor="dietaryRestrictions" className={labelClass}>
                Dietary restrictions
              </label>
              <input
                type="text"
                id="dietaryRestrictions"
                value={formData.dietaryRestrictions}
                onChange={(e) => updateField("dietaryRestrictions", e.target.value)}
                placeholder="e.g., vegetarian, no shellfish, avoid dairy..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Available days</label>
              <p className="body-sm text-warm-gray mb-2">Uncheck any days that don&rsquo;t work for you.</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <label
                    key={day}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      formData.availableDays.includes(day)
                        ? "border-terracotta bg-terracotta/10"
                        : "border-border bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.availableDays.includes(day)}
                      onChange={() => toggleDay(day)}
                      className="sr-only"
                    />
                    <span className="body-sm text-charcoal">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Page 3: Help Us Find Your Perfect Table */}
        {currentPage === 3 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="curiousAbout" className={labelClass}>
                What&rsquo;s something you&rsquo;ve been curious about lately - could be anything. *
              </label>
              <textarea
                id="curiousAbout"
                value={formData.curiousAbout}
                onChange={(e) => updateField("curiousAbout", e.target.value)}
                rows={4}
                className={inputClass}
              />
              {errors.curiousAbout && <p className={errorClass}>{errors.curiousAbout}</p>}
            </div>

            <div>
              <label htmlFor="surprisingKnowledge" className={labelClass}>
                What do you know a surprising amount about? *
              </label>
              <textarea
                id="surprisingKnowledge"
                value={formData.surprisingKnowledge}
                onChange={(e) => updateField("surprisingKnowledge", e.target.value)}
                rows={4}
                className={inputClass}
              />
              <p className="body-sm text-warm-gray mt-1.5">
                Doesn&rsquo;t have to be professional - could be anything from vintage motorcycles to the history of
                your neighborhood.
              </p>
              {errors.surprisingKnowledge && <p className={errorClass}>{errors.surprisingKnowledge}</p>}
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="privacyPolicy"
                checked={formData.privacyAccepted}
                onChange={(e) => updateField("privacyAccepted", e.target.checked)}
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
            {errors.privacyAccepted && <p className={errorClass}>{errors.privacyAccepted}</p>}
          </div>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-full bg-terracotta py-4 text-lg font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === "submitting"
            ? "Saving..."
            : currentPage === 1
              ? "Get Started"
              : currentPage === 2
                ? "Next"
                : "Count Me In"}
        </button>

        {status === "error" && (
          <p className="body-sm text-center text-red-600">
            Something went wrong - please try again or email{" "}
            <a href="mailto:joe@con-vive.com" className="underline">
              joe@con-vive.com
            </a>
          </p>
        )}

        {currentPage > 1 && (
          <button
            type="button"
            onClick={goBack}
            className="w-full text-center body-sm text-warm-gray hover:text-charcoal transition-colors"
          >
            Back
          </button>
        )}
      </form>
    </section>
  );
}
