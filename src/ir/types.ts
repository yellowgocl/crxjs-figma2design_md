import { z } from 'zod';

/** DesignIR：发给 AI 和适配层的唯一数据格式。不包含原始 Figma JSON。 */

export const TokenType = z.enum(['color', 'typography', 'effect', 'radius', 'spacing']);
export type TokenType = z.infer<typeof TokenType>;

const Scalar = z.union([z.string(), z.number()]);
export const TokenValue = z.union([Scalar, z.record(z.string(), Scalar)]);

export const Token = z.object({
  /** kebab-case，在同一份 IR 里唯一 */
  name: z.string(),
  /** 原始分组，例如 ['Brand', 'Primary'] */
  path: z.array(z.string()),
  type: TokenType,
  value: TokenValue,
  /** 多模式（例如 Light / Dark），键是模式名 */
  modes: z.record(z.string(), Scalar).optional(),
  source: z.enum(['style', 'variable', 'derived']),
  /** Figma style key，页面层靠它匹配基础层 */
  key: z.string().optional(),
  description: z.string().optional(),
  /** 在页面里出现的次数（仅页面层） */
  usage: z.number().int().optional(),
});
export type Token = z.infer<typeof Token>;

export const SourceMeta = z.object({
  fileKey: z.string(),
  fileName: z.string(),
  nodeId: z.string().optional(),
  versionId: z.string(),
  versionLabel: z.string().nullable(),
  lastModified: z.string(),
  extractedAt: z.string(),
});
export type SourceMeta = z.infer<typeof SourceMeta>;

export const ComponentDef = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  /** 变体和布尔属性，例如 { Size: ['S', 'L'], State: ['Default', 'Hover'] } */
  properties: z.record(z.string(), z.array(z.string())),
  variants: z.array(
    z.object({
      name: z.string(),
      values: z.record(z.string(), z.string()),
      /** 这个变体用到的 token 名 */
      tokens: z.array(z.string()),
    }),
  ),
  tokens: z.array(z.string()),
});
export type ComponentDef = z.infer<typeof ComponentDef>;

export const LibraryIR = z.object({
  kind: z.literal('library'),
  source: SourceMeta,
  tokens: z.array(Token),
  components: z.array(ComponentDef),
  warnings: z.array(z.string()),
});
export type LibraryIR = z.infer<typeof LibraryIR>;

export type PageNode = {
  name: string;
  type: string;
  layout?: 'row' | 'column';
  component?: string;
  variant?: string;
  text?: string;
  tokens?: string[];
  truncated?: boolean;
  children?: PageNode[];
};
export const PageNode: z.ZodType<PageNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.string(),
    layout: z.enum(['row', 'column']).optional(),
    component: z.string().optional(),
    variant: z.string().optional(),
    text: z.string().optional(),
    tokens: z.array(z.string()).optional(),
    truncated: z.boolean().optional(),
    children: z.array(PageNode).optional(),
  }),
);

export const PageIR = z.object({
  kind: z.literal('page'),
  source: SourceMeta,
  libraries: z.array(z.object({ fileKey: z.string(), name: z.string().optional() })),
  usedComponents: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      variants: z.array(z.string()),
      count: z.number().int(),
      remote: z.boolean(),
      libraryFileKey: z.string().optional(),
    }),
  ),
  usedStyles: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      type: TokenType,
      count: z.number().int(),
      remote: z.boolean(),
      libraryFileKey: z.string().optional(),
    }),
  ),
  /** 没有引用样式的值：本页自定义，以及圆角 / 间距 */
  custom: z.array(Token),
  tree: PageNode,
  warnings: z.array(z.string()),
});
export type PageIR = z.infer<typeof PageIR>;

export const DesignIR = z.discriminatedUnion('kind', [LibraryIR, PageIR]);
export type DesignIR = z.infer<typeof DesignIR>;
