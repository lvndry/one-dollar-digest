import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Run once before the test suite (via bunfig [test].preload). Gives every test
// module that imports @/lib/db an isolated, throwaway libSQL database.
if (!process.env.TURSO_DATABASE_URL) {
  process.env.TURSO_DATABASE_URL =
    "file:" + join(mkdtempSync(join(tmpdir(), "odd-test-")), "suite.db");
}
