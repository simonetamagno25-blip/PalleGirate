import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { TEST_DATABASE_URL } from "./test-db-url";

// Prisma blocca `db push --force-reset` quando e' invocato da un agente AI.
// Cancellare il file SQLite usa-e-getta del test e' equivalente. Non toccare mai prisma/dev.db.
export default function setup() {
  const dir = path.resolve(process.cwd(), "prisma");
  for (const f of ["test.db", "test.db-journal"]) rmSync(path.join(dir, f), { force: true });
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
