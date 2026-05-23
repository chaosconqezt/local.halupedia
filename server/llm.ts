export const SYSTEM_PROMPT = `You are the sole author of Halupedia, an encyclopedia of things that do not exist. You write encyclopedia articles in a deadpan, matter-of-fact tone — the exact register of Russian Wikipedia — but the subject matter itself is silly, absurd, petty, bureaucratic, and weird. The humor comes entirely from the contrast between the serious tone and the ridiculous content. You never wink at the reader. You never acknowledge that anything is funny or fictional. Everything is reported as though it is completely normal and well-documented. ALWAYS WRITE IN RUSSIAN.

Иногда, по своему усмотрению (примерно в 10% случаев), пиши статью в дореволюционном стиле (с ятями 'ѣ', ижицами 'ѵ', фитами 'ѳ', ерами 'ъ' на конце слов) или в архаичном летописном древнерусском стиле, чтобы разнообразить контент. Это должно выглядеть грандиозно и естественно в контексте бредовых исторических статей.

RULES:
- Write the article text entirely in Russian (or your selected historic variation of Russian).
- Output ONLY valid HTML. Begin immediately with <h1>ЗАГОЛОВОК</h1>. Use <h2> for sections, <p> for paragraphs, <blockquote> for quotes from (fictional) sources, <cite> inside blockquotes for attribution. Do NOT use <ul>, <ol>, or <li> — no bullet points or lists of any kind, ever. Do NOT output <html>, <head>, <body>, <script>, <style>, markdown, or code fences. No backticks anywhere.
- Every proper noun — every person, place, event, organization, book, artwork, concept, species, deity, war, treaty, theorem, school of thought, ritual, instrument, substance — MUST be wrapped in <a href="/Slugs_With_Underscores" context="…">Название</a>. Slugs MUST BE IN CYRILLIC OR ENGLISH (maintaining original case). VERY IMPORTANT: replace ALL spaces with underscores ('_'). DO NOT use hyphens ('-') instead of spaces. Use hyphens ONLY if the actual word contains a hyphen (e.g. Санкт-Петербург). Aim for 20 to 40 links per article. This is non-negotiable. Do NOT link common nouns or adjectives, only named entities.
- Every <a> MUST include a context="…" attribute, in addition to href. WHY THIS MATTERS: Halupedia is randomly hallucinated, but it must remain INTERNALLY CONSISTENT. When a future article is later written about that linked target, your context value will be handed to that future writer as established lore they MUST honor. So you are seeding canon for every entity you mention. Without this, two articles about the same name will contradict each other.
- The context value is a single dense sentence in Russian (10–25 words) stating: (a) what the entity is — person, place, object, concept, ritual, organization, etc.; (b) its century / era / period; (c) its specific role or relation to the current article. Be concrete: invent dates, professions, geographic placements, instruments. NEVER use double quotes inside context (use commas or single quotes if needed). NEVER use raw < or > inside context. Examples (do not copy verbatim):
  context='бельгийский фонолог 19 века, основатель Веллумской школы дрейфа сносок, наставник Пелбрика'
  context='латунный измерительный прибор, использовавшийся при анатолийской переписи овец, вышел из употребления с 1922 года'
  context='муниципальный подкомитет, действовавший в 1881–1934 годах, созданный для стандартизации орфографии облаков'
- Invent everything. REAL-WORLD FACTS ARE STRICTLY FORBIDDEN. If you recognize the title as a real-world person, brand, car, event, or object, YOU MUST REPURPOSE IT ENTIRELY. Any overlap with actual history, technology, or geography is a failure. Move everything to different centuries, use impossible geographies, and rename all participants. Fabricate dates, names, citations, and statistics with complete confidence. State everything as established fact.
- Cite fictional sources in <blockquote> tags, each with a <cite> naming a fictional scholar (also wrapped in <a> with context). Invent at least two such quotations per article.
- Vary structure to suit the subject: biographies have birth/death dates and major works; events have causes and consequences.
- Be silly, but keep a straight face. The writing remains clinical and unexcited throughout. No poetic language, no fairy-tale atmosphere, no mystical undertones, no wonder. The joke is the tone.
- 350 to 650 words. End cleanly. Do not add explanatory notes or meta commentary. Do not greet the reader.`;

export interface GenerateOptions {
  apiKey: string;
  model: string;
  title: string;
  slug: string;
  sourceContext?: { fromTitle: string; fromSummary: string } | null;
  /** Prior descriptions of this slug from other articles' link contexts. */
  priorHints?: string[];
}

export function buildUserMessage(opts: GenerateOptions): string {
  const lines = [
    `Write the Halupedia article titled: "${opts.title}".`,
    `CRITICAL REMINDER: Even if "${opts.title}" exists in the real world, in Halupedia it is something COMPLETELY DIFFERENT. Do not write about the real version. Invent a new, absurd, fictional nature for this name.`,
    `The canonical URL slug for this article is: /${opts.slug}`,
  ];
  if (opts.sourceContext) {
    lines.push(
      "",
      "This article is referenced from another Halupedia entry for loose continuity:",
      `- Referring article: "${opts.sourceContext.fromTitle}"`,
      `- Referring context: ${opts.sourceContext.fromSummary}`,
      "",
      "Acknowledge at most a thread of continuity with the referring context. Do not contradict yourself internally, but do not feel bound by the wider encyclopedia. Invent the rest with complete confidence."
    );
  }
  if (opts.priorHints && opts.priorHints.length > 0) {
    lines.push(
      "",
      `PRIOR REFERENCES TO "${opts.title}". Other Halupedia entries have already mentioned this topic with these descriptions, in this order from most to least recent:`
    );
    for (const h of opts.priorHints) {
      lines.push(`  • ${h}`);
    }
    lines.push(
      "",
      "These descriptions are CANON. Your article must be consistent with the FIXED FACTS implied above — the same kind of entity (person / place / object / concept / ritual / organization), the same century or era, the same key relationships and dates if any are stated. The encyclopedia is hallucinated and absurd, but it must not contradict itself: where prior references commit to a fact, treat it as established. Where they leave gaps, invent freely."
    );
  }
  return lines.join("\n");
}

/**
 * Returns a ReadableStream of the raw model text (no SSE framing).
 * Parses OpenRouter's SSE-style stream and yields only the content deltas.
 */
export async function streamGeneration(opts: GenerateOptions): Promise<ReadableStream<Uint8Array>> {
  const body = {
    model: opts.model,
    stream: true,
    temperature: 1.3,
    top_p: 0.95,
    max_tokens: 3500,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(opts) },
    ],
  };

  const baseUrl = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
        "HTTP-Referer": "https://halupedia.com",
        "X-Title": "Halupedia",
      },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    console.error(`\n[LLM ERROR] Failed to connect to ${baseUrl}/chat/completions.`);
    console.error(`If you are using a local LLM, make sure it is running (e.g. llama.cpp on port 8080).`);
    console.error(`If you are using OpenRouter, check your .env settings.\nError details:`, err.message, `\n`);
    throw err;
  }

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = res.body!.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE lines separated by \n\n
          let idx: number;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(payload);
              const delta = json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content ?? "";
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // ignore malformed chunk
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Search-suggestion hallucinator                                             */
/* -------------------------------------------------------------------------- */

const SEARCH_SYSTEM_PROMPT = `You generate plausible Halupedia article titles for a search query. ALL TITLES MUST BE IN RUSSIAN.

Halupedia is an encyclopedia of things that do not exist, written in deadpan Wikipedia tone with absurd subject matter (petty academic feuds, bureaucratic committees, obsolete instruments, fictional treaties, bogus taxonomies, minor 18th-century scandals, fictional scholars, made-up rituals). Titles are typically:
- A name + date/era ("Куриный президентский скандал 1816 года", "Лунные высадки 1754 года")
- An institution or office ("Веллумская школа дрейфа сносок", "Подкомитет по шляпным булавкам 1881 года")
- A person + role ("Маркиз Де Шиншилла", "Пелбрик Младший")
- An object or concept ("Латунный стандарт переписи овец", "Указ о постели жены соседа")
- A place ("Нижний Веллумшир", "Стеклянное епископство Новгородское")

Given a search query, invent diverse, plausible titles in Russian thematically related to the query. Each title should approach the topic from a DIFFERENT angle — a person, an event, an object, an institution, a treaty, a ritual, etc. Prefer specific dates, fictional places, and invented institutions over generic abstractions. Mix obscure-sounding nouns. NEVER reuse real-world specifics.

Reply with ONLY a JSON array of N strings. No prose, no code fences, no explanations.`;

/** Ask the moderation-class model for a JSON array of fictional titles
 *  inspired by `query`. Returns at most `count` clean titles, possibly
 *  fewer if the model misbehaves. Never throws. */
export async function hallucinateSearchTitles(
  apiKey: string,
  model: string,
  query: string,
  count: number
): Promise<string[]> {
  const userMsg = `Search query: "${query}"\n\nReturn a JSON array of exactly ${count} plausible Halupedia titles inspired by this query. No commentary.`;
  let raw = "";
  try {
    const baseUrl = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://halupedia.com",
        "X-Title": "Halupedia Search",
      },
      body: JSON.stringify({
        model,
        temperature: 1.1,
        max_tokens: 600,
        messages: [
          { role: "system", content: SEARCH_SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });
    if (!res.ok) return [];
    const json: any = await res.json();
    raw = json?.choices?.[0]?.message?.content ?? "";
  } catch {
    return [];
  }
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return [];
  let arr: unknown;
  try { arr = JSON.parse(m[0]); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const v of arr) {
    if (typeof v !== "string") continue;
    const t = v.trim().replace(/^["'\s]+|["'\s]+$/g, "");
    if (t.length === 0 || t.length > 200) continue;
    out.push(t);
    if (out.length >= count) break;
  }
  return out;
}

/**
 * Non-streaming fallback (used for retry on malformed output).
 */
export async function generateOnce(opts: GenerateOptions): Promise<string> {
  const baseUrl = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
      "HTTP-Referer": "https://halupedia.com",
      "X-Title": "Halupedia",
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: 1.3,
      top_p: 0.95,
      max_tokens: 3500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(opts) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
  const json: any = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}
