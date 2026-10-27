import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, dirname } from 'node:path';

export function safeRelativePath(value) {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('/') &&
    !value.includes('\\') && !value.split('/').includes('..') &&
    !value.split('/').includes('.') && !value.includes('\0') && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
}

export async function validateModelAssets(manifestPath) {
  const root = dirname(resolve(manifestPath));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!manifest || !safeRelativePath(manifest.entry) || !Array.isArray(manifest.files) ||
      manifest.files.length === 0 || !manifest.files.includes(manifest.entry)) {
    throw new Error('Invalid model manifest: entry must be included in files');
  }
  if (!manifest.sha256 || typeof manifest.sha256 !== 'object') throw new Error('SHA-256 map required');
  const files = new Set();
  let totalBytes = 0;
  for (const filename of manifest.files) {
    if (!safeRelativePath(filename)) throw new Error(`Unsafe asset path: ${filename}`);
    if (files.has(filename)) throw new Error(`Duplicate asset: ${filename}`);
    files.add(filename);
    const full = resolve(root, filename);
    if (relative(root, full).startsWith('..')) throw new Error(`Path escaped root: ${filename}`);
    const info = await stat(full);
    if (!info.isFile()) throw new Error(`Not a file: ${filename}`);
    const bytes = await readFile(full);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (!/^[a-fA-F0-9]{64}$/.test(manifest.sha256[filename] ?? '') || hash !== manifest.sha256[filename].toLowerCase()) {
      throw new Error(`SHA-256 mismatch: ${filename}`);
    }
    totalBytes += bytes.byteLength;
  }
  return { id: manifest.id, entry: manifest.entry, fileCount: files.size, totalBytes };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const manifestPath = process.argv[2];
  if (!manifestPath) { console.error('Usage: node scripts/validate-model-assets.mjs <manifest.json>'); process.exitCode = 2; }
  else validateModelAssets(manifestPath).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e.message); process.exitCode = 1; });
}
