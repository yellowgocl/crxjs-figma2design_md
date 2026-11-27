import { storage } from '@wxt-dev/storage';

/** 只能在 background 里使用。UI 通过消息拿状态，永远拿不到 Token 本身。 */
export type TokenMode = 'session' | 'remember';

const modeItem = storage.defineItem<TokenMode>('local:tokenMode', { fallback: 'session' });
const sessionToken = storage.defineItem<string | null>('session:figmaToken', { fallback: null });
const localToken = storage.defineItem<string | null>('local:figmaToken', { fallback: null });

export const tokenStore = {
  async get(): Promise<string | null> {
    const mode = await modeItem.getValue();
    return mode === 'remember' ? localToken.getValue() : sessionToken.getValue();
  },
  async getMode(): Promise<TokenMode> {
    return modeItem.getValue();
  },
  async set(token: string, mode: TokenMode): Promise<void> {
    await this.clear();
    await modeItem.setValue(mode);
    await (mode === 'remember' ? localToken : sessionToken).setValue(token);
  },
  async clear(): Promise<void> {
    await Promise.all([sessionToken.removeValue(), localToken.removeValue()]);
  },
};
