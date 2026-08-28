import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const DEVELOPMENT_DATABASE_URL = "postgresql://thelinelist:thelinelist@127.0.0.1:5432/thelinelist";

const globalForPrisma = globalThis as unknown as { theLineListPrisma?: PrismaClient };

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim() || DEVELOPMENT_DATABASE_URL;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalForPrisma.theLineListPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.theLineListPrisma = prisma;
}
