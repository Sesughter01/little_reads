import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Route/guard tests dynamically import next/server, supabase and lucide
    // modules; under parallel workers those cold transforms can exceed the
    // default 5s timeout. 20s is plenty for the slowest import, fast for CI.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
