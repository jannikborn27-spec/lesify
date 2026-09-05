import { describe, expect, it } from 'vitest';
import { FakeStorageGateway, type StorageGateway } from './storage.js';

describe('FakeStorageGateway (In-Memory, ohne echten Supabase-Zugang)', () => {
  it('hochladen → lesen liefert denselben Buffer zurück', async () => {
    const storage: StorageGateway = new FakeStorageGateway();
    const inhalt = Buffer.from('Hallo Lesify');
    await storage.hochladen('a/b/datei.pdf', inhalt, 'application/pdf');
    await expect(storage.lesen('a/b/datei.pdf')).resolves.toEqual(inhalt);
  });

  it('lesen eines unbekannten Keys wirft', async () => {
    const storage: StorageGateway = new FakeStorageGateway();
    await expect(storage.lesen('nicht-vorhanden')).rejects.toThrow();
  });

  it('signierteUrl liefert eine deterministische, eindeutige URL', async () => {
    const storage: StorageGateway = new FakeStorageGateway();
    const url = await storage.signierteUrl('a/b/datei.pdf', 30);
    expect(url).toContain('a%2Fb%2Fdatei.pdf');
  });

  it('loeschen entfernt das Objekt — anschließendes Lesen wirft', async () => {
    const storage: StorageGateway = new FakeStorageGateway();
    await storage.hochladen('x', Buffer.from('y'), 'text/plain');
    await storage.loeschen(['x']);
    await expect(storage.lesen('x')).rejects.toThrow();
  });

  it('loeschen mit leerer Liste ist ein No-op', async () => {
    const storage: StorageGateway = new FakeStorageGateway();
    await expect(storage.loeschen([])).resolves.toBeUndefined();
  });
});
