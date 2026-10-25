import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);const html=await readFile(new URL('index.html',root),'utf8');
if(!html.includes('PROCEDURAL PREVIEW'))throw Error('Expected root fallback preview; refusing replacement');
await writeFile(new URL('.nojekyll',root),'\n');
console.log('Validated existing root static preview; true MuJoCo release not ready.');
