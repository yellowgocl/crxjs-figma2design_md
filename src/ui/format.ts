export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '未知时间' : d.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatSize(chars: number): string {
  return chars < 1024 ? `${chars} B` : `${(chars / 1024).toFixed(1)} KB`;
}
