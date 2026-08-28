import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { prisma, databaseConfigured } from "@/lib/db/prisma";

const DEVELOPMENT_AUTH_SECRET = "the-line-list-development-secret-change-me-2026";

export function authConfigured(): boolean {
  if (process.env.NODE_ENV !== "production") return databaseConfigured();
  return Boolean(
    databaseConfigured() &&
      process.env.BETTER_AUTH_SECRET?.trim() &&
      process.env.BETTER_AUTH_URL?.trim(),
  );
}

export const auth = betterAuth({
  appName: "The Line List",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || DEVELOPMENT_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  session: { expiresIn: 60 * 60 * 24 * 30 },
  trustedOrigins: [process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_SITE_URL].filter(
    (value): value is string => Boolean(value),
  ),
});

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function getSession(): Promise<AuthSession> {
  if (!authConfigured()) return null;
  return auth.api.getSession({ headers: await headers() });
}
