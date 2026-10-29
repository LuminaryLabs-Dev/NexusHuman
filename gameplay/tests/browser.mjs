import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const origin = process.env.NEXUSHUMAN_TEST_ORIGIN || 'http://127.0.0.1:8000';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', err => errors.push(err.message));
try {
  const response = await page.goto(origin + '/gameplay/', { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200);
  await page.waitForFunction(() => document.querySelector('#progress')?.dataset.ready === 'true', { timeout: 120000 });
  const result = await page.evaluate(() => ({
    bones: Number(document.querySelector('#bones')?.textContent.replaceAll(',', '')),
    joints: Number(document.querySelector('#joints')?.textContent.replaceAll(',', '')),
    actuators: Number(document.querySelector('#actuators')?.textContent.replaceAll(',', '')),
    canvas: !!document.querySelector('#viewport canvas'),
    status: document.querySelector('#progress')?.textContent
  }));
  assert.ok(result.bones > 20, 'Original anatomical meshes must be present');
  assert.ok(result.joints > 50, 'Original articulated joints must be present');
  assert.ok(result.actuators >= 600, 'Full MS-Human-700 actuator definitions must be present');
  assert.ok(result.canvas, 'Three.js WebGL canvas must be active');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyW');
  const distance = await page.locator('#distance').innerText();
  assert.ok(Number(distance) > 0.5, 'Keyboard must produce movement');
  assert.deepEqual(errors, []);
  await mkdir('gameplay/screenshots', { recursive: true });
  await page.screenshot({ path: 'gameplay/screenshots/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'gameplay/screenshots/mobile.png', fullPage: true });
  console.log('PASS Full anatomical load, original bone meshes, joint metadata, WebGL, movement and responsive captures.', result);
} finally {
  await browser.close();
}
