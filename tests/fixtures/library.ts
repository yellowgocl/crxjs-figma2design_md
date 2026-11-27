import type { LibraryInput } from '@/src/ir/library';

export const libraryInput: LibraryInput = {
  source: {
    fileKey: 'LIB123',
    fileName: 'VI Library',
    versionId: '100',
    versionLabel: 'v2.1',
    lastModified: '2026-11-20T08:30:00Z',
    extractedAt: '2026-11-27T05:00:00Z',
  },
  styles: [
    { key: 'sk-primary', node_id: '1:1', name: 'Brand/Primary', style_type: 'FILL', description: '主色' },
    { key: 'sk-body', node_id: '1:2', name: 'Text/Body', style_type: 'TEXT' },
    { key: 'sk-shadow', node_id: '1:3', name: 'Elevation/1', style_type: 'EFFECT' },
    { key: 'sk-grad', node_id: '1:4', name: 'Brand/Gradient', style_type: 'FILL' },
  ],
  styleNodes: {
    '1:1': { id: '1:1', name: 'Primary', type: 'RECTANGLE', fills: [{ type: 'SOLID', color: { r: 0.145, g: 0.388, b: 0.922, a: 1 } }] },
    '1:2': {
      id: '1:2',
      name: 'Body',
      type: 'TEXT',
      style: { fontFamily: 'Inter', fontWeight: 400, fontSize: 16, lineHeightPx: 24, letterSpacing: 0 },
    },
    '1:3': {
      id: '1:3',
      name: 'E1',
      type: 'RECTANGLE',
      effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0 }],
    },
    '1:4': { id: '1:4', name: 'G', type: 'RECTANGLE', fills: [{ type: 'GRADIENT_LINEAR' }] },
  },
  componentSets: [{ key: 'cs-button', node_id: '2:0', name: 'Button', description: '主要按钮' }],
  components: [{ key: 'c-icon', node_id: '3:0', name: 'Icon/Close' }],
  componentNodes: {
    '2:0': {
      id: '2:0',
      name: 'Button',
      type: 'COMPONENT_SET',
      componentPropertyDefinitions: {
        State: { type: 'VARIANT', variantOptions: ['Default', 'Hover'] },
        'Has icon#12:3': { type: 'BOOLEAN' },
      },
      children: [
        {
          id: '2:2',
          name: 'State=Hover',
          type: 'COMPONENT',
          cornerRadius: 8,
          layoutMode: 'HORIZONTAL',
          itemSpacing: 8,
          paddingLeft: 16,
          paddingRight: 16,
          styles: { fill: 'S:primary', effect: 'S:shadow' },
          children: [{ id: '2:3', name: 'Label', type: 'TEXT', styles: { text: 'S:body' } }],
        },
        {
          id: '2:1',
          name: 'State=Default',
          type: 'COMPONENT',
          cornerRadius: 8,
          layoutMode: 'HORIZONTAL',
          itemSpacing: 8,
          paddingLeft: 16,
          paddingRight: 16,
          styles: { fill: 'S:primary' },
          children: [{ id: '2:4', name: 'Label', type: 'TEXT', styles: { text: 'S:body' } }],
        },
      ],
    },
    '3:0': { id: '3:0', name: 'Icon/Close', type: 'COMPONENT', cornerRadius: 4 },
  },
  styleMetaById: {
    'S:primary': { key: 'sk-primary', name: 'Brand/Primary', styleType: 'FILL' },
    'S:body': { key: 'sk-body', name: 'Text/Body', styleType: 'TEXT' },
    'S:shadow': { key: 'sk-shadow', name: 'Elevation/1', styleType: 'EFFECT' },
  },
  variables: {
    variableCollections: {
      'VC:1': {
        id: 'VC:1',
        name: 'Semantic',
        defaultModeId: 'm1',
        modes: [
          { modeId: 'm1', name: 'Light' },
          { modeId: 'm2', name: 'Dark' },
        ],
      },
    },
    variables: {
      'V:2': {
        id: 'V:2',
        name: 'bg/surface',
        resolvedType: 'COLOR',
        variableCollectionId: 'VC:1',
        valuesByMode: { m1: { r: 1, g: 1, b: 1, a: 1 }, m2: { type: 'VARIABLE_ALIAS', id: 'V:1' } },
      },
      'V:1': {
        id: 'V:1',
        name: 'bg/inverse',
        resolvedType: 'COLOR',
        variableCollectionId: 'VC:1',
        valuesByMode: { m1: { r: 0, g: 0, b: 0, a: 1 }, m2: { r: 0.1, g: 0.1, b: 0.1, a: 1 } },
      },
      'V:3': { id: 'V:3', name: 'label', resolvedType: 'STRING', variableCollectionId: 'VC:1', valuesByMode: { m1: 'x' } },
    },
  },
};
