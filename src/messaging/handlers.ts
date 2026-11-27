import { Request, type AuthStatus, type Response } from './protocol';
import { tokenStore } from '@/src/storage/token';
import { figma, FigmaError } from '@/src/figma/client';

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
        return { ok: true, data: { connected: true, unreachable: false, mode: req.mode, user: { handle: me.handle, email: me.email, imgUrl: me.img_url } } };
      }
      case 'auth/disconnect':
        await tokenStore.clear();
        return { ok: true, data: null };
    }
  } catch (e) {
    // 报错信息里绝不包含 Token
    return { ok: false, error: e instanceof FigmaError ? e.userMessage : '网络错误，请稍后再试' };
  }
}
