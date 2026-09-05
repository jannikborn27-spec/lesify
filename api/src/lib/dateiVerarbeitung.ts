import type { PrismaClient } from '@prisma/client';
import type { KiBild, KiClient } from './ki/client.js';
import { dateiZusammenfassungErzeugen, loesungTextAusBildErzeugen } from './ki/calls.js';
import { textAusDatei } from './dateiExtraktion.js';
import type { StorageGateway } from './storage.js';

function alsKiBild(buffer: Buffer, mime: string): KiBild {
  return { mediaType: mime as KiBild['mediaType'], base64: buffer.toString('base64') };
}

/**
 * Verarbeitet eine gerade hochgeladene Themen-Datei asynchron (Call 01,
 * §3/§6): Text extrahieren (pdf/doc) bzw. als Bild an die KI geben (img),
 * Zusammenfassung erzeugen, `Datei.status` → `bereit`/`fehler`. Läuft
 * fire-and-forget direkt nach der Upload-Antwort (kein externer Queue-Dienst
 * nötig — „nichts optimieren, bevor es weh tut").
 */
export async function themenDateiVerarbeiten(
  prisma: PrismaClient,
  ki: KiClient,
  storage: StorageGateway,
  dateiId: string,
): Promise<void> {
  try {
    const datei = await prisma.datei.findUniqueOrThrow({
      where: { id: dateiId },
      include: { fach: { select: { name: true } }, thema: { select: { name: true } } },
    });
    const buffer = await storage.lesen(datei.speicherPfad);

    const dateiInhalt = await textAusDatei(buffer, datei.typ, datei.mime);
    const bild = datei.typ === 'img' ? alsKiBild(buffer, datei.mime) : undefined;
    if (dateiInhalt == null && !bild) {
      // Legacy-.doc o. Ä. — nicht extrahierbar, aber kein Systemfehler.
      await prisma.datei.update({
        where: { id: dateiId },
        data: { status: 'fehler', zusammenfassung: 'Dateiformat wird nicht unterstützt.' },
      });
      return;
    }

    const { vorgeschlagenerTitel, zusammenfassung } = await dateiZusammenfassungErzeugen(ki, {
      fachName: datei.fach.name,
      themaName: datei.thema.name,
      dateiTyp: datei.typ,
      dateiInhalt,
      bild,
    });
    await prisma.datei.update({
      where: { id: dateiId },
      data: { status: 'bereit', zusammenfassung: `${vorgeschlagenerTitel}\n\n${zusammenfassung}` },
    });
  } catch (err) {
    console.error(JSON.stringify({ dateiVerarbeitungFehler: true, dateiId, err: String(err) }));
    await prisma.datei
      .update({ where: { id: dateiId }, data: { status: 'fehler' } })
      .catch(() => undefined);
  }
}

/**
 * Extrahiert den Klartext einer hochgeladenen Testklausur-Lösung — synchron
 * im Request (kurze Solo-Datei, im Gegensatz zur Themen-Datei-Verarbeitung
 * kein Hintergrund-Job nötig). `img` läuft über Vision-Transkription statt
 * Textextraktion (§6-Bridge, ersetzt die bisherige `loesungsText`-JSON-Bridge).
 */
export async function loesungTextExtrahieren(
  ki: KiClient,
  buffer: Buffer,
  typ: 'pdf' | 'doc' | 'img',
  mime: string,
): Promise<string | null> {
  if (typ === 'img') {
    const text = await loesungTextAusBildErzeugen(ki, alsKiBild(buffer, mime));
    return text === '(nicht lesbar)' ? null : text;
  }
  return textAusDatei(buffer, typ, mime);
}
