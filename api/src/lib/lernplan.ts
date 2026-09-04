import type { PrismaClient } from '@prisma/client';
import { HttpError } from './http.js';

/** chatMap-Schlüssel wie im Prototyp: "<tag>|<modus>|<themaId>" (modus null → ""). */
export function chatMapKey(tag: number, modus: string | null, themaId: string): string {
  return `${tag}|${modus ?? ''}|${themaId}`;
}

/**
 * Setzt `Lernplan.chatMap[key] = chatId` idempotent (Override-Muster).
 * Wirft 404, wenn der Lernplan nicht dem User gehört.
 */
export async function setChatMapEintrag(
  prisma: PrismaClient,
  userId: string,
  lernplanId: string,
  key: string,
  chatId: string,
): Promise<Record<string, string>> {
  const lp = await prisma.lernplan.findFirst({ where: { id: lernplanId, userId } });
  if (!lp) throw new HttpError(404, 'nicht_gefunden');
  const map = { ...((lp.chatMap as Record<string, string> | null) ?? {}) };
  if (map[key] === chatId) return map; // schon gesetzt
  map[key] = chatId;
  await prisma.lernplan.update({ where: { id: lp.id }, data: { chatMap: map } });
  return map;
}
