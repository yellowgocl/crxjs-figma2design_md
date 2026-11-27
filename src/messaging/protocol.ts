import { z } from 'zod';

export const Request = z.discriminatedUnion('type', [
  z.object({ type: z.literal('auth/status') }),
  z.object({
    type: z.literal('auth/connect'),
    token: z.string().trim().min(10),
    mode: z.enum(['session', 'remember']),
  }),
  z.object({ type: z.literal('auth/disconnect') }),
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

export type Response<T> = { ok: true; data: T } | { ok: false; error: string };
