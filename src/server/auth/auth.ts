import type { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/server/data/prisma';
import { verifyPassword } from '@/server/auth/password';
import { recordAuditEvent } from '@/server/audit/auditLog';

export const authOptions: AuthOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Client input is untrusted: re-validate shape before touching the database.
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { roleMemberships: { select: { role: true } } },
        });
        if (!user || user.suspended || !user.emailVerifiedAt) return null;

        const validPassword = await verifyPassword(password, user.passwordHash);
        if (!validPassword) return null;

        const roles = user.roleMemberships.length > 0
          ? user.roleMemberships.map((membership) => membership.role)
          : [user.role];
        return { id: user.id, email: user.email, role: user.role, roles, isOwner: user.isOwner, isAccountant: user.isAccountant };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.roles = (user as { roles: string[] }).roles;
        token.isOwner = (user as { isOwner: boolean }).isOwner;
        token.isAccountant = (user as { isAccountant: boolean }).isAccountant;
      }
      if (trigger === 'update' && session?.role && token.id) {
        const membership = await prisma.userRole.findUnique({
          where: { userId_role: { userId: token.id, role: session.role } },
          select: { role: true },
        });
        if (membership) token.role = membership.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.roles = (token.roles ?? [token.role]) as string[];
        session.user.isOwner = Boolean(token.isOwner);
        session.user.isAccountant = Boolean(token.isAccountant);
      }
      return session;
    },
    // Relative callback URLs (what our sign-in/sign-out calls always pass) must resolve
    // against the browser's actual current origin, not the static NEXTAUTH_URL/baseUrl — those
    // can differ behind a dev proxy or forwarded port, which previously sent users to the wrong
    // host and made sign-out look like it did nothing.
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return url;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // Malformed URL — fall through to the safe default below.
      }
      return baseUrl;
    },
  },
  events: {
    // Records the last-login timestamp shown in the Super User analytics profile view.
    async signIn({ user }) {
      const userId = (user as { id: string }).id;
      if (!userId) return;
      await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } }).catch(() => null);
      await recordAuditEvent({ actorId: userId, action: 'USER_LOGIN', targetType: 'User', targetId: userId });
    },
    // Approximates "time online" from the login/logout pair — no continuous activity tracking.
    async signOut({ token }) {
      const userId = (token as { id?: string })?.id;
      if (!userId) return;
      const now = new Date();
      const current = await prisma.user.findUnique({ where: { id: userId }, select: { lastLoginAt: true, totalTimeOnlineSeconds: true } }).catch(() => null);
      const sessionSeconds = current?.lastLoginAt ? Math.max(0, Math.round((now.getTime() - current.lastLoginAt.getTime()) / 1000)) : 0;
      await prisma.user
        .update({
          where: { id: userId },
          data: { lastLogoutAt: now, totalTimeOnlineSeconds: (current?.totalTimeOnlineSeconds ?? 0) + sessionSeconds },
        })
        .catch(() => null);
      await recordAuditEvent({ actorId: userId, action: 'USER_LOGOUT', targetType: 'User', targetId: userId, metadata: { sessionSeconds } });
    },
  },
};
