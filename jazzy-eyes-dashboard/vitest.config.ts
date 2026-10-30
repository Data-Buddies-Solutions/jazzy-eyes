import { defineConfig } from 'vitest/config';
import path from 'path';

const DB_TESTS = 'src/**/*.db.test.ts';

export default defineConfig({
  test: {
    fileParallelism: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['**/*.test.ts'],
          exclude: ['node_modules', '.next', DB_TESTS],
        },
      },
      {
        extends: true,
        test: {
          name: 'db',
          environment: 'node',
          include: [DB_TESTS],
          globalSetup: './vitest.db-setup.ts',
          setupFiles: ['./src/db/__tests__/db-setup.ts'],
          env: { TZ: 'America/Los_Angeles' },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
