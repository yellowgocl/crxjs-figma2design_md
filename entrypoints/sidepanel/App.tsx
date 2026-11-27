import { useQuery } from '@tanstack/react-query';
import { api } from '@/src/messaging/client';
import { ConnectFigma } from '@/src/ui/ConnectFigma';
import { StatusBar } from '@/src/ui/StatusBar';
import { Reconnecting } from '@/src/ui/Reconnecting';
import { SourcePicker } from '@/src/ui/SourcePicker';

/**
 * 启动时先用已存 Token 自动验证：
 * - 验证中：显示加载状态，不渲染连接页（避免闪一下）
 * - 通过：直接进入"选择来源"
 * - 网络问题：保留 Token，提供重试
 * - Token 失效：回到连接页并说明原因
 */
export function App() {
  const status = useQuery({ queryKey: ['auth'], queryFn: api.status, staleTime: 5 * 60_000 });
  const s = status.data;

  return (
    <main className="min-h-screen bg-surface text-ink">
      <StatusBar status={s} />
      <div className="p-4">
        {status.isPending && (
          <p role="status" className="text-sm text-muted">正在使用已保存的 Token 连接 Figma…</p>
        )}
        {status.isError && <p className="text-sm text-danger">{status.error.message}</p>}
        {s?.unreachable && <Reconnecting onRetry={() => status.refetch()} retrying={status.isFetching} />}
        {s && !s.connected && !s.unreachable && <ConnectFigma expired={s.reason === 'expired'} />}
        {s?.connected && <SourcePicker />}
      </div>
    </main>
  );
}
