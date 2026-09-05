import type { KiClient, KiFreitextAufruf, KiNachricht, KiToolAufruf, KiUsage } from './client.js';
import type { NonNullableUsage } from '@anthropic-ai/claude-agent-sdk';

/**
 * Dev-only KI-Client über den Claude Agent SDK + eine persönliche Claude
 * Pro/Max-Subscription (OAuth-Token aus `claude setup-token`) statt der
 * Anthropic-API. Ausschließlich fürs eigene lokale Testen — siehe
 * `getKiClient()` in `client.ts` für die Gate-Bedingung
 * (`NODE_ENV=development` **und** `KI_DEV_ADAPTER=claude-agent-sdk`, sonst
 * nie erreichbar). Läuft nie gegen echte Lesify-Nutzer:innen: technisch
 * (`@anthropic-ai/claude-agent-sdk` ist eine reine `devDependency`, ein
 * Produktions-Install hat das Paket gar nicht) und inhaltlich (eine
 * persönliche Subscription darf keinen Traffic für ein drittes Produkt
 * bedienen — siehe Diskussion 2026-09-04/05).
 *
 * **Zentrale Erkenntnis (2026-09-05):** `claude -p` (CLI-Print-Modus) lädt
 * IMMER das volle Claude-Code-Tool-Preset — 25.000–45.000 Token Overhead pro
 * Call, ~0,15–0,27 $/Call in Tests, unabhängig von `--system-prompt`/
 * `--allowedTools`. `--bare` schaltet das ab, verlangt dann aber
 * `ANTHROPIC_API_KEY` statt OAuth (kein Ausweg). Der **SDK-Weg** mit
 * `tools: []` (keine eingebauten Tools) + `settingSources: []` (keine
 * CLAUDE.md/Settings) + einem reinen String-`systemPrompt` (kein Preset)
 * umgeht das komplett — gemessen ~230 Input-Tokens, < 1 Cent/Call — und
 * unterstützt zusätzlich natives `outputFormat: {type:'json_schema'}` für
 * strukturierte Ausgaben (`structured_output`-Feld im Result), ohne eigenes
 * Tool-Use-Parsing. `thinking: {type:'disabled'}` vermeidet unnötige
 * Extended-Thinking-Tokens bei den einfachen Calls.
 *
 * Multi-Turn-Verläufe (Chat-Modi 03–06) werden hier — anders als bei
 * `AnthropicKiClient` — nicht als `messages`-Array geschickt (der SDK-
 * `query()`-Aufruf ist ein Einzel-Turn), sondern als Textblock in den
 * System-Prompt gefaltet; nur die letzte Nachricht wird als `prompt`
 * geschickt. Für schnelles manuelles Gegenprüfen der Prompts ausreichend,
 * aber keine exakte Parität zum Produktionspfad.
 */
export class ClaudeAgentSdkKiClient implements KiClient {
  async toolAufruf<T>(opts: KiToolAufruf<T>): Promise<{ ausgabe: T; usage: KiUsage }> {
    const { system, prompt } = alsPromptUndSystem(opts.system, opts.messages);
    const msg = await einzelnerTurn(system, prompt, opts.model, {
      type: 'json_schema',
      schema: opts.tool.schema,
    });
    logDevUsage(opts.callTyp, opts.model, msg);
    if (msg.subtype !== 'success' || msg.structured_output == null) {
      throw new Error(`Claude-Agent-SDK (dev) ohne strukturierte Ausgabe (${opts.callTyp})`);
    }
    return { ausgabe: msg.structured_output as T, usage: usageAus(msg) };
  }

  async freitextAufruf(opts: KiFreitextAufruf): Promise<{ text: string; usage: KiUsage }> {
    const { system, prompt } = alsPromptUndSystem(opts.system, opts.messages);
    const msg = await einzelnerTurn(system, prompt, opts.model);
    logDevUsage(opts.callTyp, opts.model, msg);
    if (msg.subtype !== 'success') {
      throw new Error(`Claude-Agent-SDK (dev) Fehler (${opts.callTyp}): ${msg.errors.join('; ')}`);
    }
    return { text: msg.result, usage: usageAus(msg) };
  }
}

/** Faltet Systemprompt + Verlauf für einen einzelnen `query()`-Turn zusammen. */
function alsPromptUndSystem(
  system: string,
  messages: KiNachricht[],
): { system: string; prompt: string } {
  if (messages.length === 0) return { system, prompt: '' };
  const verlauf = messages.slice(0, -1);
  const letzte = messages[messages.length - 1]!;
  if (verlauf.length === 0) return { system, prompt: letzte.text };
  const verlaufBlock = verlauf
    .map((m) => `${m.rolle === 'user' ? 'Schüler' : 'Assistent'}: ${m.text}`)
    .join('\n');
  return { system: `${system}\n\nBisheriger Chatverlauf:\n${verlaufBlock}`, prompt: letzte.text };
}

// `@anthropic-ai/claude-agent-sdk`-Typen dynamisch importiert, damit ein
// Produktions-Install (Paket fehlt dort, reine devDependency) nicht schon
// beim Laden dieser Datei crasht — nur ein tatsächlicher Aufruf braucht es.
async function einzelnerTurn(
  system: string,
  prompt: string,
  model: string,
  outputFormat?: { type: 'json_schema'; schema: Record<string, unknown> },
) {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  const stream = query({
    prompt,
    options: {
      systemPrompt: system,
      tools: [],
      settingSources: [],
      model,
      thinking: { type: 'disabled' },
      ...(outputFormat ? { outputFormat } : {}),
    },
  });
  for await (const msg of stream) {
    if (msg.type === 'result') return msg;
  }
  throw new Error('Claude-Agent-SDK (dev): kein result-Event erhalten');
}

function usageAus(msg: { usage: NonNullableUsage }): KiUsage {
  const u = msg.usage;
  return {
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheCreationTokens: u.cache_creation_input_tokens ?? 0,
  };
}

function logDevUsage(
  callTyp: string,
  model: string,
  msg: { total_cost_usd: number; usage: NonNullableUsage },
): void {
  console.log(
    JSON.stringify({
      kiUsageDev: true,
      hinweis: 'Claude-Agent-SDK (persönliche Subscription, nur lokales Testen)',
      callTyp,
      model,
      usage: usageAus(msg),
      geschaetzterKostenwertUsd: msg.total_cost_usd,
    }),
  );
}
