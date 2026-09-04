import { PrismaClient } from '@prisma/client';

let client: PrismaClient | undefined;

/** Prozessweiter PrismaClient (in Tests durch ein Fake ersetzbar, siehe buildApp). */
export function getPrisma(): PrismaClient {
  if (!client) client = new PrismaClient();
  return client;
}
