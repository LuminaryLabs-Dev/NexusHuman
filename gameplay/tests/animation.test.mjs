import test from 'node:test';
import assert from 'node:assert/strict';
import {AnatomicalGait, anatomicalJointPose, pelvisOffsets} from '../animation.mjs';
function moving(overrides={}){return {heading:0,phase:1,grounded:true,velocity:{x:0,y:2},turnVelocity:0,...overrides};}
function settle(gait,state,n=90){for(let i=0;i<n;i++)gait.update(1/120,state);return gait.snapshot();}
test('neutral standing pose has no turn or gait',()=>{
  const p=settle(new AnatomicalGait(),moving({phase:0,velocity:{x:0,y:0}}));
  assert.equal(p.weight,0);assert.equal(anatomicalJointPose('pelvis_rotation',p),0);assert.equal(anatomicalJointPose('hip_flexion_l',p),0);
});
test('turn distributes motion across pelvis, spine, neck and opposite hips',()=>{
  const p=settle(new AnatomicalGait(),moving({turnVelocity:1.8}));
  assert.ok(p.twist>.05);
  assert.ok(anatomicalJointPose('pelvis_rotation',p)>0);
  assert.ok(anatomicalJointPose('L5_S1_AR',p)<0);
  assert.ok(anatomicalJointPose('T1_head_neck_AR',p)>0);
  assert.ok(anatomicalJointPose('hip_rotation_r',p)>0);
  assert.ok(anatomicalJointPose('hip_rotation_l',p)<0);
});
test('turn in place creates stepping and torso articulation',()=>{
  const p=settle(new AnatomicalGait(),moving({turnVelocity:2,velocity:{x:0,y:0}}));
  assert.ok(p.weight>.25);assert.ok(Math.abs(anatomicalJointPose('pelvis_rotation',p))>0);
});
test('strafe transfers body weight and changes hip adduction',()=>{
  const p=settle(new AnatomicalGait(),moving({velocity:{x:2,y:0}}));
  assert.ok(p.roll>.03);assert.ok(p.shift>.015);
  assert.ok(Math.abs(anatomicalJointPose('hip_adduction_r',p))>0);
});
test('reversing direction blends smoothly',()=>{
  const gait=new AnatomicalGait(),forward=settle(gait,moving());
  const reverse=gait.update(1/120,moving({velocity:{x:0,y:-2}}));
  assert.ok(forward.forward>.5);assert.ok(reverse.forward>0);
  assert.ok(settle(gait,moving({velocity:{x:0,y:-2}})).forward<-.5);
});
test('turns settle back to neutral on stopping',()=>{
  const gait=new AnatomicalGait();settle(gait,moving({turnVelocity:2}));const before=Math.abs(gait.twist);
  const after=settle(gait,moving({turnVelocity:0,velocity:{x:0,y:0}}));
  assert.ok(Math.abs(after.twist)<before/10);
});
test('articulated joint angles are finite and bounded',()=>{
  const p=settle(new AnatomicalGait(),moving({turnVelocity:-2.5,velocity:{x:-3,y:3}}));
  for(const name of ['pelvis_tilt','pelvis_list','pelvis_rotation','L5_S1_FE','T11_T12_LB','L4_L5_AR','T1_head_neck_AR','hip_flexion_r','hip_adduction_l','hip_rotation_r','knee_angle_r','ankle_angle_l','mtp_angle_l','elv_angle_l','shoulder_elv_r','elbow_flexion_l']){
    const a=anatomicalJointPose(name,p);assert.ok(Number.isFinite(a),name);assert.ok(Math.abs(a)<.8,name);
  }
  assert.ok(Number.isFinite(pelvisOffsets(p).up));
});
test('reject invalid frame delta',()=>assert.throws(()=>new AnatomicalGait().update(0,moving()),RangeError));

test('pre-jump compression visibly bends both hips and knees',()=>{
 const gait=new AnatomicalGait();
 let pose;for(let i=0;i<18;i++)pose=gait.update(1/120,moving({phase:0,velocity:{x:0,y:0},jumpStage:'anticipation',jumpTimer:(i+1)/120}));
 assert.ok(pose.jumpCrouch>.45);
 assert.ok(anatomicalJointPose('knee_angle_r',pose)>.45);
 assert.ok(anatomicalJointPose('knee_angle_l',pose)>.45);
 assert.ok(pelvisOffsets(pose).up<-.04);
});
test('airborne pose spreads the legs, tucks knees and lifts arms',()=>{
 const gait=new AnatomicalGait();
 let pose;for(let i=0;i<36;i++)pose=gait.update(1/120,moving({grounded:false,velocity:{x:0,y:0,z:0},jumpStage:'airborne'}));
 assert.ok(pose.jumpSpread>.65);assert.ok(pose.jumpTuck>.5);
 const left=anatomicalJointPose('hip_adduction_l',pose),right=anatomicalJointPose('hip_adduction_r',pose);
 assert.ok(left*right<0,'legs spread in opposite lateral directions');
 assert.ok(anatomicalJointPose('knee_angle_l',pose)>.3);
 assert.ok(anatomicalJointPose('elv_angle_l',pose)>.2);
});
test('landing compresses then eases back toward standing',()=>{
 const gait=new AnatomicalGait();
 let impact;for(let i=0;i<12;i++)impact=gait.update(1/120,moving({velocity:{x:0,y:0},jumpStage:'landing',landingImpact:1,jumpTimer:i/120}));
 assert.ok(impact.landingBend>.25);
 assert.ok(anatomicalJointPose('knee_angle_r',impact)>.15);
 let recovered;for(let i=0;i<120;i++)recovered=gait.update(1/120,moving({velocity:{x:0,y:0},jumpStage:'grounded'}));
 assert.ok(recovered.landingBend<.01);
 assert.ok(Math.abs(pelvisOffsets(recovered).up)<.01);
});
