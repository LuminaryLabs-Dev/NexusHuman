export type MoveIntent={forward:number;right:number;run:boolean};
export function movementIntent(keys:ReadonlySet<string>):MoveIntent{
 const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
 const right=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
 const norm=Math.max(1,Math.hypot(forward,right));
 return {forward:forward/norm,right:right/norm,run:keys.has('ShiftLeft')||keys.has('ShiftRight')};
}
