import type {MuJoCoModel,MuJoCoData} from '../physics/MuJoCoBackend';
export type MuscleReading={actuatorCount:number;commands:number[];activationState:number[];forces:number[]};
export function readMuscles(model:MuJoCoModel,data:MuJoCoData):MuscleReading{
  return {actuatorCount:model.nu,commands:Array.from(data.ctrl),activationState:Array.from(data.act??[]),forces:Array.from(data.actuator_force??[])};
}
