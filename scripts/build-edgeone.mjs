import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'deploy');
const excluded = new Set(['.git', 'deploy', 'scripts']);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name)) continue;
  await cp(resolve(root, entry.name), resolve(output, entry.name), { recursive: true });
}

console.log('Prepared EdgeOne deployment output with optimized car-explorer assets.');
