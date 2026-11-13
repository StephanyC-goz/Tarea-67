import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createSceneModel } from './scene-models.js';
import { buildPiramideSENATI } from './piramide-senati.js';
import {ev52DeskPositions,pyramidScale,DEFAULT_PYRAMID_WIDTH,DEFAULT_PYRAMID_DEPTH,DEFAULT_LEVEL_HEIGHT} from './ev52-layout.js';
import { NavigationGrid, findExitInfo } from './navigation.js';

const $ = (id) => document.getElementById(id);
const stage = $('sim-stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeaf0f7);
const camera = new THREE.PerspectiveCamera(50, 1, .1, 500);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
stage.appendChild(renderer.domElement);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = .07;
orbit.maxPolarAngle = Math.PI * .49;
const walkControls = new PointerLockControls(camera, renderer.domElement);
const walkKeys = {forward:false,backward:false,left:false,right:false};
let walking = false, walkSaved = null;
let walkFloorLevel=0, walkOnStairs=false, walkNavLower=null, walkNavUpper=null;
const WALK_EYE_HEIGHT=1.65;

const hemi = new THREE.HemisphereLight(0xf6f9ff,0x65758a,1.7);scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff8ed,2.2);
sun.position.set(-12,22,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
const fill = new THREE.DirectionalLight(0xb8d9ff,.75);fill.position.set(12,10,-12);scene.add(fill);

const roomGroup = new THREE.Group();
const furniture = new THREE.Group();
const peopleGroup = new THREE.Group();
const routeGroup = new THREE.Group();
const incidentGroup = new THREE.Group();
scene.add(roomGroup,furniture,peopleGroup,routeGroup,incidentGroup);
const mat = (color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
let roomWidth=20, roomDepth=12, roomHeight=3.35;
let appearance={floorType:'tile',floorColor:'#f2f4f7',wallColor:'#f1f3f6',deskColor:'#1559a8',chairColor:'#202a38'};
let roofVisible=false,gridVisible=false;
let people=[], savedObjects=[], loadedScenario=null, running=false, evacuating=false, elapsed=0;
let incidentMarker=null, navGrid=null, exitInfo=null, routesVisible=true, earthquakePhase=0;
let fanRotors=[];
let movementLog=[];
let rainPoints=null;
function applyClimate(mode){
 appearance.climate=mode||'day';
 const night=appearance.climate==='night',rain=appearance.climate==='rain';
 scene.background=new THREE.Color(night?0x101a30:(rain?0x8998aa:0xeaf0f7));
 hemi.intensity=night?.42:(rain?.95:1.7);
 sun.intensity=night?.12:(rain?.72:2.2);
 fill.intensity=night?.22:(rain?.42:.75);
 sun.color.set(night?0x9bb8e8:(rain?0xcbd8e8:0xfff8ed));
 if(rain&&!rainPoints){
  const positions=new Float32Array(1200*3);
  for(let i=0;i<1200;i++){positions[i*3]=(Math.random()-.5)*roomWidth*1.8;positions[i*3+1]=Math.random()*10;positions[i*3+2]=(Math.random()-.5)*roomDepth*1.8;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  rainPoints=new THREE.Points(geo,new THREE.PointsMaterial({color:0xd9eaff,size:.045,transparent:true,opacity:.7}));scene.add(rainPoints);
 }
 if(rainPoints)rainPoints.visible=rain;
}

let floorMesh=null, gridHelper=null, roofMesh=null;

function disposeTree(root){
 root.traverse?.(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m?.dispose());else o.material?.dispose();});
}
function clearGroup(group){
 while(group.children.length){const child=group.children[0];group.remove(child);disposeTree(child);}
}
function addBox(parent,w,h,d,material,x,y,z){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function makeFloorTexture(type,colorHex,width,depth){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
 const ctx=canvas.getContext('2d');const color=colorHex||'#f3f4f6';
 const c=new THREE.Color(color);const lighter='#'+c.clone().lerp(new THREE.Color(0xffffff),.13).getHexString();
 const darker='#'+c.clone().lerp(new THREE.Color(0x000000),.10).getHexString();
 ctx.fillStyle=color;ctx.fillRect(0,0,512,512);
 if(type==='tile'){
  ctx.fillStyle=lighter;ctx.fillRect(0,0,256,256);ctx.fillRect(256,256,256,256);
  ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(256,0,256,256);ctx.fillRect(0,256,256,256);
  ctx.strokeStyle='rgba(115,128,144,.22)';ctx.lineWidth=3;ctx.strokeRect(2,2,508,508);ctx.beginPath();ctx.moveTo(256,0);ctx.lineTo(256,512);ctx.moveTo(0,256);ctx.lineTo(512,256);ctx.stroke();
 }else if(type==='wood'){
  for(let y=0;y<512;y+=64){ctx.fillStyle=(y/64)%2?lighter:darker;ctx.fillRect(0,y,512,62);ctx.strokeStyle='rgba(80,50,25,.2)';ctx.beginPath();ctx.moveTo((y/64%2)*64,y);ctx.lineTo((y/64%2)*64,y+64);ctx.stroke();}
 }else if(type==='carpet'){
  ctx.fillStyle=lighter;ctx.fillRect(0,0,512,512);for(let i=0;i<2400;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.12)':'rgba(30,40,50,.08)';ctx.fillRect((i*73)%512,(i*137)%512,2,2);}
 }else{
  ctx.strokeStyle='rgba(110,120,130,.12)';for(let i=0;i<120;i++){const x=(i*61)%512,y=(i*97)%512;ctx.beginPath();ctx.arc(x,y,(i%4)+1,0,Math.PI*2);ctx.stroke();}
 }
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(width/1.35,depth/1.35);tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return tex;
}
function wallBandX(x,a,b,y,h,material){if(b-a>.02&&h>.02)addBox(roomGroup,.18,h,b-a,material,x,y+h/2,(a+b)/2);}
function wallBandZ(a,b,z,y,h,material){if(b-a>.02&&h>.02)addBox(roomGroup,b-a,h,.18,material,(a+b)/2,y+h/2,z);}
function getOpenings(objects,width,depth){
 const sides={left:[],right:[],front:[],back:[]};
 for(const o of objects){
  const key=o.catalog_key||'';if(key!=='window'&&key!=='door')continue;
  const x=Number(o.pos_x)||0,z=Number(o.pos_z)||0;
  const candidates=[['left',Math.abs(x+width/2)],['right',Math.abs(x-width/2)],['front',Math.abs(z+depth/2)],['back',Math.abs(z-depth/2)]].sort((a,b)=>a[1]-b[1]);
  const [side,dist]=candidates[0];if(dist>.55)continue;
  const center=(side==='left'||side==='right')?z:x;
  sides[side].push({center,width:key==='door'?1.48:2.15,type:key});
 }
 Object.values(sides).forEach(a=>a.sort((x,y)=>x.center-y.center));
 return sides;
}
function buildWallX(x,depth,height,openings){
 const white=mat(appearance.wallColor||'#f1f3f6',.88),blue=mat(0x1456a2,.72),sill=1.12,head=2.58;let cursor=-depth/2;
 for(const o of openings){
  const a=o.center-o.width/2,b=o.center+o.width/2;
  if(a>cursor){wallBandX(x,cursor,a,0,Math.min(.98,height),blue);wallBandX(x,cursor,a,.98,height-.98,white);}
  const bottom=o.type==='door'?0:sill,top=o.type==='door'?2.48:head;
  if(bottom>0)wallBandX(x,a,b,0,bottom,blue);
  if(height>top)wallBandX(x,a,b,top,height-top,white);
  cursor=b;
 }
 if(cursor<depth/2){wallBandX(x,cursor,depth/2,0,Math.min(.98,height),blue);wallBandX(x,cursor,depth/2,.98,height-.98,white);}
}
function buildWallZ(z,width,height,openings){
 const white=mat(appearance.wallColor||'#f1f3f6',.88),blue=mat(0x1456a2,.72),sill=1.12,head=2.58;let cursor=-width/2;
 for(const o of openings){
  const a=o.center-o.width/2,b=o.center+o.width/2;
  if(a>cursor){wallBandZ(cursor,a,z,0,Math.min(.98,height),blue);wallBandZ(cursor,a,z,.98,height-.98,white);}
  const bottom=o.type==='door'?0:sill,top=o.type==='door'?2.48:head;
  if(bottom>0)wallBandZ(a,b,z,0,bottom,blue);
  if(height>top)wallBandZ(a,b,z,top,height-top,white);
  cursor=b;
 }
 if(cursor<width/2){wallBandZ(cursor,width/2,z,0,Math.min(.98,height),blue);wallBandZ(cursor,width/2,z,.98,height-.98,white);}
}
function addRoomBrand(){
 const c=document.createElement('canvas');c.width=720;c.height=300;const ctx=c.getContext('2d');ctx.clearRect(0,0,720,300);
 ctx.fillStyle='#0e57b7';ctx.beginPath();const cx=360,cy=84,r=56;for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();
 ctx.fillStyle='#fff';ctx.font='900 72px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('S',cx,cy+2);ctx.fillStyle='#0b4f9e';ctx.font='900 72px Arial';ctx.fillText('SENATI',360,226);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.05,.86),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));sign.position.set(-2.55,2.24,-roomDepth/2+.105);roomGroup.add(sign);
}

function buildExterior(){
 const outerX=-roomWidth/2-3.8;
 const groundMat=mat(0x9bb69b,.94);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(7,roomDepth+7),groundMat);ground.position.set(outerX,.015,0);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;roomGroup.add(ground);
 const facade=mat(0xb9cbd8,.68),frame=mat(0x73899d,.48,.25);
 const building=addBox(roomGroup,.24,4.4,roomDepth+5,facade,-roomWidth/2-6.6,2.2,0);building.castShadow=false;
 const skyGlass=new THREE.MeshPhysicalMaterial({color:0xa9d8f0,roughness:.12,transparent:true,opacity:.42,transmission:.2,side:THREE.DoubleSide,depthWrite:false});
 for(let z=-roomDepth/2-1.2;z<=roomDepth/2+1.2;z+=2.25){
  addBox(roomGroup,.03,2.0,1.35,skyGlass,-roomWidth/2-6.43,2.65,z);
  addBox(roomGroup,.05,2.05,.045,frame,-roomWidth/2-6.39,2.65,z-.70);
  addBox(roomGroup,.05,2.05,.045,frame,-roomWidth/2-6.39,2.65,z+.70);
 }
 for(const z of [-4.5,-.2,4.2]){
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,1.35,10),mat(0x795b3e,.9));trunk.position.set(-roomWidth/2-2.3,.68,z);roomGroup.add(trunk);
  const foliage=mat(0x4f9461,.88);
  for(const [dx,dy,dz,scale] of [[0,1.65,0,.72],[-.30,1.35,.18,.52],[.25,1.42,-.12,.56]]){const crown=new THREE.Mesh(new THREE.SphereGeometry(scale,18,14),foliage);crown.position.set(-roomWidth/2-2.3+dx,dy,z+dz);crown.scale.y=1.12;roomGroup.add(crown);}
 }
}

function buildRoomShell(objects=[]){
 clearGroup(roomGroup);
 if(appearance.buildingPlan==='senati-pyramid'){
   const ground=new THREE.Mesh(new THREE.PlaneGeometry(roomWidth+25,roomDepth+33),mat(0xdfe5df,.96));
   ground.rotation.x=-Math.PI/2;ground.position.set(0,-.07,6);ground.receiveShadow=true;roomGroup.add(ground);floorMesh=ground;
   gridHelper=new THREE.GridHelper(Math.max(roomWidth,roomDepth),Math.max(roomWidth,roomDepth),0x8392a3,0xb2c3d4);
   gridHelper.visible=gridVisible;gridHelper.material.transparent=true;gridHelper.material.opacity=.08;gridHelper.position.y=.02;roomGroup.add(gridHelper);
   const facade=buildPiramideSENATI(roomGroup,{width:roomWidth,depth:roomDepth,levelHeight:roomHeight,
       levels:Math.min(6,Math.max(3,Number(appearance.floorCount)||5)),mode:appearance.pyramidView||'exterior',roofVisible});
   roofMesh=facade.roof;
   return;
 }

 const floorMaterial=new THREE.MeshStandardMaterial({color:0xffffff,map:makeFloorTexture(appearance.floorType,appearance.floorColor,roomWidth,roomDepth),roughness:appearance.floorType==='wood'?.66:.72});
 floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(roomWidth,roomDepth),floorMaterial);floorMesh.rotation.x=-Math.PI/2;floorMesh.receiveShadow=true;roomGroup.add(floorMesh);
 const gridSize=Math.max(roomWidth,roomDepth);gridHelper=new THREE.GridHelper(gridSize,Math.max(3,Math.floor(gridSize)),0x90a8c4,0xb6c4d6);gridHelper.scale.set(roomWidth/gridSize,1,roomDepth/gridSize);gridHelper.position.y=.012;gridHelper.material.transparent=true;gridHelper.material.opacity=.075;gridHelper.visible=gridVisible;roomGroup.add(gridHelper);
 const openings=getOpenings(objects,roomWidth,roomDepth);
 buildWallZ(-roomDepth/2,roomWidth,roomHeight,openings.front);
 buildWallZ(roomDepth/2,roomWidth,roomHeight,openings.back);
 buildWallX(-roomWidth/2,roomDepth,roomHeight,openings.left);
 buildWallX(roomWidth/2,roomDepth,roomHeight,openings.right);
 const trim=mat(0xd8e0e9,.7),base=mat(0x0c438f,.62);
 addBox(roomGroup,roomWidth,.045,.205,trim,0,roomHeight-.02,-roomDepth/2);addBox(roomGroup,roomWidth,.045,.205,trim,0,roomHeight-.02,roomDepth/2);
 addBox(roomGroup,.205,.045,roomDepth,trim,-roomWidth/2,roomHeight-.02,0);addBox(roomGroup,.205,.045,roomDepth,trim,roomWidth/2,roomHeight-.02,0);
 addBox(roomGroup,roomWidth,.055,.22,base,0,.96,-roomDepth/2);addBox(roomGroup,roomWidth,.055,.22,base,0,.96,roomDepth/2);
 addBox(roomGroup,.22,.055,roomDepth,base,-roomWidth/2,.96,0);addBox(roomGroup,.22,.055,roomDepth,base,roomWidth/2,.96,0);
 const edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(roomWidth,.025,roomDepth)),new THREE.LineBasicMaterial({color:0xb9c6d6,transparent:true,opacity:.35}));edge.position.y=.012;roomGroup.add(edge);
 const totalHeight=appearance.buildingPlan==='two-floor'?(Number(appearance.floorHeight)||roomHeight)+roomHeight:roomHeight;
 roofMesh=new THREE.Mesh(new THREE.BoxGeometry(roomWidth,.12,roomDepth),mat(0xf1f3f7,.82));roofMesh.position.y=totalHeight;roofMesh.visible=roofVisible;roofMesh.castShadow=false;roomGroup.add(roofMesh);
 addRoomBrand();
 buildExterior();
 if(appearance.buildingPlan==='two-floor')buildTwoFloorArchitecture();
}

function buildTwoFloorArchitecture(){
 const upperY=Number(appearance.floorHeight)||roomHeight,stairX=Number(appearance.stairs?.x)||5.25,topZ=Number(appearance.stairs?.topZ)||-2.0,bottomZ=Number(appearance.stairs?.bottomZ)||3.45,stairWidth=Number(appearance.stairs?.width)||2.55,run=bottomZ-topZ,steps=18;
 const slab=mat(0xd5dce5,.82),stairMat=mat(0x98724f,.78),rail=mat(0x536477,.42,.35),wall=mat(0xe3e8ee,.86);
 const xL=-roomWidth/2,xR=roomWidth/2,holeL=3.65,holeR=6.85;
 addBox(roomGroup,holeL-xL,.18,roomDepth,slab,(xL+holeL)/2,upperY-.09,0);
 addBox(roomGroup,xR-holeR,.18,roomDepth,slab,(holeR+xR)/2,upperY-.09,0);
 addBox(roomGroup,holeR-holeL,.18,topZ+roomDepth/2,slab,stairX,upperY-.09,(-roomDepth/2+topZ)/2);
 addBox(roomGroup,holeR-holeL,.18,roomDepth/2-bottomZ,slab,stairX,upperY-.09,(bottomZ+roomDepth/2)/2);
 const upperWallY=upperY+roomHeight/2;
 addBox(roomGroup,roomWidth,.18,roomHeight,wall,0,upperWallY,-roomDepth/2);
 addBox(roomGroup,.18,roomHeight,roomDepth,wall,-roomWidth/2,upperWallY,0);
 addBox(roomGroup,.18,roomHeight,roomDepth,wall,roomWidth/2,upperWallY,0);
 addBox(roomGroup,roomWidth,.12,.12,rail,0,upperY+1.0,roomDepth/2-.1);
 for(let i=0;i<steps;i++){const t=(i+.5)/steps,y=upperY-(i+.5)*upperY/steps,z=topZ+t*run;addBox(roomGroup,stairWidth,.17,run/steps+.025,stairMat,stairX,y,z);addBox(roomGroup,stairWidth,.19,.07,rail,stairX,y-.09,z-run/(2*steps));}
 const railAngle=-Math.atan2(upperY,run),railLength=Math.hypot(upperY,run);
 for(const side of [-1,1]){const x=stairX+side*(stairWidth/2+.065);const hand=addBox(roomGroup,.075,.075,railLength,rail,x,upperY/2+.92,(topZ+bottomZ)/2);hand.rotation.x=railAngle;for(let i=0;i<=steps;i+=3){const t=i/steps,z=topZ+t*run,y=upperY*(1-t)+.55;const post=addBox(roomGroup,.06,.95,.06,rail,x,y,z);post.rotation.x=railAngle;}}
 const hallStart=6.35,hallEnd=roomWidth/2-.1;addBox(roomGroup,hallEnd-hallStart,3.1,.14,wall,(hallStart+hallEnd)/2,1.55,2.55);addBox(roomGroup,hallEnd-hallStart,3.1,.14,wall,(hallStart+hallEnd)/2,1.55,6.95);
 addBox(roomGroup,4.8,.06,7.2,mat(0x9bb69b,.94),roomWidth/2+2.35,.03,roomDepth*.36);addBox(roomGroup,3.2,.035,1.8,mat(0xd8e2cf,.9),roomWidth/2+1.65,.065,roomDepth*.36);
}

function parseConfig(o){try{return typeof o.config_json==='string'?JSON.parse(o.config_json||'{}'):(o.config_json||{});}catch{return {};}}
function renderSavedObjects(objects){
 clearGroup(furniture);clearGroup(peopleGroup);people=[];fanRotors=[];savedObjects=objects||[];
 for(const row of savedObjects){
  const key=row.catalog_key||row.catalogKey;
  const config=parseConfig(row);
  const opts={width:roomWidth,depth:roomDepth,height:roomHeight,appearance,seated:Boolean(config.seated),screenMode:config.screenMode||'windows11'};
  const model=createSceneModel(key,opts);
  model.position.set(Number(row.pos_x)||0,Number(row.pos_y)||0,Number(row.pos_z)||0);
  model.rotation.set(Number(row.rot_x)||0,Number(row.rot_y)||0,Number(row.rot_z)||0);
  model.scale.set(Number(row.scale_x)||1,Number(row.scale_y)||1,Number(row.scale_z)||1);
  model.userData.catalogKey=key;model.userData.objectId=row.object_uuid||row.id||'';model.userData.accessoryOf=config.accessoryOf||null;model.userData.screenMode=config.screenMode||model.userData.screenMode||null;
  const personKeys=['man','woman','man-senati','woman-senati','teacher','teacher-f'];
  if(personKeys.includes(key)){
   if(appearance.buildingPlan==='senati-pyramid'&&model.position.y>=roomHeight*.5){peopleGroup.add(model);continue;} // Otros pisos solo visuales: simulación 1.er nivel.
   const start=model.position.clone();
   const standModel=config.seated?createSceneModel(key,{...opts,seated:false}):null;
   if(standModel){standModel.position.copy(model.position);standModel.rotation.copy(model.rotation);standModel.scale.copy(model.scale);standModel.visible=false;standModel.userData.catalogKey=key;peopleGroup.add(standModel);}
   peopleGroup.add(model);
   people.push({mesh:model,seatedMesh:model,standMesh:standModel,start,target:start.clone(),waypoints:[],route:[],safe:false,held:false,isTeacher:key==='teacher'||key==='teacher-f',wasSeated:Boolean(config.seated),stood:false,departAt:0,ignoreChairId:0,pathFailed:false,speed:.88+Math.random()*.16,walkPhase:Math.random()*Math.PI*2,key});
  }else{
   furniture.add(model);
   if(model.userData.fanRotor)fanRotors.push(model.userData.fanRotor);
  }
 }
}
function fitCamera(){
 camera.up.set(0,1,0);camera.fov=50;camera.updateProjectionMatrix();
 if(appearance.buildingPlan==='senati-pyramid'){
   const y=roomHeight*(Number(appearance.floorCount)||5)*.52;
   const span=Math.max(roomWidth,roomDepth);camera.position.set(span*.72,y+span*.48,span*1.30);orbit.target.set(0,y,3);orbit.update();return;
 }
 const span=Math.max(roomWidth,roomDepth),upperY=Number(appearance.floorHeight)||roomHeight,totalHeight=appearance.buildingPlan==='two-floor'?upperY+roomHeight:roomHeight;camera.position.set(0,Math.max(8.5,totalHeight+span*.30),span*1.25);orbit.target.set(0,appearance.buildingPlan==='two-floor'?upperY*.92:1.05,0);orbit.update();
}
function setView(view){
 if(appearance.buildingPlan==='senati-pyramid'){
   const levelY=roomHeight*(Number(appearance.floorCount)||5);
   const target=new THREE.Vector3(0,levelY*.52,0),span=Math.max(roomWidth,roomDepth);let pos;
   if(view==='front')pos=[0,levelY*.75,span*1.35];
   else if(view==='back')pos=[0,levelY*.75,-span*1.35];
   else if(view==='left')pos=[-span*1.35,levelY*.8,0];
   else if(view==='right')pos=[span*1.35,levelY*.8,0];
   else if(view==='top')pos=[0,levelY+span*1.35,.01];
   else{fitCamera();return;}
   camera.position.set(...pos);orbit.target.copy(target);orbit.update();return;
 }
 const span=Math.max(roomWidth,roomDepth),upperY=Number(appearance.floorHeight)||roomHeight,totalHeight=appearance.buildingPlan==='two-floor'?upperY+roomHeight:roomHeight,viewHeight=Math.max(8.5,totalHeight+span*.30),target=new THREE.Vector3(0,appearance.buildingPlan==='two-floor'?upperY*.92:1.1,0);camera.up.set(0,1,0);
 const distances={front:[0,viewHeight,span*1.25],back:[0,viewHeight,-span*1.25],left:[-span*1.30,viewHeight,0],right:[span*1.30,viewHeight,0],top:[0,span*1.35,.01],perspective:[0,viewHeight,span*1.25]};
 if(view==='top'){camera.up.set(0,0,-1);target.y=appearance.buildingPlan==='two-floor'?upperY:0;}
 if(view==='perspective'){fitCamera();return;}
 camera.position.set(...distances[view]);camera.lookAt(target);orbit.target.copy(target);orbit.update();
}
function fitRenderer(){const w=stage.clientWidth,h=stage.clientHeight;if(w<2||h<2)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
new ResizeObserver(fitRenderer).observe(stage);window.addEventListener('resize',fitRenderer);

document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
$('show-roof')?.addEventListener('click',()=>{roofVisible=!roofVisible;if(roofMesh)roofMesh.visible=roofVisible;$('show-roof').textContent=roofVisible?'Ocultar techo':'Mostrar techo';});
$('show-grid')?.addEventListener('click',()=>{gridVisible=!gridVisible;if(gridHelper)gridHelper.visible=gridVisible;$('show-grid').textContent=gridVisible?'Ocultar cuadrícula':'Mostrar cuadrícula';});
$('toggle-routes')?.addEventListener('click',()=>{routesVisible=!routesVisible;routeGroup.visible=routesVisible;$('toggle-routes').textContent=routesVisible?'Ocultar rutas':'Mostrar rutas';});

function setStatus(text){$('sim-status').textContent=text;}
function logMovement(message,state='info'){
 const colors={info:'#64748b',queued:'#b7791f',moving:'#2563eb',safe:'#16803c',blocked:'#c62828',exit:'#7c3aed'};
 movementLog.unshift({time:elapsed,message,state,color:colors[state]||colors.info});movementLog=movementLog.slice(0,100);
 const panel=$('movement-log');if(panel)panel.innerHTML=movementLog.map(item=>`<div style="display:flex;gap:7px;padding:5px 0;border-bottom:1px solid #edf0f4;font-size:11px"><b style="color:${item.color};white-space:nowrap">${item.time.toFixed(1)}s</b><span style="color:${item.color};font-weight:700">●</span><span>${item.message}</span></div>`).join('');
}
function clearMovementLog(){movementLog=[];const panel=$('movement-log');if(panel)panel.innerHTML='';}

function disposeIncident(){clearGroup(incidentGroup);incidentMarker=null;}
function clearRoutes(){clearGroup(routeGroup);}
function drawRoutes(){
 clearRoutes();routeGroup.visible=routesVisible;if(!routesVisible)return;
 const palette=[0x2563eb,0x9333ea,0x0891b2,0xd97706,0xdb2777,0x16a34a];
 people.forEach((person,index)=>{if(!person.route||person.route.length<2)return;const points=person.route.map(point=>new THREE.Vector3(point.x,(Number(point.y)||0)+.04+(index%5)*.003,point.z));const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:person.pathFailed?0xdc2626:palette[index%palette.length],transparent:true,opacity:.7}));routeGroup.add(line);});
}
function hazardPosition(type){
 if(type==='fire')return {x:-roomWidth/2+1.35,z:-roomDepth/2+1.2};
 if(type==='accident')return {x:0,z:.2};
 if(type==='electrical')return {x:2.2,z:-.5};
 return {x:-roomWidth/2+1.4,z:0};
}
function createIncident(type){
 disposeIncident();const pos=hazardPosition(type),group=new THREE.Group();
 if(type==='fire'){
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.42,1.35,12),new THREE.MeshStandardMaterial({color:0xff642e,emissive:0xc52b08,emissiveIntensity:1.2,transparent:true,opacity:.9}));flame.position.y=.7;group.add(flame);
  const smoke=new THREE.Mesh(new THREE.SphereGeometry(.48,14,10),new THREE.MeshStandardMaterial({color:0x68717d,transparent:true,opacity:.42}));smoke.position.set(.12,1.45,0);group.add(smoke);group.userData.flame=flame;group.userData.smoke=smoke;
 }else if(type==='electrical'){
  const spark=new THREE.Mesh(new THREE.OctahedronGeometry(.48),new THREE.MeshStandardMaterial({color:0xffd43b,emissive:0xff9d00,emissiveIntensity:1.4}));spark.position.y=.65;group.add(spark);group.userData.spark=spark;
 }else{
  const marker=new THREE.Mesh(new THREE.CylinderGeometry(.42,.5,.12,24),mat(type==='earthquake'?0x2878d0:0xd94841));marker.position.y=.08;group.add(marker);
  for(let i=0;i<4;i++){const cone=new THREE.Mesh(new THREE.ConeGeometry(.16,.55,12),mat(0xf5a623));cone.position.set(Math.cos(i*Math.PI/2)*.78,.28,Math.sin(i*Math.PI/2)*.78);group.add(cone);}
 }
 group.position.set(pos.x,0,pos.z);incidentGroup.add(group);incidentMarker=group;return pos;
}

function buildTwoFloorNavigation(type){
 const upperY=Number(appearance.floorHeight)||roomHeight,stairX=Number(appearance.stairs?.x)||5.25,topZ=Number(appearance.stairs?.topZ)||-2.0,bottomZ=Number(appearance.stairs?.bottomZ)||3.45;
 const hazard=hazardPosition(type);
 const lowerObjects=savedObjects.filter(o=>(Number(o.pos_y)||0)<upperY*.5);
 const upperObjects=savedObjects.filter(o=>(Number(o.pos_y)||0)>=upperY*.5);
 const extraHazard={fire:'fire-hazard',accident:'accident-hazard',electrical:'electrical-hazard'}[type];
 if(extraHazard)lowerObjects.push({catalog_key:extraHazard,pos_x:hazard.x,pos_z:hazard.z,rot_y:0});
 const lowerGrid=new NavigationGrid(roomWidth,roomDepth,lowerObjects,{cellSize:.10,radius:.31});
 const upperGrid=new NavigationGrid(roomWidth,roomDepth,upperObjects,{cellSize:.10,radius:.31});
 const doors=lowerObjects.filter(o=>(o.catalog_key||o.catalogKey)==='door');
 const candidates=(doors.length?doors:[null]).map(door=>({door,info:findExitInfo(door?[door]:[],roomWidth,roomDepth)}));
 let best=null;
 for(const candidate of candidates){
  let paths=[],reachable=0,totalDistance=0;
  people.forEach(person=>{
   const upper=person.start.y>=upperY*.5;
   const grid=upper?upperGrid:lowerGrid;
   const target=upper?{x:stairX,z:topZ-.22}:candidate.info.inside;
   const chairId=grid.chairForStart({x:person.start.x,z:person.start.z});
   const path=grid.findPath({x:person.start.x,z:person.start.z},target,{startSearch:1.6,goalSearch:1.25,ignoreChairId:chairId});
   const dist=path.reduce((sum,p,i)=>i?sum+Math.hypot(p.x-path[i-1].x,p.z-path[i-1].z):sum,0);
   let lowerPath=[];
   if(upper&&path.length)lowerPath=lowerGrid.findPath({x:stairX,z:bottomZ+.12},candidate.info.inside,{startSearch:1.5,goalSearch:1.1});
   const ok=path.length>0&&(!upper||lowerPath.length>0);
   if(ok){reachable++;totalDistance+=dist+(upper?lowerPath.reduce((sum,p,i)=>i?sum+Math.hypot(p.x-lowerPath[i-1].x,p.z-lowerPath[i-1].z):0,0)+upperY*1.8:0);}
   paths.push({person,path,lowerPath,chairId,upper,ok});
  });
  const score=reachable*100000-totalDistance;if(!best||score>best.score)best={...candidate,paths,reachable,totalDistance,score};
 }
 exitInfo=best.info;navGrid=lowerGrid;
 logMovement(`Salida seleccionada: puerta del primer piso; ${best.reachable}/${people.length} rutas por escalera y pasadizo calculadas.`,'exit');
 let failed=0;
 best.paths.slice().sort((a,b)=>{const da=a.person.start.y>upperY*.5?Math.hypot(a.person.start.x-stairX,a.person.start.z-topZ):Math.hypot(a.person.start.x-exitInfo.inside.x,a.person.start.z-exitInfo.inside.z);const db=b.person.start.y>upperY*.5?Math.hypot(b.person.start.x-stairX,b.person.start.z-topZ):Math.hypot(b.person.start.x-exitInfo.inside.x,b.person.start.z-exitInfo.inside.z);return da-db;}).forEach(({person,path,lowerPath,chairId,upper,ok},index)=>{
   person.ignoreChairId=chairId;person.navUpper=upperGrid;person.navLower=lowerGrid;
   if(!ok){person.route=[];person.waypoints=[];person.pathFailed=true;failed++;logMovement(`${person.key||'Participante'}: no existe una ruta completa hasta la salida.`,'blocked');return;}
   const route=[];
   if(upper){
    path.forEach(p=>route.push({x:p.x,y:upperY,z:p.z}));
    route.push({x:stairX,y:upperY,z:topZ});
    const count=24;for(let i=1;i<=count;i++){const t=i/count;route.push({x:stairX,y:upperY*(1-t),z:topZ+(bottomZ-topZ)*t});}
    lowerPath.forEach(p=>route.push({x:p.x,y:0,z:p.z}));
   }else path.forEach(p=>route.push({x:p.x,y:0,z:p.z}));
   route.push({x:exitInfo.outside.x,y:0,z:exitInfo.outside.z});
   person.route=route;const first=route[0],startDistance=Math.hypot(person.start.x-first.x,person.start.z-first.z);
   const follow=startDistance>.07?route:route.slice(1);person.waypoints=follow.map(p=>new THREE.Vector3(p.x,p.y,p.z));
   person.target=person.waypoints.shift()||new THREE.Vector3(exitInfo.outside.x,0,exitInfo.outside.z);
   person.pathFailed=false;person.held=false;person.departAt=elapsed+(type==='earthquake'?5.2:0)+index*.72;person.safe=false;person.stood=false;person.loggedMoving=false;person.loggedBlocked=false;
   if(person.standMesh)person.standMesh.visible=false;if(person.wasSeated)person.mesh.visible=true;
   logMovement(`${person.key||'Participante'}: ${upper?'bajará por la escalera y seguirá el pasadizo':'seguirá el pasadizo'}; turno ${index+1}.`,'queued');
  });
 drawRoutes();return {total:people.length,planned:people.length-failed,failed};
}

function buildNavigation(type){
 if(appearance.buildingPlan==='two-floor')return buildTwoFloorNavigation(type);
 const obstacleObjects=(appearance.buildingPlan==='senati-pyramid'?savedObjects.filter(o=>(Number(o.pos_y)||0)<roomHeight*.5):savedObjects).slice(),hazard=hazardPosition(type);
 if(type==='fire')obstacleObjects.push({catalog_key:'fire-hazard',pos_x:hazard.x,pos_z:hazard.z,rot_y:0});
 if(type==='accident')obstacleObjects.push({catalog_key:'accident-hazard',pos_x:hazard.x,pos_z:hazard.z,rot_y:0});
 if(type==='electrical')obstacleObjects.push({catalog_key:'electrical-hazard',pos_x:hazard.x,pos_z:hazard.z,rot_y:0});
 navGrid=new NavigationGrid(roomWidth,roomDepth,obstacleObjects,{cellSize:.10,radius:.31});
 const doors=savedObjects.filter(o=>(o.catalog_key||o.catalogKey)==='door');
 const candidates=(doors.length?doors:[null]).map(door=>({door,info:findExitInfo(door?[door]:[],roomWidth,roomDepth)}));
 let best=null;
 for(const candidate of candidates){
  const paths=people.map(person=>{
   const chairId=navGrid.chairForStart({x:person.start.x,z:person.start.z});
   const path=navGrid.findPath({x:person.start.x,z:person.start.z},{x:candidate.info.inside.x,z:candidate.info.inside.z},{startSearch:1.5,goalSearch:1.0,ignoreChairId:chairId});
   const distance=path.reduce((sum,p,i)=>i?sum+Math.hypot(p.x-path[i-1].x,p.z-path[i-1].z):sum,0);
   return {person,path,chairId,distance};
  });
  const reachable=paths.filter(p=>p.path.length).length;
  const totalDistance=paths.reduce((sum,p)=>sum+(p.path.length?p.distance:0),0);
  const score=reachable*100000-totalDistance;
  if(!best||score>best.score)best={...candidate,paths,reachable,totalDistance,score};
 }
 exitInfo=best.info;
 logMovement(`Salida elegida automáticamente: ${best.door?'puerta '+(doors.indexOf(best.door)+1):'salida predeterminada'}; ${best.reachable}/${people.length} rutas posibles; distancia conjunta ${best.totalDistance.toFixed(1)} m.`,'exit');
 let failed=0;
 best.paths.slice().sort((a,b)=>a.distance-b.distance).forEach(({person,path,chairId},index)=>{
  person.ignoreChairId=chairId;
  if(!path.length){person.route=[];person.waypoints=[];person.pathFailed=true;failed++;logMovement(`${person.key||'Participante'}: no hay ruta continua hasta la salida.`,'blocked');return;}
  const outside={x:exitInfo.outside.x,z:exitInfo.outside.z};
  person.route=[...path.map(p=>({x:p.x,z:p.z})),outside];
  const first=person.route[0],startDistance=Math.hypot(person.start.x-first.x,person.start.z-first.z);
  const follow=startDistance>.07?person.route:person.route.slice(1);
  person.waypoints=follow.map(p=>new THREE.Vector3(p.x,0,p.z));
  person.target=person.waypoints.shift()||new THREE.Vector3(outside.x,0,outside.z);
  person.pathFailed=false;person.held=false;person.departAt=elapsed+(type==='earthquake'?5.2:0)+index*.62;person.safe=false;person.stood=false;person.loggedMoving=false;person.loggedBlocked=false;
  if(person.standMesh)person.standMesh.visible=false;if(person.wasSeated)person.mesh.visible=true;
  logMovement(`${person.key||'Participante'}: ruta calculada (${path.length} nodos), turno ${index+1}.`,'queued');
 });
 drawRoutes();return {total:people.length,planned:people.length-failed,failed};
}
function updateStats(){
 const safe=people.filter(p=>p.safe).length,moving=people.filter(p=>!p.safe&&!p.pathFailed&&p.mesh.position.distanceTo(p.target)>.06).length,failed=people.filter(p=>p.pathFailed).length;
 $('count-total').textContent=people.length;$('count-safe').textContent=safe;$('count-moving').textContent=moving;$('count-failed').textContent=failed;
 $('elapsed').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(Math.floor(elapsed%60)).padStart(2,'0')}`;
}
function resetSimulation(resetTime=true){
 clearMovementLog();running=false;evacuating=false;if(resetTime)elapsed=0;earthquakePhase=0;
 roomGroup.position.set(0,0,0);furniture.position.set(0,0,0);peopleGroup.position.set(0,0,0);
 people.forEach(p=>{if(p.wasSeated){p.mesh=p.seatedMesh;p.seatedMesh.visible=true;if(p.standMesh)p.standMesh.visible=false;}else{p.mesh.visible=true;}p.mesh.position.copy(p.start);p.target.copy(p.start);p.waypoints=[];p.route=[];p.safe=false;p.held=false;p.pathFailed=false;p.departAt=0;p.stood=false;});
 disposeIncident();clearRoutes();navGrid=null;updateStats();
}
function startEvacuation(){
 if(!loadedScenario)return;const type=$('incident').value;createIncident(type);evacuating=true;running=true;
 const labels={fire:'Incendio simulado',earthquake:'Terremoto simulado',accident:'Accidente localizado',electrical:'Riesgo eléctrico'};
 clearMovementLog();const result=buildNavigation(type);const extra=result.failed?` ${result.failed} participante(s) no tienen una ruta con ancho suficiente; revisa la distribución o despeja el pasillo.`:'';
 setStatus(`${labels[type]} activado. Se comprobaron pasillos transitables y ancho de puerta. Rutas calculadas: ${result.planned}/${result.total}.${extra}`);
}
async function loadScenario(id){
 if(id==='demo'){loadDemoScenario();return;}
 if(!id)return;setStatus('Cargando escenario guardado…');
 try{
  const response=await fetch(`./api/scenarios.php?action=load&id=${encodeURIComponent(id)}`);const result=await response.json();
  if(!response.ok||!result.success)throw new Error(result.message||'No se pudo cargar el escenario.');
  loadedScenario=result.scenario;
  $('save-results').disabled=false;roomWidth=Number(loadedScenario.width_m)||20;roomDepth=Number(loadedScenario.depth_m)||12;roomHeight=Number(loadedScenario.height_m)||3.35;
  savedObjects=loadedScenario.objects||[];
  try{appearance={...appearance,...JSON.parse(loadedScenario.appearance_json||'{}')};}catch{}
  applyClimate(appearance.climate||'day');
  roofVisible=typeof appearance.roofVisible==='boolean'?appearance.roofVisible:appearance.buildingPlan==='senati-pyramid';
  gridVisible=typeof appearance.gridVisible==='boolean'?appearance.gridVisible:false;
  const shadowOn=typeof appearance.shadowsEnabled==='boolean'?appearance.shadowsEnabled:true;renderer.shadowMap.enabled=shadowOn;sun.castShadow=shadowOn;
  const realistic=typeof appearance.realisticLighting==='boolean'?appearance.realisticLighting:true;renderer.toneMapping=realistic?THREE.ACESFilmicToneMapping:THREE.LinearToneMapping;renderer.toneMappingExposure=realistic?1.16:1;
  exitInfo=findExitInfo(savedObjects,roomWidth,roomDepth);
  buildRoomShell(savedObjects);renderSavedObjects(savedObjects);fitCamera();resetSimulation(true);
  $('sim-scene-title').textContent=loadedScenario.name;
  $('show-roof').textContent=roofVisible?'Ocultar techo':'Mostrar techo';$('show-grid').textContent=gridVisible?'Ocultar cuadrícula':'Mostrar cuadrícula';
  $('count-total').textContent=people.length;refreshRuns();
  const unknown=savedObjects.filter(o=>!['desk','chair','aio','keyboard','mouse','man','woman','man-senati','woman-senati','teacher','teacher-f','wall','door','window','whiteboard','fluorescent','fan','projector','plant','safety-exit','safety-rules','fire-extinguisher','safety-first-aid','safety-electrical','safety-safe-zone','safety-evacuation'].includes(o.catalog_key));
  setStatus(`${appearance.buildingPlan==='senati-pyramid'?'Pirámide SENATI (simulación SOLO planta baja, no certificada). ':''}Escenario cargado: ${savedObjects.length} objetos, ${people.length} personas. ${unknown.length?`No reconocidos: ${unknown.map(o=>o.catalog_key).join(', ')}.`:'Se conservaron las posiciones, rotaciones, escalas y pantallas guardadas.'}`);
  fitRenderer();
 }catch(error){setStatus(error.message);}
}

function loadDemoScenario(){
  // Escenario de demostración local: permite ensayar funciones antes de guardar algo en MySQL.
  roomWidth=DEFAULT_PYRAMID_WIDTH;roomDepth=DEFAULT_PYRAMID_DEPTH;roomHeight=DEFAULT_LEVEL_HEIGHT;
  appearance={floorType:'tile',floorColor:'#eadfc9',wallColor:'#eff2f5',deskColor:'#1559a8',chairColor:'#202a38',buildingPlan:'senati-pyramid',floorCount:6,pyramidView:'transparente',climate:'day'};
  roofVisible=true;gridVisible=false;
  savedObjects=[];
  const {x:sx,z:sz}=pyramidScale(roomWidth,roomDepth);
  const deskPositions=ev52DeskPositions(sx,sz);
  deskPositions.forEach(p=>savedObjects.push({catalog_key:'desk',pos_x:p.x,pos_y:0,pos_z:p.z,scale_x:1,scale_y:1,scale_z:1,config_json:'{}'}));
  for(const [i,p] of deskPositions.filter((_,i)=>i%2===0).slice(0,8).entries())
    savedObjects.push({catalog_key:i%2?'woman-senati':'man-senati',pos_x:p.x,pos_y:0,pos_z:p.z+.90,scale_x:1,scale_y:1,scale_z:1,config_json:'{}'});
  savedObjects.push({catalog_key:'door',pos_x:0,pos_y:0,pos_z:roomDepth/2-2.2,scale_x:1,scale_y:1,scale_z:1,config_json:'{}'});
  loadedScenario={id:null,name:'Pirámide SENATI · Demostración local'};
  exitInfo=findExitInfo(savedObjects,roomWidth,roomDepth);
  applyClimate('day');
  buildRoomShell(savedObjects);renderSavedObjects(savedObjects);fitCamera();resetSimulation(true);
  $('sim-scene-title').textContent=loadedScenario.name;
  $('show-roof').textContent=roofVisible?'Ocultar techo':'Mostrar techo';
  $('show-grid').textContent=gridVisible?'Ocultar cuadrícula':'Mostrar cuadrícula';
  $('save-results').disabled=true;
  $('saved-runs').textContent='Para guardar resultados, abre un escenario almacenado por el administrador en MySQL.';
  setStatus('Demostración EV-52 aproximada: 20 puestos distribuidos en aulas, 8 participantes. Las rutas son ilustrativas y NO equivalen al plano oficial.');
  fitRenderer();
}

// Incident controls. Una demostración local está siempre disponible, incluso si MySQL está vacío.
async function initSimulatorScenarios(){
 const select=$('scenario-select');
 select.innerHTML='<option value="demo">Pirámide SENATI · DEMO integrada (sin MySQL)</option>';
 let warning='';
 try{
   const r=await fetch('./api/scenarios.php?action=list',{credentials:'same-origin'});
   if(!r.ok)throw new Error(`API HTTP ${r.status}`);
   const data=await r.json();
   if(!data.success||!Array.isArray(data.scenarios))throw new Error(data.message||'Respuesta de la API no válida');
   for(const s of data.scenarios){const o=document.createElement('option');o.value=String(s.id);o.textContent='Guardado: '+s.name;select.appendChild(o);}
   if(!data.scenarios.length)warning='La base de datos aún no contiene escenarios guardados.';
 }catch(err){warning='MySQL/API: '+err.message+'. La demostración funciona sin la base de datos.';}
 const queryId=new URLSearchParams(location.search).get('scenario');
 const chosen=queryId&&[...select.options].some(o=>o.value===queryId)?queryId:'demo';
 select.value=chosen;
 await loadScenario(chosen);
 if(warning&&chosen==='demo')$('saved-runs').textContent=warning+' Para guardar resultados, crea un escenario desde el editor.';
}
initSimulatorScenarios().catch(err=>{console.error('Simulador',err);loadDemoScenario();setStatus('Se cargó el demo como respaldo porque el listado falló: '+err.message);});
$('scenario-select').addEventListener('change',e=>loadScenario(e.target.value));
async function refreshRuns(){
 if(!loadedScenario?.id)return;
 try{
  const r=await fetch(`./api/simulations.php?action=list&scenario=${encodeURIComponent(loadedScenario.id)}`);
  const data=await r.json();if(!data.success)return;
  $('saved-runs').textContent=data.runs.length?`Simulaciones guardadas: ${data.runs.length} · última: ${data.runs[0].created_at}`:'No hay simulaciones guardadas todavía.';
 }catch{}
}
$('save-results').addEventListener('click',async()=>{
 if(!loadedScenario?.id){setStatus('Esta es una demostración local. Guarda un escenario desde el editor para almacenar resultados en MySQL.');return;}
 if(!evacuating){setStatus('Inicia una simulación antes de guardar los resultados.');return;}
 const csrf=document.querySelector('meta[name="csrf-token"]')?.content||'';
 const data={scenarioId:Number(loadedScenario.id),incident:$('incident').value,
  participants:people.length,evacuated:people.filter(p=>p.safe).length,
  withoutRoute:people.filter(p=>p.pathFailed).length,elapsed,
  notes:appearance.buildingPlan==='senati-pyramid'?'Simulación didáctica limitada a la planta baja, sin validación estructural.':'Simulación didáctica.',
  events:movementLog.slice().reverse().map(e=>({time:e.time,message:e.message,state:e.state}))};
 try{
  const response=await fetch('./api/simulations.php?action=save',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(data)});
  const result=await response.json();if(!response.ok||!result.success)throw new Error(result.message||'Error al guardar');
  setStatus(result.message);refreshRuns();
 }catch(error){setStatus(error.message);}
});
$('start').addEventListener('click',()=>{if(!loadedScenario){setStatus('Primero selecciona un escenario guardado.');return;}if(!evacuating)startEvacuation();else{people.forEach(p=>p.held=false);running=true;setStatus('Simulación reanudada.');}});
$('pause').addEventListener('click',()=>{running=false;setStatus('Simulación pausada.');});
$('reset').addEventListener('click',()=>{resetSimulation();setStatus('Simulación reiniciada.');});
$('alarm').addEventListener('click',()=>{if(!$('incident').value)return;createIncident($('incident').value);setStatus('Alarma activada. El instructor puede ordenar la evacuación cuando corresponda.');});
$('evacuate').addEventListener('click',startEvacuation);
$('hold').addEventListener('click',()=>{running=false;people.forEach(p=>p.held=true);setStatus('Participantes detenidos por orden del instructor. Pulsa Iniciar / continuar para reanudar.');});

// First-person tour: full screen scene only, without any authoring sidebar or object selection.
function getWalkStairs(){
 const upperY=Number(appearance.floorHeight)||roomHeight;
 const stairs=appearance.stairs||{};
 return {
  upperY,
  x:Number(stairs.x)||5.25,
  topZ:Number(stairs.topZ)||-2.0,
  bottomZ:Number(stairs.bottomZ)||3.45,
  width:Number(stairs.width)||2.55,
  holeLeft:3.65,
  holeRight:6.85
 };
}
function walkGridFor(level){return level===1?walkNavUpper:walkNavLower;}
function enterWalkMode(){
 if(walking){walkControls.unlock();return;}
 if(!loadedScenario){setStatus('Carga un escenario antes de recorrerlo.');return;}
 const twoFloor=appearance.buildingPlan==='two-floor';
 const stair=getWalkStairs();
 const lowerObjects=twoFloor?savedObjects.filter(o=>(Number(o.pos_y)||0)<stair.upperY*.5):savedObjects;
 const upperObjects=twoFloor?savedObjects.filter(o=>(Number(o.pos_y)||0)>=stair.upperY*.5):[];
 walkNavLower=new NavigationGrid(roomWidth,roomDepth,lowerObjects,{cellSize:.10,radius:.31});
 walkNavUpper=twoFloor?new NavigationGrid(roomWidth,roomDepth,upperObjects,{cellSize:.10,radius:.31}):null;
 walkFloorLevel=0;walkOnStairs=false;
 walkSaved={position:camera.position.clone(),target:orbit.target.clone()};
 orbit.enabled=false;walking=true;document.body.classList.add('sim-walk-mode');
 const door=exitInfo||findExitInfo(savedObjects,roomWidth,roomDepth);
 const start=new THREE.Vector3(door.inside.x-door.normal.x*.8,WALK_EYE_HEIGHT,door.inside.z-door.normal.z*.8);
 camera.position.copy(start);camera.lookAt(start.x-door.normal.x*3,WALK_EYE_HEIGHT-.03,start.z-door.normal.z*3);
 stage.requestFullscreen?.().catch(()=>{});walkControls.lock();
 $('walk-exit').hidden=false;$('walk-hint').hidden=false;
}
function exitWalkMode(){
 if(!walking)return;walking=false;orbit.enabled=true;document.body.classList.remove('sim-walk-mode');
 $('walk-exit').hidden=true;$('walk-hint').hidden=true;
 if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
 if(walkSaved){camera.position.copy(walkSaved.position);orbit.target.copy(walkSaved.target);orbit.update();walkSaved=null;}
 Object.keys(walkKeys).forEach(k=>walkKeys[k]=false);
 walkNavLower=null;walkNavUpper=null;walkOnStairs=false;walkFloorLevel=0;
}
// Walk movement is constrained to the active floor. In a two-floor building,
// the stair footprint is the only place where the camera can change elevation.
function resolveWalkStep(oldPosition,candidatePosition){
 const twoFloor=appearance.buildingPlan==='two-floor';
 if(!twoFloor){
  const grid=walkNavLower||navGrid;
  if(grid&&(!grid.canOccupy(candidatePosition.x,candidatePosition.z,exitInfo,0)||!grid.lineClear({x:oldPosition.x,z:oldPosition.z},candidatePosition,0)))return false;
  camera.position.y=WALK_EYE_HEIGHT;return true;
 }
 const stair=getWalkStairs();
 const {x:stairX,topZ,bottomZ,upperY,width,holeLeft,holeRight}=stair;
 const halfWidth=Math.max(.55,width/2-.34); // keep the player inside the handrails
 const inWidth=Math.abs(candidatePosition.x-stairX)<=halfWidth;
 const inRun=candidatePosition.z>=topZ-.08&&candidatePosition.z<=bottomZ+.08;
 const fromLower=walkFloorLevel===0;
 const wasOnStairs=walkOnStairs;
 let nextLevel=walkFloorLevel,nextOnStairs=false,nextFloorY=fromLower?0:upperY;
 const lowerEntry=inWidth&&candidatePosition.z<=bottomZ+.38&&candidatePosition.z>=topZ-.08&&
  (wasOnStairs||oldPosition.z>=bottomZ-.10||oldPosition.z>bottomZ-.38);
 const upperEntry=inWidth&&candidatePosition.z>=topZ-.38&&candidatePosition.z<=bottomZ+.08&&
  (wasOnStairs||oldPosition.z<=topZ+.10||oldPosition.z<topZ+.38);
 if(wasOnStairs){
  if(inWidth&&inRun){nextOnStairs=true;nextFloorY=THREE.MathUtils.clamp((bottomZ-candidatePosition.z)/(bottomZ-topZ),0,1)*upperY;}
  else if(inWidth&&candidatePosition.z<topZ-.08){nextLevel=1;nextFloorY=upperY;}
  else if(inWidth&&candidatePosition.z>bottomZ+.08){nextLevel=0;nextFloorY=0;}
  else return false; // do not step sideways through the stair rails
 }else if(fromLower&&lowerEntry){
  if(candidatePosition.z<topZ-.08){nextLevel=1;nextFloorY=upperY;}
  else if(candidatePosition.z>bottomZ+.08){nextLevel=0;nextFloorY=0;}
  else{nextOnStairs=true;nextFloorY=THREE.MathUtils.clamp((bottomZ-candidatePosition.z)/(bottomZ-topZ),0,1)*upperY;}
 }else if(!fromLower&&upperEntry){
  if(candidatePosition.z>bottomZ+.08){nextLevel=0;nextFloorY=0;}
  else if(candidatePosition.z<topZ-.08){nextLevel=1;nextFloorY=upperY;}
  else{nextOnStairs=true;nextFloorY=THREE.MathUtils.clamp((bottomZ-candidatePosition.z)/(bottomZ-topZ),0,1)*upperY;}
 }
 // The upper slab has an opening around the stairwell. Prevent falling through
 // it when approaching from the side; only the stair lane connects the floors.
 const insideUpperOpening=candidatePosition.x>holeLeft-.22&&candidatePosition.x<holeRight+.22&&candidatePosition.z>topZ-.08&&candidatePosition.z<bottomZ+.08;
 if(nextLevel===1&&!nextOnStairs&&insideUpperOpening)return false;
 // Do not let the first-person camera pass underneath the solid stair flight.
 // On the first floor, the stair footprint is walkable only after entering from
 // the lower landing and following the ascending run.
 const underStairFootprint=Math.abs(candidatePosition.x-stairX)<width/2+.18&&candidatePosition.z>topZ-.08&&candidatePosition.z<bottomZ+.08;
 if(nextLevel===0&&!nextOnStairs&&underStairFootprint)return false;
 // Test ordinary floor movement against obstacles assigned to that floor.
 if(!nextOnStairs){
  const grid=walkGridFor(nextLevel);
  if(grid&&(!grid.canOccupy(candidatePosition.x,candidatePosition.z,exitInfo,0)||!grid.lineClear({x:oldPosition.x,z:oldPosition.z},candidatePosition,0)))return false;
 }
 walkFloorLevel=nextLevel;walkOnStairs=nextOnStairs;
 camera.position.y=nextFloorY+WALK_EYE_HEIGHT;
 return true;
}
$('walk-mode').addEventListener('click',enterWalkMode);$('walk-exit').addEventListener('click',()=>walkControls.unlock());
walkControls.addEventListener('unlock',exitWalkMode);
walkControls.addEventListener('lock',()=>{$('walk-exit').hidden=false;});
document.addEventListener('keydown',event=>{
 if(!walking||!walkControls.isLocked)return;const key=event.key.toLowerCase();
 if(key==='w'||key==='arrowup'){walkKeys.forward=true;event.preventDefault();}
 if(key==='s'||key==='arrowdown'){walkKeys.backward=true;event.preventDefault();}
 if(key==='a'||key==='arrowleft'){walkKeys.left=true;event.preventDefault();}
 if(key==='d'||key==='arrowright'){walkKeys.right=true;event.preventDefault();}
});
document.addEventListener('keyup',event=>{const key=event.key.toLowerCase();if(key==='w'||key==='arrowup')walkKeys.forward=false;if(key==='s'||key==='arrowdown')walkKeys.backward=false;if(key==='a'||key==='arrowleft')walkKeys.left=false;if(key==='d'||key==='arrowright')walkKeys.right=false;});
document.addEventListener('fullscreenchange',()=>{if(walking&&!document.fullscreenElement)walkControls.unlock();requestAnimationFrame(fitRenderer);});

let previousFrame=0;
function animate(timestamp){
 requestAnimationFrame(animate);const dt=Math.min((timestamp-previousFrame)/1000||0,.05);previousFrame=timestamp;
 if(rainPoints?.visible){const a=rainPoints.geometry.attributes.position;for(let i=0;i<a.count;i++){a.array[i*3+1]-=.30;if(a.array[i*3+1]<0)a.array[i*3+1]=10;}a.needsUpdate=true;}
 if(walking&&walkControls.isLocked){
  const old=camera.position.clone(),oldLevel=walkFloorLevel,oldOnStairs=walkOnStairs,speed=2.8*dt;
  if(walkKeys.forward)walkControls.moveForward(speed);if(walkKeys.backward)walkControls.moveForward(-speed);if(walkKeys.left)walkControls.moveRight(-speed);if(walkKeys.right)walkControls.moveRight(speed);
  const candidate={x:camera.position.x,z:camera.position.z};
  if(!resolveWalkStep(old,candidate)){camera.position.copy(old);walkFloorLevel=oldLevel;walkOnStairs=oldOnStairs;}
 }
 if(running){
  elapsed+=dt;const incident=$('incident').value;
  if(incident==='earthquake'&&elapsed<5.2){earthquakePhase+=dt;const dx=Math.sin(earthquakePhase*18)*.035,dz=Math.cos(earthquakePhase*15)*.025;roomGroup.position.set(dx,0,dz);furniture.position.set(dx,0,dz);peopleGroup.position.set(dx,0,dz);}
  else{roomGroup.position.set(0,0,0);furniture.position.set(0,0,0);peopleGroup.position.set(0,0,0);}
  if(incidentMarker?.userData.flame){const scale=1+Math.sin(elapsed*8)*.12;incidentMarker.userData.flame.scale.set(scale,scale,1);incidentMarker.userData.smoke.position.y=1.35+(elapsed%2)*.2;incidentMarker.userData.smoke.scale.setScalar(1+(elapsed%2)*.25);}
  if(incidentMarker?.userData.spark)incidentMarker.userData.spark.visible=Math.sin(elapsed*15)>-.35;
  people.forEach(person=>{
   if(person.safe||person.pathFailed||person.held||elapsed<person.departAt)return;
   if(!person.loggedMoving){person.loggedMoving=true;logMovement(`${person.key||'Participante'} inicia desplazamiento.`,'moving');}
   if(person.wasSeated&&!person.stood){person.mesh.visible=false;if(person.standMesh){person.standMesh.visible=true;person.mesh=person.standMesh;}person.stood=true;}
   const delta=person.target.clone().sub(person.mesh.position);const distance=delta.length();
   if(distance<.12){if(person.waypoints.length){person.target.copy(person.waypoints.shift());return;}person.safe=true;logMovement(`${person.key||'Participante'} llegó a la salida.`,'safe');return;}
   if(distance<.001)return;
   const desired=delta.normalize(),separation=new THREE.Vector3();let speedFactor=1;
   for(const other of people){if(other===person||other.safe||Math.abs(other.mesh.position.y-person.mesh.position.y)>.75)continue;const away=new THREE.Vector3(person.mesh.position.x-other.mesh.position.x,0,person.mesh.position.z-other.mesh.position.z);const gap=away.length();if(gap<.68&&gap>.001){away.normalize();separation.addScaledVector(away,(.68-gap)/.68);if(-away.dot(desired)>.25&&gap<.5)speedFactor=Math.min(speedFactor,THREE.MathUtils.clamp((gap-.34)/.16,0,1));}}
   const direction=desired.clone().addScaledVector(separation,.28);if(direction.lengthSq()<.0001)direction.copy(desired);else direction.normalize();
   const current={x:person.mesh.position.x,z:person.mesh.position.z};
   const next=person.mesh.position.clone().addScaledVector(direction,person.speed*speedFactor*dt);
   const verticalStep=appearance.buildingPlan==='two-floor'&&Math.abs(person.target.y-person.mesh.position.y)>.045;
   const activeGrid=appearance.buildingPlan==='two-floor'?(person.mesh.position.y>(Number(appearance.floorHeight)||roomHeight)*.5?person.navUpper:person.navLower):navGrid;
   if(!verticalStep&&activeGrid&&(!activeGrid.canOccupy(next.x,next.z,exitInfo,person.ignoreChairId)||!activeGrid.lineClear(current,{x:next.x,z:next.z},person.ignoreChairId))){
    const escape=person.route?.[0]||person.target;
    if(!activeGrid.canEscape(current,{x:next.x,z:next.z},escape,exitInfo,person.ignoreChairId)){ if(!person.loggedBlocked){person.loggedBlocked=true;logMovement(`${person.key||'Participante'} detenido: posible colisión o paso estrecho.`,'blocked');}return;}
   }
   // One-person queue: preserve clearance instead of allowing the crowd to
   // squeeze through a door or overtake on a narrow aisle.
   for(const other of people){if(other===person||other.safe)continue;if(Math.abs(other.mesh.position.y-next.y)<.75&&next.distanceTo(other.mesh.position)<.48){next.copy(person.mesh.position);break;}}
   const moved=next.clone().sub(person.mesh.position);if(moved.lengthSq()>.000001){person.mesh.position.copy(next);if(Math.hypot(moved.x,moved.z)>.001)person.mesh.rotation.y=Math.atan2(moved.x,moved.z);person.walkPhase+=dt*8;}
  });
  if(evacuating&&people.every(p=>p.safe||p.pathFailed)){running=false;const failed=people.filter(p=>p.pathFailed).length;setStatus(failed?`${people.length-failed} personas alcanzaron la salida; ${failed} no tuvieron ruta calculable.`:'Simulación finalizada: todos los participantes llegaron a la salida del modelo.');}
  updateStats();
 }
 fanRotors.forEach(rotor=>{rotor.rotation.y+=dt*1.1;});
 if(!walking)orbit.update();
 renderer.render(scene,camera);
}
requestAnimationFrame(animate);
