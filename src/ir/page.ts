import type { ComponentMeta, ComponentSetMeta, FigmaNode, StyleMeta } from '@/src/figma/types';
import type { PageIR, PageNode, SourceMeta, Token, TokenType } from './types';
import { cmp, Counter, layoutValues, numberTokens, shadow, slug, solidColor, splitPath, typography } from './values';

export type PageInput = {
  source: SourceMeta;
  root: FigmaNode;
  /** nodes 响应：nodeId -> 组件 meta */
  components: Record<string, ComponentMeta>;
  componentSets: Record<string, ComponentSetMeta>;
  /** nodes 响应：styleId -> 样式 meta */
  styles: Record<string, StyleMeta>;
  /** 组件 key -> 所属库文件 key（通过 library_assets:read 追溯） */
  componentLibrary: Record<string, string>;
  styleLibrary: Record<string, string>;
  libraryNames: Record<string, string>;
  warnings?: string[];
};

const MAX_DEPTH = 8;
const SKIP = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'LINE', 'ELLIPSE', 'STAR', 'REGULAR_POLYGON', 'SLICE']);
const STYLE_TYPE: Record<string, TokenType> = { FILL: 'color', TEXT: 'typography', EFFECT: 'effect' };

/** 纯函数：页面 Frame → PageIR。不进入组件实例内部（实例内容由组件库定义）。 */
export function buildPageIR(input: PageInput): PageIR {
  const warnings = [...(input.warnings ?? [])];
  const comps = new Map<string, PageIR['usedComponents'][number] & { variantSet: Set<string> }>();
  const styles = new Map<string, PageIR['usedStyles'][number]>();
  const colors = new Counter<string>();
  const texts = new Counter<string>();
  const effects = new Counter<string>();
  const radius = new Counter<number>();
  const spacing = new Counter<number>();
  let unresolved = 0;

  const styleTokens = (n: FigmaNode): string[] => {
    const names = new Set<string>();
    for (const id of Object.values(n.styles ?? {})) {
      const meta = input.styles[id];
      const type = meta ? STYLE_TYPE[meta.styleType] : undefined;
      if (!meta || !type) continue;
      const name = slug(splitPath(meta.name));
      names.add(name);
      const lib = meta.remote ? input.styleLibrary[meta.key] : input.source.fileKey;
      const prev = styles.get(meta.key);
      if (prev) prev.count++;
      else
        styles.set(meta.key, {
          key: meta.key,
          name,
          type,
          count: 1,
          remote: !!meta.remote,
          ...(lib ? { libraryFileKey: lib } : {}),
        });
    }
    return [...names].sort(cmp);
  };

  const collectCustom = (n: FigmaNode) => {
    if (!n.styles?.fill) {
      const c = solidColor(n.fills);
      if (c) colors.add(c);
    }
    if (!n.styles?.stroke) {
      const c = solidColor(n.strokes);
      if (c) colors.add(c);
    }
    if (n.type === 'TEXT' && !n.styles?.text) {
      const t = typography(n.style);
      if (t) texts.add(JSON.stringify(t));
    }
    if (!n.styles?.effect) {
      const s = shadow(n.effects);
      if (s) effects.add(s);
    }
    const l = layoutValues(n);
    l.radius.forEach((v) => radius.add(v));
    l.spacing.forEach((v) => spacing.add(v));
  };

  const visit = (n: FigmaNode, depth: number): PageNode | null => {
    if (n.visible === false || SKIP.has(n.type)) return null;
    const tokens = styleTokens(n);
    const withTokens = tokens.length ? { tokens } : {};

    if (n.type === 'INSTANCE') {
      const meta = n.componentId ? input.components[n.componentId] : undefined;
      if (!meta) return { name: n.name, type: n.type, ...withTokens };
      const set = meta.componentSetId ? input.componentSets[meta.componentSetId] : undefined;
      const key = set?.key ?? meta.key;
      const lib = meta.remote ? input.componentLibrary[meta.key] : input.source.fileKey;
      if (meta.remote && !lib) unresolved++;
      const entry = comps.get(key) ?? {
        key,
        name: set?.name ?? meta.name,
        variants: [],
        variantSet: new Set<string>(),
        count: 0,
        remote: !!meta.remote,
        ...(lib ? { libraryFileKey: lib } : {}),
      };
      entry.count++;
      if (set) entry.variantSet.add(meta.name);
      comps.set(key, entry);
      return {
        name: n.name,
        type: n.type,
        component: set?.name ?? meta.name,
        ...(set ? { variant: meta.name } : {}),
        ...withTokens,
      };
    }

    collectCustom(n);
    const node: PageNode = { name: n.name, type: n.type, ...withTokens };
    if (n.layoutMode === 'HORIZONTAL') node.layout = 'row';
    if (n.layoutMode === 'VERTICAL') node.layout = 'column';
    if (n.type === 'TEXT' && n.characters) node.text = n.characters.slice(0, 60);
    if (n.children?.length) {
      if (depth >= MAX_DEPTH) node.truncated = true;
      else {
        const kids = n.children.map((c) => visit(c, depth + 1)).filter((c): c is PageNode => c !== null);
        if (kids.length) node.children = kids;
      }
    }
    return node;
  };

  const tree = visit(input.root, 0) ?? { name: input.root.name, type: input.root.type };
  if (unresolved) warnings.push(`${unresolved} 个组件实例无法追溯到所属库文件（可能没有库文件的查看权限）`);

  const used = new Set<string>();
  const ranked = <K>(c: Counter<K>) =>
    c.entries().sort((a, b) => b[1] - a[1] || cmp(String(a[0]), String(b[0])));
  const custom: Token[] = [
    ...ranked(colors).map(([value, usage], i) => ({
      name: `custom-color-${i + 1}`,
      path: ['custom', 'color'],
      type: 'color' as const,
      value,
      source: 'derived' as const,
      usage,
    })),
    ...ranked(texts).map(([json, usage], i) => ({
      name: `custom-text-${i + 1}`,
      path: ['custom', 'typography'],
      type: 'typography' as const,
      value: JSON.parse(json) as Record<string, string | number>,
      source: 'derived' as const,
      usage,
    })),
    ...ranked(effects).map(([value, usage], i) => ({
      name: `custom-shadow-${i + 1}`,
      path: ['custom', 'effect'],
      type: 'effect' as const,
      value,
      source: 'derived' as const,
      usage,
    })),
    ...numberTokens('radius', radius, used),
    ...numberTokens('spacing', spacing, used),
  ];

  const libKeys = new Set<string>();
  for (const c of comps.values()) if (c.remote && c.libraryFileKey) libKeys.add(c.libraryFileKey);
  for (const s of styles.values()) if (s.remote && s.libraryFileKey) libKeys.add(s.libraryFileKey);

  return {
    kind: 'page',
    source: input.source,
    libraries: [...libKeys].sort(cmp).map((fileKey) => {
      const name = input.libraryNames[fileKey];
      return name ? { fileKey, name } : { fileKey };
    }),
    usedComponents: [...comps.values()]
      .map(({ variantSet, ...c }) => ({ ...c, variants: [...variantSet].sort(cmp) }))
      .sort((a, b) => cmp(a.name, b.name)),
    usedStyles: [...styles.values()].sort((a, b) => cmp(a.name, b.name)),
    custom,
    tree,
    warnings,
  };
}
