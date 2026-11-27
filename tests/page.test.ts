import { describe, expect, it } from 'vitest';
import { buildPageIR } from '@/src/ir/page';
import { PageIR } from '@/src/ir/types';
import { pageInput } from './fixtures/page';

const ir = buildPageIR(pageInput);

describe('buildPageIR', () => {
  it('produces a valid PageIR', () => {
    expect(PageIR.safeParse(ir).success).toBe(true);
  });

  it('groups instances by component set and traces the library', () => {
    expect(ir.usedComponents).toEqual([
      {
        key: 'cs-button',
        name: 'Button',
        variants: ['State=Default', 'State=Hover'],
        count: 3,
        remote: true,
        libraryFileKey: 'LIB123',
      },
    ]);
    expect(ir.libraries).toEqual([{ fileKey: 'LIB123', name: 'VI Library' }]);
  });

  it('references library styles by name', () => {
    expect(ir.usedStyles).toEqual([
      { key: 'sk-body', name: 'text-body', type: 'typography', count: 1, remote: true, libraryFileKey: 'LIB123' },
    ]);
  });

  it('collects values without styles as page custom tokens', () => {
    const custom = ir.custom.filter((t) => t.path[0] === 'custom');
    expect(custom.map((t) => [t.name, t.value])).toEqual([
      ['custom-color-1', '#666666'],
      ['custom-color-2', '#FAFAFA'],
      ['custom-text-1', { fontFamily: 'Inter', fontWeight: 500, fontSize: 13, lineHeight: '18px', letterSpacing: '0px' }],
    ]);
    expect(ir.custom.filter((t) => t.type === 'spacing').map((t) => t.value)).toEqual([24, 32]);
  });

  it('does not walk into instances, hidden nodes or vectors', () => {
    const names = ir.tree.children?.map((c) => c.name);
    expect(names).toEqual(['Title', 'Note', 'Pay', 'Cancel', 'Pay 2']);
    expect(ir.tree.children?.[2]).toEqual({ name: 'Pay', type: 'INSTANCE', component: 'Button', variant: 'State=Default' });
    expect(ir.tree.layout).toBe('column');
  });

  it('warns when a remote instance cannot be traced', () => {
    const r = buildPageIR({ ...pageInput, componentLibrary: {} });
    expect(r.warnings[0]).toContain('3 个组件实例无法追溯');
    expect(r.usedComponents[0]?.libraryFileKey).toBeUndefined();
  });

  it('is deterministic', () => {
    expect(buildPageIR(pageInput)).toEqual(ir);
  });

  it('matches snapshot', () => {
    expect(ir).toMatchSnapshot();
  });
});
