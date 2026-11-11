import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createSceneModel } from './scene-models.js';
import { buildPiramideSENATI } from './piramide-senati.js';
import {EV52_ROOMS,ev52DeskPositions,DEFAULT_PYRAMID_WIDTH,DEFAULT_PYRAMID_DEPTH,DEFAULT_LEVEL_HEIGHT} from './ev52-layout.js';

const $=id=>document.getElementById(id);
const host=$('render-area');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.setPixelRatio(Math.min(1.75,window.devicePixelRatio||1));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(78,1,.08,320);
camera.rotation.order='YXZ';
const walk=new PointerLockControls(camera,renderer.domElement);
walk.pointerSpeed=.85;
const world=new THREE.Scene();world.background=new THREE.Color(0xbadbf2);
const hemi=new THREE.HemisphereLight(0xf6faff,0xbabcb2,2.0);world.add(hemi);
const sun=new THREE.DirectionalLight(0xfff9e8,1.45);sun.position.set(15,28,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-50;sun.shadow.camera.right=50;sun.shadow.camera.top=50;sun.shadow.camera.bottom=-50;world.add(sun);
let sceneRoot=new THREE.Group();world.add(sceneRoot);
let furniture=new THREE.Group();sceneRoot.add(furniture);
let building=null,doorOpen=false,kind='piramide',currentFloor=0,totalFloors=6;
let W=DEFAULT_PYRAMID_WIDTH,D=DEFAULT_PYRAMID_DEPTH,H=DEFAULT_LEVEL_HEIGHT,frontZ=16.8,sideLeft=-21.5,sideRight=24,backZ=-16.55;
let items=[],collisionBoxes=[],stairRoute=null,stationPositions=[],seatedAt=null,pcOpen=false;
const keys=new Set();const velocity=new THREE.Vector3();let started=false;
let sceneEntries=[{id:'piramide',name:'Pirámide SENATI · 6 pisos'},{id:'aula',name:'Aula de cómputo · 20 estaciones'}];
const material=(color,roughness=.76,metalness=.0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const M={floor:material(0xdccfba),wall:material(0xe3e9ef),blue:material(0x1554a1,.55),blueEdge:material(0x10386d),metal:material(0x687b90,.48,.4),black:material(0x1e2b37),screen:material(0x0d364f,.29),keys:material(0xd1dbe4),glass:new THREE.MeshPhysicalMaterial({color:0x8dc8e5,transparent:true,opacity:.38,depthWrite:false,roughness:.2,side:THREE.DoubleSide})};
function meshBox(parent,w,h,d,x,y,z,mat,shadow=true){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
function resetGroup(g){for(const obj of [...g.children])g.remove(obj);}
function station(parent,x,y,z,idx,floor){
  const group=new THREE.Group();group.position.set(x,y,z);group.name=`PC-${String(idx+1).padStart(2,'0')} · Piso ${floor+1}`;parent.add(group);
  meshBox(group,1.65,.09,.72,0,.77,0,M.blue);
  meshBox(group,1.65,.03,.74,0,.718,0,M.blueEdge);
  for(const dx of [-.73,.73])for(const dz of [-.25,.25]) meshBox(group,.055,.72,.055,dx,.36,dz,M.metal);
  meshBox(group,.62,.39,.055,0,1.15,-.22,M.black);
  meshBox(group,.58,.35,.012,0,1.15,-.252,M.screen,false);
  meshBox(group,.045,.14,.045,0,.91,-.17,M.metal);
  meshBox(group,.27,.025,.17,0,.84,-.17,M.metal);
  meshBox(group,.60,.022,.17,-.05,.835,.12,M.black,false);
  for(let r=0;r<3;r++)for(let c=0;c<10;c++)meshBox(group,.040,.006,.037,-.29+c*.056,.852,.064+r*.045,M.keys,false);
  const mouse=new THREE.Mesh(new THREE.SphereGeometry(.052,10,8),M.black);mouse.scale.set(.7,.33,1.0);mouse.position.set(.46,.84,.12);group.add(mouse);
  const chair=meshBox(group,.51,.11,.52,0,.55,.90,M.black);
  meshBox(group,.50,.58,.10,0,.94,1.16,M.black);
  meshBox(group,.05,.35,.05,0,.28,.90,M.metal);
  for(let a=0;a<5;a++){
    const t=a*Math.PI*2/5;
    const leg=meshBox(group,.40,.035,.050,Math.sin(t)*.16,.12,.90+Math.cos(t)*.16,M.metal);
    leg.rotation.y=t;
  }
  collisionBoxes.push({x0:x-.92,x1:x+.92,z0:z-.55,z1:z+1.34,floor});
  stationPositions.push({x,y,z,floor,id:idx+1});
}
function placeDecorModel(key,x,y,z,rotY=0,opts={}){
  const obj=createSceneModel(key,opts);obj.position.set(x,y,z);obj.rotation.y=rotY;furniture.add(obj);return obj;
}
function renderDemoFurniture(){
  resetGroup(furniture);collisionBoxes=[];stationPositions=[];
  if(kind==='piramide'){
    const floorY=currentFloor*H;
    // Puestos colocados dentro de aulas separadas. No se apilan sobre el pasadizo.
    const sx=building?.scaleX||1,sz=building?.scaleZ||1;
    const stations=ev52DeskPositions(sx,sz);
    stations.forEach((desk,idx)=>{
      station(furniture,desk.x,floorY,desk.z,idx,currentFloor);
      placeDecorModel(idx%2===0?'man-senati':'woman-senati',desk.x,floorY,desk.z+.90,Math.PI,{seated:true});
    });
    for(const room of EV52_ROOMS.filter(r=>r.pcs)){
      const x=(room.x0+room.x1)/2*sx,z=(room.z0+.44)*sz;
      placeDecorModel('teacher',x+.15,floorY,z,0,{seated:false});
      placeDecorModel('fan',x,floorY,(room.z0+room.z1)/2*sz,0,{});
    }
    placeDecorModel('safety-exit',0,floorY,(building.entry.frontZ-1.15),Math.PI,{});
    placeDecorModel('fire-extinguisher',7.9*sx,floorY,1.50*sz,-Math.PI/2,{});
    placeDecorModel('safety-rules',-8.0*sx,floorY,1.5*sz,Math.PI/2,{});
  }else{
    const xs=[-6.0,-2.0,2.0,6.0],zs=[-4.1,-2.1,-.1,1.9,3.9];
    zs.forEach((z,row)=>xs.forEach((x,col)=>{
      station(furniture,x,0,z,row*4+col,0);
      const avatar=((row+col)%2===0)?'man-senati':'woman-senati';
      placeDecorModel(avatar,x,0,z+.90,Math.PI,{seated:true});
    }));
    placeDecorModel('teacher',0,0,-5.0,0,{});
    for(const x of [-7,-2,2,7]) placeDecorModel('fan',x,0,-.1,0,{});
    placeDecorModel('safety-exit',9.7,0,4.28,-Math.PI/2,{});
    placeDecorModel('safety-rules',9.7,0,3.0,-Math.PI/2,{});
  }
}
function renderSavedFurniture(){
  resetGroup(furniture);collisionBoxes=[];stationPositions=[];
  const fBase=currentFloor*H;
  // Cargar solo el nivel actual: el mobiliario de otros pisos no afecta FPS ni colisiones.
  let ordered=items.filter(o=>Math.abs(Number(o.pos_y||0)-fBase)<H*.42);
  if(ordered.length>250) ordered=ordered.slice(0,250);
  const isPyramid=kind==='piramide';
  for(const o of ordered){
    const type=o.catalog_key;
    // Teclado y mouse están guardados como objetos independientes y se reconstruyen también.
    const model=createSceneModel(type,{seated:typeof o.config_json==='string'&&o.config_json.includes('"seated":true')});
    model.position.set(Number(o.pos_x),Number(o.pos_y),Number(o.pos_z));
    model.rotation.set(Number(o.rot_x)||0,Number(o.rot_y)||0,Number(o.rot_z)||0);
    model.scale.set(Number(o.scale_x)||1,Number(o.scale_y)||1,Number(o.scale_z)||1);
    furniture.add(model);
    if(type==='desk')stationPositions.push({x:model.position.x,y:model.position.y,z:model.position.z,floor:currentFloor,id:stationPositions.length+1});
    if(['desk','chair','wall'].includes(type)){
      const w=type==='desk'?1.6:type==='chair'?.52:1.0;
      const d=type==='desk'?.74:type==='chair'?.55:1.0;
      collisionBoxes.push({x0:model.position.x-w/2-.14,x1:model.position.x+w/2+.14,z0:model.position.z-d/2-.14,z1:model.position.z+d/2+.14,floor:currentFloor});
    }
  }
  if(!ordered.length) renderDemoFurniture();
}
function makeTiledFloor(parent,width,depth){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const c=canvas.getContext('2d');c.fillStyle='#e7ddca';c.fillRect(0,0,512,512);
  c.strokeStyle='#28292b';c.lineWidth=1.5;for(let i=0;i<=512;i+=128){c.beginPath();c.moveTo(i,0);c.lineTo(i,512);c.moveTo(0,i);c.lineTo(512,i);c.stroke();}
  const tx=new THREE.CanvasTexture(canvas);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(width/5,depth/5);tx.colorSpace=THREE.SRGBColorSpace;
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshStandardMaterial({map:tx,roughness:.92}));pl.rotation.x=-Math.PI/2;parent.add(pl);
}
function makeGenericRoom(){
  frontZ=6;backZ=-6;sideLeft=-10;sideRight=10;
  makeTiledFloor(sceneRoot,20,12);
  meshBox(sceneRoot,20,3.25,.14,0,1.62,-6,M.wall);
  meshBox(sceneRoot,.14,3.25,12,-10,1.62,0,M.wall);
  meshBox(sceneRoot,.14,3.25,12,10,1.62,0,M.wall);
  // Entrada abierta en pared frontal, con marco y hoja interactiva.
  meshBox(sceneRoot,8.8,3.25,.15,-5.6,1.62,6,M.wall);
  meshBox(sceneRoot,8.8,3.25,.15,5.6,1.62,6,M.wall);
  meshBox(sceneRoot,2.4,.60,.15,0,2.95,6,M.wall);
  const pivot=new THREE.Group();pivot.position.set(-1.18,0,6.05);sceneRoot.add(pivot);
  meshBox(pivot,2.35,2.25,.06,1.175,1.15,0,M.glass,false);
  building={entry:{x:0,frontZ:6,z:6.05},setDoorOpen(v){pivot.rotation.y=v?-Math.PI*.49:0;},stairs:null};
}
function setVisibility(){
  if(kind==='piramide'&&building?.setMode){
    // Exterior se mantiene para orientación; las ventanas dejan ver los interiores.
    building.setMode('transparente',true);
  }
}
function makeFloorOptions(){
  $('floor-select').innerHTML='';
  for(let i=0;i<totalFloors;i++){let o=document.createElement('option');o.value=String(i);o.textContent=i===0&&kind==='piramide'?'Piso 1 · planta V11 con atrio':`Piso ${i+1}`;$('floor-select').append(o);}
  $('floor-select').value=String(currentFloor);
}
function resetCamera(){
  velocity.set(0,0,0);stairRoute=null;seatedAt=null;closePC();
  camera.position.set(0,1.68,frontZ+5.4);
  camera.rotation.set(0,0,0,'YXZ');
  $('status').textContent='Acércate a la entrada y pulsa E para abrir la puerta.';
}
function setFloor(index){
  seatedAt=null;closePC();
  currentFloor=THREE.MathUtils.clamp(index,0,totalFloors-1);
  if(items.length) renderSavedFurniture(); else renderDemoFurniture();
  $('floor-select').value=String(currentFloor);
  $('floor-indicator').textContent=`Piso ${currentFloor+1} / ${totalFloors}`;
}
function buildScene(scenario){
  world.remove(sceneRoot);sceneRoot=new THREE.Group();world.add(sceneRoot);
  furniture=new THREE.Group();sceneRoot.add(furniture);
  items=[];doorOpen=false;stairRoute=null;seatedAt=null;closePC();
  kind=scenario.kind||'piramide';W=kind==='piramide'?DEFAULT_PYRAMID_WIDTH:20;D=kind==='piramide'?DEFAULT_PYRAMID_DEPTH:12;H=kind==='piramide'?DEFAULT_LEVEL_HEIGHT:3.35;
  totalFloors=kind==='piramide'?6:1;
  const app=scenario.appearance||{};
  if(scenario.data){
    const data=scenario.data;
    W=Number(data.width_m)||W;D=Number(data.depth_m)||D;H=Number(data.height_m)||H;
    items=data.objects||[];
    kind=app.buildingPlan==='senati-pyramid'?'piramide':'aula';
    totalFloors=kind==='piramide'?Math.min(6,Math.max(1,Number(app.floorCount)||6)):1;
  }
  if(kind==='piramide'){
    building=buildPiramideSENATI(sceneRoot,{width:W,depth:D,levelHeight:H,levels:totalFloors,mode:'transparente',roofVisible:true,
      facadeColor:app.facadeColor||'#afa59b',signColor:app.signColor||'#1251cb'});
    frontZ=building.entry.frontZ;backZ=building.walkBounds.back;sideLeft=building.walkBounds.left;sideRight=building.walkBounds.right;
  }else makeGenericRoom();
  setVisibility();currentFloor=0;makeFloorOptions();setFloor(0);resetCamera();
  $('scene-title').textContent=scenario.name;
  $('status').textContent=kind==='piramide'?'Pirámide V11 con tragaluz central abierto: salones y pasadizos proporcionados. E cerca del ascensor cambia de piso.':'Escenario preparado · Pulsa Empezar recorrido.';
}
async function loadScene(value){
  const selected=sceneEntries.find(s=>s.id===value)||sceneEntries[0];
  if(selected.id.startsWith('db:')){
    try{
      const res=await fetch(`api/scenarios.php?action=load&id=${encodeURIComponent(selected.id.slice(3))}`,{credentials:'same-origin'});
      const data=await res.json();if(!data.success)throw new Error(data.message||'No se pudo abrir el escenario');
      const app=typeof data.scenario.appearance_json==='string'?JSON.parse(data.scenario.appearance_json||'{}'):(data.scenario.appearance_json||{});
      buildScene({kind:app.buildingPlan==='senati-pyramid'?'piramide':'aula',name:selected.name,data:data.scenario,appearance:app});
    }catch(err){$('status').textContent='No se pudo cargar: '+err.message;}
  }else buildScene({kind:selected.id,name:selected.name});
}
async function initList(){
  try{
    const res=await fetch('api/scenarios.php?action=list',{credentials:'same-origin'});
    if(res.status===401||res.status===403){
      $('status').textContent='Modo visitante: disponibles las escenas de demostración, sin acceso a escenarios privados.';
    }else{
      const data=await res.json();
      if(data.success){for(const item of data.scenarios){sceneEntries.push({id:`db:${item.id}`,name:`Guardado: ${item.name}`});}}
    }
  }catch(_e){$('status').textContent='No se pudo conectar a MySQL: puedes recorrer las escenas de demostración.';}
  const select=$('scenario-select');select.replaceChildren();
  for(const s of sceneEntries){const opt=document.createElement('option');opt.value=s.id;opt.textContent=s.name;select.add(opt);}
  select.value='piramide';await loadScene('piramide');
}
function nearbyStation(maxDistance=1.75){
  let best=null,dist=maxDistance;
  for(const s of stationPositions){
    if(s.floor!==currentFloor)continue;
    const d=Math.hypot(camera.position.x-s.x,camera.position.z-(s.z+.90));
    if(d<dist){dist=d;best=s;}
  }
  return best;
}
function nearbyClassroomDoor(maxDistance=2.0){
  if(kind!=='piramide'||!building?.classroomDoors)return null;
  let found=null,distance=maxDistance;
  for(const d of building.classroomDoors){
    if(d.floor!==currentFloor)continue;
    const dist=Math.hypot(camera.position.x-d.x,camera.position.z-d.z);
    if(dist<distance){distance=dist;found=d;}
  }
  return found;
}
function sitAtPC(){
  if(pcOpen)return;
  if(seatedAt){standFromPC();return;}
  const station=nearbyStation(1.75);
  if(!station){$('status').textContent='Acércate a un asiento y vuelve a pulsar Sentarse o la tecla E.';return;}
  seatedAt=station;keys.clear();velocity.set(0,0,0);
  camera.position.set(station.x,station.y+1.28,station.z+.90);
  camera.rotation.set(-.035,0,0,'YXZ');
  $('status').textContent=`Sentado en PC-${String(station.id).padStart(2,'0')} · Piso ${station.floor+1}. Pulsa F para usar la computadora, E para levantarte.`;
  $('sit-button').textContent='Levantarse (E)';
  $('pc-button').disabled=false;
}
function standFromPC(){
  if(!seatedAt)return;
  const s=seatedAt;seatedAt=null;closePC();
  camera.position.set(s.x+1.38,s.y+1.68,s.z+.84);
  if(!canMove(camera.position.x,camera.position.z))camera.position.set(0,s.y+1.68,0);
  velocity.set(0,0,0);
  $('sit-button').textContent='Sentarse (E)';$('pc-button').disabled=true;
  $('status').textContent='Te levantaste. Puedes seguir recorriendo el salón.';
}
function openPC(){
  if(!seatedAt){$('status').textContent='Primero siéntate en un escritorio.';return;}
  pcOpen=true;
  $('pc-number').textContent=`PC-${String(seatedAt.id).padStart(2,'0')} · PISO ${seatedAt.floor+1}`;
  $('pc-panel').hidden=false;
  if(walk.isLocked)walk.unlock();
}
function closePC(){pcOpen=false;const panel=$('pc-panel');if(panel)panel.hidden=true;}
function nearElevator(maxDistance=2.50){
  if(kind!=='piramide'||!building?.elevator)return false;
  const el=building.elevator;
  return Math.hypot(camera.position.x-el.x,camera.position.z-el.accessZ)<maxDistance;
}
function takeElevator(){
  if(!nearElevator())return false;
  const next=(currentFloor+1)%totalFloors;
  setFloor(next);
  camera.position.set(building.elevator.x,next*H+1.68,building.elevator.accessZ);
  velocity.set(0,0,0);stairRoute=null;
  $('status').textContent=`Ascensor didáctico: planta ${next+1}. Presiona E para ir a la siguiente planta.`;
  return true;
}
function interaction(){
  if(pcOpen){closePC();return;}
  if(seatedAt){standFromPC();return;}
  if(nearDoor()){toggleDoor();return;}
  if(takeElevator())return;
  const door=nearbyClassroomDoor();
  if(door){building.setClassroomDoorOpen(door.floor,door.id,!door.open);$('status').textContent=door.open?'Puerta del aula abierta.':'Puerta del aula cerrada.';return;}
  sitAtPC();
}

function canMove(x,z){
  // Huecos estrechos del croquis: radio didáctico para circulación en planta 1.
  // No representa una anchura mínima normativa o una ruta de evacuación certificada.
  const r=kind==='piramide'&&currentFloor===0?.18:.26;
  if(seatedAt)return false;
  // Colisiones calculadas para la MISMA escala usada por la geometría 3D;
  // todas las plantas usan el mismo sistema, sin reglas rígidas de la V7.
  if(kind==='piramide'&&building?.floorWallBoxes){
    const walls=building.floorWallBoxes[currentFloor]||[];
    for(const wall of walls){
      if(x>wall.x0-r&&x<wall.x1+r&&z>wall.z0-r&&z<wall.z1+r)return false;
    }
    for(const door of building.classroomDoors){
      if(door.floor!==currentFloor||door.open)continue;
      if(Math.abs(z-door.z)<r+.075&&Math.abs(x-door.x)<(door.halfWidth||.84)+r)return false;
    }
  }
  if(kind==='piramide'&&building?.stairs){
    // El tramo puede abordarse por los extremos. No se puede atravesar por
    // un lateral el hueco que comunica pisos diferentes.
    for(const st of building.staircases){
      const wasIn=camera.position.x>st.xMin+.16&&camera.position.x<st.xMax-.16&&camera.position.z<st.zBottom&&camera.position.z>st.zTop;
      const nowIn=x>st.xMin+.16&&x<st.xMax-.16&&z<st.zBottom&&z>st.zTop;
      if(nowIn&&!wasIn&&z<st.zBottom-.30&&z>st.zTop+.30)return false;
      if(wasIn&&!nowIn&&z<st.zBottom-.30&&z>st.zTop+.30)return false;
    }
  }
  if(kind==='piramide'){
    // Sólo se puede cruzar la fachada por la entrada real y cuando está abierta.
    const inside=camera.position.z<frontZ;
    const willInside=z<frontZ;
    if(inside!==willInside && (!doorOpen||Math.abs(x)>1.80))return false;
    if(willInside){
      if(x<sideLeft+r||x>sideRight-r||z<backZ+r)return false;
    }else if(Math.abs(x)>W*.95||z>frontZ+16)return false;
  }else{
    const inside=camera.position.z<frontZ;
    const willInside=z<frontZ;
    if(inside!==willInside&&(!doorOpen||Math.abs(x)>1.0))return false;
    if(willInside&&(x<sideLeft+r||x>sideRight-r||z<backZ+r))return false;
    if(!willInside&&z>frontZ+12)return false;
  }
  // Un objeto sólido no puede traspasarse; se deja un pasillo junto al núcleo de escaleras.
  for(const o of collisionBoxes){
    if(o.floor!==currentFloor)continue;
    if(x>o.x0-r&&x<o.x1+r&&z>o.z0-r&&z<o.z1+r)return false;
  }
  return true;
}
function updateStairs(prevZ){
  if(kind!=='piramide'||!building?.stairs){camera.position.y=1.68;return;}
  const z=camera.position.z,x=camera.position.x;
  const all=building.staircases||[building.stairs];
  const inside=st=>x>st.xMin+.20&&x<st.xMax-.20&&z<st.zBottom&&z>st.zTop;
  const candidate=all.find(inside);
  if(candidate&&!stairRoute){
    const fromTop=prevZ<=candidate.zTop+.25;
    const base=fromTop?currentFloor-1:currentFloor;
    if(base<0||base>=totalFloors-1){camera.position.z=prevZ;camera.position.y=currentFloor*H+1.68;return;}
    stairRoute={base,st: candidate};
  }
  if(stairRoute){
    const st=stairRoute.st;
    const percent=THREE.MathUtils.clamp((st.zBottom-z)/(st.zBottom-st.zTop),0,1);
    camera.position.y=(stairRoute.base+percent)*H+1.68;
    if(!inside(st)){
      const endedAtTop=z<=st.zTop;
      currentFloor=THREE.MathUtils.clamp(stairRoute.base+(endedAtTop?1:0),0,totalFloors-1);
      stairRoute=null;
      setFloor(currentFloor);
      camera.position.y=currentFloor*H+1.68;
    }
  }else camera.position.y=currentFloor*H+1.68;
}
function nearDoor(){return building?.entry && Math.hypot(camera.position.x-building.entry.x,camera.position.z-building.entry.z)<2.7 && currentFloor===0;}
function toggleDoor(){if(!nearDoor()){$('status').textContent='Acércate a la entrada para usar la puerta.';return;}doorOpen=!doorOpen;building.setDoorOpen(doorOpen);$('status').textContent=doorOpen?'Puerta abierta. Puedes pasar.':'Puerta cerrada.';}
const clock=new THREE.Clock();
let currentAction='';
function tick(){
  const dt=Math.min(clock.getDelta(),.045);
  if(started&&walk.isLocked&&!pcOpen){
    const forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
    const sideways=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
    const input=new THREE.Vector3(sideways,0,-forward);
    if(input.lengthSq()>0)input.normalize();
    const speed=seatedAt?0:Number($('speed').value)*(keys.has('shift')?1.8:1);
    const responsiveness=1-Math.exp(-16*dt);
    velocity.x=THREE.MathUtils.lerp(velocity.x,input.x*speed,responsiveness);
    velocity.z=THREE.MathUtils.lerp(velocity.z,input.z*speed,responsiveness);
    const yaw=camera.rotation.y;
    const dx=(velocity.x*Math.cos(yaw)+velocity.z*Math.sin(yaw))*dt;
    const dz=(-velocity.x*Math.sin(yaw)+velocity.z*Math.cos(yaw))*dt;
    const oldZ=camera.position.z;
    // Movimiento separado por eje: el personaje se desliza al rozar obstáculos sin atravesarlos.
    if(canMove(camera.position.x+dx,camera.position.z))camera.position.x+=dx;
    else velocity.x*=.38;
    if(canMove(camera.position.x,camera.position.z+dz))camera.position.z+=dz;
    else velocity.z*=.38;
    if(!seatedAt)updateStairs(oldZ);
    const door=nearbyClassroomDoor();
    const pc=nearbyStation();
    const doorText=seatedAt?'Pulsa F para usar PC · E para levantarte':nearDoor()?'Pulsa E para '+(doorOpen?'cerrar':'abrir')+' la puerta':nearElevator()?'Pulsa E: ascensor hacia el siguiente piso':door?`Pulsa E para ${door.open?'cerrar':'abrir'} la puerta del aula`:pc?`Pulsa E para sentarte en PC-${String(pc.id).padStart(2,'0')}`:'';
    if(doorText!==currentAction){currentAction=doorText;$('walk-tooltip').textContent=doorText;$('walk-tooltip').classList.toggle('visible',!!doorText);}
    $('floor-indicator').textContent=`Piso ${currentFloor+1} / ${totalFloors}`;
  }
  renderer.render(world,camera);
}
walk.addEventListener('lock',()=>{started=true;document.body.classList.add('walk-active');$('crosshair').classList.add('visible');$('status').textContent='WASD: caminar · Shift: correr · E: puerta o asiento · F: usar PC · Tab: escenarios · Esc: mouse';});
walk.addEventListener('unlock',()=>{document.body.classList.remove('walk-active');$('crosshair').classList.remove('visible');$('walk-tooltip').classList.remove('visible');keys.clear();velocity.set(0,0,0);});
$('start-walk').addEventListener('click',()=>walk.lock());
$('reset-walk').addEventListener('click',()=>{resetCamera();setFloor(0);});
$('door-button').addEventListener('click',interaction);
$('sit-button').addEventListener('click',()=>seatedAt?standFromPC():sitAtPC());
$('pc-button').addEventListener('click',openPC);
$('pc-close').addEventListener('click',closePC);
$('scenario-select').addEventListener('change',e=>{if(walk.isLocked)walk.unlock();loadScene(e.target.value);});
$('floor-select').addEventListener('change',e=>{if(walk.isLocked)walk.unlock();setFloor(Number(e.target.value));camera.position.set(0,currentFloor*H+1.68,frontZ-1.8);camera.rotation.set(0,0,0,'YXZ');velocity.set(0,0,0);});
$('speed').addEventListener('input',e=>$('speed-value').textContent=e.target.value);
$('sensitivity').addEventListener('input',e=>{walk.pointerSpeed=Number(e.target.value);$('sensitivity-value').textContent=e.target.value;});
$('fov').addEventListener('input',e=>{camera.fov=Number(e.target.value);camera.updateProjectionMatrix();$('fov-value').textContent=e.target.value;});
window.addEventListener('keydown',async e=>{
  const k=e.key.toLowerCase();
  if(walk.isLocked){
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift','tab','e','f'].includes(k))e.preventDefault();
    if(k==='e'&&!e.repeat)interaction();
    if(k==='f'&&!e.repeat)openPC();
    if(k==='tab'&&!e.repeat){
      const idx=sceneEntries.findIndex(s=>s.id===$('scenario-select').value);
      const next=sceneEntries[(idx+1)%sceneEntries.length];
      $('scenario-select').value=next.id;
      // Se conserva la sesión del usuario; se libera el mouse para poder reiniciar con clic.
      walk.unlock();await loadScene(next.id);
      $('status').textContent='Escenario cambiado. Pulsa Empezar recorrido para continuar.';
    }
    if(!['e','f','tab'].includes(k))keys.add(k);
  }
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();velocity.set(0,0,0);});
function fit(){const w=host.clientWidth,h=host.clientHeight;if(w<2||h<2)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
new ResizeObserver(fit).observe(host);window.addEventListener('resize',fit);
initList().finally(()=>{fit();renderer.setAnimationLoop(tick);});
