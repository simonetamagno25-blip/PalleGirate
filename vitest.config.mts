import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { TEST_DATABASE_URL } from './tests/test-env.mjs'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    env: { DATABASE_URL: TEST_DATABASE_URL, AUTH_SECRET: 'test-secret' },
    fileParallelism: false,
    testTimeout: 20000,
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
})
