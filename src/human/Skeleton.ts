import type {MuJoCoModel,MuJoCoData} from '../physics/MuJoCoBackend';
export type SkeletonReading={bodyCount:number;jointCount:number;bodyPositions:number[];bodyQuaternions:number[]};
export function readSkeleton(model:MuJoCoModel,data:MuJoCoData):SkeletonReading{
  return {bodyCount:model.nbody,jointCount:model.njnt,bodyPositions:Array.from(data.xpos??[]),bodyQuaternions:Array.from(data.xquat??[])};
}
