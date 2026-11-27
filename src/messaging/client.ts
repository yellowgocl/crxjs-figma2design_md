import type { Request, Response } from './protocol';
import { AuthStatus, ExtractResult, InspectResult } from './protocol';

async function send<T>(req: Request): Promise<T> {
  const res = (await browser.runtime.sendMessage(req)) as Response<T> | undefined;
  if (!res) throw new Error('后台没有响应，请重新加载扩展');
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

export const api = {
  status: async () => AuthStatus.parse(await send({ type: 'auth/status' })),
  connect: async (token: string, mode: 'session' | 'remember') =>
    AuthStatus.parse(await send({ type: 'auth/connect', token, mode })),
  disconnect: () => send<null>({ type: 'auth/disconnect' }),
  inspect: async (url: string) => InspectResult.parse(await send({ type: 'source/inspect', url })),
  extract: async (args: { kind: 'library' | 'page'; url: string; versionId?: string; versionLabel?: string | null }) =>
    ExtractResult.parse(await send({ type: 'source/extract', ...args })),
};
