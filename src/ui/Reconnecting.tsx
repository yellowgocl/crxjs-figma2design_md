import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/src/messaging/client';

export function Reconnecting({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  const qc = useQueryClient();
  const disconnect = useMutation({
    mutationFn: api.disconnect,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth'] }),
  });
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">暂时连不上 Figma</h2>
      <p className="text-sm text-muted">已保存的 Token 还在，可能是网络问题或 Figma 暂时不可用。</p>
      <div className="flex gap-2">
        <button className="h-9 rounded bg-accent px-4 text-sm font-medium text-white disabled:opacity-50" onClick={onRetry} disabled={retrying}>
          {retrying ? '正在重试…' : '重试'}
        </button>
        <button className="h-9 rounded border border-line px-4 text-sm hover:bg-subtle" onClick={() => disconnect.mutate()}>
          换一个 Token
        </button>
      </div>
    </section>
  );
}
