import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@buddy/shared-types': path.resolve(__dirname, 'packages/shared-types/src/index.ts'),
      '@buddy/storage': path.resolve(__dirname, 'packages/storage/src/index.ts'),
      '@buddy/watch-time': path.resolve(__dirname, 'packages/watch-time/src/index.ts'),
      '@buddy/activity-engine': path.resolve(__dirname, 'packages/activity-engine/src/index.ts'),
      '@buddy/focus-engine': path.resolve(__dirname, 'packages/focus-engine/src/index.ts'),
      '@buddy/site-adapters': path.resolve(__dirname, 'packages/site-adapters/src/index.ts'),
      '@buddy/mood-engine': path.resolve(__dirname, 'packages/mood-engine/src/index.ts'),
      '@buddy/i18n': path.resolve(__dirname, 'packages/i18n/src/index.ts'),
      '@buddy/ui-components': path.resolve(__dirname, 'packages/ui-components/src/index.ts'),
      '@buddy/filter-pipeline': path.resolve(__dirname, 'packages/filter-pipeline/src/index.ts'),
      '@buddy/family-engine': path.resolve(__dirname, 'packages/family-engine/src/index.ts'),
      '@buddy/intelligence-engine': path.resolve(__dirname, 'packages/intelligence-engine/src/index.ts'),
      '@buddy/shield-policy': path.resolve(__dirname, 'packages/shield-policy/src/index.ts'),
      '@buddy/shield-stats': path.resolve(__dirname, 'packages/shield-stats/src/index.ts'),
      '@buddy/shield-dnr': path.resolve(__dirname, 'packages/shield-dnr/src/index.ts'),
      '@buddy/shield-cosmetic': path.resolve(__dirname, 'packages/shield-cosmetic/src/index.ts'),
      '@buddy/shield-core': path.resolve(__dirname, 'packages/shield-core/src/index.ts'),
    },
  },
});
