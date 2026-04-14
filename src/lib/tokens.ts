import { randomBytes } from "crypto";

export function generateBringToken(): string {
  return randomBytes(8).toString("base64url").slice(0, 12);
}
