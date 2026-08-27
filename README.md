# mcp-dados-pt

dados.gov.pt MCP — Portugal's national open data portal.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1481+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_datasets` | Search datasets on dados.gov.pt, Portugal's national open data portal (Portuguese government open data). Returns matching datasets with title, description, publishing organization, and downloadable-resource counts. |
| `get_dataset` | Fetch a single dataset from dados.gov.pt (Portuguese government open data) by its id or slug, including full description, license, update frequency, tags, and the list of downloadable resources (files) with formats and URLs. |
| `list_organizations` | List or search the organizations (Portuguese government bodies and other publishers) that publish open data on dados.gov.pt, with their dataset counts and portal pages. |
| `recent_datasets` | Get the most recently published datasets on dados.gov.pt, Portugal's national open data portal (Portuguese government open data), sorted newest first. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "dados_pt": {
      "url": "https://gateway.pipeworx.io/dados_pt/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/dados_pt/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1481+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Dados Pt data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
