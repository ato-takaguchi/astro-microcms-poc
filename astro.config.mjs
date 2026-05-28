import { defineConfig } from 'astro/config';
import { rename } from 'fs/promises';
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
          const from = path.join(distPath, 'cases.html');
          const to = path.join(distPath, 'cases', 'index.html');
          try {
            await rename(from, to);
            console.log('cases.html → cases/index.html');
          } catch (e) {
            console.warn('cases.html の移動に失敗:', e.message);
          }
        }
      }
    }
  ]
});
