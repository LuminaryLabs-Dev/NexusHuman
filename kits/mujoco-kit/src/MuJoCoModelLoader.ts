/** Loads an MJCF manifest and all referenced local assets into MuJoCo MEMFS. */
export interface ModelManifest {id:string; entry:string; files:string[]; sha256?:Record<string,string>;}
export type LoadedModel={entry:string; files:Record<string,Uint8Array>};
function safe(path:string):boolean{return !!path&&!path.startsWith('/')&&!path.includes('..')&&!path.includes('\\')&&!/^[a-z]+:/i.test(path);}
export async function loadModel(manifestUrl:string,signal?:AbortSignal):Promise<LoadedModel>{
  const response=await fetch(manifestUrl,{signal});if(!response.ok)throw Error('Manifest HTTP '+response.status);
  const manifest=await response.json() as ModelManifest;
  if(!safe(manifest.entry)||!Array.isArray(manifest.files)||!manifest.files.includes(manifest.entry))throw Error('Invalid model manifest');
  const base=new URL('.',response.url);const files:Record<string,Uint8Array>={};
  for(const path of manifest.files){
    if(!safe(path))throw Error('Unsafe asset: '+path);
    const url=new URL(path,base);if(url.origin!==base.origin)throw Error('Cross-origin model asset');
    const asset=await fetch(url,{signal});if(!asset.ok)throw Error('Asset '+path+' HTTP '+asset.status);
    const bytes=new Uint8Array(await asset.arrayBuffer());
    const expected=manifest.sha256?.[path];
    if(expected){
      const digest=await crypto.subtle.digest('SHA-256',bytes);
      const hex=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
      if(hex.toLowerCase()!==expected.toLowerCase())throw Error('SHA-256 mismatch: '+path);
    }
    files['/working/'+path]=bytes;
  }
  return {entry:'/working/'+manifest.entry,files};
}
