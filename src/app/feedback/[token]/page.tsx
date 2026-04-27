"use client";

import { useEffect, useState, use } from "react";
import type { FeedbackPageData, FeedbackRating } from "@/lib/types/booking";

type RatingValue = "yes" | "no" | "not_sure";

export default function FeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<FeedbackPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Map<number, RatingValue>>(new Map());
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/feedback/${token}`);
        if (!response.ok) {
          const result = await response.json();
          if (response.status === 404) {
            setError("invalid");
          } else if (response.status === 410) {
            setError(result.reason || "expired");
          } else {
            setError("error");
          }
          return;
        }
        const result = await response.json();
        setData(result);
      } catch {
        setError("error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  function handleRatingChange(guestId: number, rating: RatingValue) {
    setRatings((prev) => {
      const next = new Map(prev);
      next.set(guestId, rating);
      return next;
    });
  }

  async function handleSubmit() {
    if (!data || submitting) return;

    // Check all ratings are selected
    const allRated = data.attendees.every((a) => ratings.has(a.id));
    if (!allRated) {
      alert("Please rate everyone before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const ratingsArray: FeedbackRating[] = data.attendees.map((a) => ({
        rateeGuestId: a.id,
        rating: ratings.get(a.id)!,
      }));

      const response = await fetch(`/api/feedback/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ratings: ratingsArray,
          comment: comment.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to submit feedback");
      }

      setSubmitted(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="body-lg text-warm-gray">Loading...</div>
      </div>
    );
  }

  // Invalid token
  if (error === "invalid") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mx-auto max-w-lg">
          <h1 className="heading-1 text-charcoal">Link Not Found</h1>
          <p className="body-lg mt-6 text-warm-gray">
            This feedback link doesn&rsquo;t seem to be valid. It may have been
            entered incorrectly.
          </p>
          <p className="body-base mt-6 text-charcoal">
            Questions? Text Joe at{" "}
            <a href="sms:+17602748830" className="text-terracotta underline">
              (760) 274-8830
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Expired or already completed
  if (error === "expired" || error === "completed") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mx-auto max-w-lg">
          <h1 className="heading-1 text-charcoal">
            {error === "completed" ? "Already Submitted" : "Link Expired"}
          </h1>
          <p className="body-lg mt-6 text-warm-gray">
            {error === "completed"
              ? "You've already submitted feedback for this dinner. Thanks!"
              : "This feedback link has expired."}
          </p>
          <p className="body-base mt-6 text-charcoal">
            Questions? Text Joe at{" "}
            <a href="sms:+17602748830" className="text-terracotta underline">
              (760) 274-8830
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Generic error
  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mx-auto max-w-lg">
          <h1 className="heading-1 text-charcoal">Something Went Wrong</h1>
          <p className="body-lg mt-6 text-warm-gray">
            We couldn&rsquo;t load the page. Please try again later.
          </p>
          <p className="body-base mt-6 text-charcoal">
            Questions? Text Joe at{" "}
            <a href="sms:+17602748830" className="text-terracotta underline">
              (760) 274-8830
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mx-auto max-w-lg">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="heading-1 text-charcoal">Thank You!</h1>
          <p className="body-lg mt-6 text-warm-gray">
            Your feedback helps me put better tables together. I really appreciate you taking the time.
          </p>
          <p className="body-base mt-8 text-charcoal">
            Hope to see you at the next dinner!
          </p>
          <p className="body-sm mt-8 text-warm-gray">
            – Joe
          </p>
        </div>
      </div>
    );
  }

  const { dinnerName, dinnerDate, attendees } = data;
  const allRated = attendees.every((a) => ratings.has(a.id));

  return (
    <div className="flex min-h-screen flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div className="text-center">
          <h1 className="heading-1 text-charcoal">How was {dinnerName}?</h1>
          <p className="body-lg mt-2 text-warm-gray">{dinnerDate}</p>
        </div>

        {/* Intro */}
        <div className="mt-8 rounded-xl bg-cream/50 p-4 text-center">
          <p className="body-base text-charcoal">
            One quick question for each person at the table. Takes about a minute.
          </p>
        </div>

        {/* Attendee Ratings */}
        <div className="mt-8 space-y-4">
          {attendees.map((attendee) => (
            <div
              key={attendee.id}
              className="rounded-xl border border-border bg-white p-4"
            >
              <p className="body-base font-medium text-charcoal mb-3">
                Were you glad <span className="text-terracotta">{attendee.firstName}</span> was at the table?
              </p>
              <div className="flex gap-2">
                <RatingButton
                  label="Yes"
                  selected={ratings.get(attendee.id) === "yes"}
                  onClick={() => handleRatingChange(attendee.id, "yes")}
                  variant="yes"
                />
                <RatingButton
                  label="Not sure"
                  selected={ratings.get(attendee.id) === "not_sure"}
                  onClick={() => handleRatingChange(attendee.id, "not_sure")}
                  variant="neutral"
                />
                <RatingButton
                  label="No"
                  selected={ratings.get(attendee.id) === "no"}
                  onClick={() => handleRatingChange(attendee.id, "no")}
                  variant="no"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Optional Comment */}
        <div className="mt-8 rounded-xl border border-border bg-white p-4">
          <label className="block">
            <span className="body-base font-medium text-charcoal">
              Anything else you want to share about the dinner?
            </span>
            <span className="body-sm text-warm-gray ml-2">(optional)</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-lg border border-border p-3 text-charcoal placeholder:text-warm-gray/50 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
              placeholder="Any thoughts, suggestions, or feedback..."
            />
          </label>
        </div>

        {/* Submit Button */}
        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={!allRated || submitting}
            className="w-full rounded-full bg-terracotta px-6 py-4 text-center text-lg font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
          {!allRated && (
            <p className="body-sm mt-3 text-center text-warm-gray">
              Please rate everyone before submitting
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="body-sm text-warm-gray">
            Questions? Text Joe at{" "}
            <a href="sms:+17602748830" className="text-terracotta underline">
              (760) 274-8830
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function RatingButton({
  label,
  selected,
  onClick,
  variant,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  variant: "yes" | "neutral" | "no";
}) {
  const baseClasses =
    "flex-1 rounded-lg border-2 py-2 px-3 text-center text-sm font-medium transition-colors";

  const variantClasses = {
    yes: selected
      ? "border-green-500 bg-green-50 text-green-700"
      : "border-border text-charcoal hover:border-green-300",
    neutral: selected
      ? "border-gray-400 bg-gray-100 text-gray-700"
      : "border-border text-charcoal hover:border-gray-300",
    no: selected
      ? "border-red-400 bg-red-50 text-red-700"
      : "border-border text-charcoal hover:border-red-300",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {label}
    </button>
  );
}
