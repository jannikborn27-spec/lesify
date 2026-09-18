import type { PrismaClient } from '@prisma/client';

/**
 * Kontext-Bausteine, die mehrere KI-Calls teilen: Themen Memory (Call 02,
 * Grundfall = reines Backend-Assembly, siehe `02-themen-memory.md`), das
 * Material eines Themas (Lernzettel bevorzugt, sonst Rohchats — Calls
 * 08/10/11/12) und die Klassenstufe (`Fach.klasse`, ersatzweise
 * `User.klassenstufe`, `00-overview.md` „Niveau-Hinweis").
 */

export async function klassenstufeFuer(
  prisma: PrismaClient,
  userId: string,
  fachId: string,
): Promise<string> {
  const fach = await prisma.fach.findUnique({ where: { id: fachId }, select: { klasse: true } });
  if (fach?.klasse) return fach.klasse;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { klassenstufe: true },
  });
  return user?.klassenstufe ?? 'Klasse 5 bis 13';
}

/** Themen-Memory-Block (Grundfall: rohe Konkatenation, keine Verdichtung —
 *  „erst optimieren, wenn nötig", siehe §3 der Prompt-Datei). */
export async function themenMemoryBlock(prisma: PrismaClient, themaId: string): Promise<string> {
  const thema = await prisma.thema.findUniqueOrThrow({
    where: { id: themaId },
    include: { fach: { select: { name: true } } },
  });
  const [lernzettel, dateien, chats] = await Promise.all([
    prisma.lernzettel.findMany({ where: { themaId }, select: { titel: true, content: true } }),
    prisma.datei.findMany({
      where: { themaId, zusammenfassung: { not: null } },
      select: { name: true, zusammenfassung: true },
    }),
    prisma.chat.findMany({ where: { themaId }, select: { titel: true, modus: true } }),
  ]);

  const lzBlock = lernzettel.length
    ? lernzettel.map((l) => `**${l.titel}**\n${l.content}`).join('\n\n')
    : '(noch keine Lernzettel)';
  const dateiBlock = dateien.length
    ? dateien.map((d) => `- **${d.name}**: ${d.zusammenfassung}`).join('\n')
    : '(keine Dateien)';
  const chatBlock = chats.length
    ? chats.map((c) => `- „${c.titel || '(ohne Titel)'}" (Modus: ${c.modus ?? 'frei'})`).join('\n')
    : '(noch keine Chats)';

  return `## Themen Memory: ${thema.name} (${thema.fach.name})
${thema.beschreibung}

### Bisherige Lernzettel
${lzBlock}

### Hochgeladene Dateien (Zusammenfassungen)
${dateiBlock}

### Bisherige Chats zu diesem Thema
${chatBlock}`;
}

export interface ThemaMaterial {
  lernzettelOderChats: string;
  dateiZusammenfassungen: string;
}

/**
 * Material eines Themas für generierende Calls (08/10/11/12): bevorzugt
 * `Lernzettel.content` (kuratiert, günstig), sonst Fallback auf die
 * vollständigen Chatverläufe. Datei-Zusammenfassungen kommen immer dazu.
 */
export async function themaMaterial(prisma: PrismaClient, themaId: string): Promise<ThemaMaterial> {
  const lz = await prisma.lernzettel.findFirst({
    where: { themaId },
    orderBy: { aktualisiertAm: 'desc' },
    select: { content: true },
  });

  let lernzettelOderChats: string;
  if (lz) {
    lernzettelOderChats = lz.content;
  } else {
    const chats = await prisma.chat.findMany({
      where: { themaId },
      select: {
        titel: true,
        modus: true,
        nachrichten: { orderBy: { erstelltAm: 'asc' }, select: { rolle: true, text: true } },
      },
    });
    lernzettelOderChats = chats.length
      ? chats
          .map(
            (c) =>
              `Chat "${c.titel || '(ohne Titel)'}" (${c.modus ?? 'frei'}):\n` +
              c.nachrichten.map((n) => `${n.rolle}: ${n.text}`).join('\n'),
          )
          .join('\n\n')
      : '(noch kein Material zu diesem Thema vorhanden)';
  }

  const dateien = await prisma.datei.findMany({
    where: { themaId, zusammenfassung: { not: null } },
    select: { name: true, zusammenfassung: true },
  });
  const dateiZusammenfassungen = dateien.length
    ? dateien.map((d) => `- ${d.name}: ${d.zusammenfassung}`).join('\n')
    : '(keine Dateien)';

  return { lernzettelOderChats, dateiZusammenfassungen };
}

/**
 * Alle vollständigen Chatverläufe + Datei-Zusammenfassungen eines Themas —
 * für die Lernzettel-Erstellung (Call 08), die im Unterschied zu
 * {@link themaMaterial} nicht den bereits vorhandenen Lernzettel bevorzugt,
 * sondern gerade aus den Rohchats den ersten Lernzettel bauen soll.
 */
export async function themaChatsUndDateien(prisma: PrismaClient, themaId: string): Promise<string> {
  const chats = await prisma.chat.findMany({
    where: { themaId },
    select: {
      titel: true,
      modus: true,
      nachrichten: { orderBy: { erstelltAm: 'asc' }, select: { rolle: true, text: true } },
    },
  });
  const chatBlock = chats.length
    ? chats
        .map(
          (c) =>
            `Chat "${c.titel || '(ohne Titel)'}" (${c.modus ?? 'frei'}):\n` +
            c.nachrichten.map((n) => `${n.rolle}: ${n.text}`).join('\n'),
        )
        .join('\n\n')
    : '(noch keine Chats zu diesem Thema)';

  const dateien = await prisma.datei.findMany({
    where: { themaId, zusammenfassung: { not: null } },
    select: { name: true, zusammenfassung: true },
  });
  const dateiBlock = dateien.length
    ? dateien.map((d) => `- ${d.name}: ${d.zusammenfassung}`).join('\n')
    : '(keine Dateien)';

  return `Chatverläufe:\n${chatBlock}\n\nDatei-Zusammenfassungen:\n${dateiBlock}`;
}
