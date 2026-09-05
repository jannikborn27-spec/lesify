import type { DateiTyp } from '@prisma/client';

/**
 * Text-Extraktion aus hochgeladenen Dateien (Phase 5), Grundlage für Call 01
 * (`dateiZusammenfassungErzeugen`) und die Testklausur-Lösungs-Extraktion.
 * `pdf`/`doc` liefern Klartext; `img` liefert `null` — Bilder gehen als
 * Bild-Block direkt in den KI-Call (Vision), nicht über Textextraktion.
 *
 * Legacy-`.doc` (altes Binärformat, nicht `.docx`) kann `mammoth` nicht lesen
 * — liefert dann `null` statt einen Absturz; die Datei bekommt Status
 * `fehler` mit einem sprechenden Hinweis.
 */
export async function textAusDatei(
  buffer: Buffer,
  typ: DateiTyp,
  mime: string,
): Promise<string | null> {
  if (typ === 'img') return null;
  if (typ === 'pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const { pages } = await parser.getText();
      const text = pages.map((p) => p.text).join('\n\n');
      return text.trim() || null;
    } finally {
      await parser.destroy();
    }
  }
  if (typ === 'doc') {
    if (mime !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return null; // altes .doc-Binärformat — nicht unterstützt
    }
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer });
    return value.trim() || null;
  }
  return null;
}

const MIME_ZU_TYP: Record<string, DateiTyp> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
  'image/png': 'img',
  'image/jpeg': 'img',
  'image/webp': 'img',
  // Kein 'image/heic' — von Claudes Vision-API nicht akzeptiert, keine
  // Konvertierung eingebaut. iPhones können in den Foto-Einstellungen auf
  // „Kompatibel" (JPEG) umgestellt werden; UI-Hinweis: Phase 11.
};

/** MIME-Type → `DateiTyp`-Enum (§6). `null`, wenn nicht unterstützt. */
export function typAusMime(mime: string): DateiTyp | null {
  return MIME_ZU_TYP[mime] ?? null;
}
