export type FigmaLink = {
  /** 主文件 key（发布类接口必须用它） */
  fileKey: string;
  /** 分支 key（如果是分支链接） */
  branchKey?: string;
  /** API 格式的节点 id，例如 1:2 */
  nodeId?: string;
};

const PATH = /^\/(design|file|proto)\/([A-Za-z0-9]+)(?:\/branch\/([A-Za-z0-9]+))?/;
const NODE_ID = /^[I\d:;]+$/;

/** 解析 Figma 文件 / Frame 链接。不是 Figma Design 链接时返回 null。 */
export function parseFigmaUrl(input: string): FigmaLink | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !/(^|\.)figma\.com$/.test(url.hostname)) return null;
  const m = url.pathname.match(PATH);
  if (!m || !m[2]) return null;
  const raw = url.searchParams.get('node-id');
  const nodeId = raw ? raw.replace(/-/g, ':') : undefined;
  return {
    fileKey: m[2],
    ...(m[3] ? { branchKey: m[3] } : {}),
    ...(nodeId && NODE_ID.test(nodeId) ? { nodeId } : {}),
  };
}

/** 读取文件内容时用的 key：分支链接用分支 key */
export const contentKey = (l: FigmaLink) => l.branchKey ?? l.fileKey;
