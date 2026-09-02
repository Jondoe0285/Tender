import NextAuth from 'next-auth';
import { authOptions } from '@/server/auth/auth';
import { createRateLimitResponse } from '@/server/http/rateLimit';

const handler = NextAuth(authOptions);

async function limitedHandler(request: Request, context?: { params?: Record<string, string[] | string> }) {
  // Only throttle actual credential login attempts — session/csrf/signout checks share this
  // same catch-all route and must never be blocked by a login-attempt rate limit (SEC-052 aside,
  // that previously broke sign-out once the shared budget was used up by normal session polling).
  const isCredentialsLogin = request.method === 'POST' && new URL(request.url).pathname.endsWith('/callback/credentials');
  if (isCredentialsLogin) {
    const rateLimitError = await createRateLimitResponse(request, 'login', { maxRequests: 10, windowMs: 60_000 });
    if (rateLimitError) return rateLimitError;
  }

  return handler(request as never, context as never);
}

export { limitedHandler as GET, limitedHandler as POST };
