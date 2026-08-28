import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      roles: string[];
      isOwner: boolean;
      isAccountant: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: string;
    roles: string[];
    isOwner: boolean;
    isAccountant: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    roles: string[];
    isOwner: boolean;
    isAccountant: boolean;
  }
}
