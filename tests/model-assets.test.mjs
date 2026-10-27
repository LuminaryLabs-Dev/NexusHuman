import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateModelAssets, safeRelativePath } from '../scripts/validate-model-assets.mjs';

test('reject traversal and URL paths', () => {
  for (const p of ['../x', 'assets/../x', '/absolute', 'C:\\foo', 'http:bad', '', './x']) assert.equal(safeRelativePath(p), false);
  assert.equal(safeRelativePath('assets/mesh.stl'), true);
});

test('validate every asset and its SHA-256, detect tampering', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nexushuman-'));
  try {
    await mkdir(join(dir, 'assets'));
    const assets = { 'model.xml': '<mujoco/>', 'assets/mesh.stl': 'solid mesh\nendsolid mesh' };
    const sha256 = {};
    for (const [path, content] of Object.entries(assets)) {
      await writeFile(join(dir, path), content);
      sha256[path] = createHash('sha256').update(content).digest('hex');
    }
    const manifest = join(dir, 'manifest.json');
    await writeFile(manifest, JSON.stringify({id: 'fixture', entry: 'model.xml', files: Object.keys(assets), sha256}));
    assert.deepEqual(await validateModelAssets(manifest), { id: 'fixture', entry: 'model.xml', fileCount: 2, totalBytes: Buffer.byteLength(assets['model.xml']) + Buffer.byteLength(assets['assets/mesh.stl']) });
    await writeFile(join(dir, 'assets/mesh.stl'), 'tampered');
    await assert.rejects(() => validateModelAssets(manifest), /SHA-256 mismatch/);
  } finally { await rm(dir, {recursive: true, force: true}); }
});
