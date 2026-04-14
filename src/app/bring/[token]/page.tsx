"use client";

import { useEffect, useState, use } from "react";

interface BringItem {
  id: number;
  category: string;
  description: string | null;
  slots: number;
  claimed_by: number | null;
  claimer_first_name: string | null;
}

interface BringData {
  guest: {
    id: number;
    first_name: string;
  };
  dinner: {
    id: number;
    name: string;
    date: string;
    host: string;
    menu: string | null;
  };
  items: BringItem[];
}

function formatDate(dateStr: string): string {
  // Parse ISO date string and format in UTC to avoid timezone shifts
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function BringPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<BringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/bring/${token}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("invalid");
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

  async function handleClaim(itemId: number) {
    if (claiming) return;
    setClaiming(itemId);

    try {
      const response = await fetch(`/api/bring/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || "Failed to claim item");
        return;
      }

      // Refresh data
      const refreshResponse = await fetch(`/api/bring/${token}`);
      if (refreshResponse.ok) {
        setData(await refreshResponse.json());
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setClaiming(null);
    }
  }

  async function handleUnclaim(itemId: number) {
    if (claiming) return;
    setClaiming(itemId);

    try {
      const response = await fetch(`/api/bring/${token}/unclaim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || "Failed to unclaim item");
        return;
      }

      // Refresh data
      const refreshResponse = await fetch(`/api/bring/${token}`);
      if (refreshResponse.ok) {
        setData(await refreshResponse.json());
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setClaiming(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="body-lg text-warm-gray">Loading...</div>
      </div>
    );
  }

  if (error === "invalid") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mx-auto max-w-lg">
          <h1 className="heading-1 text-charcoal">Link Not Found</h1>
          <p className="body-lg mt-6 text-warm-gray">
            This link doesn&rsquo;t seem to be valid. It may have expired or
            been entered incorrectly.
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

  if (error === "error" || !data) {
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

  const { guest, dinner, items } = data;
  const myClaimedItem = items.find((item) => item.claimed_by === guest.id);
  const availableItems = items.filter((item) => item.claimed_by === null);
  const otherClaimedItems = items.filter(
    (item) => item.claimed_by !== null && item.claimed_by !== guest.id
  );

  // Group items by category
  const categories = [...new Set(items.map((item) => item.category))];

  return (
    <div className="flex min-h-screen flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div className="text-center">
          <h1 className="heading-1 text-charcoal">
            Hey {guest.first_name}!
          </h1>
          <p className="body-lg mt-4 text-warm-gray">
            {dinner.host}&rsquo;s dinner on {formatDate(dinner.date)}
          </p>
        </div>

        {/* Menu (if set) */}
        {dinner.menu && (
          <div className="mt-8 rounded-xl border border-border bg-white p-6">
            <h2 className="heading-2 text-charcoal">Menu</h2>
            <p className="body-base mt-3 whitespace-pre-wrap text-warm-gray">
              {dinner.menu}
            </p>
          </div>
        )}

        {/* Your claimed item */}
        {myClaimedItem && (
          <div className="mt-8 rounded-xl border-2 border-terracotta bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="body-sm font-medium text-terracotta">
                  You&rsquo;re bringing
                </p>
                <p className="heading-2 mt-1 text-charcoal">
                  {myClaimedItem.category}
                </p>
                {myClaimedItem.description && (
                  <p className="body-sm mt-1 text-warm-gray">
                    {myClaimedItem.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleUnclaim(myClaimedItem.id)}
                disabled={claiming !== null}
                className="body-sm text-terracotta underline hover:opacity-80 disabled:opacity-50"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Available items */}
        {!myClaimedItem && availableItems.length > 0 && (
          <div className="mt-8">
            <h2 className="heading-2 text-charcoal">
              What would you like to bring?
            </h2>
            <div className="mt-4 space-y-3">
              {availableItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-white p-4"
                >
                  <div>
                    <p className="body-base font-medium text-charcoal">
                      {item.category}
                    </p>
                    {item.description && (
                      <p className="body-sm text-warm-gray">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleClaim(item.id)}
                    disabled={claiming !== null}
                    className="rounded-full bg-terracotta px-4 py-2 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {claiming === item.id ? "..." : "I'll bring this"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All items claimed message */}
        {!myClaimedItem && availableItems.length === 0 && items.length > 0 && (
          <div className="mt-8 rounded-xl border border-border bg-white p-6 text-center">
            <p className="body-lg text-charcoal">
              All items have been claimed!
            </p>
            <p className="body-base mt-2 text-warm-gray">
              If you&rsquo;d still like to bring something, text Joe.
            </p>
          </div>
        )}

        {/* No items message */}
        {items.length === 0 && (
          <div className="mt-8 rounded-xl border border-border bg-white p-6 text-center">
            <p className="body-lg text-charcoal">
              No items to bring yet.
            </p>
            <p className="body-base mt-2 text-warm-gray">
              Check back later or text Joe if you&rsquo;d like to bring something.
            </p>
          </div>
        )}

        {/* What others are bringing */}
        {otherClaimedItems.length > 0 && (
          <div className="mt-8">
            <h2 className="heading-2 text-charcoal">
              What others are bringing
            </h2>
            <div className="mt-4 space-y-3">
              {otherClaimedItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-cream/50 p-4"
                >
                  <p className="body-base text-charcoal">
                    <span className="font-medium">{item.claimer_first_name}</span>{" "}
                    is bringing {item.category.toLowerCase()}
                  </p>
                  {item.description && (
                    <p className="body-sm text-warm-gray">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
