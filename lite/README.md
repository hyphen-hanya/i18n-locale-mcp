# i18n-locale-mcp (Lite)

A **zero-dependency** [MCP](https://modelcontextprotocol.io) server that gives any AI agent a
**localization QA toolkit**. Deterministic, fully offline, safe to run in CI.

Works with Claude Desktop, Cursor, Dify, AutoGPT, and any MCP-compatible client.

## Why

Shipping a product in 20 locales is easy; shipping it *correctly* is not. Agents and devs
constantly produce `1,234` in German, `03/25` in French, or build strings that blow past the
button's character budget. This server catches those deterministically — **no API key needed**.

## Tools (Lite — free)

| Tool | What it does | Network |
|:--|:--|:--|
| `list_locales` | Formatting rules (quotes, separators, dates, RTL, formality) for 20 locales | none |
| `pseudo_localize` | Accented + expanded pseudolocale to catch hard-coded strings & truncation | none |
| `i18n_lint` | Number/date separators, quote style, CJK punctuation, RTL bidi, placeholder parity, length budget | none |

## Pro edition adds

- `glossary_apply` — enforce terminology and protect brand terms across targets
- `localize` — translate to N locales then lint, **or** emit structured translation jobs
- RTL/bidi test fixtures, a ready CI recipe, and priority email support

→ Upgrade: see the product page (link in this repo's description).

## Install

```bash
git clone <repo> && cd i18n-mcp
node index.js --list-tools     # sanity check
node test/smoke.mjs            # 9 deterministic checks
```

Requires Node.js >= 18. No dependencies.

## Use with an MCP client

Add to `claude_desktop_config.json` (or Cursor / Dify MCP settings):

```json
{
  "mcpServers": {
    "i18n": { "command": "node", "args": ["/absolute/path/to/i18n-mcp/index.js"] }
  }
}
```

## License

MIT — see [LICENSE](./LICENSE).
