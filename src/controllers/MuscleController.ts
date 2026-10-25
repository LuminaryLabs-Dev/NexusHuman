/** Controls real MuJoCo actuators. No procedural skeleton fallback. */
export function validateMuscleCommands(commands:readonly number[],expected:number):number[]{
 if(commands.length!==expected)throw Error('Controller actuator count mismatch');
 return commands.map(v=>{if(!Number.isFinite(v))throw Error('Invalid actuator value');return Math.max(0,Math.min(1,v));});
}
