// Authored anatomical pose controller for gameplay, NOT muscle-force simulation.
// Ranges are conservative; the browser renderer applies the MJCF joint limits.
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const smooth = (from,to,response,dt) => from+(to-from)*(1-Math.exp(-response*dt));
const TAU=Math.PI*2;
function stepCycle(phase,side) {
  const cycle=((phase/TAU+(side==='l'?0.5:0))%1+1)%1;
  const stance=cycle<0.62;
  const swing=stance?0:Math.sin(Math.PI*(cycle-0.62)/0.38)**2;
  return {cycle,stance,swing,wave:Math.sin(TAU*cycle)};
}
export class AnatomicalGait {
  constructor(){this.reset();}
  reset(){
    this.speed=0;this.forward=0;this.lateral=0;this.turn=0;this.weight=0;
    this.bob=0;this.shift=0;this.pitch=0;this.roll=0;this.twist=0;
    this.phase=0;this.grounded=true;this.activity=0;
  }
  update(dt,state){
    if(!Number.isFinite(dt)||dt<=0||dt>0.2)throw new RangeError('Invalid animation delta');
    const h=state.heading||0,vx=state.velocity?.x||0,vy=state.velocity?.y||0;
    const f=vx*Math.sin(h)+vy*Math.cos(h),l=vx*Math.cos(h)-vy*Math.sin(h);
    const turn=clamp(state.turnVelocity||0,-2.5,2.5);
    this.forward=smooth(this.forward,clamp(f/2.5,-1.7,1.7),6,dt);
    this.lateral=smooth(this.lateral,clamp(l/2.5,-1.7,1.7),6,dt);
    this.turn=smooth(this.turn,turn/2.5,8,dt);
    this.speed=smooth(this.speed,Math.hypot(vx,vy),8,dt);
    const target=clamp(this.speed/2.8+Math.abs(this.turn)*0.42,0,1);
    this.weight=smooth(this.weight,state.grounded?target:target*0.35,7,dt);
    this.activity=this.weight;this.phase=Number.isFinite(state.phase)?state.phase:this.phase;
    this.grounded=!!state.grounded;
    this.bob=smooth(this.bob,this.grounded?this.weight*(0.013-0.012*Math.cos(this.phase*2)):0,10,dt);
    this.shift=smooth(this.shift,this.weight*0.017*Math.sin(this.phase)+0.025*this.lateral,8,dt);
    this.pitch=smooth(this.pitch,clamp(0.02+0.045*this.forward,-0.07,0.13)*this.weight,6,dt);
    this.roll=smooth(this.roll,clamp(0.075*this.lateral+0.11*this.turn,-0.18,0.18)*this.weight,7,dt);
    this.twist=smooth(this.twist,clamp(this.turn*0.23+this.lateral*0.08,-0.30,0.30),7,dt);
    return this.snapshot();
  }
  snapshot(){return {speed:this.speed,forward:this.forward,lateral:this.lateral,turn:this.turn,weight:this.weight,activity:this.activity,bob:this.bob,shift:this.shift,pitch:this.pitch,roll:this.roll,twist:this.twist,phase:this.phase,grounded:this.grounded};}
}
export function anatomicalJointPose(name,pose){
  const side=/(?:_l|_L)(?:$|_)/.test(name)?'l':'r',sign=side==='l'?-1:1;
  const {wave,swing}=stepCycle(pose.phase,side);
  const move=clamp(pose.weight,0,1),direction=pose.forward<-.12?-.7:1;
  const hipWave=wave*move*direction,sway=pose.lateral*.08,turnStep=pose.turn*.10;
  if(name==='pelvis_tilt')return pose.pitch*.60;
  if(name==='pelvis_list')return pose.roll*.70+Math.sin(pose.phase)*.015*move;
  if(name==='pelvis_rotation')return pose.twist*.45;
  if(name==='L5_S1_AR')return -pose.twist*.42;
  if(name==='T12_L1_AR')return -pose.twist*.34;
  if(/^(?:L[1-5]_L[1-5]|T\d+_T\d+)_AR$/.test(name))return -pose.twist*.048;
  if(/^(?:L[1-5]_L[1-5]|L5_S1|T\d+_T\d+|T12_L1)_LB$/.test(name))return -pose.roll*.055;
  if(/^(?:L[1-5]_L[1-5]|L5_S1|T\d+_T\d+|T12_L1)_FE$/.test(name))return pose.pitch*.043;
  if(name==='T1_head_neck_AR')return pose.twist*.42;
  if(name==='T1_head_neck_LB')return -pose.roll*.22;
  if(name==='T1_head_neck_FE')return -pose.pitch*.38;
  if(/^hip_flexion_[rl]$/.test(name))return hipWave*.43+(!pose.grounded?.12:0);
  if(/^hip_adduction_[rl]$/.test(name))return sign*(sway+Math.sin(pose.phase+(side==='l'?Math.PI:0))*.018*move);
  if(/^hip_rotation_[rl]$/.test(name))return sign*(pose.twist*.38+turnStep);
  if(/^knee_angle_[rl]$/.test(name))return move*(.055+swing*.64+Math.max(0,-wave)*.09);
  if(/^ankle_angle_[rl]$/.test(name))return (-hipWave*.22+swing*.20)*move;
  if(/^mtp_angle_[rl]$/.test(name))return move*(swing*.12+Math.max(0,wave)*.08);
  if(/^elv_angle_[rl]$/.test(name))return -hipWave*.22+sign*pose.twist*.20;
  if(/^shoulder_elv_[rl]$/.test(name))return move*.09;
  if(/^shoulder_rot_[rl]$/.test(name))return sign*pose.twist*-.23;
  if(/^elbow_flexion_[rl]$/.test(name))return move*(.13+Math.max(0,-wave)*.17);
  return 0;
}
export function pelvisOffsets(pose){return {side:pose.shift,up:pose.bob,lean:pose.roll,turn:pose.twist};}
