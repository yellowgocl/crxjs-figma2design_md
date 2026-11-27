import { z } from 'zod';
import type { FigmaNode, VariablesMeta } from './types';

const BASE = 'https://api.figma.com';
const NODE_CHUNK = 50;

export class FigmaError extends Error {
  constructor(public status: number, public userMessage: string) {
    super(userMessage);
  }
}

/** 统计本次读了多少原始 JSON，用来展示压缩比 */
export type Meter = { chars: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(
  token: string,
  path: string,
  schema: z.ZodType<T>,
  scope: string,
  meter?: Meter,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, { headers: { 'X-Figma-Token': token } });
    if (res.status === 429 && attempt === 0) {
      const wait = Math.min(Number(res.headers.get('Retry-After')) || 2, 10);
      await sleep(wait * 1000);
      continue;
    }
    if (res.status === 403) throw new FigmaError(403, `没有权限：需要 ${scope}，或 Token 已失效`);
    if (res.status === 404) throw new FigmaError(404, '找不到文件，或你的账号没有访问权限');
    if (res.status === 429) throw new FigmaError(429, '请求太频繁，请稍后再试');
    if (!res.ok) throw new FigmaError(res.status, `Figma 返回错误（${res.status}）`);
    const text = await res.text();
    if (meter) meter.chars += text.length;
    return schema.parse(JSON.parse(text));
  }
}

const Me = z.object({ id: z.string(), handle: z.string(), email: z.string().optional(), img_url: z.string().optional() });

const Meta = z.object({
  file: z.object({
    name: z.string(),
    version: z.string(),
    last_touched_at: z.string().optional(),
    editorType: z.string().optional(),
  }),
});

const Versions = z.object({
  versions: z.array(
    z.object({
      id: z.string(),
      created_at: z.string(),
      label: z.string().nullish(),
      description: z.string().nullish(),
      user: z.object({ handle: z.string() }).partial().optional(),
    }),
  ),
});

const anyNode = z.custom<FigmaNode>((v) => typeof v === 'object' && v !== null && 'id' in v);
const StyleMeta = z.object({
  key: z.string(),
  name: z.string(),
  styleType: z.string(),
  remote: z.boolean().optional(),
  description: z.string().optional(),
});
const ComponentMeta = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  componentSetId: z.string().optional(),
  remote: z.boolean().optional(),
});
const ComponentSetMeta = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  remote: z.boolean().optional(),
});
const NodeEntry = z
  .object({
    document: anyNode,
    components: z.record(z.string(), ComponentMeta).optional(),
    componentSets: z.record(z.string(), ComponentSetMeta).optional(),
    styles: z.record(z.string(), StyleMeta).optional(),
  })
  .nullable();
const Nodes = z.object({ name: z.string(), lastModified: z.string().optional(), nodes: z.record(z.string(), NodeEntry) });
export type NodesEntry = NonNullable<z.infer<typeof NodeEntry>>;

const Published = z.object({
  key: z.string(),
  node_id: z.string(),
  name: z.string(),
  description: z.string().nullish().transform((v) => v ?? ''),
});
const PublishedStyle = Published.extend({ style_type: z.string() });
const StylesList = z.object({ meta: z.object({ styles: z.array(PublishedStyle) }) });
const ComponentsList = z.object({ meta: z.object({ components: z.array(Published) }) });
const ComponentSetsList = z.object({ meta: z.object({ component_sets: z.array(Published) }) });
const AssetMeta = z.object({ meta: z.object({ key: z.string(), file_key: z.string(), name: z.string() }) });

const Variables = z.object({ meta: z.custom<VariablesMeta>((v) => typeof v === 'object' && v !== null && 'variables' in v) });

const enc = encodeURIComponent;
const versionQs = (version?: string) => (version ? `&version=${enc(version)}` : '');

export const figma = {
  me: (token: string) => request(token, '/v1/me', Me, 'current_user:read'),

  meta: (token: string, key: string) => request(token, `/v1/files/${enc(key)}/meta`, Meta, 'file_metadata:read'),

  versions: (token: string, key: string) =>
    request(token, `/v1/files/${enc(key)}/versions`, Versions, 'file_versions:read'),

  nodes: (token: string, key: string, ids: string[], opts: { version?: string; meter?: Meter } = {}) =>
    request(
      token,
      `/v1/files/${enc(key)}/nodes?ids=${enc(ids.join(','))}${versionQs(opts.version)}`,
      Nodes,
      'file_content:read',
      opts.meter,
    ),

  /** 分批读取节点，并把各批的 styles / components map 合并 */
  async nodesChunked(token: string, key: string, ids: string[], opts: { version?: string; meter?: Meter } = {}) {
    const docs: Record<string, FigmaNode> = {};
    const merged: Required<Omit<NodesEntry, 'document'>> = { components: {}, componentSets: {}, styles: {} };
    for (let i = 0; i < ids.length; i += NODE_CHUNK) {
      const res = await figma.nodes(token, key, ids.slice(i, i + NODE_CHUNK), opts);
      for (const [id, entry] of Object.entries(res.nodes)) {
        if (!entry) continue;
        docs[id] = entry.document;
        Object.assign(merged.components, entry.components);
        Object.assign(merged.componentSets, entry.componentSets);
        Object.assign(merged.styles, entry.styles);
      }
    }
    return { docs, ...merged };
  },

  fileStyles: (token: string, key: string, meter?: Meter) =>
    request(token, `/v1/files/${enc(key)}/styles`, StylesList, 'library_content:read', meter),
  fileComponents: (token: string, key: string, meter?: Meter) =>
    request(token, `/v1/files/${enc(key)}/components`, ComponentsList, 'library_content:read', meter),
  fileComponentSets: (token: string, key: string, meter?: Meter) =>
    request(token, `/v1/files/${enc(key)}/component_sets`, ComponentSetsList, 'library_content:read', meter),

  component: (token: string, key: string) =>
    request(token, `/v1/components/${enc(key)}`, AssetMeta, 'library_assets:read'),
  style: (token: string, key: string) => request(token, `/v1/styles/${enc(key)}`, AssetMeta, 'library_assets:read'),
  componentSet: (token: string, key: string) =>
    request(token, `/v1/component_sets/${enc(key)}`, AssetMeta, 'library_assets:read'),
  localVariables: (token: string, key: string, meter?: Meter) =>
    request(token, `/v1/files/${enc(key)}/variables/local`, Variables, 'file_variables:read', meter),
};
