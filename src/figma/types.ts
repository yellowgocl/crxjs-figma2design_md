/** Figma REST API 的类型（只声明本项目用到的字段）。来源：developers.figma.com/docs/rest-api */

export type Color = { r: number; g: number; b: number; a: number };
export type Paint = { type: string; visible?: boolean; opacity?: number; color?: Color };
export type Effect = {
  type: string;
  visible?: boolean;
  color?: Color;
  offset?: { x: number; y: number };
  radius: number;
  spread?: number;
};
export type TypeStyle = {
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  lineHeightPx?: number;
  lineHeightUnit?: string;
  letterSpacing?: number;
};
export type PropertyDefinition = { type: string; variantOptions?: string[] };

export type FigmaNode = {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  style?: TypeStyle;
  /** 例如 { fill: 'S:abc', text: 'S:def' }，值是 styleId */
  styles?: Record<string, string>;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  layoutMode?: string;
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  componentId?: string;
  componentPropertyDefinitions?: Record<string, PropertyDefinition>;
  characters?: string;
};

/** nodes 响应里 styles map 的值（styleId -> meta） */
export type StyleMeta = { key: string; name: string; styleType: string; remote?: boolean; description?: string };
/** nodes 响应里 components map 的值（nodeId -> meta） */
export type ComponentMeta = {
  key: string;
  name: string;
  description?: string;
  componentSetId?: string;
  remote?: boolean;
};
export type ComponentSetMeta = { key: string; name: string; description?: string; remote?: boolean };

/** /v1/files/:key/styles 等发布列表里的条目 */
export type PublishedStyle = { key: string; node_id: string; name: string; style_type: string; description?: string };
export type PublishedComponent = { key: string; node_id: string; name: string; description?: string };
export type PublishedComponentSet = PublishedComponent;

export type VariableValue = unknown;
export type Variable = {
  id: string;
  name: string;
  resolvedType: string;
  valuesByMode: Record<string, VariableValue>;
  variableCollectionId: string;
  hiddenFromPublishing?: boolean;
  remote?: boolean;
};
export type VariableCollection = {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
  defaultModeId: string;
};
export type VariablesMeta = {
  variables: Record<string, Variable>;
  variableCollections: Record<string, VariableCollection>;
};
