import type { Color, Effect, FigmaNode, Paint, TypeStyle } from '@/src/figma/types';

/** 纯函数：把 Figma 的原始值转成稳定、可比较的字符串或数字 */

export const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const hex2 = (n: number) =>
  Math.round(Math.min(1, Math.max(0, n)) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

export function toHex(c: Color, opacity = 1): string {
  const a = (c.a ?? 1) * opacity;
  const base = `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
  return a >= 0.999 ? base : `${base}${hex2(a)}`;
}

export function solidColor(paints: Paint[] | undefined): string | null {
  const p = paints?.find((x) => x.visible !== false && x.type === 'SOLID' && x.color);
  return p?.color ? toHex(p.color, p.opacity ?? 1) : null;
}

export type Typography = {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: string;
  letterSpacing: string;
};

export function typography(s: TypeStyle | undefined): Typography | null {
  if (!s?.fontFamily || !s.fontSize) return null;
  const lineHeight =
    s.lineHeightUnit === 'INTRINSIC_%' || s.lineHeightPx == null ? 'normal' : `${round(s.lineHeightPx)}px`;
  return {
    fontFamily: s.fontFamily,
    fontWeight: s.fontWeight ?? 400,
    fontSize: round(s.fontSize),
    lineHeight,
    letterSpacing: `${round(s.letterSpacing ?? 0)}px`,
  };
}

export function shadow(effects: Effect[] | undefined): string | null {
  const list = (effects ?? []).filter(
    (e) => e.visible !== false && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'),
  );
  if (!list.length) return null;
  return list
    .map(
      (e) =>
        `${e.type === 'INNER_SHADOW' ? 'inset ' : ''}${round(e.offset?.x ?? 0)}px ${round(e.offset?.y ?? 0)}px ` +
        `${round(e.radius)}px ${round(e.spread ?? 0)}px ${e.color ? toHex(e.color) : '#000000'}`,
    )
    .join(', ');
}

export function layoutValues(n: FigmaNode): { radius: number[]; spacing: number[] } {
  const radius = [n.cornerRadius, ...(n.rectangleCornerRadii ?? [])].filter(
    (v): v is number => typeof v === 'number' && v > 0,
  );
  const auto = n.layoutMode === 'HORIZONTAL' || n.layoutMode === 'VERTICAL';
  const spacing = auto
    ? [n.itemSpacing, n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].filter(
        (v): v is number => typeof v === 'number' && v > 0,
      )
    : [];
  return { radius: [...new Set(radius.map((v) => round(v)))], spacing: [...new Set(spacing.map((v) => round(v)))] };
}

/** 名称转 kebab-case，保留中文等字母 */
export function slug(parts: string[]): string {
  return (
    parts
      .join('-')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'token'
  );
}

export const splitPath = (name: string) =>
  name
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);

export function uniqueName(base: string, used: Set<string>): string {
  let name = base;
  for (let i = 2; used.has(name); i++) name = `${base}-${i}`;
  used.add(name);
  return name;
}

/** 与语言环境无关的排序，保证输出稳定 */
export const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export class Counter<K> {
  private m = new Map<K, number>();
  add(k: K, n = 1) {
    this.m.set(k, (this.m.get(k) ?? 0) + n);
  }
  entries(): [K, number][] {
    return [...this.m.entries()];
  }
}

export function walk(node: FigmaNode, visit: (n: FigmaNode, depth: number) => boolean | void, depth = 0): void {
  if (node.visible === false) return;
  if (visit(node, depth) === false) return;
  for (const c of node.children ?? []) walk(c, visit, depth + 1);
}

const numName = (v: number) => String(v).replace('.', '_');

/** 圆角 / 间距：按数值命名（radius-8、spacing-16），按数值升序 */
export function numberTokens(type: 'radius' | 'spacing', counter: Counter<number>, used: Set<string>) {
  return counter
    .entries()
    .sort((a, b) => a[0] - b[0])
    .map(([value, usage]) => ({
      name: uniqueName(`${type}-${numName(value)}`, used),
      path: [type, String(value)],
      type,
      value,
      source: 'derived' as const,
      usage,
    }));
}
