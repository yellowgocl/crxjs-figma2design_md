import type {
  FigmaNode,
  PublishedComponent,
  PublishedComponentSet,
  PublishedStyle,
  StyleMeta,
  VariablesMeta,
} from '@/src/figma/types';
import type { ComponentDef, LibraryIR, SourceMeta, Token, TokenType } from './types';
import {
  cmp,
  Counter,
  layoutValues,
  numberTokens,
  round,
  shadow,
  slug,
  solidColor,
  splitPath,
  toHex,
  typography,
  uniqueName,
  walk,
} from './values';

export type LibraryInput = {
  source: SourceMeta;
  styles: PublishedStyle[];
  /** 样式所在节点：node_id -> node */
  styleNodes: Record<string, FigmaNode>;
  componentSets: PublishedComponentSet[];
  /** 不属于任何组件集的独立组件 */
  components: PublishedComponent[];
  /** 组件集和独立组件的节点：node_id -> node */
  componentNodes: Record<string, FigmaNode>;
  /** 组件节点里引用的样式：styleId -> meta */
  styleMetaById: Record<string, StyleMeta>;
  variables?: VariablesMeta;
  warnings?: string[];
};

const TYPE_ORDER: TokenType[] = ['color', 'typography', 'effect', 'radius', 'spacing'];
const byName = <T extends { name: string }>(a: T, b: T) => cmp(a.name, b.name);

/** 纯函数：组件库 → LibraryIR。同样的输入必须得到同样的输出。 */
export function buildLibraryIR(input: LibraryInput): LibraryIR {
  const used = new Set<string>();
  const warnings = [...(input.warnings ?? [])];
  const tokens: Token[] = [];

  let skipped = 0;
  for (const s of [...input.styles].sort(byName)) {
    const node = input.styleNodes[s.node_id];
    const t = node ? styleValue(s.style_type, node) : null;
    if (!t) {
      skipped++;
      continue;
    }
    const path = splitPath(s.name);
    tokens.push({
      name: uniqueName(slug(path), used),
      path,
      ...t,
      source: 'style',
      key: s.key,
      ...(s.description ? { description: s.description } : {}),
    });
  }
  if (skipped) warnings.push(`${skipped} 个样式没有提取（渐变、图片填充、栅格等暂不支持）`);

  tokens.push(...variableTokens(input.variables, used, warnings));

  const radius = new Counter<number>();
  const spacing = new Counter<number>();
  for (const node of Object.values(input.componentNodes)) {
    walk(node, (n) => {
      const l = layoutValues(n);
      l.radius.forEach((v) => radius.add(v));
      l.spacing.forEach((v) => spacing.add(v));
    });
  }
  if (!tokens.some((t) => t.type === 'radius')) tokens.push(...numberTokens('radius', radius, used));
  if (!tokens.some((t) => t.type === 'spacing')) tokens.push(...numberTokens('spacing', spacing, used));

  const sorted = [...tokens].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
  return {
    kind: 'library',
    source: input.source,
    tokens: sorted,
    components: buildComponents(input, sorted),
    warnings,
  };
}

function styleValue(styleType: string, node: FigmaNode): Pick<Token, 'type' | 'value'> | null {
  if (styleType === 'FILL') {
    const c = solidColor(node.fills);
    return c ? { type: 'color', value: c } : null;
  }
  if (styleType === 'TEXT') {
    const t = typography(node.style);
    return t ? { type: 'typography', value: t } : null;
  }
  if (styleType === 'EFFECT') {
    const s = shadow(node.effects);
    return s ? { type: 'effect', value: s } : null;
  }
  return null;
}

function parseVariant(name: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of name.split(',')) {
    const [k, ...v] = part.split('=');
    if (k && v.length) out[k.trim()] = v.join('=').trim();
  }
  return out;
}

const cleanProp = (k: string) => k.replace(/#[^#]*$/, '');

function buildComponents(input: LibraryInput, tokens: Token[]): ComponentDef[] {
  const nameByKey = new Map(tokens.filter((t) => t.key).map((t) => [t.key as string, t.name]));
  const tokenNames = (node: FigmaNode) => {
    const set = new Set<string>();
    walk(node, (n) => {
      for (const id of Object.values(n.styles ?? {})) {
        const meta = input.styleMetaById[id];
        if (meta) set.add(nameByKey.get(meta.key) ?? slug(splitPath(meta.name)));
      }
    });
    return [...set].sort(cmp);
  };

  const defs: ComponentDef[] = [];
  for (const set of [...input.componentSets].sort(byName)) {
    const node = input.componentNodes[set.node_id];
    if (!node) continue;
    const properties: Record<string, string[]> = {};
    for (const [k, d] of Object.entries(node.componentPropertyDefinitions ?? {})) {
      if (d.type === 'VARIANT' && d.variantOptions) properties[cleanProp(k)] = [...d.variantOptions];
      else if (d.type === 'BOOLEAN') properties[cleanProp(k)] = ['true', 'false'];
    }
    const variants = (node.children ?? [])
      .filter((c) => c.type === 'COMPONENT' && c.visible !== false)
      .map((c) => ({ name: c.name, values: parseVariant(c.name), tokens: tokenNames(c) }))
      .sort(byName);
    defs.push({
      key: set.key,
      name: set.name,
      ...(set.description ? { description: set.description } : {}),
      properties,
      variants,
      tokens: [...new Set(variants.flatMap((v) => v.tokens))].sort(cmp),
    });
  }
  for (const c of [...input.components].sort(byName)) {
    const node = input.componentNodes[c.node_id];
    defs.push({
      key: c.key,
      name: c.name,
      ...(c.description ? { description: c.description } : {}),
      properties: {},
      variants: [],
      tokens: node ? tokenNames(node) : [],
    });
  }
  return defs;
}

type Alias = { type: 'VARIABLE_ALIAS'; id: string };
const isAlias = (v: unknown): v is Alias =>
  typeof v === 'object' && v !== null && (v as Alias).type === 'VARIABLE_ALIAS' && typeof (v as Alias).id === 'string';
const isColor = (v: unknown): v is { r: number; g: number; b: number; a: number } =>
  typeof v === 'object' && v !== null && 'r' in v && 'g' in v && 'b' in v;

function guessNumberType(name: string): 'radius' | 'spacing' | null {
  if (/radius|corner|round|圆角/i.test(name)) return 'radius';
  if (/spac|gap|pad|margin|间距|边距/i.test(name)) return 'spacing';
  return null;
}

function variableTokens(v: VariablesMeta | undefined, used: Set<string>, warnings: string[]): Token[] {
  if (!v) return [];
  const pathOf = (id: string) => {
    const x = v.variables[id];
    const col = x ? v.variableCollections[x.variableCollectionId] : undefined;
    return x && col ? [col.name, ...splitPath(x.name)] : null;
  };
  const resolve = (val: unknown): string | number | null => {
    if (isAlias(val)) {
      const p = pathOf(val.id);
      return p ? `{${slug(p)}}` : null;
    }
    if (isColor(val)) return toHex({ ...val, a: val.a ?? 1 });
    if (typeof val === 'number') return round(val);
    return null;
  };

  const out: Token[] = [];
  let skipped = 0;
  const vars = Object.values(v.variables)
    .filter((x) => !x.hiddenFromPublishing && !x.remote)
    .sort((a, b) => cmp(pathOf(a.id)?.join('/') ?? a.name, pathOf(b.id)?.join('/') ?? b.name));
  for (const x of vars) {
    const col = v.variableCollections[x.variableCollectionId];
    const type =
      x.resolvedType === 'COLOR' ? 'color' : x.resolvedType === 'FLOAT' ? guessNumberType(x.name) : null;
    const value = col ? resolve(x.valuesByMode[col.defaultModeId]) : null;
    if (!col || !type || value == null) {
      skipped++;
      continue;
    }
    const modes: Record<string, string | number> = {};
    if (col.modes.length > 1) {
      for (const m of col.modes) {
        const mv = resolve(x.valuesByMode[m.modeId]);
        if (mv != null) modes[m.name] = mv;
      }
    }
    const path = [col.name, ...splitPath(x.name)];
    out.push({
      name: uniqueName(slug(path), used),
      path,
      type,
      value,
      ...(Object.keys(modes).length ? { modes } : {}),
      source: 'variable',
    });
  }
  if (skipped) warnings.push(`${skipped} 个 Variables 没有提取（字符串、布尔或无法判断用途的数值）`);
  return out;
}
