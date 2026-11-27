# M1 安装步骤

依赖不在 package.json 里写死版本，用下面的命令安装，pnpm 会自动取最新稳定版。

```bash
pnpm install
pnpm add react react-dom @tanstack/react-query zod @wxt-dev/storage
pnpm add -D wxt @wxt-dev/module-react typescript @types/react @types/react-dom \
  tailwindcss @tailwindcss/vite vitest
pnpm dev            # Chrome，开发模式（自动打开浏览器并加载扩展）
pnpm dev:firefox    # Firefox
```

装好后运行 `pnpm compile`，确认类型检查通过。
