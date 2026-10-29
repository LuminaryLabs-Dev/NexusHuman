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
  await page.waitForFunction(() => document.querySelector('#progress')?.dataset.ready === 'true', undefined, { timeout: 120000 });
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
  await mkdir('gameplay/screenshots', { recursive: true });
  await page.screenshot({ path: 'gameplay/screenshots/desktop-before-movement.png', fullPage: true });
  await page.keyboard.down('w');
  await page.waitForTimeout(3000);
  await page.keyboard.up('w');
  // Validate anatomical turn in the same browser that loaded the 700-actuator MJCF.
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(2500);
  const turnDegrees = Number(await page.locator('#turn').innerText());
  const gaitActivity = Number(await page.locator('#gait').innerText());
  console.log('Anatomical turn telemetry:', {turnDegrees, gaitActivity});
  assert.ok(turnDegrees > 30, 'Arrow-left must accelerate heading');
  assert.ok(gaitActivity > 10, 'Turn-in-place must trigger a body stepping pose');
  const rig=await page.evaluate(()=>window.NexusHumanDiagnostics());
  assert.equal(rig.ready,true,'model must be fully rigged');
  for(const [name,minimum] of [['pelvis_rotation',0.025],['L5_S1_AR',0.02],['T12_L1_AR',0.01],['T1_head_neck_AR',0.02],['hip_rotation_r',0.02],['hip_rotation_l',0.02]]) {
    assert.ok(rig.angles[name] > minimum,`${name}: actual rig quaternion must articulate during turn`);
  }
  console.log('Rig joint articulation (radians):',rig.angles);
  await page.screenshot({path:'gameplay/screenshots/anatomical-turn.png',fullPage:true});
  await page.keyboard.up('ArrowLeft');
  // Exercise the entire physically staged jump against the real articulated rig.
  const preJumpDistance = Number(await page.locator('#distance').innerText());
  assert.ok(preJumpDistance > 0.5, 'W key must move the character before Reset');
  await page.keyboard.press('r');
  await page.waitForFunction(()=>window.NexusHumanDiagnostics()?.motion?.jumpStage==='grounded',undefined,{timeout:10000});
  const idleFooting=await page.evaluate(()=>window.NexusHumanDiagnostics()?.footIK);
  assert.equal(idleFooting?.chainCount,2,'Both anatomical foot IK chains must be available');
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>window.NexusHumanDiagnostics()?.motion?.jumpStage==='airborne',undefined,{timeout:20000});
  await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.NexusHumanDiagnostics()?.pose?.jumpSpread > .25,undefined,{timeout:20000});
  const airborne=await page.evaluate(()=>window.NexusHumanDiagnostics());
  assert.ok(airborne.motion.height>0,'Jump has physical upward displacement');
  assert.ok(airborne.pose.jumpTuck>.1,'Airborne knees must tuck');
  assert.ok(airborne.angles.knee_angle_r>.08,'Right knee bends in flight');
  assert.ok(airborne.angles.knee_angle_l>.08,'Left knee bends in flight');
  assert.ok(airborne.angles.hip_adduction_r>.02,'Right leg abducts in flight');
  assert.ok(airborne.angles.hip_adduction_l>.02,'Left leg abducts in flight');
  assert.equal(airborne.footIK.locked.r,false,'Right foot must release airborne');
  assert.equal(airborne.footIK.locked.l,false,'Left foot must release airborne');
  console.log('Airborne pose and planting:',{stage:airborne.motion.jumpStage,height:airborne.motion.height,
    spread:airborne.pose.jumpSpread,tuck:airborne.pose.jumpTuck,feet:airborne.footIK,angles:airborne.angles});
  await page.screenshot({path:'gameplay/screenshots/airborne-leg-spread.png',fullPage:true});
  await page.waitForFunction(()=>['landing','grounded'].includes(window.NexusHumanDiagnostics()?.motion?.jumpStage)&&
    window.NexusHumanDiagnostics()?.motion?.grounded,undefined,{timeout:45000});
  const landed=await page.evaluate(()=>window.NexusHumanDiagnostics());
  assert.ok(landed.motion.grounded,'Jump must return to solid floor');
  assert.ok(landed.motion.contacts>=1,'Landing must produce a contact event');
  console.log('Jump recovered:',{stage:landed.motion.jumpStage,contacts:landed.motion.contacts,feet:landed.footIK});
  const distance = await page.locator('#distance').innerText();
  const speed = await page.locator('#speed').innerText();
  const fps = await page.locator('#fps').innerText();
  console.log('Gameplay movement telemetry:', { distance, speed, fps, errors });
  assert.ok(preJumpDistance > 0.5, 'W key must produce movement');
  assert.equal(Number(distance),0,'Reset should clear travel distance');
  assert.deepEqual(errors, []);
  await page.screenshot({ path: 'gameplay/screenshots/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'gameplay/screenshots/mobile.png', fullPage: true });
  console.log('PASS Full anatomical load, original bone meshes, joint metadata, WebGL, movement and responsive captures.', result);
} finally {
  await browser.close();
}
