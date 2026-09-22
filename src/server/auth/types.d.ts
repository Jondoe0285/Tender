import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'SUPER_USER' | 'USER';
      roles: Array<'SUPER_USER' | 'USER'>;
      isOwner: boolean;
      isAccountant: boolean;
      mfaEnabled?: boolean;
      sessionVersion?: number;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: 'SUPER_USER' | 'USER';
    roles: Array<'SUPER_USER' | 'USER'>;
    isOwner: boolean;
    isAccountant: boolean;
    mfaEnabled?: boolean;
    sessionVersion?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    roles: string[];
    isOwner: boolean;
    isAccountant: boolean;
    mfaEnabled?: boolean;
    sessionVersion?: number;
  }
}
