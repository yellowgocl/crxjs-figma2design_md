import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/src/messaging/client';
import { parseFigmaUrl } from '@/src/figma/link';
import type { InspectResult } from '@/src/messaging/protocol';
import { IrPreview } from './IrPreview';
import { formatDate } from './format';

type Kind = 'library' | 'page';
const LATEST = '__latest__';

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: 'library', label: '基础层', hint: 'VI / 组件库文件，生成 DESIGN.foundation.md' },
  { value: 'page', label: '页面层', hint: '产品页面的 Frame，生成 DESIGN.<page>.md' },
];

export function SourcePicker() {
  const [kind, setKind] = useState<Kind>('library');
  const [url, setUrl] = useState('');
  const [versionId, setVersionId] = useState(LATEST);

  const inspect = useMutation({ mutationFn: () => api.inspect(url), onSuccess: () => setVersionId(LATEST) });
  const extract = useMutation({
    mutationFn: (info: InspectResult) => {
      const v = info.versions.find((x) => x.id === versionId);
      return api.extract({ kind, url, ...(v ? { versionId: v.id, versionLabel: v.label } : {}) });
    },
  });

  const reset = () => {
    inspect.reset();
    extract.reset();
  };

  const link = url.trim() ? parseFigmaUrl(url) : null;
  const linkError = !url.trim()
    ? null
    : !link
      ? '不是有效的 Figma 文件链接'
      : kind === 'page' && !link.nodeId
        ? '页面层需要 Frame 链接：在 Figma 里选中 Frame，右键 → Copy link to selection'
        : kind === 'library' && link.branchKey
          ? '组件库请使用主文件链接，分支不能发布样式和组件'
          : null;
  const info = inspect.data;

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">选择来源</h2>

      <fieldset className="space-y-2 text-sm">
        <legend className="font-medium">生成类型</legend>
        {KINDS.map((k) => (
          <label key={k.value} className="flex items-start gap-2">
            <input
              type="radio"
              className="mt-1"
              checked={kind === k.value}
              onChange={() => {
                setKind(k.value);
                reset();
              }}
            />
            <span>
              {k.label}
              <span className="block text-xs text-muted">{k.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="block text-sm">
        <span className="font-medium">Figma 链接</span>
        <input
          type="url"
          spellCheck={false}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            reset();
          }}
          className="mt-1 h-9 w-full rounded border border-line bg-white px-2 text-sm outline-none focus:border-accent"
        />
      </label>
      {linkError && <p className="text-sm text-danger">{linkError}</p>}

      {!info && (
        <button
          className="h-9 w-full rounded bg-accent text-sm font-medium text-white disabled:opacity-50"
          disabled={!link || !!linkError || inspect.isPending}
          onClick={() => inspect.mutate()}
        >
          {inspect.isPending ? '正在读取…' : '读取文件'}
        </button>
      )}
      {inspect.isError && <p className="text-sm text-danger">{inspect.error.message}</p>}

      {info && (
        <div className="space-y-3 border-t border-line pt-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted">文件</dt>
            <dd className="break-words font-medium">{info.name}</dd>
            <dt className="text-muted">最后修改</dt>
            <dd>{formatDate(info.lastModified)}</dd>
            {info.nodeId && (
              <>
                <dt className="text-muted">Frame</dt>
                <dd className="font-mono text-xs leading-5">{info.nodeId}</dd>
              </>
            )}
          </dl>

          <label className="block text-sm">
            <span className="font-medium">版本</span>
            <select
              value={versionId}
              onChange={(e) => {
                setVersionId(e.target.value);
                extract.reset();
              }}
              className="mt-1 h-9 w-full rounded border border-line bg-white px-2 text-sm"
            >
              <option value={LATEST}>最新版本</option>
              {info.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} · {formatDate(v.createdAt)}
                </option>
              ))}
            </select>
          </label>
          {!info.versions.length && !info.warnings.length && (
            <p className="text-xs text-muted">这个文件没有命名过的版本，将使用最新版本。</p>
          )}
          {info.warnings.map((w) => (
            <p key={w} className="text-xs text-warn">
              {w}
            </p>
          ))}

          <button
            className="h-9 w-full rounded bg-accent text-sm font-medium text-white disabled:opacity-50"
            disabled={extract.isPending}
            onClick={() => extract.mutate(info)}
          >
            {extract.isPending ? '正在提取设计数据…' : '提取设计数据'}
          </button>
          {extract.isError && <p className="text-sm text-danger">{extract.error.message}</p>}
          {extract.data && <IrPreview result={extract.data} />}
        </div>
      )}
    </section>
  );
}
