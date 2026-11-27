import { z } from 'zod';

const BASE = 'https://api.figma.com';

export class FigmaError extends Error {
  constructor(public status: number, public userMessage: string) {
    super(userMessage);
  }
}

const Me = z.object({ id: z.string(), handle: z.string(), email: z.string().optional(), img_url: z.string().optional() });

async function request<T>(token: string, path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'X-Figma-Token': token } });
  if (res.status === 403) throw new FigmaError(403, 'Token 无效、已过期或权限不足');
  if (res.status === 429) throw new FigmaError(429, '请求太频繁，请稍后再试');
  if (!res.ok) throw new FigmaError(res.status, `Figma 返回错误（${res.status}）`);
  return schema.parse(await res.json());
}

export const figma = {
  me: (token: string) => request(token, '/v1/me', Me),
};
