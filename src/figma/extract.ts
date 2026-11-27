import { buildLibraryIR } from '@/src/ir/library';
import { buildPageIR } from '@/src/ir/page';
import type { DesignIR, SourceMeta } from '@/src/ir/types';
import { figma, FigmaError, type Meter } from './client';
import { contentKey, parseFigmaUrl, type FigmaLink } from './link';
import type { ComponentMeta, FigmaNode, StyleMeta, VariablesMeta } from './types';

/** 只在 background 运行：负责调用 Figma API，再交给 ir/ 里的纯函数。 */

export class UserError extends Error {}

const MAX_TRACE = 40;
const MAX_LIBRARY_NAMES = 10;

function parse(url: string): FigmaLink {
  const link = parseFigmaUrl(url);
  if (!link) throw new UserError('不是有效的 Figma 文件链接');
  return link;
}

const denied = (e: unknown) => e instanceof FigmaError && (e.status === 403 || e.status === 404);

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** 找出每个样式 / 组件 key 在哪些图层上使用（包括组件实例内部），用于提示 */
function locate(root: FigmaNode, styles: Record<string, StyleMeta>, components: Record<string, ComponentMeta>) {
  const where = new Map<string, string>();
  const visit = (n: FigmaNode, trail: string[], hidden: boolean) => {
    const isHidden = hidden || n.visible === false;
    const path = [...trail, n.name];
    const label = path.slice(-3).join(' › ') + (isHidden ? '（隐藏）' : '');
    const add = (k: string) => {
      if (!where.has(k)) where.set(k, label);
    };
    for (const id of Object.values(n.styles ?? {})) {
      const m = styles[id];
      if (m) add(m.key);
    }
    if (n.componentId) {
      const m = components[n.componentId];
      if (m) add(m.key);
    }
    for (const c of n.children ?? []) visit(c, path, isHidden);
  };
  visit(root, [], false);
  return where;
}

export async function inspect(token: string, url: string) {
  const link = parse(url);
  const key = contentKey(link);
  const meta = await figma.meta(token, key);
  const warnings: string[] = [];
  let versions: { id: string; label: string; createdAt: string; user?: string }[] = [];
  try {
    const res = await figma.versions(token, key);
    versions = res.versions
      .filter((v) => v.label)
      .map((v) => ({ id: v.id, label: v.label as string, createdAt: v.created_at, ...(v.user?.handle ? { user: v.user.handle } : {}) }));
  } catch (e) {
    if (!(e instanceof FigmaError && e.status === 403)) throw e;
    warnings.push('读不到版本历史（需要 file_versions:read），只能使用最新版本');
  }
  return {
    fileKey: link.fileKey,
    ...(link.branchKey ? { branchKey: link.branchKey } : {}),
    ...(link.nodeId ? { nodeId: link.nodeId } : {}),
    name: meta.file.name,
    version: meta.file.version,
    lastModified: meta.file.last_touched_at ?? '',
    editorType: meta.file.editorType ?? 'figma',
    versions,
    warnings,
  };
}

type ExtractOpts = { versionId?: string; versionLabel?: string | null };

async function sourceMeta(token: string, link: FigmaLink, opts: ExtractOpts): Promise<SourceMeta> {
  const meta = await figma.meta(token, contentKey(link));
  return {
    fileKey: link.fileKey,
    fileName: meta.file.name,
    ...(link.nodeId ? { nodeId: link.nodeId } : {}),
    versionId: opts.versionId ?? meta.file.version,
    versionLabel: opts.versionLabel ?? null,
    lastModified: meta.file.last_touched_at ?? '',
    extractedAt: new Date().toISOString(),
  };
}

export async function extractLibrary(token: string, url: string, opts: ExtractOpts) {
  const link = parse(url);
  if (link.branchKey) throw new UserError('组件库请使用主文件链接：分支不能发布样式和组件');
  const meter: Meter = { chars: 0 };
  const key = link.fileKey;
  const source = await sourceMeta(token, link, opts);
  const warnings: string[] = [];
  if (opts.versionId) warnings.push('已发布的样式和组件列表来自最新发布状态，数值按所选版本读取');

  const styles = (await figma.fileStyles(token, key, meter)).meta.styles;
  const sets = (await figma.fileComponentSets(token, key, meter)).meta.component_sets;
  const comps = (await figma.fileComponents(token, key, meter)).meta.components;
  if (!styles.length && !sets.length && !comps.length) {
    warnings.push('这个文件没有已发布的样式或组件，请确认它是已发布的组件库');
  }

  const nodeOpts = { meter, ...(opts.versionId ? { version: opts.versionId } : {}) };
  const styleRes = await figma.nodesChunked(token, key, styles.map((s) => s.node_id), nodeOpts);
  const setRes = await figma.nodesChunked(token, key, sets.map((s) => s.node_id), nodeOpts);
  const inSet = new Set(Object.values(setRes.docs).flatMap((d) => (d.children ?? []).map((c) => c.id)));
  const standalone = comps.filter((c) => !inSet.has(c.node_id));
  const compRes = await figma.nodesChunked(token, key, standalone.map((c) => c.node_id), nodeOpts);

  let variables: VariablesMeta | undefined;
  try {
    variables = (await figma.localVariables(token, key, meter)).meta;
  } catch (e) {
    if (!denied(e)) throw e;
    warnings.push('Variables 不可用（需要 Enterprise 套餐和 file_variables:read），已改用 Styles');
  }

  const ir = buildLibraryIR({
    source,
    styles,
    styleNodes: styleRes.docs,
    componentSets: sets,
    components: standalone,
    componentNodes: { ...setRes.docs, ...compRes.docs },
    styleMetaById: { ...setRes.styles, ...compRes.styles },
    ...(variables ? { variables } : {}),
    warnings,
  });
  return withStats(ir, meter);
}

export async function extractPage(token: string, url: string, opts: ExtractOpts) {
  const link = parse(url);
  const nodeId = link.nodeId;
  if (!nodeId) throw new UserError('页面层需要 Frame 链接：在 Figma 里选中 Frame，右键 → Copy link to selection');
  const meter: Meter = { chars: 0 };
  const source = await sourceMeta(token, link, opts);
  const res = await figma.nodes(token, contentKey(link), [nodeId], {
    meter,
    ...(opts.versionId ? { version: opts.versionId } : {}),
  });
  const entry = res.nodes[nodeId];
  if (!entry) throw new UserError('链接里的节点不存在，可能已被删除');
  const warnings: string[] = [];

  const components = entry.components ?? {};
  const componentSets = entry.componentSets ?? {};
  const styles = entry.styles ?? {};

  // 有组件集的变体按组件集追溯（发布的是组件集，请求也更少）；没有的按组件本身追溯
  type Target = { kind: 'set' | 'component' | 'style'; key: string; name: string; covers: string[] };
  const targets = new Map<string, Target>();
  for (const c of Object.values(components)) {
    if (!c.remote) continue;
    const set = c.componentSetId ? componentSets[c.componentSetId] : undefined;
    const t: Target = set
      ? (targets.get(`set:${set.key}`) ?? { kind: 'set', key: set.key, name: set.name, covers: [] })
      : (targets.get(`component:${c.key}`) ?? { kind: 'component', key: c.key, name: c.name, covers: [] });
    t.covers.push(c.key);
    targets.set(`${t.kind}:${t.key}`, t);
  }
  for (const st of Object.values(styles)) {
    if (st.remote && !targets.has(`style:${st.key}`)) targets.set(`style:${st.key}`, { kind: 'style', key: st.key, name: st.name, covers: [st.key] });
  }
  const all = [...targets.values()];
  if (all.length > MAX_TRACE) warnings.push(`库引用较多，只追溯了前 ${MAX_TRACE} 个`);
  const list = all.slice(0, MAX_TRACE);

  const where = locate(entry.document, styles, components);
  const label = (t: Target) => {
  const at = t.covers.map((k) => where.get(k)).find(Boolean);
    return at ? `${t.name}（在 ${at}）` : `${t.name}（只出现在组件定义里）`;
  };
  const failed = { forbidden: [] as string[], notFound: [] as string[] };
  const lookup = (t: Target) =>
    t.kind === 'set'
      ? figma.componentSet(token, t.key)
      : t.kind === 'component'
        ? figma.component(token, t.key)
        : figma.style(token, t.key);
  const files = await mapLimit(list, 4, async (t) => {
    try {
      return (await lookup(t)).meta.file_key;
    } catch (e) {
      if (e instanceof FigmaError && e.status === 403) failed.forbidden.push(label(t));
      else if (e instanceof FigmaError && e.status === 404) failed.notFound.push(label(t));
      else throw e;
      return undefined;
    }
  });
  const componentLibrary: Record<string, string> = {};
  const styleLibrary: Record<string, string> = {};
  list.forEach((t, i) => {
    const f = files[i];
    if (!f) return;
    for (const k of t.covers) (t.kind === 'style' ? styleLibrary : componentLibrary)[k] = f;
  });
  const names = (list: string[]) =>
    '\n· ' + list.slice(0, 8).join('\n· ') + (list.length > 8 ? `\n· 等共 ${list.length} 个` : '');
  if (failed.forbidden.length) {
    warnings.push(`没有权限（403）：${names(failed.forbidden)}。可能没有所属库文件的查看权限`);
  }
  if (failed.notFound.length) {
    warnings.push(`找不到（404）：${names(failed.notFound)}。可能没有发布到团队库，或来自社区 / UI Kit 库`);
  }

  const libKeys = [...new Set([...Object.values(componentLibrary), ...Object.values(styleLibrary)])].slice(
    0,
    MAX_LIBRARY_NAMES,
  );
  const libraryNames: Record<string, string> = {};
  await mapLimit(libKeys, 4, async (k) => {
    try {
      libraryNames[k] = (await figma.meta(token, k)).file.name;
    } catch (e) {
      if (!denied(e)) throw e;
    }
  });

  const ir = buildPageIR({
    source,
    root: entry.document,
    components,
    componentSets,
    styles,
    componentLibrary,
    styleLibrary,
    libraryNames,
    warnings,
  });
  return withStats(ir, meter);
}

function withStats(ir: DesignIR, meter: Meter) {
  return { ir, stats: { rawChars: meter.chars, irChars: JSON.stringify(ir).length } };
}
