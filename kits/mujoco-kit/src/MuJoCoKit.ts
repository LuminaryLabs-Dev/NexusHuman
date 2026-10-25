import { MuJoCoBackend, type MuJoCoModule } from './MuJoCoBackend';
import { loadModel } from './MuJoCoModelLoader';
/** Reusable runtime-independent Kit facade: no anatomical assumptions. */
export async function createMuJoCoKit(factory:()=>Promise<MuJoCoModule>){
 const backend=new MuJoCoBackend(await factory());
 return {id:'nexus.mujoco',backend,async loadManifest(url:string){const model=await loadModel(url);backend.mount(model.files);backend.load(model.entry);return backend.info();},dispose(){backend.dispose();}};
}
