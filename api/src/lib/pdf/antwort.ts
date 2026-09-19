import type { FastifyReply } from 'fastify';

/** Dateiname ohne Umlaute/Sonderzeichen (ASCII-sicher für den Content-Disposition-Header). */
export function dateiSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'dokument'
  );
}

/** Sendet ein PDF inline (Vorschau im iframe) oder als Download. */
export function pdfAntwort(
  reply: FastifyReply,
  pdf: Buffer,
  name: string,
  download: boolean,
): FastifyReply {
  return reply
    .type('application/pdf')
    .header(
      'Content-Disposition',
      `${download ? 'attachment' : 'inline'}; filename="${dateiSlug(name)}.pdf"`,
    )
    .header('Cache-Control', 'private, no-store')
    .send(pdf);
}
