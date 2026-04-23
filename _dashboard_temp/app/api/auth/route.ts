import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from '@/lib/constants';
import { generateAuthToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const correctPassword = process.env.DASHBOARD_PASSWORD;

    if (!correctPassword) {
      console.error('DASHBOARD_PASSWORD environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (password !== correctPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Generate auth token and set cookie
    const token = generateAuthToken();
    const response = NextResponse.json({ success: true });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
