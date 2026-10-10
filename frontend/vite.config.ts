import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: { rolldownOptions: { input: {
    app: fileURLToPath(new URL('./index.html', import.meta.url)),
    publishing: fileURLToPath(new URL('./publishing.html', import.meta.url)),
  } } },
});
