// Runnable demo of the i18n-locale-mcp toolkit (no MCP client required).
import { pseudoLocalize, lint, glossaryApply, localize } from "../index.js";

const line = (s) => console.log("\n" + "\u2500".repeat(60) + "\n" + s + "\n" + "\u2500".repeat(60));

line("1) Pseudo-localize a UI string (expansion + accents)");
console.log(pseudoLocalize("Save changes"));

line("2) Lint: en-US number grouping inside German");
console.log(JSON.stringify(lint("Gesamt: 1,234 EUR", "de-DE"), null, 2));

line("3) Lint: ambiguous date in French (expects DD/MM)");
console.log(JSON.stringify(lint("Livraison le 03/25/2026", "fr-FR", { source: "Delivery on {date}" }), null, 2));

line("4) Glossary: untranslated term");
console.log(JSON.stringify(glossaryApply(
  [{ source: "Save", target: "Enregistrer" }, { source: "OpenClaw", keep: true }],
  [{ key: "btn.save", text: "Save" }, { key: "brand", text: "openclaw" }],
), null, 2));

line("5) localize(): structured jobs when no provider is set (never fabricates)");
const r = await localize("Hello {name}, you have {count} new messages.", ["de-DE", "ja-JP"]);
console.log("providerMode:", r.providerMode);
console.log(JSON.stringify(r.results[0].job, null, 2));
