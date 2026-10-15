// DATABASE_URL / DIRECT_URL live in apps/web/.env.local; the db:* scripts load it with --env-file.
// The CLI (migrations) uses DIRECT_URL: Supabase's session pooler, which supports migrations.
// The app at runtime uses DATABASE_URL: the transaction pooler (see src/index.ts).
// `prisma generate` doesn't connect to the database, so it works without either (e.g. on CI).
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
