import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role?: string;
      customerId?: string;
      id?: string;
      sessionVersion?: number;
      mfaEnabled?: boolean;
      mfaVerified?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    customerId?: string;
    sessionVersion?: number;
    mfaEnabled?: boolean;
    mfaVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    customerId?: string;
    id?: string;
    sessionVersion?: number;
    mfaEnabled?: boolean;
    mfaVerified?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: string;
    customerId?: string;
    id?: string;
    sessionVersion?: number;
    mfaEnabled?: boolean;
    mfaVerified?: boolean;
  }
}
