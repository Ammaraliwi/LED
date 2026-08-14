import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role?: string;
      customerId?: string;
      id?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    customerId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    customerId?: string;
    id?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: string;
    customerId?: string;
    id?: string;
  }
}
