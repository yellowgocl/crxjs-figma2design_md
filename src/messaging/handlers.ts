import { ZodError } from 'zod';
import { Request, type AuthStatus, type Response } from './protocol';
import { tokenStore } from '@/src/storage/token';
import { figma, FigmaError } from '@/src/figma/client';
import { extractLibrary, extractPage, inspect, UserError } from '@/src/figma/extract';

async function status(): Promise<AuthStatus> {
  const token = await tokenStore.get();
  const mode = await tokenStore.getMode();
  if (!token) return { connected: false, unreachable: false, mode, user: null };
  try {
    const me = await figma.me(token);
    return { connected: true, unreachable: false, mode, user: { handle: me.handle, email: me.email, imgUrl: me.img_url } };
  } catch (e) {
    if (e instanceof FigmaError && e.status === 403) {
      await tokenStore.clear(); // 过期或被撤销
      return { connected: false, unreachable: false, reason: 'expired', mode, user: null };
    }
    // 断网、限流或 Figma 故障：保留 Token，不退回连接页
    return { connected: false, unreachable: true, mode, user: null };
  }
}

async function requireToken(): Promise<string> {
  const token = await tokenStore.get();
  if (!token) throw new UserError('尚未连接 Figma，请先连接');
  return token;
}

export async function handleMessage(raw: unknown): Promise<Response<unknown>> {
  const parsed = Request.safeParse(raw);
  if (!parsed.success) return { ok: false, error: '无效的请求' };
  const req = parsed.data;
  try {
    switch (req.type) {
      case 'auth/status':
        return { ok: true, data: await status() };
      case 'auth/connect': {
        const me = await figma.me(req.token); // 先验证，通过才保存
        await tokenStore.set(req.token, req.mode);
        return {
          ok: true,
          data: { connected: true, unreachable: false, mode: req.mode, user: { handle: me.handle, email: me.email, imgUrl: me.img_url } },
        };
      }
      case 'auth/disconnect':
        await tokenStore.clear();
        return { ok: true, data: null };
      case 'source/inspect':
        return { ok: true, data: await inspect(await requireToken(), req.url) };
      case 'source/extract': {
        const token = await requireToken();
        const opts = {
          ...(req.versionId ? { versionId: req.versionId } : {}),
          versionLabel: req.versionLabel ?? null,
        };
        const data =
          req.kind === 'library' ? await extractLibrary(token, req.url, opts) : await extractPage(token, req.url, opts);
        return { ok: true, data };
      }
    }
  } catch (e) {
    // 报错信息里绝不包含 Token
    if (e instanceof FigmaError || e instanceof UserError) {
      return { ok: false, error: e instanceof FigmaError ? e.userMessage : e.message };
    }
    if (e instanceof ZodError) return { ok: false, error: 'Figma 返回的数据格式和预期不同' };
    return { ok: false, error: '网络错误，请稍后再试' };
  }
}
