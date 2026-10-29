import * as THREE from './vendor/three.module.min.js';
import { GameplayMotion, anatomicalFacingYaw, cameraFollowOffset } from './motion.mjs?v=anatomical-turn-1';
import { AnatomicalGait, anatomicalJointPose, pelvisOffsets } from './animation.mjs?v=anatomical-turn-1';

const $ = (id) => document.getElementById(id);
const MODEL_BASE = new URL('../assets/models/ms-human-700/', import.meta.url);
const MODEL_URL = new URL('MS-Human-700.xml', MODEL_BASE);
const readVec = (value, fallback='0 0 0') => (value || fallback).trim().split(/\s+/).map(Number);
const quatOf = (value) => { const [w,x,y,z]=readVec(value,'1 0 0 0'); return new THREE.Quaternion(x,y,z,w).normalize(); };
const vec3 = (value) => {const a=readVec(value);return new THREE.Vector3(a[0],a[1],a[2]);};
const xmlCache=new Map();
async function fetchXml(url) {
  const key=url.href;
  if(!xmlCache.has(key)) xmlCache.set(key,(async()=>{
    const response=await fetch(url);if(!response.ok)throw Error(`MJCF ${url.pathname}: HTTP ${response.status}`);
    const doc=new DOMParser().parseFromString(await response.text(),'text/xml');
    if(doc.querySelector('parsererror'))throw Error(`Invalid MJCF XML: ${url.pathname}`);
    return doc;
  })());
  return xmlCache.get(key);
}
async function expandIncludes(node, base, rootDoc, depth=0) {
  if(depth>24)throw Error('Excessive MJCF include depth');
  for(const child of [...node.children]) {
    if(child.localName==='include') {
      const file=child.getAttribute('file');if(!file)throw Error('Missing MJCF include path');
      const next=new URL(file,base);
      if(next.origin!==MODEL_BASE.origin||!next.pathname.startsWith(MODEL_BASE.pathname))throw Error('MJCF include escaped model directory');
      const included=await fetchXml(next);
      const fragment=rootDoc.createDocumentFragment();
      for(const entry of included.documentElement.children) {
        const clone=rootDoc.importNode(entry,true);
        if(clone.matches?.('mesh'))clone.setAttribute('data-source',next.href);
        clone.querySelectorAll?.('mesh').forEach(m=>m.setAttribute('data-source',next.href));
        await expandIncludes(clone,next,rootDoc,depth+1);
        fragment.appendChild(clone);
      }
      child.replaceWith(fragment);
    } else await expandIncludes(child,base,rootDoc,depth);
  }
}
function parseStl(buffer) {
  const view=new DataView(buffer);
  if(buffer.byteLength>=84) {
    const count=view.getUint32(80,true);
    if(count>0&&count<=1500000&&84+count*50===buffer.byteLength) {
      const vertices=new Float32Array(count*9),normals=new Float32Array(count*9);
      let offset=84;
      for(let i=0;i<count;i++) {
        const n=[view.getFloat32(offset,true),view.getFloat32(offset+4,true),view.getFloat32(offset+8,true)];offset+=12;
        for(let v=0;v<3;v++) {
          for(let j=0;j<3;j++) {vertices[i*9+v*3+j]=view.getFloat32(offset,true);normals[i*9+v*3+j]=n[j];offset+=4;}
        }
        offset+=2;
      }
      const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(vertices,3));geom.setAttribute('normal',new THREE.BufferAttribute(normals,3));
      return geom;
    }
  }
  const text=new TextDecoder().decode(buffer);
  const values=[...text.matchAll(/vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/g)].flatMap(m=>[+m[1],+m[2],+m[3]]);
  if(values.length<9)throw Error('Unrecognized STL mesh');
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(values,3));geom.computeVertexNormals();return geom;
}
function parseObj(buffer) {
  const text=new TextDecoder().decode(buffer),points=[],triangles=[];
  for(const line of text.split(/\r?\n/)){
    if(line.startsWith('v ')){const v=readVec(line.slice(2));points.push(v);}
    else if(line.startsWith('f ')){
      const face=line.slice(2).trim().split(/\s+/).map(token=>{
        const i=Number(token.split('/')[0]);return i<0?points.length+i:i-1;
      });
      for(let k=1;k<face.length-1;k++)for(const idx of [face[0],face[k],face[k+1]]){
        const p=points[idx];if(!p)throw Error('Invalid OBJ vertex reference');triangles.push(...p.slice(0,3));
      }
    }
  }
  if(!triangles.length)throw Error('OBJ contains no triangles');
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(triangles,3));geom.computeVertexNormals();return geom;
}
const geometryCache=new Map();
async function loadGeometry(url, scale) {
  const key=url.href+'|'+scale.join(',');
  if(!geometryCache.has(key))geometryCache.set(key,(async()=>{
    const response=await fetch(url);if(!response.ok)throw Error(`Mesh ${url.pathname}: HTTP ${response.status}`);
    const bytes=await response.arrayBuffer();
    const geometry=url.pathname.toLowerCase().endsWith('.obj')?parseObj(bytes):parseStl(bytes);
    geometry.scale(scale[0],scale[1],scale[2]);geometry.computeBoundingSphere();return geometry;
  })());
  return geometryCache.get(key);
}
const obstacleDefs=[{x:-2,y:2,radius:.53,height:1.2},{x:2,y:3,radius:.65,height:1.4},{x:0,y:5,radius:.45,height:.8}];
const motion=new GameplayMotion({obstacles:obstacleDefs});
const gait=new AnatomicalGait();
let currentPose=gait.snapshot();
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.setClearColor(0x0b1926);
renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('viewport').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b1926);scene.fog=new THREE.Fog(0x0b1926,12,45);
const camera=new THREE.PerspectiveCamera(50,1,.05,90);camera.up.set(0,0,1);
scene.add(new THREE.HemisphereLight(0xc7edff,0x233e4c,2));
const sun=new THREE.DirectionalLight(0xfff0d5,2.4);sun.position.set(5,-3,9);sun.castShadow=true;sun.shadow.mapSize.set(512,512);
sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:0x173b43,roughness:.93,metalness:0.05}));floor.receiveShadow=true;floor.position.z=-.016;scene.add(floor);
const grid=new THREE.GridHelper(60,60,0x3d8f8e,0x24535d);grid.rotation.x=Math.PI/2;grid.position.z=.002;scene.add(grid);
const obstacles=[];
for(const ob of obstacleDefs){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(ob.radius,ob.radius,ob.height,20),new THREE.MeshStandardMaterial({color:0x397e8b,roughness:.52}));mesh.rotation.x=Math.PI/2;mesh.position.set(ob.x,ob.y,ob.height/2);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);obstacles.push(mesh);}
const modelRoot=new THREE.Group();scene.add(modelRoot);
const boneMaterial=new THREE.MeshStandardMaterial({color:0xe7c8a5,roughness:.72,metalness:.06,side:THREE.DoubleSide});
const skinMaterial=new THREE.MeshStandardMaterial({color:0xdba992,transparent:true,opacity:.18,roughness:.8,depthWrite:false,side:THREE.DoubleSide});
const joints=[], meshJobs=[];
// Read-only rig diagnostics for automated browser acceptance and game integration.
window.NexusHumanDiagnostics=()=>{
  const names=['pelvis_rotation','L5_S1_AR','T12_L1_AR','T1_head_neck_AR','hip_rotation_r','hip_rotation_l'];
  const angles=Object.fromEntries(names.map(name=>{
    const joint=joints.find(j=>j.name===name);
    if(!joint)return [name,null];
    const w=Math.max(-1,Math.min(1,Math.abs(joint.hinge.quaternion.w)));
    return [name,2*Math.acos(w)];
  }));
  return {ready:modelReady,turnVelocity:motion.turnVelocity,pose:currentPose,angles};
};
let boneCount=0, actuatorCount=0, modelReady=false;
function buildBody(node,parent,meshes) {
  const body=new THREE.Group();body.name=node.getAttribute('name')||'body';body.position.copy(vec3(node.getAttribute('pos')));body.quaternion.copy(quatOf(node.getAttribute('quat')));parent.add(body);
  let current=body;
  for(const child of [...node.children])if(child.localName==='joint'&&child.getAttribute('type')!=='slide') {
    const pivot=vec3(child.getAttribute('pos'));
    const hinge=new THREE.Group();hinge.position.copy(pivot);current.add(hinge);
    const next=new THREE.Group();next.position.copy(pivot).multiplyScalar(-1);hinge.add(next);current=next;
    const axis=vec3(child.getAttribute('axis')||'0 0 1').normalize();
    const range=readVec(child.getAttribute('range'),'-3.14 3.14');
    joints.push({name:child.getAttribute('name')||'',hinge,axis,min:range[0],max:range[1]});
  }
  for(const child of [...node.children]){
    if(child.localName==='body')buildBody(child,current,meshes);
    if(child.localName==='geom'&&child.getAttribute('class')==='skin'){
      const size=readVec(child.getAttribute('size'),'0.05 0.12');
      if(Number.isFinite(size[0])&&Number.isFinite(size[1])&&size[0]>0&&size[1]>0){
        const shape=new THREE.CapsuleGeometry(size[0],2*size[1],5,10);shape.rotateX(Math.PI/2);
        const overlay=new THREE.Mesh(shape,skinMaterial);
        overlay.position.copy(vec3(child.getAttribute('pos')));
        overlay.quaternion.copy(quatOf(child.getAttribute('quat')));
        current.add(overlay);
      }
    }
    if(child.localName==='geom'&&child.getAttribute('type')==='mesh'){
      const definition=meshes.get(child.getAttribute('mesh'));if(!definition)throw Error('Missing named anatomical mesh: '+child.getAttribute('mesh'));
      const obj=new THREE.Mesh(new THREE.BufferGeometry(),boneMaterial);obj.name=child.getAttribute('name')||child.getAttribute('mesh');obj.position.copy(vec3(child.getAttribute('pos')));obj.quaternion.copy(quatOf(child.getAttribute('quat')));obj.castShadow=true;obj.receiveShadow=true;current.add(obj);boneCount++;
      meshJobs.push(async()=>{obj.geometry=await loadGeometry(definition.url,definition.scale);});
    }
  }
}
async function loadModel() {
  $('progress').textContent='Reading MS-Human-700 MJCF hierarchy…';
  const doc=await fetchXml(MODEL_URL);
  await expandIncludes(doc.documentElement,MODEL_URL,doc);
  const defs=new Map();
  doc.querySelectorAll('asset > mesh').forEach(node=>{
    const name=node.getAttribute('name'),file=node.getAttribute('file');if(!name||!file)return;
    const source=node.getAttribute('data-source')||MODEL_URL.href;
    const url=new URL(file,source);
    if(url.origin!==MODEL_BASE.origin||!url.pathname.startsWith(MODEL_BASE.pathname))throw Error('Mesh escaped anatomical model directory');
    defs.set(name,{url,scale:readVec(node.getAttribute('scale'),'1 1 1')});
  });
  actuatorCount=doc.querySelectorAll('actuator > general, actuator > muscle, actuator > motor').length;
  const world=doc.querySelector('worldbody');if(!world)throw Error('Missing MJCF worldbody');
  for(const node of [...world.children])if(node.localName==='body')buildBody(node,modelRoot,defs);
  $('joints').textContent=joints.length.toLocaleString();$('bones').textContent=boneCount.toLocaleString();$('actuators').textContent=actuatorCount.toLocaleString();
  if(actuatorCount<600)throw Error('Expected full anatomical model; only '+actuatorCount+' actuators discovered');
  const maxConcurrent=5;let cursor=0,loaded=0;
  await Promise.all(Array.from({length:maxConcurrent},async()=>{
    while(cursor<meshJobs.length){const i=cursor++;await meshJobs[i]();loaded++;$('progress').textContent=`Loading original bone meshes ${loaded}/${meshJobs.length}…`;}
  }));
  if(!boneCount)throw Error('No anatomical bone geometry loaded');
  modelReady=true;
  $('progress').textContent=`Ready · ${boneCount} anatomical meshes · ${actuatorCount} actuator definitions (not simulated muscles)`;
  $('progress').dataset.ready='true';
}
const pressed=new Set();let paused=false,orbitYaw=0,orbitElevation=.22,orbitDistance=3.6,drag=null;
addEventListener('keydown',ev=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;pressed.add(ev.code);if(['Space','ArrowLeft','ArrowRight'].includes(ev.code))ev.preventDefault();if(ev.code==='KeyR'){motion.reset();gait.reset();currentPose=gait.snapshot();}if(ev.code==='KeyP'&&!ev.repeat)togglePause();});
addEventListener('keyup',ev=>pressed.delete(ev.code));addEventListener('blur',()=>pressed.clear());
renderer.domElement.addEventListener('pointerdown',ev=>{drag={x:ev.clientX,y:ev.clientY};renderer.domElement.setPointerCapture(ev.pointerId);});
renderer.domElement.addEventListener('pointermove',ev=>{if(!drag)return;orbitYaw+=(ev.clientX-drag.x)*.007;orbitElevation=Math.max(-.45,Math.min(1.2,orbitElevation+(ev.clientY-drag.y)*.005));drag={x:ev.clientX,y:ev.clientY};});
renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('pointercancel',()=>drag=null);
renderer.domElement.addEventListener('wheel',ev=>{orbitDistance=Math.max(1.4,Math.min(10,orbitDistance*(1+Math.sign(ev.deltaY)*.08)));ev.preventDefault();},{passive:false});
function togglePause(){paused=!paused;$('pause').textContent=paused?'Resume':'Pause';}
$('pause').onclick=togglePause;$('reset').onclick=()=>{motion.reset();gait.reset();currentPose=gait.snapshot();};
function updateSize(){const w=$('viewport').clientWidth,h=$('viewport').clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(updateSize).observe($('viewport'));updateSize();
let last=performance.now(),accumulator=0,frames=0,sampleStart=last;
function frame(now){
  const dt=Math.min(.06,(now-last)/1000);last=now;
  if(!paused&&modelReady){
    accumulator+=dt;let n=0;
    while(accumulator>=1/120&&n<8){const step=motion.step(1/120,{forward:pressed.has('KeyW'),backward:pressed.has('KeyS'),left:pressed.has('KeyA'),right:pressed.has('KeyD'),run:pressed.has('ShiftLeft')||pressed.has('ShiftRight'),jump:pressed.has('Space'),turnLeft:pressed.has('ArrowLeft'),turnRight:pressed.has('ArrowRight')});currentPose=gait.update(1/120,step);accumulator-=1/120;n++;}
    if(n===8)accumulator=0;
  }
  if(modelReady){const state=motion.snapshot();
    const pelvis=pelvisOffsets(currentPose);
    // Transfer body weight sideways relative to the character's heading.
    modelRoot.position.set(state.position.x+Math.cos(state.heading)*pelvis.side,state.position.y-Math.sin(state.heading)*pelvis.side,state.position.z+pelvis.up);
    modelRoot.rotation.z=anatomicalFacingYaw(state.heading);
    for(const j of joints){const angle=Math.max(j.min,Math.min(j.max,anatomicalJointPose(j.name,currentPose)));j.hinge.quaternion.setFromAxisAngle(j.axis,angle);}
    const pivot=new THREE.Vector3(state.position.x,state.position.y,state.position.z+.9);
    const flat=orbitDistance*Math.cos(orbitElevation);
    const follow=cameraFollowOffset(state.heading,orbitYaw,flat);
    camera.position.set(pivot.x+follow.x,pivot.y+follow.y,pivot.z+orbitDistance*Math.sin(orbitElevation)+.4);
    camera.lookAt(pivot);
    $('speed').textContent=state.speed.toFixed(1);$('distance').textContent=state.distance.toFixed(1);$('contact').textContent=state.contacts.toLocaleString();
    if($('turn'))$('turn').textContent=(state.turnVelocity*180/Math.PI).toFixed(0);
    if($('gait'))$('gait').textContent=(currentPose.weight*100).toFixed(0);
  }
  renderer.render(scene,camera);frames++;
  if(now-sampleStart>=500){$('fps').textContent=Math.round(frames*1000/(now-sampleStart));sampleStart=now;frames=0;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
loadModel().catch(err=>{console.error(err);$('progress').textContent='Model load failed: '+err.message;$('progress').dataset.ready='false';});
