import type { DefaultSession, NextAuthOptions, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

import type { UserRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      role: UserRole;
    };
  }

  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
  }
}

declare module "next-auth" {
  interface NextAuthOptions {
    providers: NextAuthOptions["providers"];
  }
}
