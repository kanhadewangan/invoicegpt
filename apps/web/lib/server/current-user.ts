import "server-only";
import { db } from "./services";

let cachedUserId: string | undefined;

/**
 * The signed-in user. For now there is no login: everything belongs to one demo user,
 * created on first use. Replace this function when real authentication is added.
 */
export async function getCurrentUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const email = process.env.DEMO_USER_EMAIL ?? "demo@invoicegpt.app";
  const user = await db().user.upsert({
    where: { email },
    update: {},
    create: { email, name: process.env.DEMO_USER_NAME ?? "Demo Freelancer" },
  });
  cachedUserId = user.id;
  return user.id;
}
