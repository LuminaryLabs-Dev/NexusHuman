import type {MoveIntent} from './InputController';
/** Real locomotion requires a pretrained policy or validated feedback controller.
 * Until a compatible policy is installed, movement is deliberately unsupported. */
export interface LocomotionPolicy{readonly actuatorCount:number;compute(intent:MoveIntent,observation:Float32Array):Float32Array}
export class LocomotionController{
 constructor(private readonly policy:LocomotionPolicy|null){}
 get available(){return this.policy!==null;}
 evaluate(intent:MoveIntent,observation:Float32Array,nu:number):number[]{
  if(!this.policy)throw Error('No validated muscle locomotion policy installed');
  if(this.policy.actuatorCount!==nu)throw Error('Incompatible locomotion policy');
  const controls=Array.from(this.policy.compute(intent,observation));
  if(controls.length!==nu||controls.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('Policy output is invalid');
  return controls;
 }
}
