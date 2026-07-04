import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = { '@': path.resolve(__dirname, 'src') };

// Resolve React from wherever npm hoisted it (local or workspace root).
// Using createRequire ensures this stays correct regardless of deduplication.
const _require = createRequire(import.meta.url);
const reactAlias = {
  react: path.dirname(_require.resolve('react/package.json')),
  'react-dom': path.dirname(_require.resolve('react-dom/package.json')),
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias, dedupe: ['react', 'react-dom'] },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias: { ...alias, ...reactAlias }, dedupe: ['react', 'react-dom'] },
        test: {
          name: 'browser',
          environment: 'jsdom',
          setupFiles: ['tests/setup.ts'],
          include: ['tests/**/*.vitest.tsx'],
          server: {
            deps: {
              // Force @testing-library packages through Vite's resolver so the
              // react/react-dom alias applies and only one React instance is used.
              inline: [/@testing-library/],
            },
          },
        },
      },
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.vitest.ts'],
        },
      },
    ],
  },
});
