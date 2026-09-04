import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // DB-Flows über mehrere Endpunkte (inkl. KI-Calls gegen den Fake-Client,
    // Phase 6) brauchen bei einer entfernten Supabase-DB mehr als die
    // Vitest-Default-5s pro Test.
    testTimeout: 15000,
  },
});
