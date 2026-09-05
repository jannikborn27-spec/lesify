import { describe, expect, it } from 'vitest';
import { pdfMitText } from '../test-utils/multipart.js';
import { textAusDatei, typAusMime } from './dateiExtraktion.js';

async function docxMitText(text: string): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  const doc = new Document({
    sections: [{ children: [new Paragraph({ children: [new TextRun(text)] })] }],
  });
  return Packer.toBuffer(doc);
}

describe('textAusDatei', () => {
  it('extrahiert Text aus einer echten PDF', async () => {
    const buffer = await pdfMitText("Ableitungsregeln: f(x) = x^2 → f'(x) = 2x");
    const text = await textAusDatei(buffer, 'pdf', 'application/pdf');
    expect(text).toContain('Ableitungsregeln');
  });

  it('extrahiert Text aus einer echten .docx', async () => {
    const buffer = await docxMitText('Photosynthese findet in Chloroplasten statt.');
    const text = await textAusDatei(
      buffer,
      'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(text).toContain('Photosynthese');
  });

  it('legacy .doc (application/msword) liefert null statt Absturz', async () => {
    const text = await textAusDatei(Buffer.from('irgendwas'), 'doc', 'application/msword');
    expect(text).toBeNull();
  });

  it('img liefert immer null (Bild geht über Vision, nicht Textextraktion)', async () => {
    const text = await textAusDatei(Buffer.from('binärdaten'), 'img', 'image/png');
    expect(text).toBeNull();
  });
});

describe('typAusMime', () => {
  it('erkennt pdf/docx/Bild-Typen', () => {
    expect(typAusMime('application/pdf')).toBe('pdf');
    expect(
      typAusMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ).toBe('doc');
    expect(typAusMime('image/png')).toBe('img');
    expect(typAusMime('image/jpeg')).toBe('img');
  });

  it('lehnt unbekannte/heic MIME-Types ab', () => {
    expect(typAusMime('audio/mpeg')).toBeNull();
    expect(typAusMime('image/heic')).toBeNull();
  });
});
