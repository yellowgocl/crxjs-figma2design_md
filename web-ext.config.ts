import { defineWebExtConfig } from 'wxt';

/**
 * pnpm dev 时启动的浏览器配置。
 * 使用固定的用户资料目录，重启 dev 后已登录的 Figma Token（"记住 Token"）、
 * 已安装的 DevTools 插件等都会保留。目录在 .wxt/ 下，已被 .gitignore 忽略。
 */
export default defineWebExtConfig({
  chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
});
