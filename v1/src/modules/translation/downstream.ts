import { env } from "../../config/env";

type Json = Record<string, unknown>;

const DOWNSTREAM_TIMEOUT_MS = 120_000;

async function postJson(url: string, body: Json): Promise<Json> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DOWNSTREAM_TIMEOUT_MS),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const cause =
      e instanceof Error && "cause" in e && (e as Error & { cause?: unknown }).cause != null
        ? String((e as Error & { cause?: unknown }).cause)
        : "";
    if (env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[gateway downstream] request failed:", url, msg, cause || "");
    }
    throw new Error(`DOWNSTREAM_NETWORK:${msg}${cause ? `|${cause}` : ""}`);
  }

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`DOWNSTREAM_${res.status}:${raw.slice(0, 4000)}`);
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`DOWNSTREAM_EMPTY_BODY:${url}`);
  }

  try {
    return JSON.parse(trimmed) as Json;
  } catch {
    throw new Error(`DOWNSTREAM_BAD_JSON:${trimmed.slice(0, 800)}`);
  }
}

/** Maps client/NLLB-style labels to codes expected by translation_v2 (`source` / `target`). */
function mapLangForTranslationService(lang: string | undefined): string | undefined {
  if (lang == null || lang === "") return undefined;
  const t = lang.trim();
  const lower = t.toLowerCase();
  if (lower === "eng_latn" || lower === "en" || lower === "english") return "en";
  if (lower === "lus_latn" || lower === "kokborok" || lower === "boro" || lower === "trp") return env.KOKBOROK_LANGUAGE_CODE;
  return t;
}

export async function translate(input: { text: string; sourceLang?: string; targetLang?: string }) {
  const target = mapLangForTranslationService(input.targetLang);
  if (!target) throw new Error("TRANSLATION_TARGET_REQUIRED");

  const payload: Record<string, string> = { text: input.text, target };
  const source = mapLangForTranslationService(input.sourceLang);
  if (source !== undefined) payload.source = source;

  const base = env.TRANSLATION_SERVICE_URL.replace(/\/+$/, "");
  const out = await postJson(`${base}/translate`, payload);
  return out;
}

export async function morphAnalyze(input: { text: string; lang?: string }) {
  const base = env.POS_SERVICE_URL.replace(/\/+$/, "");
  const out = await postJson(`${base}/api/v1/analyze`, { sentence: input.text });
  return out;
}
