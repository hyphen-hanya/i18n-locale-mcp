# i18n-locale-mcp

A zero-dependency [MCP](https://modelcontextprotocol.io) server that gives any AI agent a
**localization QA toolkit**. Deterministic, offline-capable, and safe to run in CI.

Works with Claude Desktop, Cursor, Dify, AutoGPT, and any MCP-compatible client.

## Why

Shipping a product in 20 locales is easy; shipping it *correctly* is not. Agents and devs
constantly produce `1,234` in German, `03/25` in French, missing `{name}` placeholders, or
untranslated brand terms. This server catches those deterministically — no API key needed.

## Tools

| Tool | What it does | Network |
|:--|:--|:--|
| `list_locales` | Locale formatting rules (quotes, separators, dates, RTL, formality) for 20 locales | none |
| `pseudo_localize` | Accented + expanded pseudolocale to catch hard-coded strings & truncation | none |
| `i18n_lint` | Number/date separators, quote style, CJK punctuation, RTL bidi, placeholder parity, length budget | none |
| `glossary_apply` | Enforce terminology + protect brand terms across targets | none |
| `localize` | Translate to N locales, then lint — **or** emit structured translation jobs if no provider is set | optional |

`localize` **never fabricates translations**: without a provider configured it returns
machine-readable translation jobs (source + rules + placeholders) for you to execute.

## Install

```bash
git clone <repo> && cd i18n-mcp
node index.js --list-tools     # sanity check
node test/smoke.mjs            # 11 deterministic checks
```

Requires Node.js >= 18. No dependencies.

## Use with an MCP client

Add to `claude_desktop_config.json` (or Cursor / Dify MCP settings):

```json
{
  "mcpServers": {
    "i18n": {
      "command": "node",
      "args": ["/absolute/path/to/i18n-mcp/index.js"]
    }
  }
}
```

### Optional: enable live translation

Set an OpenAI-compatible endpoint and `localize` will translate before linting:

```bash
export I18N_LLM_BASE_URL="https://api.openai.com/v1"
export I18N_LLM_API_KEY="sk-..."
export I18N_LLM_MODEL="gpt-4o-mini"      # optional
```

Without these, `localize` returns `providerMode: "jobs"` and does zero network calls.

## Examples

### Pseudolocalize (find hard-coded UI strings)

```js
pseudoLocalize("Save changes")   // 【Såvé çhångéš~~~~~~~~~】
```

### Lint a translation

```json
{ "text": "Gesamt: 1,234 EUR", "locale": "de-DE" }
```
→ `NUMBER_GROUP_SEP` error: German expects `.` as thousands separator.

### Programmatic API

```js
import { pseudoLocalize, lint, glossaryApply, localize } from "i18n-locale-mcp";

lint("Cherchez 03/25/2026", "fr-FR");                       // DATE_ORDER error
glossaryApply([{ source: "Save", target: "Enregistrer" }],
              [{ key: "btn.save", text: "Save" }]);          // TERM_UNTRANSLATED
await localize("Hello {name}", ["de-DE", "ja-JP"]);          // lint-ready output
```

## CLI

```bash
node index.js              # run MCP server on stdio
node index.js --list-tools # list tools
node index.js --version
```

## License

MIT
