import { describe, expect, it } from 'vitest';
import { buildLibraryIR } from '@/src/ir/library';
import { LibraryIR } from '@/src/ir/types';
import { libraryInput } from './fixtures/library';

const ir = buildLibraryIR(libraryInput);
const token = (name: string) => ir.tokens.find((t) => t.name === name);

describe('buildLibraryIR', () => {
  it('produces a valid LibraryIR', () => {
    expect(LibraryIR.safeParse(ir).success).toBe(true);
  });

  it('extracts style tokens with library names', () => {
    expect(token('brand-primary')).toMatchObject({ type: 'color', value: '#2563EB', key: 'sk-primary', description: '主色' });
    expect(token('text-body')?.value).toEqual({
      fontFamily: 'Inter',
      fontWeight: 400,
      fontSize: 16,
      lineHeight: '24px',
      letterSpacing: '0px',
    });
    expect(token('elevation-1')?.value).toBe('0px 2px 4px 0px #0000001A');
  });

  it('skips unsupported styles with a warning', () => {
    expect(token('brand-gradient')).toBeUndefined();
    expect(ir.warnings.some((w) => w.includes('1 个样式没有提取'))).toBe(true);
  });

  it('extracts variables with modes and aliases', () => {
    expect(token('semantic-bg-surface')).toMatchObject({
      value: '#FFFFFF',
      modes: { Light: '#FFFFFF', Dark: '{semantic-bg-inverse}' },
      source: 'variable',
    });
    expect(ir.tokens.some((t) => t.path.includes('label'))).toBe(false);
  });

  it('derives radius and spacing from components', () => {
    expect(ir.tokens.filter((t) => t.type === 'radius').map((t) => t.value)).toEqual([4, 8]);
    expect(ir.tokens.filter((t) => t.type === 'spacing').map((t) => t.value)).toEqual([8, 16]);
  });

  it('builds components with variants and token usage', () => {
    const button = ir.components.find((c) => c.name === 'Button');
    expect(button?.properties).toEqual({ State: ['Default', 'Hover'], 'Has icon': ['true', 'false'] });
    expect(button?.variants.map((v) => v.name)).toEqual(['State=Default', 'State=Hover']);
    expect(button?.variants[1]?.tokens).toEqual(['brand-primary', 'elevation-1', 'text-body']);
    expect(ir.components.find((c) => c.name === 'Icon/Close')?.variants).toEqual([]);
  });

  it('is deterministic regardless of input order', () => {
    const shuffled = { ...libraryInput, styles: [...libraryInput.styles].reverse() };
    expect(buildLibraryIR(shuffled)).toEqual(ir);
    expect(buildLibraryIR(libraryInput)).toEqual(ir);
  });

  it('matches snapshot', () => {
    expect(ir).toMatchSnapshot();
  });
});
