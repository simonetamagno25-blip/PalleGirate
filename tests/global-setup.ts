import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import path from 'node:path'
import { TEST_DATABASE_URL } from './test-env.mjs'

// Ricrea da zero il database SQLite dei test (file usa e getta in backend/prisma/).
export default function setup() {
  for (const suffix of ['', '-journal']) {
    rmSync(path.join(import.meta.dirname, '..', 'backend', 'prisma', `test.db${suffix}`), { force: true })
  }
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  })
}
