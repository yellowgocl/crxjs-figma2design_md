import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/src/messaging/client';
import type { AuthStatus } from '@/src/messaging/protocol';

export function StatusBar({ status }: { status?: AuthStatus }) {
  const qc = useQueryClient();
  const disconnect = useMutation({
    mutationFn: api.disconnect,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth'] }),
  });

  return (
    <header className="flex items-center justify-between border-b border-line px-4 py-3">
      <h1 className="text-sm font-semibold">Figma → DESIGN.md</h1>
      {status?.connected ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted">
            {status.user?.handle} · {status.mode === 'remember' ? '已记住' : '仅本次会话'}
          </span>
          <button
            className="rounded border border-line px-2 py-1 hover:bg-subtle"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
          >
            断开连接
          </button>
        </div>
      ) : (
        <span className="text-xs text-muted">未连接</span>
      )}
    </header>
  );
}
