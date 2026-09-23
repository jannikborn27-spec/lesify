import Anthropic from '@anthropic-ai/sdk';
import type { OutgoingHttpHeaders } from 'node:http';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { KiAbgeschnittenError } from './ki/client.js';

/** Möchte der Client die Antwort als Server-Sent Events (`Accept: text/event-stream`)? */
export function willStream(req: FastifyRequest): boolean {
  return (req.headers.accept ?? '').includes('text/event-stream');
}

/**
 * Schickt eine KI-Antwort als Server-Sent Events: `{typ:'delta', text}` je
 * Textstück, zum Schluss `{typ:'fertig', ...ergebnis}` (dasselbe JSON wie die
 * Nicht-Stream-Antwort) oder `{typ:'fehler', fehler}`. Alles, was vorher
 * scheitern kann (Guards, Limits, 404), muss **vor** dem Aufruf geworfen
 * werden — dann antwortet der normale Error-Handler mit JSON, weil noch
 * nichts gesendet ist. Header der Hooks (CORS, Rate-Limit) werden übernommen.
 */
export async function streameSse(
  req: FastifyRequest,
  reply: FastifyReply,
  arbeit: (onDelta: (text: string) => void) => Promise<object>,
): Promise<void> {
  const kopf = reply.getHeaders() as OutgoingHttpHeaders;
  reply.hijack();
  const raw = reply.raw;
  raw.writeHead(200, {
    ...kopf,
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    // Proxies (nginx/Railway) nicht puffern lassen, sonst kommt alles am Stück.
    'x-accel-buffering': 'no',
  });
  const senden = (ereignis: object) => {
    if (!raw.writableEnded) raw.write(`data: ${JSON.stringify(ereignis)}\n\n`);
  };
  try {
    const ergebnis = await arbeit((text) => senden({ typ: 'delta', text }));
    senden({ typ: 'fertig', ...ergebnis });
  } catch (err) {
    const kiFehler = err instanceof Anthropic.APIError || err instanceof KiAbgeschnittenError;
    req.log.error({ err, kiFehler }, 'Stream-Antwort fehlgeschlagen');
    senden({ typ: 'fehler', fehler: kiFehler ? 'ki_nicht_verfuegbar' : 'serverfehler' });
  } finally {
    raw.end();
  }
}
