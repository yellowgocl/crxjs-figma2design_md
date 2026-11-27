import { z } from 'zod';
import { DesignIR } from '@/src/ir/types';

export const Request = z.discriminatedUnion('type', [
  z.object({ type: z.literal('auth/status') }),
  z.object({
    type: z.literal('auth/connect'),
    token: z.string().trim().min(10),
    mode: z.enum(['session', 'remember']),
  }),
  z.object({ type: z.literal('auth/disconnect') }),
  z.object({ type: z.literal('source/inspect'), url: z.string().max(2000) }),
  z.object({
    type: z.literal('source/extract'),
    kind: z.enum(['library', 'page']),
    url: z.string().max(2000),
    versionId: z.string().max(100).optional(),
    versionLabel: z.string().max(500).nullable().optional(),
  }),
]);
export type Request = z.infer<typeof Request>;

export const AuthStatus = z.object({
  connected: z.boolean(),
  /** 有已存 Token 但暂时验证不了（断网、Figma 5xx/429），不能当成未连接 */
  unreachable: z.boolean().default(false),
  /** 已存 Token 被 Figma 拒绝（过期或撤销），已自动清除 */
  reason: z.enum(['expired']).optional(),
  mode: z.enum(['session', 'remember']),
  user: z.object({ handle: z.string(), email: z.string().optional(), imgUrl: z.string().optional() }).nullable(),
});
export type AuthStatus = z.infer<typeof AuthStatus>;

export const InspectResult = z.object({
  fileKey: z.string(),
  branchKey: z.string().optional(),
  nodeId: z.string().optional(),
  name: z.string(),
  version: z.string(),
  lastModified: z.string(),
  editorType: z.string(),
  versions: z.array(z.object({ id: z.string(), label: z.string(), createdAt: z.string(), user: z.string().optional() })),
  warnings: z.array(z.string()),
});
export type InspectResult = z.infer<typeof InspectResult>;

export const ExtractResult = z.object({
  ir: DesignIR,
  stats: z.object({ rawChars: z.number(), irChars: z.number() }),
});
export type ExtractResult = z.infer<typeof ExtractResult>;

export type Response<T> = { ok: true; data: T } | { ok: false; error: string };
