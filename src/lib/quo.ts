import { createHmac, timingSafeEqual } from "crypto";

const FROM_PHONE = "+17602748830";

interface QuoMessageResponse {
  data: {
    id: string;
  };
}

/**
 * Sends an SMS via Quo (OpenPhone) API
 * @param to Phone number in E.164 format (e.g., +15551234567)
 * @param content Message body
 * @returns Object containing the message ID
 */
export async function sendSms(to: string, content: string): Promise<{ id: string }> {
  const apiKey = process.env.QUO_API_KEY;
  if (!apiKey) throw new Error("QUO_API_KEY not set");

  const res = await fetch("https://api.openphone.com/v1/messages", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      from: FROM_PHONE,
      to: [to],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Quo API ${res.status}: ${body}`);
  }

  const json = (await res.json()) as QuoMessageResponse;
  return { id: json.data.id };
}

/**
 * Verifies the OpenPhone webhook signature
 * Header format: hmac;1;{timestamp};{signature}
 * Signature is HMAC-SHA256 of "{timestamp}.{rawBody}" using base64-decoded secret
 * @param payload The raw request body as a string
 * @param header The openphone-signature header value
 * @returns True if signature is valid
 */
export function verifyQuoSignature(payload: string, header: string): boolean {
  const secret = process.env.QUO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("QUO_WEBHOOK_SECRET not set");
    return false;
  }

  // Parse header: hmac;1;{timestamp};{signature}
  const parts = header.split(";");
  if (parts.length !== 4 || parts[0] !== "hmac" || parts[1] !== "1") {
    console.error("Invalid signature header format");
    return false;
  }

  const timestamp = parts[2];
  const providedSignature = parts[3];

  // Decode the base64 secret
  const secretKey = Buffer.from(secret, "base64");

  // Create the signed payload: timestamp.body
  const signedPayload = `${timestamp}.${payload}`;

  // Compute HMAC-SHA256
  const expectedSignature = createHmac("sha256", secretKey).update(signedPayload).digest("base64");

  // Timing-safe comparison
  try {
    const providedBuffer = Buffer.from(providedSignature, "base64");
    const expectedBuffer = Buffer.from(expectedSignature, "base64");

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
