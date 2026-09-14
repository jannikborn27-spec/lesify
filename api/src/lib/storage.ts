import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from '../env.js';

/**
 * Objektspeicher-Kapselung (Phase 5, §6): Zugriff nur über zeitlich begrenzte
 * signierte URLs, nie öffentliche Links. `Datei.speicherPfad` speichert den
 * Objekt-Key relativ zum Bucket.
 *
 * Ohne `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` läuft ein deterministisches
 * `FakeStorageGateway` (In-Memory, kein Netzwerk) — wie `FakeKiClient`
 * (Phase 6) und `FakeZahlungsGateway` (Phase 9).
 */
export interface StorageGateway {
  hochladen(key: string, buffer: Buffer, contentType: string): Promise<void>;
  /** Kurzlebige signierte URL zum Lesen (Redirect-Ziel für `GET /dateien/:id/inhalt`). */
  signierteUrl(key: string, ablaufSekunden?: number): Promise<string>;
  /** Serverseitiger Direktzugriff (Verarbeitungs-Job, §3/§6) — kein Umweg über eine signierte URL. */
  lesen(key: string): Promise<Buffer>;
  loeschen(keys: string[]): Promise<void>;
}

/**
 * Legt den konfigurierten Bucket an, falls er noch nicht existiert
 * (`SUPABASE_STORAGE_BUCKET`, Default `lesify-local`) — ersetzt den
 * manuellen Dashboard-Schritt aus §6 „Objektspeicher-Bucket je Umgebung".
 * Idempotent, still bei „existiert schon".
 */
async function sicherstellenBucket(client: SupabaseClient, bucket: string): Promise<void> {
  const { data } = await client.storage.getBucket(bucket);
  if (data) return;
  const { error } = await client.storage.createBucket(bucket, { public: false });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Bucket „${bucket}" konnte nicht angelegt werden: ${error.message}`);
  }
}

export class SupabaseStorageGateway implements StorageGateway {
  private readonly client: SupabaseClient;
  private readonly bucket: string;
  private bereitPromise: Promise<void> | undefined;

  constructor(url: string, serviceKey: string, bucket: string) {
    // Wir nutzen Supabase nur für Storage, nie Realtime — der Client
    // initialisiert intern trotzdem einen RealtimeClient, der ab Node <22
    // eine WebSocket-Implementierung braucht (kein natives `WebSocket`
    // global). `ws` deckt das ab, ohne Node-Version-Zwang (2026-09-14,
    // Railway-Absturz "Node.js detected but native WebSocket not found").
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false },
      realtime: { transport: WebSocket as unknown as SupabaseClient['realtime']['transport'] },
    });
    this.bucket = bucket;
  }

  private bereit(): Promise<void> {
    if (!this.bereitPromise) this.bereitPromise = sicherstellenBucket(this.client, this.bucket);
    return this.bereitPromise;
  }

  async hochladen(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.bereit();
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, buffer, { contentType, upsert: false });
    if (error) throw new Error(`Upload fehlgeschlagen (${key}): ${error.message}`);
  }

  async signierteUrl(key: string, ablaufSekunden = 60): Promise<string> {
    await this.bereit();
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, ablaufSekunden);
    if (error || !data) throw new Error(`Signierte URL fehlgeschlagen (${key}): ${error?.message}`);
    return data.signedUrl;
  }

  async lesen(key: string): Promise<Buffer> {
    await this.bereit();
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error || !data) throw new Error(`Lesen fehlgeschlagen (${key}): ${error?.message}`);
    return Buffer.from(await data.arrayBuffer());
  }

  async loeschen(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.bereit();
    const { error } = await this.client.storage.from(this.bucket).remove(keys);
    if (error) throw new Error(`Löschen fehlgeschlagen: ${error.message}`);
  }
}

/** Deterministischer In-Memory-Objektspeicher — Default in Dev/Test ohne Supabase-Storage-Zugang. */
export class FakeStorageGateway implements StorageGateway {
  private readonly objekte = new Map<string, Buffer>();

  async hochladen(key: string, buffer: Buffer): Promise<void> {
    this.objekte.set(key, buffer);
  }

  async signierteUrl(key: string, ablaufSekunden = 60): Promise<string> {
    const ablaeuftAm = Date.now() + ablaufSekunden * 1000;
    return `https://fake-storage.lesify.local/${encodeURIComponent(key)}?exp=${ablaeuftAm}`;
  }

  async lesen(key: string): Promise<Buffer> {
    const buffer = this.objekte.get(key);
    if (!buffer) throw new Error(`Objekt nicht gefunden: ${key}`);
    return buffer;
  }

  async loeschen(keys: string[]): Promise<void> {
    for (const key of keys) this.objekte.delete(key);
  }
}

let instanz: StorageGateway | undefined;

export function getStorageGateway(): StorageGateway {
  if (!instanz) {
    instanz =
      env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY
        ? new SupabaseStorageGateway(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_KEY,
            env.SUPABASE_STORAGE_BUCKET,
          )
        : new FakeStorageGateway();
  }
  return instanz;
}
