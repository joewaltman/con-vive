"use client";

import { useState } from "react";

interface ReserveButtonProps {
  email?: string;
  name?: string;
}

export function ReserveButton({ email, name }: ReserveButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleClick() {
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/reserve/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 429) {
          setErrorMessage(data.error || "Too many requests. Please try again later.");
        } else {
          setErrorMessage(data.error || "Something went wrong. Please try again.");
        }
        setStatus("error");
        return;
      }

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage("Failed to start verification. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className="w-full rounded-full bg-terracotta py-4 text-lg font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "loading" ? "Starting verification..." : "Verify & Reserve"}
      </button>

      {status === "error" && errorMessage && (
        <p className="body-sm text-center text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
