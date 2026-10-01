import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { inAppRedirect } from '@/server/http/inAppRedirect';

export default withAuth(
  function proxy(request) {
    const role = request.nextauth.token?.role;
    const path = request.nextUrl.pathname;
    const isOwner = Boolean(request.nextauth.token?.isOwner);
    const mfaEnabled = Boolean(request.nextauth.token?.mfaEnabled);
    const platformMfaActive = Boolean(request.nextauth.token?.platformMfaActive);

    const mustChangePassword = Boolean(request.nextauth.token?.mustChangePassword);

    if (isOwner && !mfaEnabled && path.startsWith('/super-user/owner')) {
      return inAppRedirect('/account/security');
    }
    if (role === 'SUPER_USER' && !mfaEnabled && platformMfaActive && path.startsWith('/super-user')) {
      return inAppRedirect('/account/security');
    }
    if (role === 'USER' && mustChangePassword && path !== '/change-password') {
      return inAppRedirect('/change-password');
    }
    if (path === '/change-password') {
      if (role !== 'USER') return inAppRedirect(role === 'SUPER_USER' ? '/super-user' : '/login');
      if (!mustChangePassword) return inAppRedirect('/user');
      return NextResponse.next();
    }

    const isClientPath = path.startsWith('/client') || path.startsWith('/contractor') || path.startsWith('/user');
    const isRetailerPath = path.startsWith('/retailer') || path.startsWith('/provider');

    if (isClientPath && role !== 'USER') {
      return inAppRedirect('/login');
    }
    if (isRetailerPath && role !== 'USER') {
      return inAppRedirect('/login');
    }
    if (path.startsWith('/super-user') && role !== 'SUPER_USER') {
      return inAppRedirect(role === 'USER' ? '/forbidden' : '/login');
    }

    if (path.startsWith('/user')) {
      if (path.startsWith('/user/opportunities')) return NextResponse.rewrite(new URL(path.replace(/^\/user\/opportunities/, '/retailer/opportunities'), request.url));
      if (path.startsWith('/user/unlocked')) return NextResponse.rewrite(new URL(path.replace(/^\/user\/unlocked/, '/retailer/unlocked'), request.url));
      if (path.startsWith('/user/quotes')) return NextResponse.rewrite(new URL(path.replace(/^\/user\/quotes/, '/retailer/quotes'), request.url));
      if (path.startsWith('/user/profile')) return NextResponse.rewrite(new URL(path.replace(/^\/user\/profile/, '/client/profile'), request.url));
      if (path.startsWith('/user/billing')) return NextResponse.rewrite(new URL(path.replace(/^\/user\/billing/, '/retailer/billing'), request.url));
      return NextResponse.rewrite(new URL(path.replace(/^\/user/, '/client'), request.url));
    }
    if (path.startsWith('/client') || path.startsWith('/contractor')) {
      return inAppRedirect(path.replace(/^\/(client|contractor)/, '/user'));
    }
    if (path.startsWith('/retailer')) {
      return inAppRedirect(path.replace(/^\/retailer/, '/provider'));
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
  matcher: ['/client/:path*', '/contractor/:path*', '/retailer/:path*', '/provider/:path*', '/user/:path*', '/super-user/:path*', '/change-password'],
};