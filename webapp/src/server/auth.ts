import NeonAdapter from "@auth/neon-adapter";
import { Pool } from "@neondatabase/serverless";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { sql } from "./db";

const connectionString = process.env.DATABASE_URL;
const adminEmailAllowlist = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return adminEmailAllowlist.includes(email.toLowerCase());
}

function resolveRole(email?: string | null): "admin" | "member" {
  return isAdminEmail(email) ? "admin" : "member";
}

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Required for NextAuth adapter.");
}

if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is not configured. Set it in your environment variables.");
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials are missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
}

const pool = new Pool({ connectionString });

export const authOptions: NextAuthOptions = {
  adapter: NeonAdapter(pool),
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as typeof session.user & { id?: string; role?: "admin" | "member" };
        user.id = token.sub ?? user.id ?? "";
        user.role = (token.role as "admin" | "member") ?? "member";
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        const nextRole = (user as { role?: "admin" | "member"; email?: string | null }).role ?? resolveRole(user.email);
        token.role = nextRole;
      } else if (!token.role) {
        token.role = "member";
      }
      return token;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      await sql`
        UPDATE users
        SET last_login_at = NOW(),
            role = ${resolveRole(user.email)}
        WHERE id = ${user.id}
      `;
    },
  },
  pages: {
    signIn: "/login",
  },
};
