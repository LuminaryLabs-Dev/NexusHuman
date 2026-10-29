import test from 'node:test';
import assert from 'node:assert/strict';
import {FootTargets,stanceForFoot} from '../foot-ik.mjs';
const state=(overrides={})=>({phase:0,grounded:true,jumpStage:'grounded',speed:1,turnVelocity:0,...overrides});
test('foot targets anchor world space during stance and release in swing',()=>{
 const feet=new FootTargets(),a={x:.1,y:0,z:.065};
 const first=feet.update('r',state(),a);
 const next=feet.update('r',state({phase:.4}),{x:.18,y:.1,z:.14});
 assert.deepEqual(first,next);assert.equal(next.z,.065);
 const swing=feet.update('r',state({phase:5}),{x:.3,y:.2,z:.2});
 assert.equal(swing,null);assert.equal(feet.feet.r.locked,false);
});
test('left and right steps alternate, turn stepping uses the same gait phase',()=>{
 assert.equal(stanceForFoot(0,'r',1,0),true);
 assert.equal(stanceForFoot(0,'l',1,0),true); // both feet overlap during double support
 assert.equal(stanceForFoot(4.4,'r',1,0),false);
 assert.equal(stanceForFoot(4.4,'l',1,0),true);
 assert.equal(stanceForFoot(4.4,'r',0,1),false);
});
test('airborne feet release, landing can acquire both planted targets',()=>{
 const f=new FootTargets();
 assert.ok(f.update('l',state(),{x:0,y:0,z:.1}));
 assert.equal(f.update('l',state({grounded:false,jumpStage:'airborne'}),{x:0,y:0,z:.3}),null);
 assert.ok(f.update('l',state({jumpStage:'landing',phase:4.4}),{x:.1,y:.2,z:.06}));
 assert.equal(f.feet.l.locked,true);
});
test('stance reach limit replants without extreme knee extension',()=>{
 const f=new FootTargets();f.update('r',state(),{x:0,y:0,z:.04});
 const p=f.update('r',state({phase:.2}),{x:.9,y:0,z:.04});
 assert.ok(Math.abs(p.x-.9)<1e-8);assert.equal(p.z,.04);
});
test('idle feet remain planted and reset clears anchors',()=>{
 const f=new FootTargets();
 const p=f.update('r',state({speed:0}),{x:0,y:0,z:.08});
 assert.ok(p);assert.ok(f.update('r',state({speed:0,phase:5.3}),{x:.04,y:0,z:.06}));
 f.reset();assert.equal(f.feet.r.target,null);
});
