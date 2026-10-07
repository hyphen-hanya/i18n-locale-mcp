// Smoke test: exercises every tool deterministically and fails loudly on regression.
import assert from "node:assert/strict";
import { pseudoLocalize, lint, glossaryApply, localize } from "../index.js";

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log(`  \u2713 ${name}`); };

console.log("i18n-locale-mcp smoke test");

ok("pseudo_localize expands and brackets", () => {
  const p = pseudoLocalize("Save changes");
  assert.ok(p.startsWith("\u3010") && p.endsWith("\u3011"));
  assert.ok(p.length > "Save changes".length);
  assert.ok(p.includes("S\u00E5") || /\u00E5/.test(p));
});

ok("lint flags en-US number grouping in de-DE", () => {
  const r = lint("Gesamt: 1,234 EUR", "de-DE");
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.code === "NUMBER_GROUP_SEP"));
});

ok("lint passes clean de-DE string", () => {
  const r = lint("Gesamt: 1.234,50 EUR", "de-DE");
  assert.ok(!r.issues.some((i) => i.code === "NUMBER_GROUP_SEP" && i.severity === "error"));
});

ok("lint catches MDY date in DMY locale", () => {
  const r = lint("Due 03/25/2026", "fr-FR");
  assert.ok(r.issues.some((i) => i.code === "DATE_ORDER"));
});

ok("lint enforces placeholder parity", () => {
  const r = lint("Bonjour !", "fr-FR", { source: "Hello {name}, you have {count} items" });
  assert.ok(r.issues.some((i) => i.code === "PLACEHOLDER_MISSING"));
});

ok("lint flags missing bidi marks for RTL with LTR run", () => {
  const r = lint("\u0645\u0631\u062D\u0628\u0627 OpenClaw", "ar-SA");
  assert.ok(r.issues.some((i) => i.code === "BIDI_MARK"));
});

ok("lint enforces length budget", () => {
  const r = lint("this is definitely too long for the button", "en-US", { maxLength: 10 });
  assert.ok(r.issues.some((i) => i.code === "LENGTH_BUDGET"));
});

ok("glossary flags untranslated term", () => {
  const r = glossaryApply([{ source: "Save", target: "Enregistrer" }], [{ key: "btn.save", text: "Save" }]);
  assert.equal(r.violatingItems, 1);
  assert.equal(r.report[0].violations[0].code, "TERM_UNTRANSLATED");
});

ok("glossary passes correct translation", () => {
  const r = glossaryApply([{ source: "Save", target: "Enregistrer" }], [{ key: "btn.save", text: "Enregistrer" }]);
  assert.equal(r.violatingItems, 0);
});

ok("localize returns jobs when no provider configured", async () => {
  const prev = process.env.I18N_LLM_BASE_URL;
  delete process.env.I18N_LLM_BASE_URL;
  const r = await localize("Hello {name}", ["de-DE", "ja-JP"]);
  if (prev) process.env.I18N_LLM_BASE_URL = prev;
  assert.equal(r.providerMode, "jobs");
  assert.equal(r.results.length, 2);
  assert.equal(r.results[0].status, "needs_translation");
  assert.deepEqual(r.results[0].job.placeholders, ["{name}"]);
});

ok("localize reports unknown locale instead of guessing", async () => {
  const r = await localize("Hi", ["xx-YY"]);
  assert.ok(r.results[0].error);
});

console.log(`\n${pass} checks passed.`);
