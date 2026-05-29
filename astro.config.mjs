import { defineConfig } from 'astro/config';
import { rename, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

export default defineConfig({
  output: 'static',
  base: '/poc',
  build: {
    format: 'file'
  },
  integrations: [
    {
      name: 'cases-index',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          const distPath = fileURLToPath(dir);
          const moves = [
            { from: 'cases.html', to: path.join('cases', 'index.html') },
            { from: 'catalog.html', to: path.join('catalog', 'index.html') },
          ];
          for (const { from, to } of moves) {
            try {
              const toPath = path.join(distPath, to);
              await mkdir(path.dirname(toPath), { recursive: true });
              await rename(path.join(distPath, from), toPath);
              console.log(`${from} → ${to}`);
            } catch (e) {
              console.warn(`${from} の移動に失敗:`, e.message);
            }
          }
        }
      }
    }
  ]
});
