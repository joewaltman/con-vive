import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME } from './constants';

// Simple token generation - in production you might want something more robust
export function generateAuthToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `${timestamp}-${random}`;
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  return !!authCookie?.value;
}

export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}
