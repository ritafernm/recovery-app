import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = { '@': path.resolve(__dirname, 'src') };

// Ensure a single copy of React is used across the workspace.
const reactAlias = {
  react: path.resolve(__dirname, 'node_modules/react'),
  'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
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
