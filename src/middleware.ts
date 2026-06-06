import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;

  // Protect the dashboard and all other main application routes
  const protectedRoutes = [
    '/dashboard', '/vendors', '/rfq', '/quotation', '/approvals', 
    '/purchase-orders', '/invoices', '/reports', '/activity'
  ];

  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  if (isProtectedRoute && !token) {
    // No token, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Prevent logged in users from visiting login/signup pages
  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.some(route => request.nextUrl.pathname === route);

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
