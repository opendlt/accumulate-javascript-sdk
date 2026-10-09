// Import every public entry point of the BUILT package, the way a consumer's `import` does.
//
// The unit tests run the TypeScript sources through ts-jest, which resolves extensionless
// relative imports. Node's ESM loader does not, so a missing `.js` in a source import compiles
// fine, passes every unit test, and then breaks `import "accumulate-sdk-opendlt"` for everyone.
// Run after `npm run build`:  npm run test:esm
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

// Entry points that already fail to import, for reasons unrelated to the package's own sources.
// They are reported but do not fail the run; remove an entry when it is fixed.
const KNOWN_BROKEN = {
  "./ledger":
    "hardware-wallet module deep-imports 'rxjs/operators', which Node's ESM loader rejects (also in 2.4.0)",
};

const failures = [];
const known = [];
let checked = 0;
for (const [entry, target] of Object.entries(pkg.exports ?? {})) {
  const file = typeof target === "string" ? target : target.import;
  if (!file) continue;
  try {
    await import(pathToFileURL(path.join(root, file)).href);
    checked++;
  } catch (err) {
    const reason = String(err?.message ?? err).split("\n")[0];
    if (KNOWN_BROKEN[entry]) {
      known.push(`${entry}: ${KNOWN_BROKEN[entry]}`);
    } else {
      failures.push(`${entry} -> ${file}\n    ${reason}`);
    }
  }
}

for (const k of known) console.warn(`  known issue, not failing: ${k}`);
if (failures.length) {
  console.error(`ESM smoke test FAILED (${failures.length} entry points):`);
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log(`ESM smoke test ok: ${checked} entry points import cleanly from lib/`);
