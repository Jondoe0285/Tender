import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { appUrl } from '@/server/config/appUrl';

export default withAuth(
  function middleware(request) {
    const role = request.nextauth.token?.role;
    const path = request.nextUrl.pathname;

    // The proxied request host is the internal listener, so redirect against the public origin.
    if (path.startsWith('/client') && role !== 'CLIENT') {
      return NextResponse.redirect(appUrl('/login'));
    }
    if (path.startsWith('/retailer') && role !== 'RETAILER') {
      return NextResponse.redirect(appUrl('/login'));
    }
    if (path.startsWith('/super-user') && role !== 'SUPER_USER') {
      return NextResponse.redirect(appUrl('/login'));
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
