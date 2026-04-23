import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/admin/constants';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only gate /admin/* routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Public admin routes
  const publicAdminRoutes = ['/admin/login', '/api/admin/auth'];
  const isPublicAdminRoute = publicAdminRoutes.some(r => pathname.startsWith(r));

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  const isAuthenticated = !!authCookie?.value;

  if (!isAuthenticated && !isPublicAdminRoute) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (isAuthenticated && pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
