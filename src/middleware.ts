import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(request) {
    const role = request.nextauth.token?.role;
    const path = request.nextUrl.pathname;

    if (path.startsWith('/client') && role !== 'CLIENT') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (path.startsWith('/retailer') && role !== 'RETAILER') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (path.startsWith('/super-user') && role !== 'SUPER_USER') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      // Fail closed: any protected route requires a valid session token.
      authorized: ({ token }) => Boolean(token),
    },
  }
);

export const config = {
  matcher: ['/client/:path*', '/retailer/:path*', '/super-user/:path*'],
};
