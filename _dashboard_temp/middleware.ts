import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from './lib/constants';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/api/auth'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Check for auth cookie
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  const isAuthenticated = !!authCookie?.value;

  // If not authenticated and trying to access protected route, redirect to login
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access login, redirect to dashboard
  if (isAuthenticated && pathname === '/login') {
    const dashboardUrl = new URL('/', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
