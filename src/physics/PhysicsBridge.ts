import type {Snapshot} from './MuJoCoBackend';
export interface BodyTransform{position:[number,number,number];quaternion:[number,number,number,number]}
export function getBodyTransform(snapshot:Snapshot,index:number):BodyTransform{
  const p=index*3,q=index*4;
  if(snapshot.bodies.length<p+3||snapshot.quaternions.length<q+4)throw Error('Body '+index+' unavailable');
  // MuJoCo quaternions are w,x,y,z; most web renderers accept x,y,z,w.
  return {position:[snapshot.bodies[p],snapshot.bodies[p+1],snapshot.bodies[p+2]],quaternion:[snapshot.quaternions[q+1],snapshot.quaternions[q+2],snapshot.quaternions[q+3],snapshot.quaternions[q]]};
}
