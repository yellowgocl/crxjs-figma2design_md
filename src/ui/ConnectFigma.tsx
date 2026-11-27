import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/src/messaging/client';

export function ConnectFigma({ expired = false }: { expired?: boolean }) {
  const qc = useQueryClient();
  const [token, setToken] = useState('');
  const [mode, setMode] = useState<'session' | 'remember'>('session');
  const connect = useMutation({
    mutationFn: () => api.connect(token, mode),
    onSuccess: (data) => {
      setToken('');
      qc.setQueryData(['auth'], data);
    },
  });

  return (
    <section className="space-y-4">
      {expired && (
        <p role="alert" className="rounded border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          之前保存的 Token 已过期或被撤销，已自动清除，请重新连接。
        </p>
      )}
      <div>
        <h2 className="text-base font-semibold">连接 Figma</h2>
        <p className="mt-1 text-sm text-muted">
          在 Figma 的 Settings → Security → Personal access tokens 生成 Token。
          需要勾选 current_user:read、file_content:read、library_content:read、library_assets:read（企业版可加 file_variables:read），并设置过期时间。
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-medium">Personal access token</span>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-1 h-9 w-full rounded border border-line bg-white px-2 font-mono text-sm outline-none focus:border-accent"
        />
      </label>

      <fieldset className="space-y-2 text-sm">
        <legend className="font-medium">保存方式</legend>
        <label className="flex items-start gap-2">
          <input type="radio" checked={mode === 'session'} onChange={() => setMode('session')} className="mt-1" />
          <span>仅本次会话<span className="block text-xs text-muted">关闭浏览器后自动清除，更安全</span></span>
        </label>
        <label className="flex items-start gap-2">
          <input type="radio" checked={mode === 'remember'} onChange={() => setMode('remember')} className="mt-1" />
          <span>记住 Token<span className="block text-xs text-muted">保存在本机，未加密，请只在自己的电脑上使用</span></span>
        </label>
      </fieldset>

      <button
        className="h-9 w-full rounded bg-accent text-sm font-medium text-white disabled:opacity-50"
        disabled={token.trim().length < 10 || connect.isPending}
        onClick={() => connect.mutate()}
      >
        {connect.isPending ? '正在验证…' : '验证并连接'}
      </button>
      {connect.isError && <p className="text-sm text-danger">{connect.error.message}</p>}
    </section>
  );
}
