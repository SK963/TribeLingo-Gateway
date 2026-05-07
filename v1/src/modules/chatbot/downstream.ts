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
    if (env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[gateway chatbot downstream] request failed:", url, msg);
    }
    throw new Error(`DOWNSTREAM_NETWORK:${msg}`);
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

export async function chatWithBot(input: { user_query: string }): Promise<Json> {
  const base = env.CHATBOT_SERVICE_URL.replace(/\/+$/, "");
  return postJson(`${base}/api/chat`, { user_query: input.user_query });
}

export async function chatbotHealth(): Promise<Json> {
  const base = env.CHATBOT_SERVICE_URL.replace(/\/+$/, "");
  const res = await fetch(`${base}/`, {
    signal: AbortSignal.timeout(10_000),
  });
  return (await res.json()) as Json;
}
