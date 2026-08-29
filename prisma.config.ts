import "dotenv/config";
import { defineConfig } from "prisma/config";

const GENERATE_FALLBACK_DATABASE_URL = "postgresql://thelinelist:thelinelist@127.0.0.1:5432/thelinelist";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL?.trim() || GENERATE_FALLBACK_DATABASE_URL },
});
