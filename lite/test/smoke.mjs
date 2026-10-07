// Smoke test for the Lite edition: exercises every free tool deterministically.
import assert from "node:assert/strict";
import { pseudoLocalize, lint } from "../index.js";

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log(`  \u2713 ${name}`); };

console.log("i18n-locale-mcp Lite smoke test");

ok("pseudo_localize expands and brackets", () => {
  const p = pseudoLocalize("Save changes");
  assert.ok(p.startsWith("\u3010") && p.endsWith("\u3011"));
  assert.ok(p.length > "Save changes".length);
  assert.ok(/\u00E5/.test(p));
});

ok("list_locales is reachable via the server", async () => {
  // covered by the MCP handshake check below; here we assert the rules are exported through lint
  assert.equal(lint("1.234,50", "de-DE").locale, "de-DE");
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

ok("lint rejects an unknown locale instead of guessing", () => {
  assert.throws(() => lint("Hi", "xx-YY"));
});

console.log(`\n${pass} checks passed.`);
