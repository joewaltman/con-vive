import { randomBytes } from 'crypto';

export function generateMagicToken(): string {
  return randomBytes(32).toString('base64url');
}
