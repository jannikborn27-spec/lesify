import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../env.js';
import { getPrisma } from '../../db.js';
import { ClaudeAgentSdkKiClient } from './devAgentSdkClient.js';
import { kostenEurMikroAus, protokolliereKiKosten } from './kosten.js';

/**
 * Anthropic-Client-Kapselung (Phase 6): Retry + Timeout kommen aus den
 * SDK-eigenen Client-Optionen, `response.usage` wird pro Call geloggt (für
 * die spätere Kosten-Kalibrierung, siehe `docs/RUNBOOK.md`). Modellwahl ist
 * Config (`env.KI_MODELL_*` + `MODELL_JE_CALL` in `calls.ts`), nicht fest
 * verdrahtet.
 *
 * Ohne `ANTHROPIC_API_KEY` läuft ein deterministischer `FakeKiClient` — wie
 * `FakeZahlungsGateway` (Phase 9): kein echter Call, keine Kosten, aber
 * plausible, schema-treue Antworten fürs Testen der ganzen Route.
 */

export interface KiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface KiNachricht {
  rolle: 'user' | 'assistant';
  text: string;
}

export interface KiBild {
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  base64: string;
}

export interface KiToolDefinition {
  name: string;
  beschreibung: string;
  schema: Record<string, unknown>;
}

interface KiAufrufBasis {
  callTyp: string;
  system: string;
  messages: KiNachricht[];
  model: string;
  maxTokens: number;
  temperature?: number;
  /** System-Prompt cachen (`cache_control` ans Ende) — für gecachte Themen-Memory-Blöcke. */
  cache?: boolean;
  /** Bild(er) an die letzte User-Nachricht anhängen (Vision, Phase 5 — Datei-Zusammenfassung/Lösungs-Transkription von Bildern). */
  bilder?: KiBild[];
}

export interface KiToolAufruf<T> extends KiAufrufBasis {
  tool: KiToolDefinition;
  /** Nur für den Fake-Client: liefert Felder, die er ohne echtes Modell nicht
   *  ableiten kann (z. B. welche themaIds erwartet werden). Beeinflusst den
   *  echten Anthropic-Call nicht. */
  fakeKontext?: unknown;
  __output?: T; // nur für Typinferenz, kein Laufzeitfeld
}

export type KiFreitextAufruf = KiAufrufBasis;

export interface KiClient {
  toolAufruf<T>(opts: KiToolAufruf<T>): Promise<{ ausgabe: T; usage: KiUsage }>;
  freitextAufruf(opts: KiFreitextAufruf): Promise<{ text: string; usage: KiUsage }>;
}

function leereUsage(): KiUsage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 };
}

type OnUsage = (info: { callTyp: string; model: string; usage: KiUsage }) => void;

const standardOnUsage: OnUsage = (info) => {
  // Kosten-Kalibrierung (§7/docs/RUNBOOK.md): strukturiertes Log, kein PII.
  const kostenEurMikro = kostenEurMikroAus(info.model, info.usage);
  console.log(JSON.stringify({ kiUsage: true, kostenEurMikro, ...info }));
  // Aggregation in `KiKosten` fürs Kosten-Dashboard (Phase 15) — fire-and-forget,
  // Fehler werden in `protokolliereKiKosten` selbst geloggt, nie geworfen.
  void protokolliereKiKosten(getPrisma(), info);
};

export class AnthropicKiClient implements KiClient {
  private readonly client: Anthropic;
  private readonly onUsage: OnUsage;

  constructor(apiKey: string, onUsage: OnUsage = standardOnUsage) {
    // Retry + Timeout aus den SDK-Client-Optionen (kein eigenes Retry-Rad).
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 45_000 });
    this.onUsage = onUsage;
  }

  private system(opts: KiAufrufBasis): string | Anthropic.TextBlockParam[] {
    if (!opts.cache) return opts.system;
    return [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }];
  }

  /** Baut die Message-Liste; `opts.bilder` hängt als Bild-Blöcke an die letzte Nachricht (Vision). */
  private messagesAus(opts: KiAufrufBasis): Anthropic.MessageParam[] {
    return opts.messages.map((m, i): Anthropic.MessageParam => {
      const istLetzte = i === opts.messages.length - 1;
      if (!istLetzte || !opts.bilder?.length) return { role: m.rolle, content: m.text };
      return {
        role: m.rolle,
        content: [
          ...opts.bilder.map((b): Anthropic.ImageBlockParam => ({
            type: 'image',
            source: { type: 'base64', media_type: b.mediaType, data: b.base64 },
          })),
          { type: 'text', text: m.text },
        ],
      };
    });
  }

  private usageAus(u: Anthropic.Messages.Usage): KiUsage {
    return {
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
      cacheCreationTokens: u.cache_creation_input_tokens ?? 0,
    };
  }

  async toolAufruf<T>(opts: KiToolAufruf<T>): Promise<{ ausgabe: T; usage: KiUsage }> {
    const res = await this.client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      system: this.system(opts),
      messages: this.messagesAus(opts),
      tools: [
        {
          name: opts.tool.name,
          description: opts.tool.beschreibung,
          input_schema: opts.tool.schema as Anthropic.Messages.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: opts.tool.name },
    });
    const usage = this.usageAus(res.usage);
    this.onUsage({ callTyp: opts.callTyp, model: opts.model, usage });

    const block = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (!block) throw new Error(`KI-Antwort ohne tool_use-Block (${opts.callTyp})`);
    return { ausgabe: block.input as T, usage };
  }

  async freitextAufruf(opts: KiFreitextAufruf): Promise<{ text: string; usage: KiUsage }> {
    const res = await this.client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      system: this.system(opts),
      messages: this.messagesAus(opts),
    });
    const usage = this.usageAus(res.usage);
    this.onUsage({ callTyp: opts.callTyp, model: opts.model, usage });

    const block = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    return { text: block?.text ?? '', usage };
  }
}

/**
 * Deterministischer Platzhalter-Client (kein Netzwerk, keine Kosten) — Default
 * in Dev/Test ohne `ANTHROPIC_API_KEY`. Erkennt bekannte Tool-Namen und baut
 * daraus eine schema-treue, plausible Antwort; unbekannte Tools bekommen eine
 * generische Fallback-Antwort.
 */
export class FakeKiClient implements KiClient {
  async toolAufruf<T>(opts: KiToolAufruf<T>): Promise<{ ausgabe: T; usage: KiUsage }> {
    const letzte = opts.messages[opts.messages.length - 1]?.text ?? '';
    const ausgabe = fakeToolAusgabe(opts.tool.name, letzte, opts.fakeKontext);
    return { ausgabe: ausgabe as T, usage: leereUsage() };
  }

  async freitextAufruf(opts: KiFreitextAufruf): Promise<{ text: string; usage: KiUsage }> {
    const letzte = opts.messages[opts.messages.length - 1]?.text ?? '';
    return {
      text: `_(Platzhalter-KI-Antwort auf „${kuerzen(letzte, 60)}" — echte Anthropic-Integration läuft nur mit ANTHROPIC_API_KEY.)_`,
      usage: leereUsage(),
    };
  }
}

function kuerzen(s: string, n: number): string {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function themaIdsAus(fakeKontext: unknown): string[] {
  if (
    fakeKontext &&
    typeof fakeKontext === 'object' &&
    'themaIds' in fakeKontext &&
    Array.isArray((fakeKontext as { themaIds: unknown }).themaIds)
  ) {
    return (fakeKontext as { themaIds: string[] }).themaIds;
  }
  return [];
}

function fakeToolAusgabe(toolName: string, letzteNachricht: string, fakeKontext: unknown): unknown {
  switch (toolName) {
    case 'chat_titel':
      return { titel: kuerzen(letzteNachricht, 48) || 'Neue Frage' };
    case 'datei_zusammenfassung':
      return {
        vorgeschlagenerTitel: 'Zusammenfassung (Platzhalter)',
        zusammenfassung: `Platzhalter-Zusammenfassung: ${kuerzen(letzteNachricht, 200)}`,
      };
    case 'themen_memory_verdichtet':
      return {
        kontextBlock: `Verdichteter Kontext (Platzhalter): ${kuerzen(letzteNachricht, 200)}`,
      };
    case 'lernzettel_erstellen':
      return {
        titel: 'Lernzettel (Platzhalter)',
        content: `## Zusammenfassung\n${kuerzen(letzteNachricht, 300) || 'Noch kein Material vorhanden.'}`,
      };
    case 'lernzettel_revision':
      return {
        antwortText: 'Ich habe deine Anweisung umgesetzt (Platzhalter-Antwort).',
        art: 'patch',
        patches: [],
      };
    case 'testklausur_aufgaben': {
      const ids = themaIdsAus(fakeKontext);
      return {
        aufgaben: ids.map((themaId) => ({
          themaId,
          frage: `Platzhalter-Aufgabe zu diesem Thema (Testklausur-Erstellung ohne ANTHROPIC_API_KEY).`,
        })),
      };
    }
    case 'testklausur_analyse': {
      const ids = themaIdsAus(fakeKontext);
      return {
        ergebnisse: ids.map((themaId) => ({
          themaId,
          prozent: 70,
          erklaerung: 'Platzhalter-Bewertung (echte Analyse läuft nur mit ANTHROPIC_API_KEY).',
        })),
      };
    }
    case 'lernzettel_abschnitte': {
      const ids = themaIdsAus(fakeKontext);
      return {
        eintraege: ids.map((themaId) => ({
          themaId,
          abschnitt: `### Thema\n- Platzhalter-Merkpunkt (echte Generierung läuft nur mit ANTHROPIC_API_KEY).`,
        })),
      };
    }
    default:
      return {};
  }
}

let instanz: KiClient | undefined;

/**
 * Prozessweiter KI-Client (in Tests via `buildApp({ ki })` ersetzbar).
 * Reihenfolge: echter `ANTHROPIC_API_KEY` gewinnt immer. Sonst — nur bei
 * `NODE_ENV=development` **und** explizit gesetztem
 * `KI_DEV_ADAPTER=claude-agent-sdk` — der dev-only `ClaudeAgentSdkKiClient`
 * (persönliche Claude-Subscription, siehe `devAgentSdkClient.ts`). In jedem
 * anderen Fall (Produktion, Tests, Standard-Dev-Betrieb) der deterministische
 * `FakeKiClient`, auch wenn `CLAUDE_CODE_OAUTH_TOKEN` zufällig gesetzt ist —
 * der Dev-Adapter ist ein bewusstes Opt-in, kein automatischer Fallback.
 */
export function getKiClient(): KiClient {
  if (!instanz) {
    if (env.ANTHROPIC_API_KEY) {
      instanz = new AnthropicKiClient(env.ANTHROPIC_API_KEY);
    } else if (
      env.NODE_ENV === 'development' &&
      env.KI_DEV_ADAPTER === 'claude-agent-sdk' &&
      env.CLAUDE_CODE_OAUTH_TOKEN
    ) {
      console.warn(
        '[ki] Dev-Adapter aktiv: Claude Agent SDK über die persönliche Subscription (CLAUDE_CODE_OAUTH_TOKEN). Nur fürs eigene lokale Testen — nie in Produktion.',
      );
      instanz = new ClaudeAgentSdkKiClient();
    } else {
      instanz = new FakeKiClient();
    }
  }
  return instanz;
}
