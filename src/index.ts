interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * dados.gov.pt MCP — Portugal's national open data portal.
 *
 * Portuguese government open data published on the uData platform
 * (same API family as data.gouv.fr). Auth: none (keyless, read-only).
 * Docs: https://dados.gov.pt/api/1/
 */


const BASE = 'https://dados.gov.pt/api/1';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_datasets',
    description:
      "Search datasets on dados.gov.pt, Portugal's national open data portal (Portuguese government open data). Returns matching datasets with title, description, publishing organization, and downloadable-resource counts.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Full-text search terms (Portuguese or English).' },
        page: { type: 'number', description: '1-based page number (default 1).' },
        page_size: { type: 'number', description: 'Results per page, 1-50 (default 20).' },
        sort: { type: 'string', description: "Sort order, e.g. '-created' (newest), '-reuses' (most reused)." },
      },
    },
  },
  {
    name: 'get_dataset',
    description:
      'Fetch a single dataset from dados.gov.pt (Portuguese government open data) by its id or slug, including full description, license, update frequency, tags, and the list of downloadable resources (files) with formats and URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Dataset id or slug.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_organizations',
    description:
      'List or search the organizations (Portuguese government bodies and other publishers) that publish open data on dados.gov.pt, with their dataset counts and portal pages.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Full-text search over organization names.' },
        page: { type: 'number', description: '1-based page number (default 1).' },
        page_size: { type: 'number', description: 'Results per page, 1-50 (default 20).' },
      },
    },
  },
  {
    name: 'recent_datasets',
    description:
      "Get the most recently published datasets on dados.gov.pt, Portugal's national open data portal (Portuguese government open data), sorted newest first.",
    inputSchema: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: 'Results per page, 1-50 (default 20).' },
      },
    },
  },
];

interface UDataResource {
  title?: string;
  format?: string;
  url?: string;
  filesize?: number | null;
  last_modified?: string;
}

interface UDataDataset {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  organization?: { name?: string } | null;
  license?: string;
  created_at?: string;
  last_modified?: string;
  frequency?: string;
  tags?: string[];
  page?: string;
  resources?: UDataResource[] | number;
}

interface UDataOrganization {
  id?: string;
  slug?: string;
  name?: string;
  metrics?: { datasets?: number } | null;
  page?: string;
}

interface UDataList<T> {
  data: T[];
  total?: number;
  page?: number;
  page_size?: number;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_datasets': {
      const params = new URLSearchParams();
      if (args.query) params.set('q', String(args.query));
      params.set('page', String(pageNum(args.page)));
      params.set('page_size', String(pageSize(args.page_size)));
      if (args.sort) params.set('sort', String(args.sort));
      const json = (await dpGet(`/datasets/?${params}`)) as UDataResult<UDataList<UDataDataset>>;
      return mapList(json);
    }
    case 'get_dataset': {
      const id = reqStr(args, 'id', '"<dataset-id-or-slug>"');
      const json = (await dpGet(`/datasets/${encodeURIComponent(id)}/`)) as UDataResult<UDataDataset>;
      if (isError(json)) return json;
      const d = json;
      return {
        id: d.id,
        slug: d.slug,
        title: d.title,
        description: (d.description || '').slice(0, 1000),
        organization: d.organization?.name,
        license: d.license,
        created_at: d.created_at,
        last_modified: d.last_modified,
        frequency: d.frequency,
        tags: d.tags,
        page_url: d.page,
        resources: (Array.isArray(d.resources) ? d.resources : []).map((r) => ({
          title: r.title,
          format: r.format,
          url: r.url,
          filesize: r.filesize,
          last_modified: r.last_modified,
        })),
      };
    }
    case 'list_organizations': {
      const params = new URLSearchParams();
      if (args.query) params.set('q', String(args.query));
      params.set('page', String(pageNum(args.page)));
      params.set('page_size', String(pageSize(args.page_size)));
      const json = (await dpGet(`/organizations/?${params}`)) as UDataResult<UDataList<UDataOrganization>>;
      if (isError(json)) return json;
      return {
        total: json.total,
        organizations: (json.data ?? []).map((o) => ({
          id: o.id,
          slug: o.slug,
          name: o.name,
          datasets: o.metrics?.datasets ?? null,
          page_url: o.page,
        })),
      };
    }
    case 'recent_datasets': {
      const params = new URLSearchParams();
      params.set('sort', '-created');
      params.set('page_size', String(pageSize(args.page_size)));
      const json = (await dpGet(`/datasets/?${params}`)) as UDataResult<UDataList<UDataDataset>>;
      return mapList(json);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

type ApiError = { error: number; message: string };
type UDataResult<T> = T | ApiError;

function isError(x: unknown): x is ApiError {
  return !!x && typeof x === 'object' && 'error' in x;
}

function mapList(json: UDataResult<UDataList<UDataDataset>>): unknown {
  if (isError(json)) return json;
  return {
    total: json.total,
    page: json.page,
    datasets: (json.data ?? []).map((d) => ({
      id: d.id,
      slug: d.slug,
      title: d.title,
      description: (d.description || '').slice(0, 300),
      organization: d.organization?.name,
      created_at: d.created_at,
      last_modified: d.last_modified,
      resources_count: Array.isArray(d.resources) ? d.resources.length : d.resources ?? null,
      page_url: d.page,
    })),
  };
}

function pageNum(v: unknown): number {
  return Math.max(1, (v as number) || 1);
}

function pageSize(v: unknown): number {
  return Math.min(50, Math.max(1, (v as number) || 20));
}

async function dpGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) {
    return { error: res.status, message: (await res.text().catch(() => '')).slice(0, 200) || res.statusText };
  }
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
