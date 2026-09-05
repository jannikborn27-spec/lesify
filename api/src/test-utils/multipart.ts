/** Baut einen minimalen multipart/form-data-Body — `light-my-request` kennt keine `FormData`. */
export function buildMultipart(
  felder: { name: string; filename: string; contentType: string; data: Buffer }[],
): { body: Buffer; contentType: string } {
  const boundary = `----lesifyTestBoundary${Date.now()}`;
  const teile = felder.map((f) =>
    Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${f.name}"; filename="${f.filename}"\r\nContent-Type: ${f.contentType}\r\n\r\n`,
      ),
      f.data,
      Buffer.from('\r\n'),
    ]),
  );
  const body = Buffer.concat([...teile, Buffer.from(`--${boundary}--\r\n`)]);
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

/** Echte, valide PDF mit lesbarem Text (via `pdfkit`) — für pdf-parse-Extraktionstests. */
export async function pdfMitText(text: string): Promise<Buffer> {
  const { default: PDFDocument } = await import('pdfkit');
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const fertig = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(chunks))),
  );
  doc.fontSize(20).text(text);
  doc.end();
  return fertig;
}
