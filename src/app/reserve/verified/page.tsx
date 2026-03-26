"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VerifiedPage() {
  const [status, setStatus] = useState<"loading" | "processing" | "requires_input" | "verified" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [continueUrl, setContinueUrl] = useState("");

  useEffect(() => {
    async function checkVerification() {
      // Get session ID from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      let sessionId = urlParams.get("session_id");

      // If URL has placeholder or no session_id, check localStorage
      if (!sessionId || sessionId === "{VERIFICATION_SESSION_ID}") {
        sessionId = localStorage.getItem("verification_session_id");
      }

      if (!sessionId) {
        setErrorMessage("We couldn't find your verification session.");
        setStatus("error");
        return;
      }

      try {
        const res = await fetch("/api/reserve/check-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(data.error || "Something went wrong.");
          setStatus("error");
          return;
        }

        if (data.checkoutUrl) {
          // Clear localStorage and redirect to checkout
          localStorage.removeItem("verification_session_id");
          window.location.href = data.checkoutUrl;
          return;
        }

        if (data.status === "processing") {
          setStatus("processing");
        } else if (data.status === "requires_input") {
          setStatus("requires_input");
          setContinueUrl(data.continueUrl || "");
        } else {
          setErrorMessage("Verification was not successful.");
          setStatus("error");
        }
      } catch {
        setErrorMessage("Network error. Please try again.");
        setStatus("error");
      }
    }

    checkVerification();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="heading-1 text-charcoal">Checking verification...</h1>
        <p className="body-base mt-4 text-warm-gray">Please wait a moment.</p>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="heading-1 text-charcoal">Verification in progress</h1>
        <p className="body-base mt-4 text-warm-gray">
          We&rsquo;re still reviewing your documents. This usually takes just a moment.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 inline-block rounded-full bg-terracotta px-8 py-3 text-cream transition-opacity hover:opacity-90"
        >
          Check status
        </button>
      </div>
    );
  }

  if (status === "requires_input") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="heading-1 text-charcoal">Verification incomplete</h1>
        <p className="body-base mt-4 text-warm-gray">
          We need a bit more information to complete your verification.
        </p>
        {continueUrl && (
          <a
            href={continueUrl}
            className="mt-8 inline-block rounded-full bg-terracotta px-8 py-3 text-cream transition-opacity hover:opacity-90"
          >
            Continue verification
          </a>
        )}
      </div>
    );
  }

  // Error state
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="heading-1 text-charcoal">Something went wrong</h1>
      <p className="body-base mt-4 text-warm-gray">{errorMessage}</p>
      <Link
        href="/reserve"
        className="mt-8 inline-block rounded-full bg-terracotta px-8 py-3 text-cream transition-opacity hover:opacity-90"
      >
        Try again
      </Link>
      <a
        href="mailto:joe@con-vive.com"
        className="mt-4 body-sm text-terracotta underline hover:opacity-80"
      >
        Contact support
      </a>
    </div>
  );
}
