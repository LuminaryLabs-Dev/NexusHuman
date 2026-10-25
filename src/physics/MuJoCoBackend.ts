/**
 * Explicit MuJoCo simulation adapter. This module never approximates muscle physics.
 * Supply a compatible Emscripten-backed mujoco factory from the installed dependency.
 */
export type MuJoCoModule = {
  FS: { mkdir(path:string):void; writeFile(path:string,data:Uint8Array):void };
  MjModel: { loadFromXML(path:string): MuJoCoModel };
  MjData: new(model:MuJoCoModel) => MuJoCoData;
  mj_step(model:MuJoCoModel,data:MuJoCoData):void;
  mj_resetData(model:MuJoCoModel,data:MuJoCoData):void;
  mj_forward(model:MuJoCoModel,data:MuJoCoData):void;
};
export interface MuJoCoModel {
  nq:number; nv:number; nu:number; nbody:number; njnt:number;
  opt:{timestep:number;gravity:Float64Array};
  actuator_gainprm?:Float64Array; geom_friction?:Float64Array;
  delete?():void;
}
export interface MuJoCoData {
  qpos:Float64Array; qvel:Float64Array; ctrl:Float64Array;
  act?:Float64Array; actuator_force?:Float64Array;
  xpos?:Float64Array; xquat?:Float64Array;
  ncon?:number; time:number; delete?():void;
}
export type Snapshot={time:number; qpos:number[]; qvel:number[]; act:number[]; forces:number[]; contacts:number; bodies:number[]; quaternions:number[]};
export class MuJoCoBackend {
  private module:MuJoCoModule;
  model:MuJoCoModel|null=null;
  data:MuJoCoData|null=null;
  constructor(module:MuJoCoModule){this.module=module;}
  mount(files:Record<string,Uint8Array>):void{
    const folders=new Set<string>();
    for(const path of Object.keys(files)){
      if(!path.startsWith('/working/')||path.includes('..'))throw Error('Unsafe model path: '+path);
      const parts=path.split('/').filter(Boolean);let dir='';
      for(const part of parts.slice(0,-1)){dir+='/'+part;folders.add(dir);}
    }
    for(const dir of [...folders].sort((a,b)=>a.length-b.length)){
      try{this.module.FS.mkdir(dir);}catch(e){ /* folder may exist */ }
    }
    for(const [path,bytes] of Object.entries(files))this.module.FS.writeFile(path,bytes);
  }
  load(xmlPath:string):void{
    if(!xmlPath.startsWith('/working/')||!xmlPath.endsWith('.xml'))throw Error('Invalid model path');
    this.dispose();
    this.model=this.module.MjModel.loadFromXML(xmlPath);
    this.data=new this.module.MjData(this.model);
    this.module.mj_forward(this.model,this.data);
  }
  get ready():boolean{return !!this.model&&!!this.data;}
  setControls(activations:readonly number[]):void{
    const {model,data}=this.required();
    if(activations.length!==model.nu)throw Error('Expected '+model.nu+' actuator commands, got '+activations.length);
    activations.forEach((v,i)=>{if(!Number.isFinite(v)||v<0||v>1)throw Error('Activation out of bounds '+i);data.ctrl[i]=v;});
  }
  configure(config:{gravity?:number; timestep?:number}):void{
    const {model}=this.required();
    if(config.gravity!==undefined){if(!Number.isFinite(config.gravity)||config.gravity<0||config.gravity>40)throw Error('Invalid gravity');model.opt.gravity[2]=-config.gravity;}
    if(config.timestep!==undefined){if(!Number.isFinite(config.timestep)||config.timestep<0.00025||config.timestep>0.02)throw Error('Invalid timestep');model.opt.timestep=config.timestep;}
  }
  step(steps=1):Snapshot{
    const {model,data}=this.required();
    if(!Number.isInteger(steps)||steps<1||steps>1000)throw Error('Invalid step count');
    for(let i=0;i<steps;i++)this.module.mj_step(model,data);
    return this.snapshot();
  }
  reset():Snapshot{
    const {model,data}=this.required();this.module.mj_resetData(model,data);this.module.mj_forward(model,data);return this.snapshot();
  }
  snapshot():Snapshot{
    const {data}=this.required();
    return {time:data.time,qpos:Array.from(data.qpos),qvel:Array.from(data.qvel),
      act:Array.from(data.act??[]),forces:Array.from(data.actuator_force??[]),
      contacts:data.ncon??0,bodies:Array.from(data.xpos??[]),quaternions:Array.from(data.xquat??[])};
  }
  info(){const {model}=this.required();return {bodies:model.nbody,joints:model.njnt,actuators:model.nu,positions:model.nq,velocities:model.nv};}
  dispose():void{this.data?.delete?.();this.model?.delete?.();this.data=null;this.model=null;}
  private required(){if(!this.model||!this.data)throw Error('MuJoCo model is not loaded');return {model:this.model,data:this.data};}
}
