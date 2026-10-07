# Gumroad listing copy — i18n-locale-mcp

> Ready-to-paste product page. Fill the `<...>` placeholders.

## Title
i18n Locale MCP — Localization QA toolkit for AI agents (20 locales, zero deps)

## Short tagline
Give your AI agent deterministic localization QA: pseudo-localization, locale linting, glossary enforcement, and translation jobs. No API key required.

## Price
- Basic — **$19.99** (this MCP server + README + examples)
- Pro — **$39.99** (adds: RTL/bidi test fixtures, CI recipe, priority email support)

## Description
Shipping to 20 locales is easy. Shipping *correctly* is not.

`i18n-locale-mcp` is a zero-dependency MCP server that plugs straight into Claude Desktop,
Cursor, Dify, AutoGPT — anything that speaks MCP. It catches the localization bugs that
models and devs keep producing:

- `1,234` written the German way (should be `1.234`)
- `03/25` where the locale expects `25/03`
- missing `{name}` placeholders after translation
- untranslated brand terms
- RTL text with no bidi isolation
- strings that blow past the button's character budget

**Deterministic. Offline. CI-safe.** The core tools need no API key and make no network calls,
so you can lint thousands of strings in tests without burning tokens.

### Tools
| Tool | What it does |
|:--|:--|
| `list_locales` | Formatting rules for 20 locales (quotes, separators, dates, RTL, formality) |
| `pseudo_localize` | Accented + expanded pseudolocale to catch hard-coded strings & truncation |
| `i18n_lint` | Number/date separators, quotes, CJK punctuation, RTL bidi, placeholder parity, length |
| `glossary_apply` | Enforce terminology + protect brand terms |
| `localize` | Translate + post-process, **or** emit structured jobs (never fabricates output) |

### Quick start
```bash
git clone <repo> && cd i18n-mcp
node index.js --list-tools
node test/smoke.mjs        # 11 deterministic checks
```
Add to `claude_desktop_config.json`:
```json
{ "mcpServers": { "i18n": { "command": "node", "args": ["/path/to/i18n-mcp/index.js"] } } }
```

Requires Node.js 18+. **No dependencies.**

## Refund / support
30-day refund, no questions asked. Support via Gumroad messages.

## Tags
mcp, model-context-protocol, i18n, localization, l10n, translation, ai-agent, claude, cursor, devtools
