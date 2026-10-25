import type { MuJoCoBackend } from './MuJoCoBackend';
/** Fixed-step adapter for Nexus tick participants. Requires actual MuJoCo. */
export class MuJoCoProvider {
 constructor(private readonly backend:MuJoCoBackend){}
 step(dt:number){const timestep=this.backend.model?.opt.timestep;if(!timestep)throw Error('No MuJoCo model loaded');if(!Number.isFinite(dt)||dt<=0||dt>1)throw Error('Bad delta');const steps=Math.round(dt/timestep);if(steps<1||Math.abs(steps*timestep-dt)>1e-6)throw Error('Delta is not divisible by fixed timestep');return this.backend.step(steps);}
 getFrame(){return this.backend.snapshot();}
 reset(){return this.backend.reset();}
}
