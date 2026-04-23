import { randomBytes } from "crypto";

export function generateBringToken(): string {
  return randomBytes(8).toString("base64url").slice(0, 12);
}

export function generateBookingToken(): string {
  return randomBytes(12).toString("base64url").slice(0, 16);
}
