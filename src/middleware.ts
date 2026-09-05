import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { appUrl } from '@/server/config/appUrl';

export default withAuth(
  function middleware(request) {
    const role = request.nextauth.token?.role;
    const path = request.nextUrl.pathname;

    // The proxied request host is the internal listener, so redirect against the public origin.
    const isClientPath = path.startsWith('/client') || path.startsWith('/contractor') || path.startsWith('/user');
    const isRetailerPath = path.startsWith('/retailer') || path.startsWith('/provider');

    if (isClientPath && role !== 'USER') {
      return NextResponse.redirect(appUrl('/login'));
    }
    if (isRetailerPath && role !== 'USER') {
      return NextResponse.redirect(appUrl('/login'));
    }
    if (path.startsWith('/super-user') && role !== 'SUPER_USER') {
      return NextResponse.redirect(appUrl('/login'));
    }

    if (path.startsWith('/user')) {
      if (path.startsWith('/user/opportunities')) return NextResponse.rewrite(new URL(path.replace(/^\/user\/opportunities/, '/retailer/opportunities'), request.url));
      if (path.startsWith('/user/unlocked')) return NextResponse.rewrite(new URL(path.replace(/^\/user\/unlocked/, '/retailer/unlocked'), request.url));
      if (path.startsWith('/user/quotes')) return NextResponse.rewrite(new URL(path.replace(/^\/user\/quotes/, '/retailer/quotes'), request.url));
      if (path.startsWith('/user/profile')) return NextResponse.rewrite(new URL(path.replace(/^\/user\/profile/, '/client/profile'), request.url));
      if (path.startsWith('/user/billing')) return NextResponse.rewrite(new URL(path.replace(/^\/user\/billing/, '/retailer/billing'), request.url));
      return NextResponse.rewrite(new URL(path.replace(/^\/user/, '/client'), request.url));
    }
    if (path.startsWith('/client')) {
      return NextResponse.redirect(new URL(path.replace(/^\/client/, '/contractor'), request.url));
    }
    if (path.startsWith('/retailer')) {
      return NextResponse.redirect(new URL(path.replace(/^\/retailer/, '/provider'), request.url));
    }
    if (path.startsWith('/contractor')) {
      return NextResponse.rewrite(new URL(path.replace(/^\/contractor/, '/client'), request.url));
    }
    if (path.startsWith('/provider')) {
      return NextResponse.rewrite(new URL(path.replace(/^\/provider/, '/retailer'), request.url));
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
  matcher: ['/client/:path*', '/contractor/:path*', '/retailer/:path*', '/provider/:path*', '/user/:path*', '/super-user/:path*'],
};
