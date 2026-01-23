import type { NextApiRequest, NextApiResponse } from "next";
import fallback from "../../data/asa-note/fallback-proverbs.json";

type AsaNoteResponse = {
  proverb_text: string;
  author: string;
  source: "ZenQuotes" | "Local";
  attribution_html: string;
};

const ZEN_ATTRIBUTION =
  'Inspirational quotes provided by <a href="https://zenquotes.io/" target="_blank" rel="noreferrer">ZenQuotes API</a>';

const TTL_MS = 6 * 60 * 60 * 1000;
let cache: { expiresAt: number; value: AsaNoteResponse } | null = null;

function stableHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function localPick(seed?: string): AsaNoteResponse {
  const list = (fallback as Array<{ id: string; text: string; author?: string }>) || [];
  const safeList = list.length ? list : [{ id: "p-000", text: "Stay ready so you never have to get ready.", author: "Proverb" }];
  const idx = seed ? stableHash(seed) % safeList.length : Math.floor(Math.random() * safeList.length);
  const item = safeList[idx];
  return { proverb_text: item.text, author: item.author || "Proverb", source: "Local", attribution_html: "" };
}

async function fetchZenQuotes(mode: "random" | "today"): Promise<AsaNoteResponse> {
  const url = mode === "today" ? "https://zenquotes.io/api/today" : "https://zenquotes.io/api/random";
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  const data = (await r.json()) as Array<{ q?: string; a?: string }>;
  const q = data?.[0]?.q?.trim();
  const a = data?.[0]?.a?.trim();
  if (!q) throw new Error("invalid payload");
  return { proverb_text: q, author: a || "Unknown", source: "ZenQuotes", attribution_html: ZEN_ATTRIBUTION };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<AsaNoteResponse>) {
  const mode = (req.query.mode === "today" ? "today" : "random") as "random" | "today";
  const seed = typeof req.query.seed === "string" ? req.query.seed : undefined;

  if (cache && Date.now() < cache.expiresAt) {
    res.status(200).json(cache.value);
    return;
  }

  try {
    const value = await fetchZenQuotes(mode);
    cache = { value, expiresAt: Date.now() + TTL_MS };
    res.status(200).json(value);
  } catch {
    res.status(200).json(localPick(seed));
  }
}
