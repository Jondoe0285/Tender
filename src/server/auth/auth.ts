import type { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/server/data/prisma';
import { verifyPassword } from '@/server/auth/password';

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
  },
};
