import { useState } from 'react';
import type { ExtractResult } from '@/src/messaging/protocol';
import type { TokenType } from '@/src/ir/types';
import { formatSize } from './format';

const TYPE_LABEL: Record<TokenType, string> = {
  color: '颜色',
  typography: '字体',
  effect: '阴影',
  radius: '圆角',
  spacing: '间距',
};

export function IrPreview({ result }: { result: ExtractResult }) {
  const { ir, stats } = result;
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(ir, null, 2);

  const rows: [string, number][] =
    ir.kind === 'library'
      ? [
          ...(Object.keys(TYPE_LABEL) as TokenType[]).map(
            (t) => [TYPE_LABEL[t], ir.tokens.filter((x) => x.type === t).length] as [string, number],
          ),
          ['组件', ir.components.length],
        ]
      : [
          ['用到的组件', ir.usedComponents.length],
          ['用到的样式', ir.usedStyles.length],
          ['本页自定义值', ir.custom.filter((t) => t.path[0] === 'custom').length],
          ['关联的库', ir.libraries.length],
        ];

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3 border-t border-line pt-3">
      <h3 className="text-sm font-semibold">提取结果</h3>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        {rows.map(([label, n]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-muted">{label}</dt>
            <dd className="tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted">
        Figma 原始数据 {formatSize(stats.rawChars)} → DesignIR {formatSize(stats.irChars)}，约{' '}
        {Math.ceil(stats.irChars / 4).toLocaleString('zh-CN')} tokens（按 4 个字符约 1 token 估算）
      </p>
      {ir.warnings.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-xs text-warn">
          {ir.warnings.map((w) => (
            <li key={w} className="whitespace-pre-line">
              {w}
            </li>
          ))}
        </ul>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer select-none">查看 DesignIR JSON</summary>
        <div className="mt-2 space-y-2">
          <button className="rounded border border-line px-2 py-1 text-xs hover:bg-subtle" onClick={copy}>
            {copied ? '已复制' : '复制 JSON'}
          </button>
          <pre className="max-h-80 overflow-auto rounded bg-subtle p-2 font-mono text-xs leading-5">{json}</pre>
        </div>
      </details>
      <p className="text-xs text-muted">下一阶段（M3）会把它生成为 DESIGN.md。</p>
    </div>
  );
}
