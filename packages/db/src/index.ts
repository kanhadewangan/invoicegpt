import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  // Prisma 7 talks to Postgres through a driver adapter (here: node-postgres).
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Reuse one client across Next.js hot reloads so dev mode doesn't open new connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getDb(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}
