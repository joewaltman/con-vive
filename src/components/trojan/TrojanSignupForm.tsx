"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-4 py-3 text-charcoal placeholder:text-warm-gray/60 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta";
const labelClass = "body-sm mb-1.5 block font-medium text-charcoal";
const errorClass = "body-sm text-red-600 mt-1.5";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DIETARY_OPTIONS = [
  "None",
  "No Gluten",
  "No Dairy",
  "No Pork",
  "No Shellfish",
  "Vegetarian",
  "Vegan",
  "No Red Meat",
  "Lactose Intolerant",
  "No Fish",
  "Other",
];

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

interface BringItem {
  slot: number;
  name: string;
  claimed_by_guest_id: number | null;
}

interface TrojanSignupFormProps {
  bringItems: BringItem[];
  isWaitlistMode: boolean;
  onWaitlistSuccess: () => void;
}

export function TrojanSignupForm({
  bringItems,
  isWaitlistMode,
  onWaitlistSuccess,
}: TrojanSignupFormProps) {
  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "redirecting" | "error"
  >("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // Page 1
    firstName: "",
    lastName: "",
    email: "",
    graduationYear: "",
    major: "",
    // Page 2
    phone: "",
    phoneDigits: "",
    gender: "",
    zipCode: "",
    dietaryRestrictions: [] as string[],
    dietaryNotes: "",
    availableDays: [...DAYS],
    bringItemSlot: null as number | null,
  });

  function updateField<K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) {
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

  function toggleDietary(option: string) {
    setFormData((prev) => {
      let restrictions = [...prev.dietaryRestrictions];
      if (option === "None") {
        restrictions = restrictions.includes("None") ? [] : ["None"];
      } else {
        restrictions = restrictions.filter((d) => d !== "None");
        if (restrictions.includes(option)) {
          restrictions = restrictions.filter((d) => d !== option);
        } else {
          restrictions.push(option);
        }
      }
      return { ...prev, dietaryRestrictions: restrictions };
    });
  }

  function validatePage1(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    const year = parseInt(formData.graduationYear, 10);
    if (!formData.graduationYear.trim()) {
      newErrors.graduationYear = "Graduation year is required";
    } else if (isNaN(year) || year < 1940 || year > 2030) {
      newErrors.graduationYear = "Please enter a valid graduation year (1940-2030)";
    }
    if (!formData.major.trim()) newErrors.major = "Major is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validatePage2(): boolean {
    const newErrors: Record<string, string> = {};
    if (formData.phoneDigits.length !== 10) {
      newErrors.phone = "Please enter a valid 10-digit US phone number";
    }
    if (!formData.gender) newErrors.gender = "Please select your gender";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handlePage1Submit() {
    if (!validatePage1()) return;

    setStatus("submitting");
    try {
      if (isWaitlistMode) {
        // Submit to waitlist
        const res = await fetch("/api/trojan/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            graduationYear: formData.graduationYear,
            major: formData.major,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to join waitlist");
        }

        onWaitlistSuccess();
        return;
      }

      // Normal signup flow - continue to page 2
      const res = await fetch("/api/trojan/signup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          graduationYear: formData.graduationYear,
          major: formData.major,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Signup failed");
      }

      const data = await res.json();
      setGuestId(data.guestId);
      setStatus("idle");
      setCurrentPage(2);
    } catch (err) {
      console.error("Page 1 submit error:", err);
      setStatus("error");
    }
  }

  async function handlePage2Submit() {
    if (!validatePage2()) return;

    setStatus("submitting");
    try {
      // Complete guest profile
      const completeRes = await fetch("/api/trojan/signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          phone: formData.phoneDigits,
          gender: formData.gender,
          zipCode: formData.zipCode,
          dietaryRestrictions: formData.dietaryRestrictions,
          dietaryNotes: formData.dietaryNotes,
          availableDays: formData.availableDays,
          bringItemSlot: formData.bringItemSlot,
        }),
      });

      if (!completeRes.ok) {
        const data = await completeRes.json();
        throw new Error(data.error || "Failed to complete signup");
      }

      const completeData = await completeRes.json();

      // Create checkout session
      const checkoutRes = await fetch("/api/trojan/signup/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          token: completeData.token,
        }),
      });

      if (!checkoutRes.ok) {
        const data = await checkoutRes.json();
        throw new Error(data.error || "Failed to create checkout");
      }

      const checkoutData = await checkoutRes.json();

      setStatus("redirecting");
      window.location.href = checkoutData.url;
    } catch (err) {
      console.error("Page 2 submit error:", err);
      setStatus("error");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (currentPage === 1) handlePage1Submit();
    else handlePage2Submit();
  }

  function goBack() {
    setErrors({});
    setStatus("idle");
    setCurrentPage(1);
  }

  const availableBringItems = bringItems.filter(
    (item) => item.claimed_by_guest_id === null
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Bar */}
      {!isWaitlistMode && (
        <div className="mb-8">
          <p className="body-sm text-charcoal font-medium mb-2">
            Step {currentPage} of 2
          </p>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-terracotta transition-all duration-500"
              style={{ width: `${(currentPage / 2) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Page 1: Basic Info + USC Details */}
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
              {errors.firstName && (
                <p className={errorClass}>{errors.firstName}</p>
              )}
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
              {errors.lastName && (
                <p className={errorClass}>{errors.lastName}</p>
              )}
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

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="graduationYear" className={labelClass}>
                Graduation year *
              </label>
              <input
                type="text"
                id="graduationYear"
                value={formData.graduationYear}
                onChange={(e) =>
                  updateField(
                    "graduationYear",
                    e.target.value.replace(/\D/g, "").slice(0, 4)
                  )
                }
                inputMode="numeric"
                maxLength={4}
                placeholder="e.g., 1995"
                className={inputClass}
              />
              {errors.graduationYear && (
                <p className={errorClass}>{errors.graduationYear}</p>
              )}
            </div>
            <div>
              <label htmlFor="major" className={labelClass}>
                Major/degree *
              </label>
              <input
                type="text"
                id="major"
                value={formData.major}
                onChange={(e) => updateField("major", e.target.value)}
                placeholder="e.g., Business Administration"
                className={inputClass}
              />
              {errors.major && <p className={errorClass}>{errors.major}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Page 2: Contact + Preferences */}
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
              We&rsquo;ll text you dinner details and reminders.
            </p>
            {errors.phone && <p className={errorClass}>{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="gender" className={labelClass}>
              Gender *
            </label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => updateField("gender", e.target.value)}
              className={inputClass}
            >
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
            {errors.gender && <p className={errorClass}>{errors.gender}</p>}
          </div>

          <div>
            <label htmlFor="zipCode" className={labelClass}>
              Zip code
            </label>
            <input
              type="text"
              id="zipCode"
              value={formData.zipCode}
              onChange={(e) =>
                updateField("zipCode", e.target.value.slice(0, 10))
              }
              inputMode="numeric"
              maxLength={10}
              placeholder="92024"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Dietary restrictions</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DIETARY_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    formData.dietaryRestrictions.includes(option)
                      ? "border-terracotta bg-terracotta/10"
                      : "border-border bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.dietaryRestrictions.includes(option)}
                    onChange={() => toggleDietary(option)}
                    className="sr-only"
                  />
                  <span className="body-sm text-charcoal">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {formData.dietaryRestrictions.includes("Other") && (
            <div>
              <label htmlFor="dietaryNotes" className={labelClass}>
                Please describe
              </label>
              <input
                type="text"
                id="dietaryNotes"
                value={formData.dietaryNotes}
                onChange={(e) => updateField("dietaryNotes", e.target.value)}
                placeholder="e.g., allergic to tree nuts"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>
              What days work for future dinners?
            </label>
            <p className="body-sm text-warm-gray mb-2">
              Uncheck any days that don&rsquo;t work for you.
            </p>
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

          {availableBringItems.length > 0 && (
            <div>
              <label className={labelClass}>What would you like to bring?</label>
              <p className="body-sm text-warm-gray mb-2">
                Optional. Each guest brings something to share.
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="bringItem"
                    value=""
                    checked={formData.bringItemSlot === null}
                    onChange={() => updateField("bringItemSlot", null)}
                    className="h-4 w-4 border-border text-terracotta focus:ring-terracotta"
                  />
                  <span className="body-base text-charcoal">
                    I&rsquo;ll decide later
                  </span>
                </label>
                {availableBringItems.map((item) => (
                  <label
                    key={item.slot}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="bringItem"
                      value={item.slot}
                      checked={formData.bringItemSlot === item.slot}
                      onChange={() => updateField("bringItemSlot", item.slot)}
                      className="h-4 w-4 border-border text-terracotta focus:ring-terracotta"
                    />
                    <span className="body-base text-charcoal">{item.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || status === "redirecting"}
        className="w-full rounded-full bg-terracotta py-4 text-lg font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "submitting"
          ? "Saving..."
          : status === "redirecting"
          ? "Redirecting to payment..."
          : isWaitlistMode
          ? "Join Waitlist"
          : currentPage === 1
          ? "Continue"
          : "Continue to Payment"}
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
  );
}
