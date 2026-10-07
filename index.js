#!/usr/bin/env node
/**
 * i18n-locale-mcp — a zero-dependency MCP server for localization QA.
 *
 * Tools (all runnable without any API key):
 *   - pseudo_localize : generate pseudolocale strings to test UI expansion (real i18n practice)
 *   - i18n_lint        : validate translated strings against locale formatting rules
 *   - glossary_apply   : enforce glossary / term consistency across target strings
 *   - localize         : translate + post-process. Uses an LLM provider when configured,
 *                        otherwise emits structured translation jobs (never fabricates output).
 *
 * Transport: MCP over stdio (JSON-RPC 2.0), newline-delimited.
 * Compatible with Claude Desktop, Cursor, Dify, and any MCP client.
 */
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";

const NAME = "i18n-locale-mcp";
const VERSION = "1.0.0";
const PROTOCOL = "2025-06-18";

/* ------------------------------------------------------------------ */
/* Locale rules                                                        */
/* ------------------------------------------------------------------ */

// Deterministic, offline formatting rules per locale. These power lint + post-processing.
const LOCALE_RULES = {
  "en-US": { name: "English (US)", openQuote: "\u201C", closeQuote: "\u201D", groupSep: ",", decimalSep: ".", dateOrder: "MDY", dateFmt: "MM/DD/YYYY", formality: "neutral", rtl: false, punct: ".,:;!?" },
  "en-GB": { name: "English (UK)", openQuote: "\u2018", closeQuote: "\u2019", groupSep: ",", decimalSep: ".", dateOrder: "DMY", dateFmt: "DD/MM/YYYY", formality: "neutral", rtl: false, punct: ".,:;!?" },
  "de-DE": { name: "German", openQuote: "\u201E", closeQuote: "\u201C", groupSep: ".", decimalSep: ",", dateOrder: "DMY", dateFmt: "DD.MM.YYYY", formality: "formal", rtl: false, punct: ".,:;!?" },
  "fr-FR": { name: "French", openQuote: "\u00AB\u00A0", closeQuote: "\u00A0\u00BB", groupSep: "\u202F", decimalSep: ",", dateOrder: "DMY", dateFmt: "DD/MM/YYYY", formality: "formal", rtl: false, punct: ".,:;!?" },
  "es-ES": { name: "Spanish (ES)", openQuote: "\u00AB", closeQuote: "\u00BB", groupSep: ".", decimalSep: ",", dateOrder: "DMY", dateFmt: "DD/MM/YYYY", formality: "neutral", rtl: false, punct: ".,:;!\u00BF\u00A1" },
  "es-MX": { name: "Spanish (MX)", openQuote: "\u201C", closeQuote: "\u201D", groupSep: ",", decimalSep: ".", dateOrder: "DMY", dateFmt: "DD/MM/YYYY", formality: "neutral", rtl: false, punct: ".,:;!\u00BF\u00A1" },
  "pt-BR": { name: "Portuguese (BR)", openQuote: "\u201C", closeQuote: "\u201D", groupSep: ".", decimalSep: ",", dateOrder: "DMY", dateFmt: "DD/MM/YYYY", formality: "neutral", rtl: false, punct: ".,:;!?" },
  "it-IT": { name: "Italian", openQuote: "\u00AB", closeQuote: "\u00BB", groupSep: ".", decimalSep: ",", dateOrder: "DMY", dateFmt: "DD/MM/YYYY", formality: "neutral", rtl: false, punct: ".,:;!?" },
  "nl-NL": { name: "Dutch", openQuote: "\u201C", closeQuote: "\u201D", groupSep: ".", decimalSep: ",", dateOrder: "DMY", dateFmt: "DD-MM-YYYY", formality: "neutral", rtl: false, punct: ".,:;!?" },
  "ru-RU": { name: "Russian", openQuote: "\u00AB", closeQuote: "\u00BB", groupSep: "\u00A0", decimalSep: ",", dateOrder: "DMY", dateFmt: "DD.MM.YYYY", formality: "neutral", rtl: false, punct: ".,:;!?" },
  "ja-JP": { name: "Japanese", openQuote: "\u300C", closeQuote: "\u300D", groupSep: ",", decimalSep: ".", dateOrder: "YMD", dateFmt: "YYYY/MM/DD", formality: "formal", rtl: false, punct: "\u3002\u3001\uFF01\uFF1F" },
  "ko-KR": { name: "Korean", openQuote: "\u201C", closeQuote: "\u201D", groupSep: ",", decimalSep: ".", dateOrder: "YMD", dateFmt: "YYYY.MM.DD", formality: "formal", rtl: false, punct: ".,?!\u3002" },
  "zh-CN": { name: "Chinese (Simplified)", openQuote: "\u201C", closeQuote: "\u201D", groupSep: ",", decimalSep: ".", dateOrder: "YMD", dateFmt: "YYYY\u5E74M\u6708D\u65E5", formality: "neutral", rtl: false, punct: "\u3002\uFF0C\uFF01\uFF1F\uFF1B\uFF1A" },
  "zh-TW": { name: "Chinese (Traditional)", openQuote: "\u300C", closeQuote: "\u300D", groupSep: ",", decimalSep: ".", dateOrder: "YMD", dateFmt: "YYYY/M/D", formality: "neutral", rtl: false, punct: "\u3002\uFF0C\uFF01\uFF1F\uFF1B\uFF1A" },
  "ar-SA": { name: "Arabic", openQuote: "\u00AB", closeQuote: "\u00BB", groupSep: ",", decimalSep: ".", dateOrder: "DMY", dateFmt: "DD/MM/YYYY", formality: "formal", rtl: true, punct: "\u060C\u061B\u061F" },
  "he-IL": { name: "Hebrew", openQuote: "\u201E", closeQuote: "\u201C", groupSep: ",", decimalSep: ".", dateOrder: "DMY", dateFmt: "DD/MM/YYYY", formality: "neutral", rtl: true, punct: ".,:;!?" },
  "id-ID": { name: "Indonesian", openQuote: "\u201C", closeQuote: "\u201D", groupSep: ".", decimalSep: ",", dateOrder: "DMY", dateFmt: "DD/MM/YYYY", formality: "neutral", rtl: false, punct: ".,:;!?" },
  "vi-VN": { name: "Vietnamese", openQuote: "\u201C", closeQuote: "\u201D", groupSep: ".", decimalSep: ",", dateOrder: "DMY", dateFmt: "DD/MM/YYYY", formality: "neutral", rtl: false, punct: ".,:;!?" },
  "th-TH": { name: "Thai", openQuote: "\u201C", closeQuote: "\u201D", groupSep: ",", decimalSep: ".", dateOrder: "DMY", dateFmt: "DD/MM/YYYY", formality: "neutral", rtl: false, punct: ".,:;!?" },
  "tr-TR": { name: "Turkish", openQuote: "\u201C", closeQuote: "\u201D", groupSep: ".", decimalSep: ",", dateOrder: "DMY", dateFmt: "DD.MM.YYYY", formality: "neutral", rtl: false, punct: ".,:;!?" },
};
const PRACTICAL_LOCALES = ["en-US", "en-GB", "de-DE", "fr-FR", "es-ES", "es-MX", "pt-BR", "it-IT", "nl-NL", "ru-RU", "ja-JP", "ko-KR", "zh-CN", "zh-TW", "ar-SA", "he-IL", "id-ID", "vi-VN", "th-TH", "tr-TR"];

/* ------------------------------------------------------------------ */
/* Core: pseudo-localization (deterministic, always runnable)          */
/* ------------------------------------------------------------------ */

const ACCENTS = { a: "\u00E5", b: "\u0185", c: "\u00E7", d: "\u00F0", e: "\u00E9", f: "\u0192", g: "\u011D", h: "\u0125", i: "\u00EE", j: "\u0135", k: "\u0137", l: "\u013C", m: "\u1E3F", n: "\u00F1", o: "\u00F6", p: "\u00FE", q: "\u01EB", r: "\u0159", s: "\u0161", t: "\u0163", u: "\u00FB", v: "\u1E7D", w: "\u0175", x: "\u017E", y: "\u00FD", z: "\u017E", A: "\u00C5", B: "\u0184", C: "\u00C7", D: "\u00D0", E: "\u00C9", F: "\u0191", G: "\u011C", H: "\u0124", I: "\u00CE", J: "\u0134", K: "\u0136", L: "\u013B", M: "\u1E3E", N: "\u00D1", O: "\u00D6", P: "\u00DE", Q: "\u01EA", R: "\u0158", S: "\u0160", T: "\u0162", U: "\u00DB", V: "\u1E7C", W: "\u0174", X: "\u017D", Y: "\u00DD", Z: "\u017D" };

/**
 * Pseudolocalize source strings to surface hard-coded text, truncation, and
 * layout breakage before real translation. Deterministic -> ideal for CI.
 * @param {string} text
 * @param {{expansion?:number, brackets?:boolean, accent?:boolean}} [opts]
 */
export function pseudoLocalize(text, opts = {}) {
  const expansion = opts.expansion ?? 0.4; // 40% average expansion budget
  const brackets = opts.brackets ?? true;
  const accent = opts.accent ?? true;
  const out = [...text].map((ch) => (accent && ACCENTS[ch] ? ACCENTS[ch] : ch)).join("");
  const pad = Math.round(text.length * expansion);
  const filler = "~".repeat(pad);
  const res = expansion > 0 ? `${out}${filler}` : out;
  return brackets ? `\u3010${res}\u3011` : res;
}

/* ------------------------------------------------------------------ */
/* Core: lint (deterministic locale QA)                                */
/* ------------------------------------------------------------------ */

function numSepIssues(text, rules, locale) {
  const issues = [];
  // US-style thousands groups "1,234" are wrong where groupSep is "." / narrow NBSP.
  if (rules.groupSep !== "," && /\d{1,3}(,\d{3})+/.test(text)) {
    issues.push({ code: "NUMBER_GROUP_SEP", severity: "error", message: `Expected thousands separator "${rules.groupSep}" for ${locale}; found "," (looks like en-US formatting).` });
  }
  // Decimal comma used where locale uses dot, and vice versa.
  if (rules.decimalSep === "," && /\d+\.\d+/.test(text) && rules.groupSep !== ".") {
    issues.push({ code: "DECIMAL_SEP", severity: "warn", message: `Expected decimal separator "," for ${locale}; found ".".` });
  }
  return issues;
}

function dateIssues(text, rules, locale) {
  const issues = [];
  const m = text.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\b/);
  if (!m) return issues;
  const [a, b] = [Number(m[1]), Number(m[2])];
  let looksLike = null;
  if (a > 12 && b <= 12) looksLike = "DMY";
  else if (a <= 12 && b > 12) looksLike = "MDY";
  if (looksLike && looksLike !== rules.dateOrder) {
    issues.push({ code: "DATE_ORDER", severity: "error", message: `Ambiguous date "${m[0]}" looks like ${looksLike} but ${locale} expects ${rules.dateOrder} (${rules.dateFmt}).` });
  }
  return issues;
}

function quoteIssues(text, rules, locale) {
  const issues = [];
  if (rules.openQuote !== "\u201C" && /[\u201C\u201D]/.test(text)) {
    issues.push({ code: "QUOTE_STYLE", severity: "warn", message: `Straight/curly " quotes used; ${locale} prefers ${rules.openQuote}...${rules.closeQuote}.` });
  }
  if (rules.rtl && /[\u201C\u201D]/.test(text)) {
    issues.push({ code: "QUOTE_STYLE", severity: "warn", message: `RTL locale ${locale} should use ${rules.openQuote}...${rules.closeQuote} and wrap embedded LTR runs with U+2066/U+2069.` });
  }
  return issues;
}

function cjkPunctIssues(text, rules, locale) {
  const issues = [];
  if (!/^(ja|ko|zh|th)/.test(locale)) return issues;
  if (/,/.test(text)) issues.push({ code: "PUNCT_FULLWIDTH", severity: "info", message: `${locale} typically uses fullwidth punctuation; found ASCII ",".` });
  return issues;
}

function rtlIssues(text, rules, locale) {
  const issues = [];
  if (!rules.rtl) return issues;
  if (!text.includes("\u200F") && !text.includes("\u2066") && /[A-Za-z]/.test(text)) {
    issues.push({ code: "BIDI_MARK", severity: "warn", message: `${locale} mixes LTR runs with RTL text; wrap LTR segments in U+2066...U+2069 (or add U+200F) to avoid reordering.` });
  }
  return issues;
}

function placeholderIssues(text, source) {
  const issues = [];
  const ph = (s) => (String(s ?? "").match(/\{\{\s*[\w.]+\s*\}\}|\{[^{}]+\}|%[sdif]|%\d+\$[sd]/g) || []);
  const a = ph(source).sort();
  const b = ph(text).sort();
  const missing = a.filter((x) => !b.includes(x));
  const extra = b.filter((x) => !a.includes(x));
  if (missing.length) issues.push({ code: "PLACEHOLDER_MISSING", severity: "error", message: `Missing placeholders vs source: ${missing.join(", ")}` });
  if (extra.length) issues.push({ code: "PLACEHOLDER_EXTRA", severity: "error", message: `Unexpected placeholders not in source: ${extra.join(", ")}` });
  return issues;
}

/**
 * Lint a target string against a locale's formatting rules.
 * @param {string} text translated text
 * @param {string} locale e.g. "de-DE"
 * @param {{source?:string, maxLength?:number}} [opts]
 */
export function lint(text, locale, opts = {}) {
  if (!LOCALE_RULES[locale]) throw new Error(`Unknown locale "${locale}". See tool "list_locales".`);
  const rules = LOCALE_RULES[locale];
  const issues = [
    ...numSepIssues(text, rules, locale),
    ...dateIssues(text, rules, locale),
    ...quoteIssues(text, rules, locale),
    ...cjkPunctIssues(text, rules, locale),
    ...rtlIssues(text, rules, locale),
    ...(opts.source ? placeholderIssues(text, opts.source) : []),
  ];
  if (typeof opts.maxLength === "number") {
    if ([...text].length > opts.maxLength) {
      issues.push({ code: "LENGTH_BUDGET", severity: "warn", message: `Length ${[...text].length} exceeds budget ${opts.maxLength} (UI may truncate).` });
    }
  }
  return { locale, ok: issues.every((i) => i.severity !== "error"), issueCount: issues.length, issues, rules: { formality: rules.formality, rtl: rules.rtl, dateFmt: rules.dateFmt } };
}

/* ------------------------------------------------------------------ */
/* Core: glossary consistency                                          */
/* ------------------------------------------------------------------ */

/**
 * Enforce a glossary across target strings. Terms flagged "keep" must appear
 * verbatim; translated terms must appear in their target form.
 * @param {Array<{source:string, target:string}>} glossary
 * @param {Array<{key?:string, text:string}>} items
 */
export function glossaryApply(glossary, items) {
  const report = [];
  for (const it of items) {
    const violations = [];
    for (const g of glossary) {
      if (g.keep) {
        // required verbatim: if source term family appears in text, must be exact form
        if (new RegExp(escapeRe(g.variant || ""), "i").test(it.text) && g.variant && g.variant !== g.source) {
          violations.push({ term: g.source, code: "KEEP_VARIANT", message: `Brand/proper term must stay "${g.source}", found variant "${g.variant}".` });
        }
        continue;
      }
      const src = g.source;
      const tgt = g.target;
      if (!src || !tgt) continue;
      // If target term is missing where its source concept is referenced by an obvious cognate, flag.
      if (new RegExp(escapeRe(src), "i").test(it.text) && !new RegExp(escapeRe(tgt), "i").test(it.text)) {
        violations.push({ term: src, code: "TERM_UNTRANSLATED", message: `Source term "${src}" left untranslated; expected "${tgt}".` });
      }
    }
    if (violations.length) report.push({ key: it.key ?? null, text: it.text, violations });
  }
  return { itemCount: items.length, violatingItems: report.length, report };
}

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/* ------------------------------------------------------------------ */
/* Core: localize (LLM-assisted when configured, else structured jobs) */
/* ------------------------------------------------------------------ */

function providerConfig() {
  const base = process.env.I18N_LLM_BASE_URL;
  const key = process.env.I18N_LLM_API_KEY || process.env.OPENROUTER_API_KEY;
  const model = process.env.I18N_LLM_MODEL || "openai/gpt-4o-mini";
  return base && key ? { base, key, model } : null;
}

async function llmTranslate(text, locale, cfg) {
  const rules = LOCALE_RULES[locale];
  const sys = `You are a professional localization engine. Translate into ${rules.name} (${locale}). ` +
    `Preserve ALL placeholders, markup and numbers exactly. Keep brand terms verbatim. ` +
    `Output ONLY the translated string, no quotes, no notes.`;
  const res = await fetch(`${cfg.base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({ model: cfg.model, temperature: 0.2, messages: [{ role: "system", content: sys }, { role: "user", content: text }] }),
  });
  if (!res.ok) throw new Error(`provider ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content?.trim() ?? "";
}

/**
 * Translate and post-process. With a provider configured, returns real translations
 * plus lint results. Without one, returns structured translation job descriptors
 * (source + rules + placeholders) that a downstream agent/human can execute — it never
 * fabricates translations.
 * @param {string} text
 * @param {string[]} locales
 */
export async function localize(text, locales, opts = {}) {
  const glossary = opts.glossary || [];
  const cfg = providerConfig();
  const results = [];
  for (const locale of locales) {
    if (!LOCALE_RULES[locale]) { results.push({ locale, error: `Unknown locale "${locale}".` }); continue; }
    if (cfg) {
      let translated = "";
      let error = null;
      try { translated = await llmTranslate(text, locale, cfg); } catch (e) { error = String(e.message || e); }
      const out = { locale, translated, provider: cfg.model, error };
      if (translated) {
        out.lint = lint(translated, locale, { source: text, maxLength: opts.maxLength });
        if (glossary.length) out.glossary = glossaryApply(glossary, [{ text: translated }]);
      }
      results.push(out);
    } else {
      results.push({
        locale,
        status: "needs_translation",
        job: {
          source: text,
          targetLocale: locale,
          rules: LOCALE_RULES[locale],
          placeholders: (text.match(/\{\{\s*[\w.]+\s*\}\}|\{[^{}]+\}|%[sdif]|%\d+\$[sd]/g) || []),
          maxLength: opts.maxLength ?? null,
          glossary,
        },
        hint: "Set I18N_LLM_BASE_URL + I18N_LLM_API_KEY (OpenAI-compatible) to auto-translate, or execute this job with your own model.",
      });
    }
  }
  return { source: text, locales, providerMode: cfg ? "live" : "jobs", results };
}

/* ------------------------------------------------------------------ */
/* MCP plumbing                                                        */
/* ------------------------------------------------------------------ */

const TOOLS = [
  {
    name: "list_locales",
    description: "List supported locales and their formatting rules (quotes, separators, date format, RTL, formality).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: () => ({ locales: LOCALE_RULES, count: Object.keys(LOCALE_RULES).length }),
  },
  {
    name: "pseudo_localize",
    description: "Generate pseudolocalized text (accented + expanded + bracketed) to catch hard-coded strings, truncation and layout breakage before real translation. Deterministic; safe for CI.",
    inputSchema: {
      type: "object",
      required: ["text"],
      properties: {
        text: { type: "string", description: "Source string to pseudolocalize." },
        expansion: { type: "number", description: "Expansion ratio, e.g. 0.4 = +40%. Default 0.4." },
        brackets: { type: "boolean", description: "Wrap in 【】. Default true." },
        accent: { type: "boolean", description: "Accent letters. Default true." },
      },
      additionalProperties: false,
    },
    handler: ({ text, expansion, brackets, accent }) => ({ source: text, pseudo: pseudoLocalize(text, { expansion, brackets, accent }) }),
  },
  {
    name: "i18n_lint",
    description: "Lint a translated string against a locale's rules: number/date separators, quote style, CJK fullwidth punctuation, RTL bidi marks, placeholder parity with source, and length budget. Deterministic.",
    inputSchema: {
      type: "object",
      required: ["text", "locale"],
      properties: {
        text: { type: "string", description: "Translated string to check." },
        locale: { type: "string", description: "Target locale, e.g. de-DE. See list_locales." },
        source: { type: "string", description: "Optional source string for placeholder parity check." },
        maxLength: { type: "number", description: "Optional UI character budget." },
      },
      additionalProperties: false,
    },
    handler: ({ text, locale, source, maxLength }) => lint(text, locale, { source, maxLength }),
  },
  {
    name: "glossary_apply",
    description: "Enforce glossary/term consistency across target strings. Flags untranslated source terms and brand-term variants. Deterministic.",
    inputSchema: {
      type: "object",
      required: ["glossary", "items"],
      properties: {
        glossary: { type: "array", description: "Terms: {source,target} for translation pairs, or {source,keep:true} for brand/proper terms that must stay verbatim.", items: { type: "object" } },
        items: { type: "array", description: "Strings to check: {key?,text}.", items: { type: "object" } },
      },
      additionalProperties: false,
    },
    handler: ({ glossary, items }) => glossaryApply(glossary, items),
  },
  {
    name: "localize",
    description: "Translate source text into one or more locales and post-process (lint + glossary). With an OpenAI-compatible provider configured it returns real translations; otherwise it returns structured translation jobs (it never fabricates output).",
    inputSchema: {
      type: "object",
      required: ["text", "locales"],
      properties: {
        text: { type: "string", description: "Source text (can be multiple lines)." },
        locales: { type: "array", items: { type: "string" }, description: "Target locales, e.g. ['de-DE','ja-JP']." },
        glossary: { type: "array", items: { type: "object" }, description: "Optional glossary for post-check." },
        maxLength: { type: "number", description: "Optional UI character budget." },
      },
      additionalProperties: false,
    },
    handler: ({ text, locales, glossary, maxLength }) => localize(text, locales, { glossary, maxLength }),
  },
];

function rpcResult(id, result) { return { jsonrpc: "2.0", id, result }; }
function rpcError(id, code, message, data) { return { jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } }; }

async function handle(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case "initialize":
      return rpcResult(id, { protocolVersion: PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: NAME, version: VERSION } });
    case "notifications/initialized":
    case "initialized":
      return null;
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return rpcError(id, -32602, `Unknown tool "${params?.name}".`);
      try {
        const out = await tool.handler(params.arguments || {});
        return rpcResult(id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: out, isError: false });
      } catch (e) {
        return rpcResult(id, { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true });
      }
    }
    default:
      if (id === undefined || id === null) return null; // notification
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export function startServer(input = process.stdin, output = process.stdout) {
  const rl = createInterface({ input, crlfDelay: Infinity });
  rl.on("line", async (line) => {
    const s = line.trim();
    if (!s) return;
    let msg;
    try { msg = JSON.parse(s); } catch { return; }
    try {
      const out = await handle(msg);
      if (out) output.write(JSON.stringify(out) + "\n");
    } catch (e) {
      if (msg?.id != null) output.write(JSON.stringify(rpcError(msg.id, -32603, `Internal error: ${e.message}`)) + "\n");
    }
  });
  return rl;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  if (process.argv.includes("--list-tools")) {
    for (const t of TOOLS) console.log(`${t.name}\t${t.description.split(".")[0]}.`);
  } else if (process.argv.includes("--version")) {
    console.log(`${NAME} ${VERSION}`);
  } else {
    startServer();
    process.stderr.write(`${NAME} v${VERSION} listening on stdio (${TOOLS.length} tools)\n`);
  }
}
