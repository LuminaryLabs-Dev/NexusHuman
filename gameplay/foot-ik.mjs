// Contact-aware foot targeting and bounded CCD for the existing Three.js MJCF rig.
// The input model remains kinematic; this is NOT a muscle, tendon or force solver.
const TAU=Math.PI*2, clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function stanceForFoot(phase,side,speed=0,turnVelocity=0){
  if(!Number.isFinite(phase)||!['l','r'].includes(side))throw new RangeError('Invalid foot step');
  if(speed<.08&&Math.abs(turnVelocity)<.08)return true;
  const cycle=((phase/TAU+(side==='l'?.5:0))%1+1)%1;
  return cycle<.62;
}
export class FootTargets {
  constructor(){this.reset();}
  reset(){this.feet={l:{locked:false,target:null,floorZ:null},r:{locked:false,target:null,floorZ:null}};}
  update(side,state,position){
    const foot=this.feet[side];if(!foot)throw RangeError('Unknown foot');
    const grounded=!!state.grounded;
    if(foot.floorZ===null&&grounded)foot.floorZ=position.z;
    const lock=grounded && (state.jumpStage==='landing'||stanceForFoot(state.phase,side,state.speed,state.turnVelocity));
    if(!lock){foot.locked=false;foot.target=null;return null;}
    if(!foot.locked||!foot.target){
      foot.target={x:position.x,y:position.y,z:foot.floorZ??position.z};
      foot.locked=true;
    }
    const deviation=Math.hypot(position.x-foot.target.x,position.y-foot.target.y);
    // Avoid violently overextending the knee; replant when a stance is too long.
    if(deviation>.46){foot.target.x=position.x;foot.target.y=position.y;}
    return {...foot.target};
  }
}
export class FootIK {
  constructor(THREE,root,joints,bodies){
    this.THREE=THREE;this.root=root;this.targets=new FootTargets();this.chains={};
    this.error={l:0,r:0};this.locked={l:false,r:false};
    for(const side of ['l','r']){
      const byName=name=>joints.find(j=>j.name===name);
      const chain={
        foot:bodies.get('calcn_'+side)||bodies.get('toes_'+side),
        joints:['ankle_angle_','knee_angle_','hip_flexion_','hip_adduction_'].map(s=>byName(s+side)).filter(Boolean)
      };
      if(chain.foot&&chain.joints.length>=3)this.chains[side]=chain;
    }
    this.goal=new THREE.Vector3();
    this.end=new THREE.Vector3();
    this.pivot=new THREE.Vector3();
    this.axis=new THREE.Vector3();
    this.toEnd=new THREE.Vector3();
    this.toGoal=new THREE.Vector3();
    this.quaternion=new THREE.Quaternion();
    this.cross=new THREE.Vector3();
  }
  reset(){this.targets.reset();this.error={l:0,r:0};this.locked={l:false,r:false};}
  update(pose,state){
    this.root.updateMatrixWorld(true);
    for(const side of ['l','r']){
      const chain=this.chains[side];if(!chain)continue;
      chain.foot.getWorldPosition(this.end);
      const target=this.targets.update(side,state,this.end);
      this.locked[side]=!!target;
      if(!target){this.error[side]=0;continue;}
      this.goal.set(target.x,target.y,target.z);
      // Do not distort an idle standing pose; use IK while moving, crouching or landing.
      const active=(state.speed>.09||Math.abs(state.turnVelocity)>.1||pose.jumpCrouch>.02||pose.landingBend>.02);
      if(active)for(let pass=0;pass<2;pass++)for(const joint of chain.joints){
        joint.hinge.getWorldPosition(this.pivot);
        chain.foot.getWorldPosition(this.end);
        this.toEnd.copy(this.end).sub(this.pivot);
        this.toGoal.copy(this.goal).sub(this.pivot);
        joint.hinge.parent.getWorldQuaternion(this.quaternion);
        this.axis.copy(joint.axis).applyQuaternion(this.quaternion).normalize();
        this.toEnd.addScaledVector(this.axis,-this.toEnd.dot(this.axis));
        this.toGoal.addScaledVector(this.axis,-this.toGoal.dot(this.axis));
        if(this.toEnd.lengthSq()<1e-7||this.toGoal.lengthSq()<1e-7)continue;
        this.toEnd.normalize();this.toGoal.normalize();
        const sine=this.axis.dot(this.cross.crossVectors(this.toEnd,this.toGoal));
        const cosine=clamp(this.toEnd.dot(this.toGoal),-1,1);
        const change=clamp(Math.atan2(sine,cosine)*.64,-.13,.13);
        joint.currentAngle=clamp((joint.currentAngle||0)+change,joint.min,joint.max);
        joint.hinge.quaternion.setFromAxisAngle(joint.axis,joint.currentAngle);
        this.root.updateMatrixWorld(true);
      }
      chain.foot.getWorldPosition(this.end);
      this.error[side]=this.end.distanceTo(this.goal);
    }
  }
  diagnostics(){return {locked:{...this.locked},error:{...this.error},chainCount:Object.keys(this.chains).length};}
}
