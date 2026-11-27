import type { PageInput } from '@/src/ir/page';

export const pageInput: PageInput = {
  source: {
    fileKey: 'PAGE456',
    fileName: 'Checkout',
    nodeId: '10:1',
    versionId: '200',
    versionLabel: null,
    lastModified: '2026-11-25T10:00:00Z',
    extractedAt: '2026-11-27T05:00:00Z',
  },
  root: {
    id: '10:1',
    name: 'Checkout',
    type: 'FRAME',
    layoutMode: 'VERTICAL',
    itemSpacing: 24,
    paddingTop: 32,
    fills: [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98, a: 1 } }],
    children: [
      { id: '10:2', name: 'Title', type: 'TEXT', characters: '确认订单', styles: { text: 'S:body' } },
      {
        id: '10:3',
        name: 'Note',
        type: 'TEXT',
        characters: '本页自定义的说明文字',
        style: { fontFamily: 'Inter', fontWeight: 500, fontSize: 13, lineHeightPx: 18 },
        fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 } }],
      },
      { id: '10:4', name: 'Pay', type: 'INSTANCE', componentId: '50:1', children: [{ id: 'I10:4;1', name: 'x', type: 'TEXT' }] },
      { id: '10:5', name: 'Cancel', type: 'INSTANCE', componentId: '50:2' },
      { id: '10:6', name: 'Pay 2', type: 'INSTANCE', componentId: '50:1' },
      { id: '10:7', name: 'Hidden', type: 'FRAME', visible: false },
      { id: '10:8', name: 'Icon', type: 'VECTOR' },
    ],
  },
  components: {
    '50:1': { key: 'ck-default', name: 'State=Default', componentSetId: '60:1', remote: true },
    '50:2': { key: 'ck-hover', name: 'State=Hover', componentSetId: '60:1', remote: true },
  },
  componentSets: { '60:1': { key: 'cs-button', name: 'Button', remote: true } },
  styles: { 'S:body': { key: 'sk-body', name: 'Text/Body', styleType: 'TEXT', remote: true } },
  componentLibrary: { 'ck-default': 'LIB123', 'ck-hover': 'LIB123' },
  styleLibrary: { 'sk-body': 'LIB123' },
  libraryNames: { LIB123: 'VI Library' },
};
