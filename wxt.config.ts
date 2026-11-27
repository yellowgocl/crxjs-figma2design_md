import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: '.',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'Figma → DESIGN.md',
    description: 'Turn Figma specs into an AI-friendly DESIGN.md',
    permissions: ['storage', 'sidePanel'],
    host_permissions: ['https://api.figma.com/*'],
    action: { default_title: 'Figma → DESIGN.md' },
  },
});
