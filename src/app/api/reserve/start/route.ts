import { NextResponse } from "next/server";
import { stripe, getBaseUrl } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] ||
               headersList.get("x-real-ip") ||
               "unknown";

    const { success, remaining } = rateLimit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "X-RateLimit-Remaining": remaining.toString() }
        }
      );
    }

    const body = await request.json();
    const { email, name } = body;

    const baseUrl = getBaseUrl();

    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      metadata: {
        email: email || "",
        name: name || "",
      },
    });

    // Update the session with return_url containing the actual session ID
    const updatedSession = await stripe.identity.verificationSessions.update(
      verificationSession.id,
      {
        return_url: `${baseUrl}/reserve/verified?session_id=${verificationSession.id}`,
      }
    );

    return NextResponse.json({ url: updatedSession.url });
  } catch (error) {
    console.error("Reserve start error:", error);
    return NextResponse.json(
      { error: "Failed to create verification session" },
      { status: 500 }
    );
  }
}
