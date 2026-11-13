import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildPiramideSENATI } from './piramide-senati.js';
import {EV52_ROOMS,ev52DeskPositions,pyramidScale,DEFAULT_PYRAMID_WIDTH,DEFAULT_PYRAMID_DEPTH,DEFAULT_LEVEL_HEIGHT} from './ev52-layout.js';
import thumbManSenati from './assets/library/student-senati-m.webp';
import thumbWomanSenati from './assets/library/student-senati-f.webp';
import thumbManCasual from './assets/library/student-casual-m.webp';
import thumbWomanCasual from './assets/library/student-casual-f.webp';
import thumbTeacher from './assets/library/teacher-m.webp';
import thumbTeacherFemale from './assets/library/teacher-f.webp';
import thumbDesk from './assets/library/desk.webp';
import thumbChair from './assets/library/chair.webp';
import thumbAio from './assets/library/aio.webp';
import thumbKeyboardMouse from './assets/library/keyboard-mouse.webp';
import thumbWindow from './assets/library/window.webp';
import thumbDoor from './assets/library/door.webp';
import thumbWhiteboard from './assets/library/whiteboard.webp';
import thumbFluorescent from './assets/library/fluorescent.webp';
import thumbFan from './assets/library/fan.webp';
import thumbProjector from './assets/library/projector.webp';
import './editor.css';

const $ = (id) => document.getElementById(id);
const viewport = $('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeaf0f7);

const camera = new THREE.PerspectiveCamera(45, 1, .1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.physicallyCorrectLights = true;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
const walkControls = new PointerLockControls(camera, renderer.domElement);
const walkClock = new THREE.Clock();
const walkKeys = { forward:false, backward:false, left:false, right:false, sprint:false };
const walkSmooth=new THREE.Vector2();
let walkDoorOpen=false,walkStairRoute=null;
walkControls.pointerSpeed=.85;
let walkMode = false;
controls.enableDamping = true;
controls.dampingFactor = .07;
controls.maxPolarAngle = Math.PI * .49;
controls.minDistance = 4;
controls.maxDistance = 150;

const hemi = new THREE.HemisphereLight(0xf2f7ff, 0x64748b, 1.65);scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff8ed, 2.25);
sun.position.set(-12, 22, 16); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xb6d6ff, .8);
fill.position.set(12, 10, -12); scene.add(fill);

const roomGroup = new THREE.Group(); roomGroup.name = 'Room'; scene.add(roomGroup);
const objectGroup = new THREE.Group(); objectGroup.name = 'PlacedObjects'; scene.add(objectGroup);
let room = { width: 20, depth: 12, height: 3.4 };
let appearance = {
  floorType: 'tile', floorColor: '#f2f4f7', wallColor: '#f1f3f6',
  deskColor: '#1559a8', chairColor: '#202a38'
};
let placed = [];
let selected = null;
let activeTool = 'select';
let activeCategory = 'all';
let activePlacementKey = null;
let currentScenarioId = null;
let gridVisible = true;
let roofVisible = false;
let floorMesh, gridHelper, roofMesh, roomEdges;
let activeFloorIndex=0;
let walkFloorIndex=0, walkOnStairs=false;
let floorMeshes=[];
let pyramidBuilding=null;
let selectionHelper = null;
let pointerDown = null;
let isDraggingObject = false;
let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const floorY = .015;
// Dimensiones físicas únicas para todos los escritorios (metros): 158 x 72 cm.
const DESK_LENGTH = 1.58;
const DESK_DEPTH = .72;

function ensureFloorModel(){
  const wanted=appearance.buildingPlan==='senati-pyramid'?THREE.MathUtils.clamp(Number(appearance.floorCount)||5,3,6):(appearance.buildingPlan==='two-floor'?2:1);
  const current=Array.isArray(appearance.floors)?appearance.floors:[];
  const floors=[];
  for(let i=0;i<wanted;i++){
    const saved=current[i]||{};
    floors.push({
      id:i+1,
      name:saved.name||`Piso ${i+1}`,
      elevation:i*room.height,
      height:room.height,
      floorType:saved.floorType||appearance.floorType||'tile',
      floorColor:saved.floorColor||appearance.floorColor||'#f2f4f7'
    });
  }
  appearance.floors=floors;
  activeFloorIndex=THREE.MathUtils.clamp(activeFloorIndex,0,wanted-1);
  return floors;
}
function getFloors(){return ensureFloorModel();}
function floorElevation(index=activeFloorIndex){return getFloors()[index]?.elevation??0;}
function floorStyle(index){
  const floor=getFloors()[index]||{};
  return {floorType:floor.floorType||appearance.floorType||'tile',floorColor:floor.floorColor||appearance.floorColor||'#f2f4f7'};
}
function getStairSpec(){
  const st=appearance.stairs||{};
  return {x:Number(st.x??5.25),topZ:Number(st.topZ??-2),bottomZ:Number(st.bottomZ??3.45),width:Number(st.width??2.55)};
}
function syncFloorControls(){
  const floors=getFloors();
  const active=$('construction-floor');
  const scope=$('floor-edit-scope');
  if(!active||!scope)return;
  const previous=active.value||'all';
  active.innerHTML='<option value="all">Vista global · todos los niveles</option>'+floors.map((f,i)=>`<option value="${i}">${f.name}</option>`).join('');
  active.value=[...active.options].some(o=>o.value===previous)?previous:'all';
  if(active.value!=='all')activeFloorIndex=Number(active.value)||0;
  scope.innerHTML='<option value="global">Global · todos los pisos</option>'+floors.map((f,i)=>`<option value="${i}">${f.name}</option>`).join('');
  if(![...scope.options].some(o=>o.value===scope.value))scope.value='global';
  const isPyramid=appearance.buildingPlan==='senati-pyramid';
  $('remove-floor').disabled=floors.length<=(isPyramid?3:1);
  $('add-floor').disabled=floors.length>=(isPyramid?6:2);
  $('floor-manager-hint').textContent=isPyramid?`${floors.length} plantas conceptuales, con escaleras transitables. No son planos estructurales reales.`:(floors.length===1?'Este escenario tiene un nivel. Agrega el segundo piso para habilitar la escalera y la conexión vertical.':'Selecciona el piso de trabajo. Los cambios Globales se aplican a todos los niveles.');
  const style=scope.value==='global'?{floorType:appearance.floorType,floorColor:appearance.floorColor}:floorStyle(Number(scope.value));
  $('floor-type').value=style.floorType;
  $('floor-color').value=style.floorColor;
}
function applyFloorVisibility(){
  const floors=getFloors();
  const all=$('construction-floor')?.value==='all';
  const index=activeFloorIndex;
  placed.forEach(obj=>{
    const objectFloor=nearestFloorIndex(obj.position.y,floors);
    obj.visible=all||objectFloor===index;
  });
}
function nearestFloorIndex(y,floors=getFloors()){
  let best=0,bestDistance=Infinity;
  floors.forEach((f,i)=>{const distance=Math.abs(y-f.elevation);if(distance<bestDistance){best=i;bestDistance=distance;}});
  return best;
}
function selectConstructionFloor(index,{moveCamera=true}={}){
  const floors=getFloors();
  activeFloorIndex=THREE.MathUtils.clamp(Number(index)||0,0,floors.length-1);
  if($('construction-floor'))$('construction-floor').value=String(activeFloorIndex);
  applyFloorVisibility();
  if(gridHelper)gridHelper.position.y=floorElevation(activeFloorIndex)+.012;
  if(moveCamera){
    const delta=floorElevation(activeFloorIndex)-controls.target.y+1.05;
    camera.position.y+=delta;controls.target.y=floorElevation(activeFloorIndex)+1.05;controls.update();
  }
  $('viewport-status').textContent=`Edición: ${floors[activeFloorIndex].name}`;
}
function setFloorCount(count){
  if(appearance.buildingPlan==='senati-pyramid'){
    const old=getFloors();
    count=THREE.MathUtils.clamp(Number(count)||6,3,6);
    appearance.floorCount=count;
    appearance.floors=Array.from({length:count},(_,i)=>old[i]||{id:i+1,name:`Planta ${i+1} (aproximada)`,elevation:i*room.height,height:room.height,floorType:appearance.floorType,floorColor:appearance.floorColor});
    for(const obj of [...placed])if(obj.position.y>(count-1)*room.height+.5){objectGroup.remove(obj);placed.splice(placed.indexOf(obj),1);}
    activeFloorIndex=Math.min(activeFloorIndex,count-1);
    syncFloorControls();makeRoom();applyFloorVisibility();renderObjectList();markDirty();
    return;
  }
  count=THREE.MathUtils.clamp(Number(count)||1,1,2);
  const existing=getFloors();
  if(count===2){
    appearance.buildingPlan='two-floor';
    appearance.floorHeight=room.height;
    if(!appearance.stairs)appearance.stairs={x:5.25,topZ:-2,bottomZ:3.45,width:2.55};
    appearance.floors=[existing[0],existing[1]||{id:2,name:'Piso 2',elevation:room.height,height:room.height,floorType:appearance.floorType,floorColor:appearance.floorColor}];
  }else{
    appearance.buildingPlan='single-floor';
    appearance.floors=[existing[0]];
    const removed=placed.filter(o=>o.position.y>room.height*.5);
    removed.forEach(o=>{objectGroup.remove(o);const idx=placed.indexOf(o);if(idx>=0)placed.splice(idx,1);});
    activeFloorIndex=0;
  }
  syncFloorControls();makeRoom();applyFloorVisibility();renderObjectList();markDirty();
}

const catalog = [
  {key:'desk',label:'Escritorio informático estándar',category:'mobiliario',icon:'▰',description:'158 × 72 cm · frente marcado, zona de teclado y canal posterior para cables'},
  {key:'chair',label:'Silla giratoria',category:'mobiliario',icon:'◉',description:'Base de cinco radios'},
  {key:'aio',label:'PC All-in-One XL',category:'computacion',icon:'▣',description:'Pantalla ampliada y base grande · teclado y mouse automáticos'},
  {key:'keyboard',label:'Teclado',category:'computacion',icon:'⌨',description:'Teclado independiente'},
  {key:'mouse',label:'Mouse',category:'computacion',icon:'⌁',description:'Mouse óptico'},
  {key:'man',label:'Hombre · polo casual',category:'personas',icon:'👨',description:'Alumno con polo de color aleatorio'},
  {key:'woman',label:'Mujer · polo casual',category:'personas',icon:'👩',description:'Alumna con polo de color aleatorio'},
  {key:'man-senati',label:'Hombre · polo SENATI',category:'personas',icon:'👨‍🎓',description:'Alumno con polo institucional SENATI'},
  {key:'woman-senati',label:'Mujer · polo SENATI',category:'personas',icon:'👩‍🎓',description:'Alumna con polo institucional SENATI'},
  {key:'teacher',label:'Profesor · terno',category:'personas',icon:'🧑‍🏫',description:'Docente con terno formal'},
  {key:'teacher-f',label:'Profesora · terno',category:'personas',icon:'👩‍🏫',description:'Docente con traje formal'},
  {key:'wall',label:'Pared',category:'arquitectura',icon:'▤',description:'Tramo de pared'},
  {key:'door',label:'Puerta de vidrio',category:'arquitectura',icon:'▯',description:'Puerta con marco'},
  {key:'window',label:'Ventana',category:'arquitectura',icon:'▦',description:'Ventana de pared'},
  {key:'whiteboard',label:'Pizarra',category:'arquitectura',icon:'▱',description:'Pizarra blanca'},
  {key:'fluorescent',label:'Fluorescente',category:'equipamiento',icon:'━',description:'Luminaria rectangular'},
  {key:'fan',label:'Ventilador',category:'equipamiento',icon:'✥',description:'Ventilador de techo'},
  {key:'projector',label:'Proyector',category:'equipamiento',icon:'▰',description:'Proyector de techo'},
  {key:'plant',label:'Planta decorativa',category:'equipamiento',icon:'♧',description:'Maceta decorativa'},
  {key:'safety-exit',label:'Rótulo SALIDA',category:'seguridad',icon:'🟩',description:'Señal fotoluminiscente de salida'},
  {key:'safety-rules',label:'Reglas de seguridad',category:'seguridad',icon:'⚠️',description:'Panel de normas de seguridad del aula'},
  {key:'fire-extinguisher',label:'Extintor',category:'seguridad',icon:'🧯',description:'Extintor rojo con soporte y señal identificativa'},
  {key:'safety-first-aid',label:'Señal de botiquín',category:'seguridad',icon:'✚',description:'Señal verde de primeros auxilios'},
  {key:'safety-electrical',label:'Riesgo eléctrico',category:'seguridad',icon:'⚡',description:'Advertencia amarilla de riesgo eléctrico'},
  {key:'safety-safe-zone',label:'Zona segura',category:'seguridad',icon:'🟢',description:'Identificación de zona segura'},
  {key:'safety-evacuation',label:'Ruta de evacuación',category:'seguridad',icon:'➡️',description:'Señal direccional de evacuación'}
];
const categoryLabels = {mobiliario:'Mobiliario',computacion:'Computación',personas:'Personas',arquitectura:'Arquitectura',equipamiento:'Equipamiento',seguridad:'Seguridad'};
const libraryThumbs = {
  'man-senati':thumbManSenati,'woman-senati':thumbWomanSenati,
  man:thumbManCasual,woman:thumbWomanCasual,teacher:thumbTeacher,'teacher-f':thumbTeacherFemale,
  desk:thumbDesk,chair:thumbChair,aio:thumbAio,keyboard:thumbKeyboardMouse,mouse:thumbKeyboardMouse,
  window:thumbWindow,door:thumbDoor,whiteboard:thumbWhiteboard,
  fluorescent:thumbFluorescent,fan:thumbFan,projector:thumbProjector
};
const mat = (color, roughness=.72, metalness=0) => new THREE.MeshStandardMaterial({color,roughness,metalness});
const mats = {
  desk:mat(0x164b82,.48),deskEdge:mat(0x0d3159,.55),black:mat(0x171c24,.75),
  metal:mat(0x6f7b88,.42,.55),blue:mat(0x07549b,.68),yellow:mat(0xf3c34b,.5),
  skin:mat(0xc88f6b,.85),white:mat(0xf6f7f8,.5),glass:new THREE.MeshPhysicalMaterial({color:0xbfe9f7,roughness:.06,metalness:0,transparent:true,opacity:.24,transmission:.72,thickness:.06,ior:1.46,depthWrite:false,side:THREE.DoubleSide}),
  wall:mat(0xe3e7eb,.9),green:mat(0x327f5a,.85),brown:mat(0x8a6245,.8)
};
function mesh(parent, geometry, material, x=0, y=0, z=0, cast=true) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x,y,z); m.castShadow=cast; m.receiveShadow=true; parent.add(m); return m;
}
function box(parent,w,h,d,material,x,y,z) {
  return mesh(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z);
}
function cylinder(parent,rt,rb,h,material,x,y,z,segments=16) {
  return mesh(parent,new THREE.CylinderGeometry(rt,rb,h,segments),material,x,y,z);
}
function hexColor(hex){ return new THREE.Color(hex || '#ffffff'); }
function makeFloorTexture(type, colorHex) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d');const color=colorHex||'#f3f4f6';
  ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
  const c=hexColor(color);
  const lighter='#'+c.clone().lerp(new THREE.Color(0xffffff),.13).getHexString();
  const darker='#'+c.clone().lerp(new THREE.Color(0x000000),.10).getHexString();
  if(type==='tile'){
    ctx.fillStyle=lighter;ctx.fillRect(0,0,256,256);ctx.fillRect(256,256,256,256);
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(256,0,256,256);ctx.fillRect(0,256,256,256);
    ctx.strokeStyle='rgba(115,128,144,.22)';ctx.lineWidth=3;ctx.strokeRect(2,2,508,508);ctx.beginPath();ctx.moveTo(256,0);ctx.lineTo(256,512);ctx.moveTo(0,256);ctx.lineTo(512,256);ctx.stroke();
  } else if(type==='wood'){
    ctx.fillStyle=lighter;
    for(let y=0;y<256;y+=64){ctx.fillRect(0,y,256,62);ctx.fillStyle=darker;ctx.fillRect(0,y+62,256,2);ctx.fillStyle=lighter;
      const offset=(y/64%2)*64;ctx.strokeStyle='rgba(80,50,25,.20)';ctx.beginPath();ctx.moveTo(offset,y);ctx.lineTo(offset,y+64);ctx.moveTo(offset+128,y);ctx.lineTo(offset+128,y+64);ctx.stroke();}
    ctx.strokeStyle='rgba(90,65,40,.10)';for(let i=0;i<40;i++){const y=(i*37)%256;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y+((i%3)-1)*3);ctx.stroke();}
  } else if(type==='carpet'){
    ctx.fillStyle=lighter;ctx.fillRect(0,0,256,256);
    for(let i=0;i<2400;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.12)':'rgba(30,40,50,.08)';const x=(i*73)%256,y=(i*137)%256;ctx.fillRect(x,y,2,2);}
  } else {
    ctx.strokeStyle='rgba(110,120,130,.12)';ctx.lineWidth=1;
    for(let i=0;i<120;i++){const x=(i*61)%256,y=(i*97)%256;ctx.beginPath();ctx.arc(x,y,(i%4)+1,0,Math.PI*2);ctx.stroke();}
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(room.width/1.35,room.depth/1.35);texture.anisotropy=8;
  return texture;
}
function addRoomBox(w,h,d,material,x,y,z){return box(roomGroup,w,h,d,material,x,y,z);}
function wallBandZ(a,b,z,y,h,material){
  if(b-a<.02||h<.02)return;
  addRoomBox(b-a,h,.18,material,(a+b)/2,y+h/2,z);
}
function wallBandX(x,a,b,y,h,material){
  if(b-a<.02||h<.02)return;
  addRoomBox(.18,h,b-a,material,x,y+h/2,(a+b)/2);
}
function buildWallZ(z, openings=[]){
  const W=room.width,H=room.height,white=mat(appearance.wallColor||0xf4f6f8,.88),blue=mat(0x1456a2,.72);
  const sill=1.12,head=2.58;let cursor=-W/2;
  const list=[...openings].filter(o=>o.center-o.width/2>-W/2+.05&&o.center+o.width/2<W/2-.05).sort((a,b)=>a.center-b.center);
  for(const o of list){
    const left=o.center-o.width/2,right=o.center+o.width/2;
    if(left>cursor){wallBandZ(cursor,left,z,0,Math.min(.98,H),blue);wallBandZ(cursor,left,z,.98,H-.98,white);}
    const bottom=o.type==='door'?0:sill,top=o.type==='door'?2.48:head;
    if(bottom>0)wallBandZ(left,right,z,0,bottom,blue);
    if(H>top)wallBandZ(left,right,z,top,H-top,white);
    cursor=right;
  }
  if(cursor<W/2){wallBandZ(cursor,W/2,z,0,Math.min(.98,H),blue);wallBandZ(cursor,W/2,z,.98,H-.98,white);}
}
function buildWallX(x, openings=[]){
  const D=room.depth,H=room.height,white=mat(appearance.wallColor||0xf4f6f8,.88),blue=mat(0x1456a2,.72);
  const sill=1.12,head=2.58;let cursor=-D/2;
  const list=[...openings].filter(o=>o.center-o.width/2>-D/2+.05&&o.center+o.width/2<D/2-.05).sort((a,b)=>a.center-b.center);
  for(const o of list){
    const a=o.center-o.width/2,b=o.center+o.width/2;
    if(a>cursor){wallBandX(x,cursor,a,0,Math.min(.98,H),blue);wallBandX(x,cursor,a,.98,H-.98,white);}
    const bottom=o.type==='door'?0:sill,top=o.type==='door'?2.48:head;
    if(bottom>0)wallBandX(x,a,b,0,bottom,blue);
    if(H>top)wallBandX(x,a,b,top,H-top,white);
    cursor=b;
  }
  if(cursor<D/2){wallBandX(x,cursor,D/2,0,Math.min(.98,H),blue);wallBandX(x,cursor,D/2,.98,H-.98,white);}
}
function addBranding(){
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=300;const c=canvas.getContext('2d');
  c.clearRect(0,0,720,300);c.fillStyle='#0e57b7';c.beginPath();
  const cx=360,cy=84,r=56;for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3;const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();
  c.fillStyle='#fff';c.font='900 72px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('S',cx,cy+2);
  c.fillStyle='#0b4f9e';c.font='900 72px Arial';c.fillText('SENATI',360,226);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mark=mesh(roomGroup,new THREE.PlaneGeometry(2.05,.86),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}),-2.55,2.24,-room.depth/2+.105,false);
  mark.userData.roomBrand=true;
}
function buildExterior(){
  const outerX=-room.width/2-3.8;
  const groundMat=mat(0x9bb69b,.94);mesh(roomGroup,new THREE.PlaneGeometry(7,room.depth+7),groundMat,outerX,0.015,0,false).rotation.x=-Math.PI/2;
  const facade=mat(0xb9cbd8,.68);const frame=mat(0x73899d,.48,.25);const skyGlass=new THREE.MeshPhysicalMaterial({color:0xa9d8f0,roughness:.12,transparent:true,opacity:.42,transmission:.2,side:THREE.DoubleSide,depthWrite:false});
  const building=box(roomGroup,.24,4.4,room.depth+5,facade,-room.width/2-6.6,2.2,0);building.castShadow=false;
  for(let z=-room.depth/2-1.2;z<=room.depth/2+1.2;z+=2.25){
    box(roomGroup,.03,2.0,1.35,skyGlass,-room.width/2-6.43,2.65,z);
    box(roomGroup,.05,2.05,.045,frame,-room.width/2-6.39,2.65,z-.70);
    box(roomGroup,.05,2.05,.045,frame,-room.width/2-6.39,2.65,z+.70);
  }
  for(const z of [-4.5,-.2,4.2]){
    cylinder(roomGroup,.055,.075,1.35,mat(0x795b3e,.9),-room.width/2-2.3,.68,z,10);
    const foliage=mat(0x4f9461,.88);
    for(const [dx,dy,dz,scale] of [[0,1.65,0,.72],[-.30,1.35,.18,.52],[.25,1.42,-.12,.56]]){const crown=mesh(roomGroup,new THREE.SphereGeometry(scale,18,14),foliage,-room.width/2-2.3+dx,dy,z+dz);crown.scale.y=1.12;}
  }
}
let rainPoints=null;
function applyClimate(mode){
 appearance.climate=mode||'day';
 const night=appearance.climate==='night',rain=appearance.climate==='rain';
 scene.background=new THREE.Color(night?0x101a30:(rain?0x8998aa:0xb9d8f3));
 hemi.intensity=night?.42:(rain?.95:1.65);
 sun.intensity=night?.12:(rain?.72:2.25);
 fill.intensity=night?.22:(rain?.42:.8);
 sun.color.set(night?0x9bb8e8:(rain?0xcbd8e8:0xfff8ed));
 if(rain&&!rainPoints){
  const positions=new Float32Array(900*3);
  for(let i=0;i<900;i++){positions[i*3]=(Math.random()-.5)*room.width*1.8;positions[i*3+1]=Math.random()*9;positions[i*3+2]=(Math.random()-.5)*room.depth*1.8;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  rainPoints=new THREE.Points(geo,new THREE.PointsMaterial({color:0xd9eaff,size:.045,transparent:true,opacity:.7}));scene.add(rainPoints);
 }
 if(rainPoints)rainPoints.visible=rain;
 const select=$('climate-mode');if(select)select.value=appearance.climate;
}

function buildTwoFloorArchitecture(){
  const upperY=room.height, stair=getStairSpec(), stairX=stair.x, topZ=stair.topZ, bottomZ=stair.bottomZ, run=bottomZ-topZ, steps=18;
  const upperStyle=floorStyle(1);
  const slab=mat(new THREE.Color(upperStyle.floorColor).getHex(),.82), stairMat=mat(0x98724f,.78), rail=mat(0x536477,.42,.35), corridor=mat(0xe3e8ee,.86);
  // Segundo nivel: cuatro paños que dejan libre el hueco de la escalera.
  const xL=-room.width/2, xR=room.width/2, holeL=stairX-stair.width/2-.3, holeR=stairX+stair.width/2+.3, holeBack=topZ, holeFront=bottomZ;
  addRoomBox(holeL-xL,.18,room.depth,slab,(xL+holeL)/2,upperY-.09,0);
  addRoomBox(xR-holeR,.18,room.depth,slab,(holeR+xR)/2,upperY-.09,0);
  addRoomBox(holeR-holeL,.18,holeBack+room.depth/2,slab,stairX,upperY-.09,(-room.depth/2+holeBack)/2);
  addRoomBox(holeR-holeL,.18,room.depth/2-holeFront,slab,stairX,upperY-.09,(holeFront+room.depth/2)/2);
  // Muros del segundo nivel y barandas abiertas al frente para que el corte 3D sea visible.
  const upperWallY=upperY+room.height/2;
  addRoomBox(room.width,.18,room.height,corridor,0,upperWallY,-room.depth/2);
  addRoomBox(.18,room.height,room.depth,corridor,-room.width/2,upperWallY,0);
  addRoomBox(.18,room.height,room.depth,corridor,room.width/2,upperWallY,0);
  addRoomBox(room.width,.12,.12,rail,0,upperY+1.0,room.depth/2-.1);
  // Escalera recta con huellas, contrahuellas y pasamanos a ambos lados.
  for(let i=0;i<steps;i++){
    const t=(i+.5)/steps, y=upperY-(i+.5)*upperY/steps, z=topZ+t*run;
    addRoomBox(stair.width,.17,run/steps+.025,stairMat,stairX,y,z);
    addRoomBox(stair.width,.19,.07,rail,stairX,y-.09,z-run/(2*steps));
  }
  const railAngle=-Math.atan2(upperY,run), railLength=Math.hypot(upperY,run);
  for(const side of [-1,1]){
    const x=stairX+side*(stair.width/2+.065);
    const hand=addRoomBox(.075,.075,railLength,rail,x,upperY/2+.92,(topZ+bottomZ)/2);
    hand.rotation.x=railAngle;
    for(let i=0;i<=steps;i+=3){const t=i/steps,z=topZ+t*run,y=upperY*(1-t)+.55;addRoomBox(.06,.95,.06,rail,x,y,z).rotation.x=railAngle;}
  }
  // Pasadizo despejado del pie de escalera hacia la puerta exterior del primer piso.
  const hallStart=6.35,hallEnd=room.width/2-.1;
  addRoomBox(hallEnd-hallStart,3.1,.14,corridor,(hallStart+hallEnd)/2,1.55,2.55);
  addRoomBox(hallEnd-hallStart,3.1,.14,corridor,(hallStart+hallEnd)/2,1.55,6.95);
  // Señal de circulación en el borde de la escalera y en el pasadizo.
  const signMat=mat(0x087a45,.55);
  addRoomBox(.9,.35,.06,signMat,stairX,2.0,3.0);
  // Plataforma exterior frente a la salida para identificar el punto seguro.
  addRoomBox(4.8,.06,7.2,mat(0x9bb69b,.94),room.width/2+2.35,.03,room.depth*.36);
  addRoomBox(3.2,.035,1.8,mat(0xd8e2cf,.9),room.width/2+1.65,.065,room.depth*.36);
}

function makeRoom(){
  roomGroup.clear();
  pyramidBuilding=null;
  if(appearance.buildingPlan==='senati-pyramid'){
    const baseStyle=floorStyle(0);
    const bgMat=new THREE.MeshStandardMaterial({color:0xe2e6e1,roughness:.95});
    floorMesh=mesh(roomGroup,new THREE.PlaneGeometry(room.width+25,room.depth+33),bgMat,0,-.07,6,false);
    floorMesh.rotation.x=-Math.PI/2; floorMesh.userData.isFloor=true;floorMeshes=[floorMesh];
    gridHelper=new THREE.GridHelper(Math.max(room.width,room.depth),Math.max(room.width,room.depth),0x8193a4,0xb8c7d6);
    gridHelper.position.y=.025;gridHelper.material.transparent=true;gridHelper.material.opacity=.10;roomGroup.add(gridHelper);gridHelper.visible=gridVisible;
    pyramidBuilding=buildPiramideSENATI(roomGroup,{width:room.width,depth:room.depth,levelHeight:room.height,levels:getFloors().length,
      mode:appearance.pyramidView||'exterior',roofVisible:roofVisible,facadeColor:appearance.facadeColor||'#afa59b',signColor:appearance.signColor||'#1251cb'});
    roofMesh=pyramidBuilding.roof;
    syncFloorControls();positionCamera();
    $('stage-dimensions').textContent=`${room.width.toFixed(1)} × ${room.depth.toFixed(1)} m · ${getFloors().length} plantas`;
    $('viewport-status').textContent='V11 · tragaluz abierto entre plantas 2-6, barandas y patio central · medidas orientativas';
    if($('pyramid-shell-mode'))$('pyramid-shell-mode').value=appearance.pyramidView||'exterior';
    if($('pyramid-facade-color'))$('pyramid-facade-color').value=appearance.facadeColor||'#afa59b';
    if($('pyramid-sign-color'))$('pyramid-sign-color').value=appearance.signColor||'#1251cb';
    if($('pyramid-controls'))$('pyramid-controls').hidden=false;
    return;
  }
  if($('pyramid-controls'))$('pyramid-controls').hidden=true;
  const baseStyle=floorStyle(0);
  const floorMat=new THREE.MeshStandardMaterial({color:0xffffff,map:makeFloorTexture(baseStyle.floorType,baseStyle.floorColor),roughness:baseStyle.floorType==='wood'?.66:.72,metalness:0});
  floorMesh=mesh(roomGroup,new THREE.PlaneGeometry(room.width,room.depth),floorMat,0,floorElevation(0),0,false);floorMesh.rotation.x=-Math.PI/2;floorMesh.userData.isFloor=true;floorMeshes=[floorMesh];
  gridHelper=new THREE.GridHelper(Math.max(room.width,room.depth),Math.max(room.width,room.depth),0x90a8c4,0xb6c4d6);
  gridHelper.scale.set(room.width/Math.max(room.width,room.depth),1,room.depth/Math.max(room.width,room.depth));gridHelper.position.y=floorElevation(0)+.012;gridHelper.material.transparent=true;gridHelper.material.opacity=.075;roomGroup.add(gridHelper);
  // Aula: franja azul inferior y paredes claras superiores; ventanales en el lateral izquierdo y acceso acristalado a la derecha.
  const windowCenters=[-room.depth*.30,0,room.depth*.30].map(v=>({center:v,width:2.15,type:'window'}));
  const doorCenter=room.depth*.36;
  buildWallZ(-room.depth/2,[]);buildWallZ(room.depth/2,[]);
  buildWallX(-room.width/2,windowCenters);buildWallX(room.width/2,[{center:doorCenter,width:1.48,type:'door'}]);
  // Zócalo superior e inferior y líneas de encuentro.
  const trim=mat(0xd8e0e9,.7),base=mat(0x0c438f,.62);
  box(roomGroup,room.width,.045,.205,trim,0,room.height-.02,-room.depth/2);box(roomGroup,room.width,.045,.205,trim,0,room.height-.02,room.depth/2);
  box(roomGroup,.205,.045,room.depth,trim,-room.width/2,room.height-.02,0);box(roomGroup,.205,.045,room.depth,trim,room.width/2,room.height-.02,0);
  box(roomGroup,room.width,.055,.22,base,0,.96,-room.depth/2);box(roomGroup,room.width,.055,.22,base,0,.96,room.depth/2);
  box(roomGroup,.22,.055,room.depth,base,-room.width/2,.96,0);box(roomGroup,.22,.055,room.depth,base,room.width/2,.96,0);
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(room.width,.025,room.depth)),new THREE.LineBasicMaterial({color:0xb9c6d6,transparent:true,opacity:.35}));edge.position.y=.012;roomGroup.add(edge);
  if(appearance.buildingPlan==='two-floor'&&getFloors().length>1)buildTwoFloorArchitecture();
  const totalHeight=appearance.buildingPlan==='two-floor'?room.height*2:room.height;
  roofMesh=mesh(roomGroup,new THREE.BoxGeometry(room.width,.12,room.depth),mat(0xf1f3f7,.82),0,totalHeight,0,false);roofMesh.visible=roofVisible;
  addBranding();buildExterior();
  gridHelper.visible=gridVisible;
  syncFloorControls();
  positionCamera();
  $('stage-dimensions').textContent=`${room.width.toFixed(2)} × ${room.depth.toFixed(2)} m`;
  $('viewport-status').textContent=`${room.width.toFixed(0)} × ${room.depth.toFixed(0)} m`;
}
function positionCamera(){
  camera.fov=50;camera.updateProjectionMatrix();
  if(appearance.buildingPlan==='senati-pyramid'){
    camera.position.set(35,24,49);
    controls.target.set(0,room.height*getFloors().length*.52,3.0);
    controls.minDistance=6; controls.maxDistance=140;controls.update();return;
  }
  const span=Math.max(room.width,room.depth);
  // La vista inicial encuadra también el ancho completo de aulas grandes, no solo su profundidad.
  const totalHeight=appearance.buildingPlan==='two-floor'?room.height*2:room.height;
  const individualFloor=$('construction-floor')?.value!=='all';
  const baseY=individualFloor?floorElevation(activeFloorIndex):0;
  camera.position.set(0,baseY+Math.max(8.5,individualFloor?room.height+span*.30:totalHeight+span*.30),span*1.25);
  controls.target.set(0,individualFloor?baseY+1.05:(appearance.buildingPlan==='two-floor'?room.height*.92:1.05),0);
  controls.minDistance=3.2;controls.maxDistance=Math.max(55,span*4.2);controls.update();
}
function setPointer(event) {
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.x=((event.clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
}
function pointOnFloor(event) {
  setPointer(event);
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-(floorElevation(activeFloorIndex)+floorY));
  const out=new THREE.Vector3();
  return raycaster.ray.intersectPlane(plane,out) ? out : null;
}
function clampToRoom(v) {
  return new THREE.Vector3(
    THREE.MathUtils.clamp(v.x,-room.width/2+.25,room.width/2-.25),
    floorElevation(activeFloorIndex),
    THREE.MathUtils.clamp(v.z,-room.depth/2+.25,room.depth/2-.25)
  );
}
function createPerson(key, seated=false) {
  // Figura estilizada con cuello anatómico estrecho y articulaciones integradas.
  const g=new THREE.Group();
  const isTeacher=key==='teacher'||key==='teacher-f', isWoman=key.startsWith('woman')||key==='teacher-f', isSenati=key.endsWith('-senati');
  const casualColors=isWoman?[0x2b9f98,0x9b6ac4,0xd16b83,0x3c83bd]:[0x367fc0,0x3c9b76,0xb56b42,0x6b78a8];
  const shirtColor=isTeacher?0x24364b:(isSenati?0x123f72:casualColors[Math.floor(Math.random()*casualColors.length)]);
  const skin=mat(isWoman?0xd9a27e:0xc98e69,.88);
  const shirt=mat(shirtColor,.78);
  const pants=mat(isTeacher?0x202b39:(isWoman?0x263448:0x202b3b),.88);
  const hair=mat(isWoman?0x75402f:(isTeacher?0x292522:0x292724),.94);
  const shoe=mat(0x17202b,.72), eye=mat(0x292b30,.7);
  const capsule=(parent,r,material,a,b)=>{
    const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),dir=vb.clone().sub(va);
    const m=mesh(parent,new THREE.CapsuleGeometry(r,Math.max(.01,dir.length()-2*r),10,20),material);
    m.position.copy(va.add(vb).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return m;
  };
  const ellipsoid=(parent,scale,material,pos)=>{const m=mesh(parent,new THREE.SphereGeometry(1,32,24),material,...pos);m.scale.set(...scale);return m;};
  const topY=seated?.82:1.08;
  ellipsoid(g,[.235,seated?.30:.34,.15],shirt,[0,topY,0]);
  if(isSenati){
    const badgeCanvas=document.createElement('canvas');badgeCanvas.width=512;badgeCanvas.height=180;
    const bc=badgeCanvas.getContext('2d');bc.fillStyle='#123f72';bc.fillRect(0,0,512,180);bc.fillStyle='#fff';bc.font='bold 82px Arial';bc.textAlign='center';bc.textBaseline='middle';bc.fillText('SENATI',256,90);
    const badgeTex=new THREE.CanvasTexture(badgeCanvas);badgeTex.colorSpace=THREE.SRGBColorSpace;
    mesh(g,new THREE.PlaneGeometry(.145,.052),new THREE.MeshBasicMaterial({map:badgeTex,transparent:false}),.105,topY+.10,.151,false);
  }
  // Cuello cilíndrico y ligeramente cónico: evita la apariencia de una bola entre cabeza y torso.
  const neck=mesh(g,new THREE.CylinderGeometry(.072,.085,.16,20),skin,0,topY+.39,.005);neck.rotation.x=-.05;
  const headY=topY+.64;
  ellipsoid(g,[.174,.19,.16],skin,[0,headY,.012]);
  for(const x of [-.174,.174])ellipsoid(g,[.035,.052,.027],skin,[x,headY,0]);
  for(const x of [-.057,.057])ellipsoid(g,[.014,.018,.009],eye,[x,headY+.025,.164]);
  ellipsoid(g,[.018,.024,.018],skin,[0,headY-.03,.17]);
  const smilePts=[new THREE.Vector3(-.035,headY-.075,.161),new THREE.Vector3(0,headY-.09,.17),new THREE.Vector3(.035,headY-.075,.161)];
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smilePts),10,.004,5,false),eye));
  // Cabello diferenciado; el docente lleva un corte corto y peinado lateral.
  ellipsoid(g,[.178,.105,.166],hair,[0,headY+.14,-.012]);
  ellipsoid(g,[.18,.065,.08],hair,[0,headY+.095,.105]);
  if(isWoman){ellipsoid(g,[.085,.19,.085],hair,[.13,headY-.05,-.075]);ellipsoid(g,[.085,.19,.085],hair,[-.13,headY-.05,-.075]);}
  if(isTeacher){
    // Chaqueta, solapas, camisa clara, corbata y credencial para distinguir al profesor.
    ellipsoid(g,[.105,.285,.018],mat(0xf2f4f6,.72),[0,topY,.148]);
    const lapel=mat(0x314c68,.58);
    const l1=mesh(g,new THREE.ConeGeometry(.085,.25,4),lapel,-.085,topY+.13,.16);l1.rotation.z=-.30;
    const l2=mesh(g,new THREE.ConeGeometry(.085,.25,4),lapel,.085,topY+.13,.16);l2.rotation.z=.30;
    if(!isWoman)mesh(g,new THREE.CylinderGeometry(.018,.045,.25,12),mat(0x9b4050,.55),0,topY-.02,.174);
    ellipsoid(g,[.032,.026,.012],mat(0xe5edf4,.5),[.13,topY+.11,.157]);
    // Montura fina de gafas.
    for(const x of [-.057,.057]){
      const lens=mesh(g,new THREE.TorusGeometry(.035,.004,6,18),mat(0x344454,.35,.3),x,headY+.025,.171);lens.scale.set(1,.72,1);
    }
  }
  for(const side of [-1,1]){
    if(seated){
      // Postura de trabajo: brazos flexionados hacia delante y palmas apoyadas sobre el escritorio.
      const shoulder=[side*.205,topY+.18,.015],elbow=[side*.285,topY+.08,.40],wrist=[side*.30,topY-.035,.76];
      capsule(g,.073,shirt,shoulder,elbow);ellipsoid(g,[.074,.074,.074],shirt,elbow);
      capsule(g,.057,shirt,elbow,wrist);ellipsoid(g,[.074,.034,.058],skin,[...wrist]);
      for(let finger=0;finger<3;finger++)ellipsoid(g,[.018,.018,.045],skin,[wrist[0]+(finger-1)*.026,wrist[1]-.002,wrist[2]+.045]);
    }else{
      const shoulder=[side*.205,topY+.20,0],elbow=[side*.32,topY-.06,.015],wrist=[side*.34,topY-.30,.055];
      capsule(g,.075,shirt,shoulder,elbow);ellipsoid(g,[.076,.076,.076],shirt,elbow);
      capsule(g,.061,shirt,elbow,wrist);ellipsoid(g,[.067,.06,.07],skin,[...wrist]);
      ellipsoid(g,[.025,.035,.027],skin,[wrist[0]+side*.035,wrist[1]+.015,wrist[2]+.035]);
    }
  }
  if(isWoman&&!seated&&!isTeacher){const skirt=mesh(g,new THREE.CylinderGeometry(.15,.235,.30,24),mat(0x263d5c,.85),0,.55,0);skirt.scale.set(1,.95,1);}
  else ellipsoid(g,[.19,seated?.12:.17,.14],pants,[0,seated?.57:.79,0]);
  for(const side of [-1,1]){
    if(seated){
      const hip=[side*.105,.57,0],knee=[side*.11,.51,.32],ankle=[side*.11,.14,.34];
      capsule(g,.078,pants,hip,knee);ellipsoid(g,[.078,.075,.078],pants,knee);
      capsule(g,.066,pants,knee,ankle);ellipsoid(g,[.105,.055,.17],shoe,[side*.11,.08,.41]);
    }else{
      const hip=[side*.105,isWoman?.49:.66,0],knee=[side*.11,.31,.012],ankle=[side*.11,.105,.025];
      capsule(g,.075,pants,hip,knee);ellipsoid(g,[.078,.075,.078],pants,knee);
      capsule(g,.064,pants,knee,ankle);ellipsoid(g,[.095,.055,.16],shoe,[side*.11,.055,.095]);
    }
  }
  ellipsoid(g,[.035,.035,.008],mat(0xeaf4fa,.5),[.105,topY+.12,.137]);
  g.userData.kind=key;g.userData.seated=seated;g.userData.rig={animated:true};
  return g;
}
function createModel(key, seated=false) {
  const g=new THREE.Group();
  const deskTopY=.78;
  switch(key){
    case 'desk': {
      const deskMat=mat(appearance.deskColor,.48);
      const deskEdgeMat=mat(appearance.deskColor,.58);
      g.userData.primaryColorMaterial=deskMat;
      g.userData.secondaryColorMaterial=deskEdgeMat;
      // Escritorio con orientación local inequívoca: frente = +Z, posterior = -Z.
      // La huella es idéntica en todas las instancias: 158 x 72 cm.
      mesh(g,new RoundedBoxGeometry(DESK_LENGTH,.10,DESK_DEPTH,.035,4),deskMat,0,deskTopY,0);
      box(g,DESK_LENGTH+.025,.025,DESK_DEPTH+.02,deskEdgeMat,0,deskTopY-.065,0);
      // Canal posterior para cableado: identifica el lado donde va el monitor.
      box(g,.92,.012,.045,mat(0x343b43,.8),0,.837,-.315);
      // Zona de teclado marcada sobre la superficie (sin relieve molesto).
      box(g,.72,.004,.245,mat(0xc7b99e,.9),-.055,.833,.105);
      // Línea frontal discreta y redondeada visualmente mediante una moldura fina.
      box(g,1.34,.012,.018,mat(0x9b805e,.72),0,.837,.345);
      // Patas y travesaños simétricos para mantener una geometría consistente.
      for(const x of [-.70,.70]) for(const z of [-.27,.27]) box(g,.055,.72,.055,mats.metal,x,.36,z);
      box(g,1.28,.045,.035,mats.metal,0,.39,-.27);
      g.userData.deskOrientation={front:'+Z',rear:'-Z',standardLength:DESK_LENGTH,standardDepth:DESK_DEPTH};
      break;
    }
    case 'chair': {
      const chairMat=mat(appearance.chairColor,.78);
      g.userData.primaryColorMaterial=chairMat;
      box(g,.48,.12,.48,chairMat,0,.56,0);
      const back=box(g,.08,.56,.46,chairMat,-.20,.88,0);back.rotation.z=-.08;
      cylinder(g,.045,.045,.35,mats.metal,0,.28,0);
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const leg=box(g,.48,.04,.055,mats.metal,Math.cos(a)*.24,.09,Math.sin(a)*.24);leg.rotation.y=-a;cylinder(g,.055,.055,.07,chairMat,Math.cos(a)*.48,.055,Math.sin(a)*.48,12);}
      break;
    }
    case 'aio': {
      // All-in-One XL: pantalla ampliada para que se lea claramente en aulas amplias.
      // Huella visual aproximada: 0.88 x 0.50 m; base y soporte proporcionales.
      box(g,.92,.535,.072,mats.black,0,1.185,0);
      box(g,.892,.507,.009,mat(0x080d16,.35),0,1.188,.039);
      const screen=box(g,.868,.488,.008,mat(0x0c3155,.25),0,1.188,.046);
      const stand=box(g,.095,.275,.082,mat(0x9aa6b2,.38,.35),0,.91,-.008);
      // Base ancha, con apoyo metálico visible y centrado sobre la mesa.
      const base=box(g,.405,.032,.245,mat(0x788694,.42,.28),0,.845,.045);base.rotation.x=-.035;
      box(g,.355,.014,.205,mat(0xc2cbd3,.36,.25),0,.868,.045);
      // Pantalla personalizable: Windows 11, SENATI o pantalla neutra.
      const c=document.createElement('canvas');c.width=768;c.height=432;
      const ctx=c.getContext('2d');
      const drawScreen=(mode='windows11')=>{
        ctx.clearRect(0,0,768,432);
        if(mode==='windows11'){
          const gr=ctx.createLinearGradient(0,0,768,432);gr.addColorStop(0,'#061a49');gr.addColorStop(.55,'#0876bd');gr.addColorStop(1,'#46c5dc');ctx.fillStyle=gr;ctx.fillRect(0,0,768,432);
          ctx.fillStyle='rgba(255,255,255,.16)';ctx.beginPath();ctx.ellipse(405,200,250,130,-.35,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#fff';ctx.font='500 25px Segoe UI,Arial';ctx.fillText('12:45',34,48);ctx.font='18px Segoe UI,Arial';ctx.fillText('Lunes, 2 de noviembre',34,78);
          ctx.fillStyle='rgba(18,34,63,.82)';ctx.beginPath();ctx.roundRect(180,374,408,42,18);ctx.fill();
          // Icono Windows de cuatro paneles y campo Buscar, dibujados sin depender de fuentes instaladas.
          ctx.fillStyle='#f5fbff';ctx.fillRect(300,386,11,11);ctx.fillRect(314,386,11,11);ctx.fillRect(300,400,11,11);ctx.fillRect(314,400,11,11);
          ctx.fillStyle='#fff';ctx.font='bold 19px Segoe UI,Arial';ctx.fillText('Buscar',345,403);ctx.font='20px Arial';ctx.fillText('···',520,403);
        } else if(mode==='senati'){
          const gr=ctx.createLinearGradient(0,0,768,432);gr.addColorStop(0,'#08264b');gr.addColorStop(1,'#1265a5');ctx.fillStyle=gr;ctx.fillRect(0,0,768,432);
          // Emblema institucional estilizado junto al nombre; se dibuja en canvas para verse en el monitor.
          ctx.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3,x=384+Math.cos(a)*70,y=132+Math.sin(a)*70;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fillStyle='#ffffff';ctx.fill();
          ctx.fillStyle='#125b9b';ctx.font='900 92px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('S',384,132);
          ctx.fillStyle='#fff';ctx.font='bold 84px Arial';ctx.textBaseline='alphabetic';ctx.fillText('SENATI',384,286);ctx.fillStyle='#6bd2ed';ctx.fillRect(240,316,288,7);
          ctx.font='600 22px Arial';ctx.fillStyle='#d8efff';ctx.fillText('FORMACIÓN PROFESIONAL',384,357);ctx.textAlign='left';
        } else {ctx.fillStyle='#eef3f8';ctx.fillRect(0,0,768,432);ctx.fillStyle='#164b82';ctx.font='bold 48px Arial';ctx.textAlign='center';ctx.fillText('Pantalla de presentación',384,220);ctx.textAlign='left';}
      };
      drawScreen('windows11');
      const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
      const plane=mesh(g,new THREE.PlaneGeometry(.868,.488),new THREE.MeshBasicMaterial({map:tex}),0,1.188,.052);
      g.userData.screenCanvas=c;g.userData.screenTexture=tex;g.userData.drawScreen=drawScreen;g.userData.screenMode='windows11';
      break;
    }
    case 'keyboard': {
      box(g,.52,.026,.18,mats.black,0,.83,0);
      const keyMat=mat(0xd2d8df,.7);
      // Instancias: 56 teclas en una sola llamada de dibujo por teclado.
      const keys=new THREE.InstancedMesh(new THREE.BoxGeometry(.023,.008,.019),keyMat,56);
      const transform=new THREE.Object3D();let index=0;
      for(let r=0;r<4;r++)for(let i=0;i<14;i++){
        transform.position.set(-.245+i*.036,.849,-.062+r*.041);
        transform.updateMatrix();keys.setMatrixAt(index++,transform.matrix);
      }
      keys.instanceMatrix.needsUpdate=true;keys.castShadow=false;g.add(keys);
      break;
    }
    case 'mouse': {
      const m=mesh(g,new THREE.SphereGeometry(1,16,12),mats.black,0,.84,0);m.scale.set(.05,.027,.075);
      break;
    }
    case 'man': case 'woman': case 'man-senati': case 'woman-senati': case 'teacher': case 'teacher-f': {
      return createPerson(key, seated);
    }
    case 'wall': {
      const wallMat=mat(appearance.wallColor,.9);
      g.userData.primaryColorMaterial=wallMat;
      box(g,2.5,room.height,.16,wallMat,0,room.height/2,0);
      break;
    }
    case 'door': {
      const frame=mat(0x485a6d,.36,.55),handle=mat(0xc2ccd6,.24,.82);
      box(g,1.42,2.48,.085,frame,0,1.24,0);
      const pane=mesh(g,new THREE.BoxGeometry(1.28,2.34,.018),mats.glass,0,1.24,.052);pane.renderOrder=3;
      box(g,.035,2.34,.055,frame,-.62,1.24,.065);box(g,.035,2.34,.055,frame,.62,1.24,.065);
      box(g,1.26,.035,.055,frame,0,2.40,.065);box(g,1.26,.035,.055,frame,0,.08,.065);
      box(g,.025,2.28,.045,frame,0,1.24,.075);
      box(g,.035,.74,.075,handle,.47,1.18,.12);cylinder(g,.025,.025,.035,handle,.45,1.18,.15,16);
      box(g,1.30,.045,.07,handle,0,.035,.08);
      break;
    }
    case 'window': {
      const frame=mat(0x485a6d,.34,.58),seal=mat(0xe8eef4,.58);
      const pane=mesh(g,new THREE.BoxGeometry(2.08,1.35,.018),mats.glass,0,1.84,.04);pane.renderOrder=3;
      box(g,2.18,.055,.09,frame,0,2.53,0);box(g,2.18,.055,.09,frame,0,1.15,0);
      box(g,.055,1.42,.09,frame,-1.06,1.84,0);box(g,.055,1.42,.09,frame,1.06,1.84,0);
      box(g,.035,1.32,.07,frame,0,1.84,.045);
      box(g,2.08,.025,.055,seal,0,1.84,.065);
      break;
    }
    case 'safety-exit': case 'safety-rules': case 'safety-first-aid': case 'safety-electrical': case 'safety-safe-zone': case 'safety-evacuation': {
      const isExit=key==='safety-exit', isRules=key==='safety-rules';
      const presets={
        'safety-exit':{w:.82,h:.42,bg:'#087a45',fg:'#ffffff',title:'SALIDA'},
        'safety-rules':{w:1.02,h:.72,bg:'#f7f9fb',fg:'#17324d',title:'REGLAS DE SEGURIDAD'},
        'safety-first-aid':{w:.62,h:.52,bg:'#087a45',fg:'#ffffff',title:'BOTIQUÍN',symbol:'✚'},
        'safety-electrical':{w:.66,h:.58,bg:'#ffd22e',fg:'#1e293b',title:'RIESGO ELÉCTRICO',symbol:'⚡'},
        'safety-safe-zone':{w:.76,h:.58,bg:'#087a45',fg:'#ffffff',title:'ZONA SEGURA',symbol:'✚'},
        'safety-evacuation':{w:.82,h:.42,bg:'#087a45',fg:'#ffffff',title:'RUTA DE EVACUACIÓN',symbol:'➜'}
      };
      const p=presets[key];
      box(g,p.w,p.h,.055,mat(p.bg,.55),0,1.72,0);
      const c=document.createElement('canvas');c.width=640;c.height=420;const ctx=c.getContext('2d');
      ctx.fillStyle=p.bg;ctx.fillRect(0,0,640,420);ctx.strokeStyle=p.fg;ctx.lineWidth=13;ctx.strokeRect(8,8,624,404);
      ctx.fillStyle=p.fg;ctx.textAlign='center';
      if(isRules){
        ctx.font='bold 39px Arial';ctx.fillText(p.title,320,65);ctx.textAlign='left';ctx.font='bold 29px Arial';
        ['Mantén libre la salida','No bloquees los pasillos','Cuida cables y equipos','Sigue las indicaciones'].forEach((t,i)=>ctx.fillText('• '+t,35,135+i*66));
      } else if(isExit){
        // Rótulo de texto limpio, sin flecha; se coloca centrado sobre la puerta.
        ctx.font='bold 112px Arial';ctx.textBaseline='middle';ctx.fillText('SALIDA',320,220);ctx.textBaseline='alphabetic';
      } else {
        ctx.font=`bold ${key==='safety-evacuation'?47:58}px Arial`;ctx.fillText(p.title,320,key==='safety-electrical'?82:90);
        ctx.font='bold 190px Arial';ctx.fillText(p.symbol||'',320,300);
      }
      const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
      const plane=mesh(g,new THREE.PlaneGeometry(p.w-.025,p.h-.025),new THREE.MeshBasicMaterial({map:tex}),0,1.72,.031);plane.renderOrder=4;
      g.userData.safetySign=true;
      break;
    }
    case 'fire-extinguisher': {
      const red=mat(0xc62828,.42),dark=mat(0x283443,.5),metal=mat(0xaeb8c2,.32,.65);
      cylinder(g,.105,.12,.62,red,0,.40,0,24);
      cylinder(g,.105,.105,.045,mat(0x9f1d1d,.45),0,.72,0,24);
      cylinder(g,.035,.035,.09,metal,0,.79,0,16);
      const handle=box(g,.19,.035,.045,dark,.055,.84,0);handle.rotation.z=-.12;
      const hose=mesh(g,new THREE.TorusGeometry(.105,.012,8,24,Math.PI*1.35),dark,-.11,.70,.025);hose.rotation.z=Math.PI/2;
      box(g,.27,.035,.035,metal,0,.06,0);
      const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=128;const lc=labelCanvas.getContext('2d');
      lc.fillStyle='#fff';lc.fillRect(0,0,256,128);lc.fillStyle='#c62828';lc.font='bold 31px Arial';lc.textAlign='center';lc.fillText('EXTINTOR',128,49);lc.font='bold 23px Arial';lc.fillText('ABC',128,88);
      const labelTex=new THREE.CanvasTexture(labelCanvas);labelTex.colorSpace=THREE.SRGBColorSpace;
      mesh(g,new THREE.PlaneGeometry(.18,.09),new THREE.MeshBasicMaterial({map:labelTex}),0,.43,.122);
      g.userData.safetyEquipment=true;
      break;
    }
    case 'whiteboard': {
      box(g,2.4,1.25,.08,mats.metal,0,1.65,0);
      box(g,2.28,1.13,.035,mats.white,0,1.65,.05);
      break;
    }
    case 'fluorescent': {
      const frame=mat(0x64748b,.4,.45),emitter=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:2.3,roughness:.25});
      box(g,1.48,.065,.30,frame,0,room.height-.15,0);
      box(g,1.32,.025,.20,emitter,0,room.height-.105,0);
      const light=new THREE.PointLight(0xfff9ed,3.8,6.8,1.7);light.position.set(0,room.height-.28,0);light.castShadow=false;g.add(light);
      break;
    }
    case 'fan': {
      // Mounting plate, downrod and motor are fixed; blades share one centered rotor.
      const ceilingY=room.height-.08;
      cylinder(g,.24,.24,.055,mats.metal,0,ceilingY,0,32);
      cylinder(g,.045,.045,.34,mats.metal,0,room.height-.27,0,20);
      cylinder(g,.19,.19,.20,mat(0x66717d,.42,.45),0,room.height-.49,0,32);
      cylinder(g,.105,.105,.08,mat(0x9da8b3,.35,.5),0,room.height-.63,0,24);
      const rotor=new THREE.Group();
      rotor.position.y=room.height-.64;
      const bladeShape=new THREE.Shape();
      bladeShape.moveTo(-.085,.10);
      bladeShape.quadraticCurveTo(-.17,.42,-.105,.91);
      bladeShape.quadraticCurveTo(-.02,1.10,.105,1.02);
      bladeShape.quadraticCurveTo(.15,.60,.085,.10);
      bladeShape.closePath();
      const bladeGeo=new THREE.ExtrudeGeometry(bladeShape,{depth:.035,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.012,bevelThickness:.008});
      bladeGeo.rotateX(-Math.PI/2);
      const bladeMat=mat(0xe7ebef,.48,.18);
      for(let i=0;i<3;i++){
        const blade=mesh(rotor,bladeGeo,bladeMat,0,0,0);
        blade.rotation.y=i*Math.PI*2/3;
      }
      cylinder(rotor,.125,.125,.09,mat(0x7d8995,.35,.5),0,.035,0,24);
      g.add(rotor);
      g.userData.fanRotor=rotor;
      break;
    }
    case 'projector': {
      box(g,.48,.18,.42,mats.white,0,room.height-.22,0);
      cylinder(g,.08,.08,.07,mats.black,.23,room.height-.22,0,16).rotation.z=Math.PI/2;
      break;
    }
    case 'plant': {
      cylinder(g,.22,.27,.35,mat(0x9b6546,.85),0,.18,0);
      for(let i=0;i<7;i++){const leaf=mesh(g,new THREE.SphereGeometry(.13,12,8),mat(0x3d8158,.8),Math.cos(i)*.18,.55+Math.sin(i*1.3)*.18,Math.sin(i)*.18);leaf.scale.set(.65,1.5,.65);}
      break;
    }
  }
  return g;
}
function applyAppearance(){
  const savedCamera=camera.position.clone();
  const savedTarget=controls.target.clone();
  if(floorMesh?.material?.map)floorMesh.material.map.dispose();
  makeRoom();
  camera.position.copy(savedCamera);
  controls.target.copy(savedTarget);
  controls.update();
  placed.forEach(o=>{
    const key=o.userData.catalogKey;
    if(o.userData.primaryColorMaterial){
      if(key==='desk')o.userData.primaryColorMaterial.color.set(appearance.deskColor);
      if(key==='chair')o.userData.primaryColorMaterial.color.set(appearance.chairColor);
      if(key==='wall')o.userData.primaryColorMaterial.color.set(appearance.wallColor);
    }
    if(key==='desk'&&o.userData.secondaryColorMaterial){
      o.userData.secondaryColorMaterial.color.set(appearance.deskColor);
    }
  });
  markDirty();
}
function syncAppearanceInputs(){
  const scope=$('floor-edit-scope')?.value||'global';
  const floorStyleNow=scope==='global'?{floorType:appearance.floorType,floorColor:appearance.floorColor}:floorStyle(Number(scope));
  $('floor-type').value=floorStyleNow.floorType;
  $('floor-color').value=floorStyleNow.floorColor;
  $('wall-color').value=appearance.wallColor;
  $('desk-color').value=appearance.deskColor;
  $('chair-color').value=appearance.chairColor;
}
['floor-type','floor-color'].forEach(id=>{
  $(id).addEventListener('change',()=>{
    const scope=$('floor-edit-scope').value;
    const floors=getFloors();
    const targets=scope==='global'?floors:[floors[Number(scope)]].filter(Boolean);
    targets.forEach(f=>{f.floorType=$('floor-type').value;f.floorColor=$('floor-color').value;});
    if(scope==='global'){appearance.floorType=$('floor-type').value;appearance.floorColor=$('floor-color').value;}
    applyAppearance();showToast(scope==='global'?'Material del piso aplicado a todos los niveles.':'Material aplicado al piso seleccionado.');
  });
});
['wall-color','desk-color','chair-color'].forEach(id=>{
  $(id).addEventListener('change',()=>{
    appearance={...appearance,wallColor:$('wall-color').value,deskColor:$('desk-color').value,chairColor:$('chair-color').value};
    applyAppearance();showToast('Material global actualizado en el edificio.');
  });
});
$('floor-edit-scope').addEventListener('change',syncFloorControls);
$('construction-floor').addEventListener('change',e=>{if(e.target.value==='all'){applyFloorVisibility();$('viewport-status').textContent='Vista global: todos los niveles';}else selectConstructionFloor(Number(e.target.value));});
$('add-floor').addEventListener('click',()=>{
  const max=appearance.buildingPlan==='senati-pyramid'?6:2;
  const current=getFloors().length;
  if(current>=max){showToast(`Este modelo admite hasta ${max} plantas.`);return;}
  setFloorCount(current+1);selectConstructionFloor(current);
  showToast(`Planta ${current+1} agregada. Selecciona el nuevo piso para colocar objetos.`);
});
$('remove-floor').addEventListener('click',()=>{
  const current=getFloors().length,min=appearance.buildingPlan==='senati-pyramid'?3:1;
  if(current<=min){showToast(`Este modelo necesita al menos ${min} niveles.`);return;}
  const top=(current-1)*room.height;
  const count=placed.filter(o=>o.position.y>=top-.15).length;
  if(count&&!confirm(`Hay ${count} objetos en la última planta. ¿Eliminar la planta y esos objetos?`))return;
  setFloorCount(current-1);selectConstructionFloor(current-2);
  showToast(`Última planta eliminada.`);
});
$('reset-appearance').addEventListener('click',()=>{
  appearance={...appearance,floorType:'tile',floorColor:'#f2f4f7',wallColor:'#f1f3f6',deskColor:'#1559a8',chairColor:'#202a38'};
  getFloors().forEach(f=>{f.floorType='tile';f.floorColor='#f2f4f7';});
  syncAppearanceInputs();applyAppearance();showToast('Materiales restablecidos en todos los pisos.');
});

function setObjectColor(obj,hex){
  if(!obj||!/^#[0-9a-f]{6}$/i.test(hex))return;
  const current=obj.userData.primaryColorMaterial;
  if(current&&current.color){current.color.set(hex);obj.userData.customColor=hex;return;}
  // Clona solo el primer material estándar. Evita recolorear objetos que compartan materiales.
  let changed=false;
  obj.traverse(child=>{
    if(changed||!child.isMesh)return;
    const source=child.userData._selectionOriginal||child.material;
    if(!source||Array.isArray(source)||!source.isMeshStandardMaterial)return;
    const clone=source.clone();clone.color.set(hex);
    if(child.userData._selectionOriginal){child.userData._selectionOriginal=clone;}
    else child.material=clone;
    changed=true;
  });
  if(changed)obj.userData.customColor=hex;
}
function addObject(key, position, opts={}) {
  const item=catalog.find(o=>o.key===key);
  if(!item)return null;
  const model=createModel(key,Boolean(opts.seated));
  if(['man','woman','man-senati','woman-senati','teacher','teacher-f'].includes(key)) model.userData.seated=Boolean(opts.seated);
  model.position.copy(position || new THREE.Vector3(0,0,0));
  model.rotation.y=opts.rotationY ?? 0;
  // Los escritorios siempre conservan la misma huella física, incluso al cargar escenarios antiguos.
  if(key==='desk') model.scale.set(1,1,1);
  else model.scale.set(opts.scaleX??1,opts.scaleY??1,opts.scaleZ??1);
  const id=opts.id || `obj-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  model.userData.editorObject=true;
  model.userData.objectId=id;
  model.userData.catalogKey=key;
  model.userData.label=opts.label || item.label;
  model.userData.category=item.category;
  model.userData.floorIndex=nearestFloorIndex(model.position.y);
  model.userData.floorId=model.userData.floorIndex+1;
  if(opts.accessoryOf)model.userData.accessoryOf=opts.accessoryOf;
  if(opts.screenMode&&model.userData.drawScreen){model.userData.drawScreen(opts.screenMode);model.userData.screenTexture.needsUpdate=true;model.userData.screenMode=opts.screenMode;}
  if(opts.customColor)setObjectColor(model,opts.customColor);
  objectGroup.add(model);
  placed.push(model);
  if(key==='desk' && $('auto-station')?.checked && !opts.skipStation){ equipDesk(model,{silent:true}); }
  if(key==='chair' && $('auto-seat')?.checked && !opts.skipSeat){ seatPerson(model,placed.filter(o=>['man','woman','man-senati','woman-senati'].includes(o.userData.catalogKey)).length%2?'woman-senati':'man-senati'); }
  if(key==='aio'&&!opts.skipAccessories){
    // Keyboard and mouse are spawned as separate editable objects, aligned to the PC.
    const angle=model.rotation.y;
    const offset=(x,z)=>new THREE.Vector3(
      model.position.x + x*Math.cos(angle) + z*Math.sin(angle),
      model.position.y,
      model.position.z - x*Math.sin(angle) + z*Math.cos(angle)
    );
    addObject('keyboard',offset(0,.48),{rotationY:angle,silent:true,accessoryOf:id});
    addObject('mouse',offset(.30,.48),{rotationY:angle,silent:true,accessoryOf:id});
  }
  if(!opts.silent){
    selectObject(model);
    renderObjectList();
    markDirty();
  }
  return model;
}
function deskLocalPoint(desk,x,z){
  const a=desk.rotation.y;
  return new THREE.Vector3(desk.position.x+x*Math.cos(a)+z*Math.sin(a),desk.position.y,desk.position.z-x*Math.sin(a)+z*Math.cos(a));
}
function detectDeskSeatDirection(desk){
  // La orientación del mueble es la autoridad; no inferimos el frente por la silla.
  // Convención local fija: frente +Z (alumno), posterior -Z (monitor/canal de cables).
  return new THREE.Vector3(0,0,1);
}
function equipDesk(desk,opts={}){
  if(!desk||desk.userData.stationEquipped)return null;
  const angle=desk.rotation.y;
  // Monitor atrás, con la pantalla mirando al frente (+Z).
  const pcPos=deskLocalPoint(desk,0,-.235);
  // Teclado en la zona marcada y mouse a su derecha, ambos orientados al alumno.
  const keyboardPos=deskLocalPoint(desk,-.045,.115);
  const mousePos=deskLocalPoint(desk,.32,.115);
  const pc=addObject('aio',pcPos,{rotationY:angle,silent:true,skipAccessories:true,accessoryOf:desk.userData.objectId});
  addObject('keyboard',keyboardPos,{rotationY:angle,silent:true,accessoryOf:desk.userData.objectId});
  addObject('mouse',mousePos,{rotationY:angle,silent:true,accessoryOf:desk.userData.objectId});
  desk.userData.stationEquipped=true;
  desk.userData.stationLayout='fixed-front-rear-v1';
  if(!opts.silent){renderObjectList();markDirty();}
  return pc;
}
function unequipDesk(desk){
  if(!desk)return;
  const descendants=linkedDescendants(desk);
  descendants.forEach(o=>{objectGroup.remove(o);const i=placed.indexOf(o);if(i>=0)placed.splice(i,1);});
  desk.userData.stationEquipped=false;
}
function setAllDeskStations(enabled){
  const desks=placed.filter(o=>o.userData.catalogKey==='desk');
  desks.forEach(d=>enabled?equipDesk(d,{silent:true}):unequipDesk(d));
  renderObjectList();markDirty();
  showToast(enabled?`Estaciones activadas en ${desks.length} escritorios.`:`Se retiraron los equipos de ${desks.length} escritorios.`);
}
function seatPerson(chair,key='man',opts={}){
  if(!chair||chair.userData.occupied)return null;
  const angle=chair.rotation.y;
  const occupant=addObject(key,chair.position.clone(),{rotationY:angle+Math.PI/2,seated:true,silent:true,accessoryOf:chair.userData.objectId});
  chair.userData.occupied=true;
  return occupant;
}
function unseatPerson(chair){
  if(!chair)return;
  const id=chair.userData.objectId;
  const people=placed.filter(o=>o.userData.accessoryOf===id&&(['man','woman','man-senati','woman-senati'].includes(o.userData.catalogKey)));
  people.forEach(o=>{objectGroup.remove(o);const i=placed.indexOf(o);if(i>=0)placed.splice(i,1);});
  chair.userData.occupied=false;
}
function setAllSeats(enabled){
  const chairs=placed.filter(o=>o.userData.catalogKey==='chair');
  const variants=['man-senati','woman-senati'];
  chairs.forEach((c,i)=>enabled?seatPerson(c,variants[i%variants.length]):unseatPerson(c));
  renderObjectList();markDirty();
  showToast(enabled?`Se ocuparon ${chairs.length} asientos.`:`Se dejaron vacíos ${chairs.length} asientos.`);
}
function linkedDescendants(root){
  const result=[];const ids=new Set([root.userData.objectId]);let changed=true;
  while(changed){changed=false;placed.forEach(o=>{if(o!==root&&o.userData.accessoryOf&&ids.has(o.userData.accessoryOf)&&!ids.has(o.userData.objectId)){ids.add(o.userData.objectId);result.push(o);changed=true;}});}
  return result;
}
function moveLinkedObjects(root,delta){linkedDescendants(root).forEach(o=>o.position.add(delta));}
function rotateLinkedObjects(root,angle){
  const descendants=linkedDescendants(root),origin=root.position;
  descendants.forEach(o=>{const offset=o.position.clone().sub(origin).applyAxisAngle(new THREE.Vector3(0,1,0),angle);o.position.copy(origin).add(offset);o.rotation.y+=angle;});
}
function removeSelectionHelper(){
  if(selected)selected.traverse(node=>{if(node.isMesh&&node.userData._selectionOriginal){const current=node.material; if(Array.isArray(current))current.forEach(m=>m.dispose());else current.dispose();node.material=node.userData._selectionOriginal;delete node.userData._selectionOriginal;}});
  if(selectionHelper){scene.remove(selectionHelper);selectionHelper.geometry?.dispose();selectionHelper.material?.dispose();selectionHelper=null;}
}
function selectObject(obj) {
  removeSelectionHelper();
  selected=obj;
  if(selected){
    selectionHelper=new THREE.BoxHelper(selected,0xff7a00);
    selectionHelper.material.color.setHex(0xff7a00);selectionHelper.material.depthTest=false;selectionHelper.material.transparent=true;selectionHelper.material.opacity=1;selectionHelper.renderOrder=999;
    scene.add(selectionHelper);
    selected.traverse(node=>{if(node.isMesh){node.userData._selectionOriginal=node.material;const mats=Array.isArray(node.material)?node.material:[node.material];node.material=mats.map(m=>{const clone=m.clone();if(clone.emissive)clone.emissive.setHex(0x392000);return clone;});if(!Array.isArray(node.userData._selectionOriginal))node.material=node.material[0];}});
    $('empty-inspector').classList.add('hidden');
    $('object-inspector').classList.remove('hidden');
    document.querySelector('[data-left-tab="properties"]')?.click();
    syncInspector();
  } else {
    $('empty-inspector').classList.remove('hidden');
    $('object-inspector').classList.add('hidden');
  }
  renderObjectList();
}

// The screen selector must redraw the active All-in-One texture and persist the selected mode.
$('prop-color')?.addEventListener('change',e=>{if(selected){setObjectColor(selected,e.target.value);markDirty();showToast('Color aplicado al objeto seleccionado.');}});
$('prop-screen')?.addEventListener('change',e=>{
  if(!selected || selected.userData.catalogKey!=='aio' || !selected.userData.drawScreen)return;
  const mode=['windows11','senati','blank'].includes(e.target.value)?e.target.value:'windows11';
  selected.userData.drawScreen(mode);
  if(selected.userData.screenTexture)selected.userData.screenTexture.needsUpdate=true;
  selected.userData.screenMode=mode;
  markDirty();
  showToast(mode==='windows11'?'Pantalla Windows 11 aplicada.':mode==='senati'?'Pantalla SENATI aplicada.':'Pantalla neutra aplicada.');
});

function syncInspector() {
  if(!selected)return;
  $('prop-label').value=selected.userData.label;
  if($('prop-color'))$('prop-color').value=selected.userData.customColor||'#1655aa';
  $('prop-x').value=selected.position.x.toFixed(2);
  $('prop-y').value=selected.position.y.toFixed(2);
  $('prop-z').value=selected.position.z.toFixed(2);
  const isDesk=selected.userData.catalogKey==='desk';
  const screenControl=$('prop-screen-wrap');if(screenControl)screenControl.classList.toggle('hidden',selected.userData.catalogKey!=='aio');
  if(selected.userData.catalogKey==='aio'&&$('prop-screen'))$('prop-screen').value=selected.userData.screenMode||'windows11';
  $('prop-sx').value=isDesk?'1.00':selected.scale.x.toFixed(2);
  $('prop-sy').value=isDesk?'1.00':selected.scale.y.toFixed(2);
  $('prop-sz').value=isDesk?'1.00':selected.scale.z.toFixed(2);
  ['prop-sx','prop-sy','prop-sz'].forEach(id=>$(id).disabled=isDesk);
}
function updateSceneBadges(){
  const people=placed.filter(o=>['man','woman','man-senati','woman-senati','teacher','teacher-f'].includes(o.userData.catalogKey)).length;
  const badge=$('scene-person-count');if(badge)badge.textContent=String(people);
  const title=$('scene-template-tag');if(title)title.textContent=$('scenario-name')?.value||'Aula SENATI (Default)';
  const dimension=$('stage-dimensions');if(dimension)dimension.textContent=`${room.width.toFixed(2)} × ${room.depth.toFixed(2)} m`;
}
function renderObjectList(){
  $('object-count').textContent=String(placed.length);
  const holder=$('placed-objects');holder.innerHTML='';
  if(!placed.length){holder.innerHTML='<span class="muted">Todavía no hay objetos.</span>';updateSceneBadges();return;}
  [...placed].reverse().forEach(obj=>{
    const item=catalog.find(c=>c.key===obj.userData.catalogKey);
    const row=document.createElement('button');row.className='placed-row'+(obj===selected?' active':'');
    row.innerHTML=`<span class="row-icon">${catalogArt(obj.userData.catalogKey)}</span><span class="row-label">${escapeHtml(obj.userData.label)}</span><span class="row-type">${item?.category||''}</span>`;
    row.addEventListener('click',()=>selectObject(obj));holder.appendChild(row);
  });
  updateSceneBadges();
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function markDirty(){ $('save-status').textContent='Cambios sin guardar'; $('save-status').previousElementSibling.style.background='#e6b44c'; }
function showToast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2400);}
function setPlacement(key){activePlacementKey=key;activeTool='place';$('tool-select').classList.remove('active');$('tool-move').classList.remove('active');$('viewport-status').textContent=`Colocando: ${catalog.find(x=>x.key===key)?.label}.`;renderer.domElement.style.cursor='crosshair';}
function catalogArt(key){
  const people=['man','woman','man-senati','woman-senati','teacher','teacher-f'].includes(key);
  if(people){
    const female=key.startsWith('woman')||key==='teacher-f',teacher=key==='teacher'||key==='teacher-f',shirt=teacher?'#263b59':(key.endsWith('senati')?'#1555a0':(female?'#d76b89':'#379b8b'));
    const hair=female?'#5a342b':(teacher?'#282a30':'#252b32');
    return `<svg viewBox="0 0 100 78" aria-hidden="true"><defs><linearGradient id="p${key}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${shirt}"/><stop offset="1" stop-color="#102c50"/></linearGradient><linearGradient id="s${key}" x1="0" y1="0" x2="0.8" y2="1"><stop stop-color="#e8b995"/><stop offset="1" stop-color="#b97859"/></linearGradient></defs><ellipse cx="50" cy="72" rx="25" ry="4" fill="#7f91a8" opacity=".25"/><path d="M34 52 L42 52 L40 73 L31 73 Z M52 52 L61 52 L68 73 L58 73 Z" fill="#263449"/><path d="M29 42 Q30 32 41 31 L58 31 Q71 34 72 45 L69 58 Q50 64 30 57 Z" fill="url(#p${key})"/><path d="M31 42 Q25 42 23 55 L29 58 L37 48 M68 42 Q77 43 78 54 L71 58 L64 48" fill="${shirt}" stroke="#163b65" stroke-width="2"/><path d="M42 27 L58 27 L58 36 Q50 42 42 36 Z" fill="#d8a27f"/><ellipse cx="50" cy="22" rx="15" ry="17" fill="url(#s${key})"/><path d="M35 22 Q33 3 51 4 Q69 4 65 23 Q61 15 54 14 Q44 18 35 22Z" fill="${hair}"/>${female?`<path d="M37 18 Q31 30 36 42 L30 49 Q24 27 35 11 M63 18 Q70 30 65 42 L71 49 Q77 27 65 11" fill="${hair}"/>`:''}<circle cx="44" cy="23" r="1.4" fill="#263447"/><circle cx="56" cy="23" r="1.4" fill="#263447"/><path d="M46 31 Q50 34 54 31" fill="none" stroke="#965c50" stroke-width="1.2"/>${key.endsWith('senati')?`<text x="50" y="49" fill="#fff" font-size="5.5" font-weight="800" text-anchor="middle">SENATI</text>`:''}${teacher?`<path d="M43 33 L50 42 L57 33" fill="#fff"/>${female?'':`<path d="M49 38 L52 38 L53 54 L50 57 L47 54Z" fill="#c8464d"/>`}`:''}</svg>`;
  }
  const common=`<defs><linearGradient id="a${key}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#80b9fa"/><stop offset="1" stop-color="#1555a0"/></linearGradient><linearGradient id="g${key}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dff5ff"/><stop offset="1" stop-color="#6bb6e6"/></linearGradient></defs>`;
  const arts={
    desk:`<path d="M13 31 L52 15 L91 31 L50 47Z" fill="#2e80d8" stroke="#174b87" stroke-width="2"/><path d="M13 31 L50 47 L50 53 L13 37Z" fill="#174b87"/><path d="M50 47 L91 31 L91 37 L50 53Z" fill="#0d3d78"/><path d="M23 38 L23 70 M42 45 L42 72 M81 35 L81 67 M62 42 L62 69" stroke="#6a7a8d" stroke-width="3"/><rect x="40" y="28" width="20" height="8" rx="1" fill="#c7d2df"/>`,
    chair:`<path d="M32 18 Q32 12 39 12 H59 Q66 12 66 19 V45 H32Z" fill="#303d50"/><path d="M30 39 Q50 34 70 40 L69 49 Q50 55 31 48Z" fill="#1f2e43"/><path d="M50 49 V65 M50 65 L24 72 M50 65 L76 72 M50 65 L50 74" stroke="#718196" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="72" r="3" fill="#26364c"/><circle cx="76" cy="72" r="3" fill="#26364c"/>`,
    aio:`<rect x="23" y="7" width="54" height="42" rx="4" fill="#34475d"/><rect x="27" y="11" width="46" height="34" rx="2" fill="url(#a${key})"/><path d="M43 49 L57 49 L60 62 L40 62Z" fill="#8996a6"/><path d="M32 64 H68 Q72 64 72 67 V70 H28 V67 Q28 64 32 64Z" fill="#64748b"/><text x="50" y="30" font-size="7" fill="#fff" font-weight="800" text-anchor="middle">SENATI</text>`,
    keyboard:`<path d="M11 29 Q11 25 16 25 H84 Q89 25 89 29 V57 H11Z" fill="#35465b"/><path d="M17 31 H83 V52 H17Z" fill="#d7e0eb"/>${Array.from({length:4},(_,r)=>Array.from({length:12},(_,i)=>`<rect x="${20+i*5.1}" y="${34+r*4.2}" width="3.5" height="2.8" rx=".5" fill="#65778e"/>`).join('')).join('')}`,
    mouse:`<path d="M39 13 Q50 6 61 13 Q71 23 66 50 Q62 67 50 69 Q38 67 34 50 Q29 23 39 13Z" fill="#29394e"/><path d="M50 11 V34" stroke="#91a4ba" stroke-width="2"/><path d="M50 33 V42" stroke="#91a4ba" stroke-width="1.5"/>`,
    wall:`<path d="M12 12 H88 V67 H12Z" fill="#e8edf4" stroke="#96a7ba" stroke-width="3"/><path d="M12 49 H88 V67 H12Z" fill="#1556a7"/><path d="M12 44 H88" stroke="#fff" stroke-width="2"/>`,
    door:`<rect x="26" y="6" width="48" height="66" rx="2" fill="#52677f"/><rect x="31" y="11" width="38" height="56" fill="url(#g${key})" opacity=".8"/><path d="M50 11 V67" stroke="#fff" stroke-width="2" opacity=".7"/><circle cx="63" cy="40" r="2" fill="#e5edf4"/>`,
    window:`<rect x="8" y="16" width="84" height="49" rx="2" fill="#52677f"/><rect x="13" y="21" width="74" height="39" fill="url(#g${key})"/><path d="M50 21 V60 M13 40 H87" stroke="#fff" stroke-width="3" opacity=".9"/><path d="M13 60 L87 21" stroke="#a8d8f1" stroke-width="1.2"/>`,
    whiteboard:`<rect x="9" y="14" width="82" height="47" rx="2" fill="#5e6e82"/><rect x="14" y="18" width="72" height="39" fill="#fff"/><path d="M17 66 H83" stroke="#71839a" stroke-width="4"/><path d="M24 30 H72 M24 37 H62" stroke="#9caec0" stroke-width="1.5"/>`,
    fluorescent:`<rect x="10" y="23" width="80" height="32" rx="7" fill="#65778d"/><rect x="16" y="28" width="68" height="22" rx="5" fill="#fff6d8"/><path d="M20 34 H80" stroke="#fff" stroke-width="3"/>`,
    fan:`<circle cx="50" cy="40" r="8" fill="#56697f"/>${[0,120,240].map(a=>`<path d="M50 40 Q${50+Math.cos(a*Math.PI/180)*14} ${40+Math.sin(a*Math.PI/180)*14} ${50+Math.cos(a*Math.PI/180)*33} ${40+Math.sin(a*Math.PI/180)*33} Q${50+Math.cos((a+30)*Math.PI/180)*12} ${40+Math.sin((a+30)*Math.PI/180)*12} 50 40Z" fill="#c9d5e2" stroke="#697c91"/>`).join('')}`,
    projector:`<rect x="19" y="22" width="62" height="36" rx="7" fill="#e8edf4" stroke="#7e8fa4" stroke-width="2"/><circle cx="73" cy="40" r="8" fill="#4d627d"/><circle cx="73" cy="40" r="4" fill="#8ccbed"/>`,
    plant:`<path d="M50 38 Q20 20 24 7 Q44 10 50 36 Q53 11 76 6 Q79 27 53 40 Q77 33 87 48 Q67 60 51 43 Q34 64 13 50 Q27 32 50 38Z" fill="#459a67"/><path d="M33 49 H67 L62 72 H38Z" fill="#a86f4d"/>`,
    'safety-exit':`<rect x="9" y="17" width="82" height="44" rx="4" fill="#087a45" stroke="#fff" stroke-width="3"/><text x="50" y="45" fill="#fff" font-size="20" font-weight="900" text-anchor="middle">SALIDA</text>`,
    'safety-rules':`<rect x="13" y="8" width="74" height="62" rx="3" fill="#fff" stroke="#c62828" stroke-width="3"/><path d="M24 27 H76 M24 39 H76 M24 51 H68" stroke="#52677f" stroke-width="3"/><text x="50" y="20" fill="#17324d" font-size="8" font-weight="800" text-anchor="middle">REGLAS</text>`,
    'fire-extinguisher':`<rect x="35" y="16" width="30" height="49" rx="8" fill="#c62828"/><path d="M48 16 V9 H62 M61 9 Q75 13 68 25" stroke="#334155" stroke-width="4" fill="none"/><rect x="39" y="34" width="22" height="13" fill="#fff"/><text x="50" y="43" fill="#c62828" font-size="6" font-weight="800" text-anchor="middle">ABC</text>`,
    'safety-first-aid':`<rect x="12" y="12" width="76" height="54" rx="4" fill="#087a45" stroke="#fff" stroke-width="3"/><path d="M50 22 V56 M33 39 H67" stroke="#fff" stroke-width="8"/>`,
    'safety-electrical':`<path d="M50 6 L94 68 H6Z" fill="#ffd22e" stroke="#283443" stroke-width="3"/><path d="M55 22 L38 43 H51 L45 58 L65 35 H52Z" fill="#283443"/>`,
    'safety-safe-zone':`<rect x="12" y="12" width="76" height="54" rx="4" fill="#087a45" stroke="#fff" stroke-width="3"/><circle cx="50" cy="31" r="8" fill="#fff"/><path d="M50 40 V57 M36 48 H64" stroke="#fff" stroke-width="5"/>`,
    'safety-evacuation':`<rect x="8" y="17" width="84" height="44" rx="4" fill="#087a45" stroke="#fff" stroke-width="3"/><path d="M20 39 H76 M62 25 L76 39 L62 53" stroke="#fff" stroke-width="7" fill="none"/>`
  };
  return `<svg viewBox="0 0 100 78" aria-hidden="true">${common}<ellipse cx="50" cy="72" rx="35" ry="3.5" fill="#8092a8" opacity=".2"/>${arts[key]||arts.wall}</svg>`;
}
function interfaceIcon(name){
  const paths={
    people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-1.2A4.8 4.8 0 0 1 7.8 14h2.4a4.8 4.8 0 0 1 4.8 4.8V20M16 5.5a3 3 0 0 1 0 5.8M18 14.5a4.5 4.5 0 0 1 3 4.3V20"',
    furniture:'<rect x="4" y="9" width="16" height="5" rx="1.4"/><path d="M6 14v6m12-6v6M4 9V6h16v3"',
    devices:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"',
    building:'<path d="M3 21h18M5 21V5l7-3 7 3v16M9 9h2m2 0h2m-6 4h2m2 0h2m-5 8v-4h4v4"',
    'shield-check':'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    front:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h8"',
    back:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 15h8M8 11h8"',
    left:'<path d="M5 4h14v16H5zM5 12h14"',
    right:'<path d="M5 4h14v16H5zM5 12h14"',
    top:'<path d="M4 8l8-4 8 4-8 4-8-4zM4 8v8l8 4 8-4V8M12 12v8"',
    perspective:'<path d="M3 8l9-5 9 5-9 5-9-5zM3 8v8l9 5 9-5V8M12 13v8"'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.devices}</svg>`;
}
function renderLibrary(){
  const q=$('object-search').value.trim().toLowerCase();const holder=$('object-library');holder.innerHTML='';
  const groups=[
    {id:'personas',title:'Personas',icon:'people',keys:['man-senati','woman-senati','man','woman','teacher','teacher-f']},
    {id:'mobiliario',title:'Mobiliario',icon:'furniture',keys:['desk','chair']},
    {id:'computacion',title:'Equipos',icon:'devices',keys:['aio','keyboard','mouse']},
    {id:'infraestructura',title:'Infraestructura',icon:'building',keys:['window','door','wall','whiteboard','fluorescent','fan','projector','plant']},
    {id:'seguridad',title:'Seguridad',icon:'shield-check',keys:['safety-exit','safety-rules','fire-extinguisher','safety-first-aid','safety-electrical','safety-safe-zone','safety-evacuation']}
  ];
  groups.forEach((group,index)=>{
    const items=group.keys.map(k=>catalog.find(c=>c.key===k)).filter(Boolean).filter(item=>
      (!q||`${item.label} ${item.description}`.toLowerCase().includes(q)) &&
      (activeCategory==='all'||item.category===activeCategory)
    );
    if(!items.length)return;
    const section=document.createElement('section');section.className='library-group'+((index===0||q)?' expanded':'');
    const head=document.createElement('button');head.className='library-group-head';
    head.innerHTML=`<span class="group-emoji">${interfaceIcon(group.icon)}</span><span class="group-title">${group.title}</span><span class="group-count">${items.length}</span><span class="group-chevron">⌄</span>`;
    head.addEventListener('click',()=>section.classList.toggle('expanded'));
    const body=document.createElement('div');body.className='library-group-body';
    items.forEach(item=>{
      const button=document.createElement('button');button.className='library-item';button.draggable=true;
      const thumb=libraryThumbs[item.key];
      button.innerHTML=`<span class="item-preview">${thumb?`<img src="${thumb}" alt="" loading="lazy">`:catalogArt(item.key)}</span><span class="item-name">${item.label}</span>`;
      button.title=`${item.label} — ${item.description}`;
      button.addEventListener('click',()=>setPlacement(item.key));
      button.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/object-key',item.key);e.dataTransfer.effectAllowed='copy';setPlacement(item.key);});
      body.appendChild(button);
    });
    section.append(head,body);holder.appendChild(section);
  });
}
function getRootObject(intersection) {
 let o=intersection.object;
 while(o && o!==objectGroup && !o.userData.editorObject)o=o.parent;
 return o?.userData.editorObject?o:null;
}
renderer.domElement.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
renderer.domElement.addEventListener('drop',e=>{
 e.preventDefault();
 const key=e.dataTransfer.getData('text/object-key')||activePlacementKey;
 if(!key)return;
 const p=pointOnFloor(e);if(!p)return;
 addObject(key,clampToRoom(p));
 activePlacementKey=null;activeTool='select';renderer.domElement.style.cursor='grab';
});
renderer.domElement.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 const p=pointOnFloor(e);setPointer(e);
 if(activePlacementKey){
   if(p){addObject(activePlacementKey,clampToRoom(p));activePlacementKey=null;activeTool='select';renderer.domElement.style.cursor='grab';}
   return;
 }
 const hits=raycaster.intersectObjects(placed,true);
 const root=hits.length?getRootObject(hits[0]):null;
 if(root){
   selectObject(root);
   pointerDown={x:e.clientX,y:e.clientY};
   isDraggingObject=true;
   controls.enabled=false;
   renderer.domElement.setPointerCapture(e.pointerId);
 }else{
   selectObject(null);
 }
});
renderer.domElement.addEventListener('pointermove',e=>{
 if(!isDraggingObject||!selected)return;
 const p=pointOnFloor(e);if(!p)return;
 const previous=selected.position.clone();selected.position.copy(clampToRoom(p));moveLinkedObjects(selected,selected.position.clone().sub(previous));
 if(selectionHelper)selectionHelper.update();
 syncInspector();markDirty();
});
function endDrag(){if(isDraggingObject){isDraggingObject=false;controls.enabled=true;}}
renderer.domElement.addEventListener('pointerup',endDrag);
renderer.domElement.addEventListener('pointercancel',endDrag);
function deleteSelected(){
 if(!selected)return;
 const deleting=[selected];
 const ids=new Set([selected.userData.objectId]);
 let changed=true;
 while(changed){changed=false;placed.forEach(o=>{if(o.userData.accessoryOf&&ids.has(o.userData.accessoryOf)&&!ids.has(o.userData.objectId)){ids.add(o.userData.objectId);deleting.push(o);changed=true;}});}
 deleting.forEach(obj=>{
   const idx=placed.indexOf(obj);if(idx>=0)placed.splice(idx,1);
   objectGroup.remove(obj);
 });
 selectObject(null);renderObjectList();markDirty();
}
function duplicateSelected(){
 if(!selected)return;
 const key=selected.userData.catalogKey;
 const copy=addObject(key,selected.position.clone().add(new THREE.Vector3(.5,0,.5)),{
  rotationY:selected.rotation.y,scaleX:selected.scale.x,scaleY:selected.scale.y,scaleZ:selected.scale.z,
  label:`${selected.userData.label} copia`
 });
 return copy;
}
function applyInspector(){
 if(!selected)return;
 selected.userData.label=$('prop-label').value.trim()||'Objeto';
 const previousPosition=selected.position.clone();
 selected.position.set(
  Number($('prop-x').value)||0,Number($('prop-y').value)||0,Number($('prop-z').value)||0
 );
 moveLinkedObjects(selected,selected.position.clone().sub(previousPosition));
 if(selected.userData.catalogKey==='desk'){
  selected.scale.set(1,1,1);
  $('prop-sx').value='1.00';$('prop-sy').value='1.00';$('prop-sz').value='1.00';
 }else{
  selected.scale.set(
   Math.max(.1,Number($('prop-sx').value)||1),Math.max(.1,Number($('prop-sy').value)||1),Math.max(.1,Number($('prop-sz').value)||1)
  );
 }
 if(selectionHelper)selectionHelper.update();
 syncInspector();renderObjectList();markDirty();
}
['prop-label','prop-x','prop-y','prop-z','prop-sx','prop-sy','prop-sz'].forEach(id=>{
 $(id).addEventListener('change',applyInspector);
});
$('duplicate-object').addEventListener('click',duplicateSelected);
$('delete-object').addEventListener('click',deleteSelected);
document.querySelectorAll('[data-rotate]').forEach(btn=>btn.addEventListener('click',()=>{
 if(!selected)return;
 const angle=THREE.MathUtils.degToRad(Number(btn.dataset.rotate));
 selected.rotation.y+=angle;rotateLinkedObjects(selected,angle);
 if(selectionHelper)selectionHelper.update();markDirty();
}));
$('object-search').addEventListener('input',renderLibrary);
document.querySelectorAll('.category-tab').forEach(btn=>btn.addEventListener('click',()=>{
 document.querySelectorAll('.category-tab').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active');activeCategory=btn.dataset.category;renderLibrary();
}));
$('tool-select').addEventListener('click',()=>{activePlacementKey=null;activeTool='select';renderer.domElement.style.cursor='grab';$('viewport-status').textContent='Selecciona y arrastra los objetos para moverlos.';});
$('tool-move').addEventListener('click',()=>{activePlacementKey=null;activeTool='move';renderer.domElement.style.cursor='move';$('viewport-status').textContent='Selecciona un objeto y arrástralo para moverlo.';});
$('tool-grid').addEventListener('click',()=>{gridVisible=!gridVisible;gridHelper.visible=gridVisible;$('tool-grid').classList.toggle('active',gridVisible);$('opt-grid').checked=gridVisible;});
$('tool-roof').addEventListener('click',()=>{roofVisible=!roofVisible;roofMesh.visible=roofVisible;pyramidBuilding?.setMode(appearance.pyramidView||'exterior',roofVisible);$('tool-roof').classList.toggle('active',roofVisible);$('opt-roof').checked=roofVisible;});
$('tool-top').addEventListener('click',()=>setQuickView('perspective'));
function setQuickView(view){
  if(appearance.buildingPlan==='senati-pyramid'){
    const topY=room.height*getFloors().length;
    const target=new THREE.Vector3(0,topY*.52,0),span=Math.max(room.width,room.depth);let pos;
    if(view==='front')pos=new THREE.Vector3(0,topY*.73,span*1.30);
    else if(view==='back')pos=new THREE.Vector3(0,topY*.73,-span*1.30);
    else if(view==='left')pos=new THREE.Vector3(-span*1.30,topY*.79,3);
    else if(view==='right')pos=new THREE.Vector3(span*1.30,topY*.79,3);
    else if(view==='top'){pos=new THREE.Vector3(0,topY+span*1.40,.01);}
    else{positionCamera();pos=null;}
    if(pos){camera.position.copy(pos);controls.target.copy(target);controls.update();}
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));return;
  }
  const w=room.width,d=room.depth,h=room.height,span=Math.max(w,d),target=new THREE.Vector3(0,1.25,0);let pos;
  if(view==='front') {pos=new THREE.Vector3(0,Math.max(7,h+span*.34),span*1.25);target.set(0,1.1,0);}
  else if(view==='back') {pos=new THREE.Vector3(0,Math.max(7,h+span*.34),-span*1.25);target.set(0,1.1,0);}
  else if(view==='left') {pos=new THREE.Vector3(-span*1.30,Math.max(7,h+span*.34),0);target.set(0,1.1,0);}
  else if(view==='right') {pos=new THREE.Vector3(span*1.30,Math.max(7,h+span*.34),0);target.set(0,1.1,0);}
  else if(view==='top') {pos=new THREE.Vector3(0,span*1.35,.01);target.set(0,0,0);}
  else {positionCamera();pos=null;}
  if(pos){camera.position.copy(pos);controls.target.copy(target);controls.update();}
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
}
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>setQuickView(btn.dataset.view)));
document.querySelectorAll('[data-left-tab]').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('[data-left-tab]').forEach(b=>b.classList.toggle('active',b===btn));
  document.querySelectorAll('.left-tab-content').forEach(p=>p.classList.toggle('active',p.id===`left-tab-${btn.dataset.leftTab}`));
}));
$('tool-rotate').addEventListener('click',()=>{if(!selected){showToast('Selecciona un objeto primero.');return;}const angle=Math.PI/4;selected.rotation.y+=angle;rotateLinkedObjects(selected,angle);if(selectionHelper)selectionHelper.update();markDirty();});
$('tool-duplicate').addEventListener('click',()=>selected?duplicateSelected():showToast('Selecciona un objeto primero.'));
$('tool-delete').addEventListener('click',()=>selected?deleteSelected():showToast('Selecciona un objeto primero.'));
$('opt-grid').addEventListener('change',e=>{gridVisible=e.target.checked;if(gridHelper)gridHelper.visible=gridVisible;$('tool-grid').classList.toggle('active',gridVisible);});
$('opt-roof').addEventListener('change',e=>{roofVisible=e.target.checked;if(roofMesh)roofMesh.visible=roofVisible;pyramidBuilding?.setMode(appearance.pyramidView||'exterior',roofVisible);$('tool-roof').classList.toggle('active',roofVisible);});
$('climate-mode').addEventListener('change',e=>{applyClimate(e.target.value);markDirty();});
$('opt-shadows').addEventListener('change',e=>{renderer.shadowMap.enabled=e.target.checked;sun.castShadow=e.target.checked;markDirty();});
$('opt-realistic').addEventListener('change',e=>{renderer.toneMapping=e.target.checked?THREE.ACESFilmicToneMapping:THREE.LinearToneMapping;renderer.toneMappingExposure=e.target.checked?1.16:1.0;markDirty();});
$('scenario-name').addEventListener('input',updateSceneBadges);

$('apply-dimensions').addEventListener('click',()=>{
 const w=Number($('room-width').value),d=Number($('room-depth').value),h=Number($('room-height').value);
 if(!Number.isFinite(w)||!Number.isFinite(d)||!Number.isFinite(h)||w<3||d<3||h<2.2||w>100||d>100||h>20){showToast('Revisa las dimensiones ingresadas.');return;}
 const oldHeight=room.height,oldWidth=room.width,oldDepth=room.depth;
 const previousFloorIndices=placed.map(o=>nearestFloorIndex(o.position.y));
 room={width:w,depth:d,height:h};getFloors();makeRoom();
 // Un cambio de anchura o profundidad arrastra proporcionalmente los objetos
 // guardados: el mobiliario permanece dentro de su aula en la planta ampliada.
 placed.forEach((o,i)=>{
   if(appearance.buildingPlan==='senati-pyramid'){
     o.position.x*=w/oldWidth;o.position.z*=d/oldDepth;
   }
   const idx=previousFloorIndices[i];
   o.position.x=THREE.MathUtils.clamp(o.position.x,-room.width/2+.25,room.width/2-.25);
   o.position.z=THREE.MathUtils.clamp(o.position.z,-room.depth/2+.25,room.depth/2-.25);
   o.position.y=floorElevation(idx);
 });applyFloorVisibility();
 showToast(`Escenario actualizado: ${w} × ${d} m`);markDirty();
});
$('new-scene').addEventListener('click',()=>{
 if(placed.length&&!confirm('¿Crear un escenario nuevo? Se perderán los cambios no guardados.'))return;
 placed.forEach(o=>objectGroup.remove(o));placed=[];selectObject(null);currentScenarioId=null;
 $('scenario-name').value='Escenario nuevo';room={width:20,depth:12,height:3.35};
 appearance={floorType:'tile',floorColor:'#f2f4f7',wallColor:'#f1f3f6',deskColor:'#1559a8',chairColor:'#202a38',climate:'day',buildingPlan:'single-floor'};
 activeFloorIndex=0;syncFloorControls();$('construction-floor').value='all';syncAppearanceInputs();
 $('room-width').value=20;$('room-depth').value=12;$('room-height').value=3.35;makeRoom();renderObjectList();markDirty();
});

function populatePyramidClassroomFloor(floorIndex,{silent=true}={}){
  const y=floorElevation(floorIndex);
  const {x:sx,z:sz}=pyramidScale(room.width,room.depth);
  ev52DeskPositions(sx,sz).forEach((desk,idx)=>{
    const obj=addObject('desk',new THREE.Vector3(desk.x,y,desk.z),{rotationY:0,silent:true});
    equipDesk(obj,{silent:true});
    const chair=addObject('chair',new THREE.Vector3(desk.x,y,desk.z+.91),{rotationY:Math.PI/2,silent:true,skipSeat:true});
    // La mitad de los puestos muestra alumnos para aligerar la escena sin perder las PC.
    if(idx%2===0)addObject('man-senati',new THREE.Vector3(desk.x,y,desk.z+.92),
      {rotationY:Math.PI,silent:true,seated:true,accessoryOf:chair.userData.objectId});
  });
  for(const r of EV52_ROOMS.filter(r=>r.pcs)){
    const x=(r.x0+r.x1)/2*sx,z=(r.z0+.46)*sz;
    addObject('teacher',new THREE.Vector3(x,y,z),{rotationY:0,silent:true});
    addObject('fan',new THREE.Vector3(x,y,(r.z0+r.z1)/2*sz),{silent:true});
  }
  addObject('safety-exit',new THREE.Vector3(0,y,7.10*sz),{rotationY:Math.PI,silent:true});
  addObject('fire-extinguisher',new THREE.Vector3(7.90*sx,y,1.85*sz),{rotationY:-Math.PI/2,silent:true});
  if(!silent){renderObjectList();markDirty();}
}
function populatePyramidInterior({silent=true}={}){
  for(let i=0;i<getFloors().length;i++) populatePyramidClassroomFloor(i,{silent:true});
  if(!silent){renderObjectList();applyFloorVisibility();markDirty();}
}

$('classroom-template').addEventListener('click',()=>{
 document.querySelectorAll('.scenario-card').forEach(card=>card.classList.toggle('selected',card.id==='classroom-template'));
 if(placed.length&&!confirm('La plantilla reemplazará los objetos actuales. ¿Continuar?'))return;
 placed.forEach(o=>objectGroup.remove(o));placed=[];selectObject(null);
 // Aula amplia 20 x 12 m: recupera la distribución anterior de cuatro columnas y seis filas.
 room={width:20,depth:12,height:3.35};appearance={floorType:'tile',floorColor:'#f2f4f7',wallColor:'#f1f3f6',deskColor:'#1559a8',chairColor:'#202a38',climate:'day',buildingPlan:'single-floor'};activeFloorIndex=0;
 roofVisible=false;gridVisible=true;$('opt-roof').checked=false;$('opt-grid').checked=true;
 $('scenario-name').value='Aula SENATI (Default)';$('room-width').value=20;$('room-depth').value=12;$('room-height').value=3.35;
 $('auto-station').checked=true;$('auto-seat').checked=true;syncAppearanceInputs();makeRoom();
 // Ventanales con vidrio transparente en el lateral izquierdo y puerta de vidrio en el lateral derecho.
 [-3.6,0,3.6].forEach(z=>addObject('window',new THREE.Vector3(-room.width/2+.055,0,z),{rotationY:Math.PI/2,silent:true}));
 const doorZ=room.depth*.36;addObject('door',new THREE.Vector3(room.width/2-.055,0,doorZ),{rotationY:Math.PI/2,silent:true});
 // Señal de salida sobre la puerta y panel de reglas junto al acceso, orientados hacia el interior.
 addObject('safety-exit',new THREE.Vector3(room.width/2-.10,.88,doorZ-.08),{rotationY:-Math.PI/2,silent:true});
 addObject('safety-rules',new THREE.Vector3(room.width/2-.10,0,doorZ-1.25),{rotationY:-Math.PI/2,silent:true});
 // Equipo y señalización complementaria de emergencia, sin invadir el ancho libre de la puerta.
 addObject('fire-extinguisher',new THREE.Vector3(room.width/2-1.05,0,doorZ-2.05),{rotationY:-Math.PI/2,silent:true});
 addObject('safety-electrical',new THREE.Vector3(room.width/2-.10,0,-1.65),{rotationY:-Math.PI/2,silent:true});
 addObject('safety-safe-zone',new THREE.Vector3(-room.width/2+.10,0,room.depth/2-1.0),{rotationY:Math.PI/2,silent:true});
 // Pizarra y profesor al frente; los alumnos quedan orientados hacia ellos.
 addObject('teacher',new THREE.Vector3(0,0,-4.95),{rotationY:0,silent:true});
 addObject('whiteboard',new THREE.Vector3(0,0,-5.78),{rotationY:0,scaleX:1.45,scaleY:1.05,silent:true});
 // 24 estaciones: cuatro columnas simétricas por seis filas. Escritorios de 158 x 72 cm.
 const deskXs=[-6.6,-2.2,2.2,6.6];
 const deskRows=[-3.9,-2.2,-.5,1.2,2.9,4.6];
 deskRows.forEach((z,row)=>deskXs.forEach((x,col)=>{
   addObject('desk',new THREE.Vector3(x,0,z),{rotationY:0,silent:true});
   // La silla está al frente (+Z) y gira para que el alumno mire hacia el monitor (-Z).
   addObject('chair',new THREE.Vector3(x,0,z+.94),{rotationY:Math.PI/2,silent:true});
 }));
 // Luminarias paralelas al eje ancho del aula, distribuidas sobre las filas de escritorios.
 for(const x of [-6,-2,2,6])for(const z of [-3.2,0,3.2])addObject('fluorescent',new THREE.Vector3(x,0,z),{rotationY:0,silent:true});
 for(const x of [-7,-2,2,7])addObject('fan',new THREE.Vector3(x,0,-.1),{silent:true});
 addObject('projector',new THREE.Vector3(0,0,-1.2),{silent:true});
 selectObject(null);renderLibrary();renderObjectList();applyFloorVisibility();markDirty();
 $('scene-template-tag').textContent='Aula SENATI (Default)';$('viewport-status').textContent='20 × 12 m';
 showToast('Aula SENATI creada: 24 puestos, 24 estudiantes, profesor y 24 estaciones informáticas.');
});

$('building-template').addEventListener('click',()=>{
 document.querySelectorAll('.scenario-card').forEach(card=>card.classList.toggle('selected',card.id==='building-template'));
 if(placed.length&&!confirm('La plantilla reemplazará los objetos actuales. ¿Continuar?'))return;
 placed.forEach(o=>objectGroup.remove(o));placed=[];selectObject(null);currentScenarioId=null;
 room={width:22,depth:16,height:3.4};
 appearance={floorType:'tile',floorColor:'#e7ebf0',wallColor:'#e9edf2',deskColor:'#1559a8',chairColor:'#202a38',climate:'day',buildingPlan:'two-floor',floorHeight:3.4,stairs:{x:5.25,topZ:-2.0,bottomZ:3.45,width:2.55},floors:[{id:1,name:'Piso 1',elevation:0,height:3.4,floorType:'tile',floorColor:'#e7ebf0'},{id:2,name:'Piso 2',elevation:3.4,height:3.4,floorType:'tile',floorColor:'#e7ebf0'}]};activeFloorIndex=0;
 roofVisible=false;gridVisible=false;$('opt-roof').checked=false;$('opt-grid').checked=false;
 $('scenario-name').value='Edificio de 2 pisos (Default 2)';$('room-width').value=22;$('room-depth').value=16;$('room-height').value=3.4;
 $('auto-station').checked=false;$('auto-seat').checked=false;syncFloorControls();$('construction-floor').value='all';syncAppearanceInputs();makeRoom();
 const doorZ=room.depth*.36;
 addObject('door',new THREE.Vector3(room.width/2-.055,0,doorZ),{rotationY:Math.PI/2,silent:true});
 addObject('safety-exit',new THREE.Vector3(room.width/2-.10,.88,doorZ-.05),{rotationY:-Math.PI/2,silent:true});
 addObject('fire-extinguisher',new THREE.Vector3(room.width/2-1.15,0,doorZ-1.45),{rotationY:-Math.PI/2,silent:true});
 addObject('safety-evacuation',new THREE.Vector3(7.6,1.9,4.7),{rotationY:Math.PI/2,silent:true});
 // Ocho participantes y estaciones en el segundo nivel, fuera del hueco de escalera.
 const upperY=room.height;
 const xs=[-7.4,-4.2,-1.0,2.0];
 xs.forEach((x,i)=>{
   addObject('desk',new THREE.Vector3(x,upperY,-6.15),{silent:true});
   addObject(i%2?'woman-senati':'man-senati',new THREE.Vector3(x,upperY,-4.95),{silent:true});
   addObject('desk',new THREE.Vector3(x,upperY,-3.65),{silent:true});
   addObject(i%2?'man-senati':'woman-senati',new THREE.Vector3(x,upperY,-2.95),{silent:true});
 });
 // Señales de orientación en la llegada a escalera y la salida del primer nivel.
 addObject('safety-exit',new THREE.Vector3(5.25,upperY+1.0,-2.55),{rotationY:Math.PI,silent:true});
 selectObject(null);renderLibrary();renderObjectList();applyFloorVisibility();markDirty();
 $('scene-template-tag').textContent='Edificio 2 pisos (Default 2)';$('viewport-status').textContent='22 × 16 m · 2 niveles';
 showToast('Default 2 creado: 2 pisos, escalera, pasadizo y 8 participantes en el segundo nivel. Guarda el escenario para simularlo.');
});

$('pyramid-template').addEventListener('click',()=>{
  if(placed.length&&!confirm('La plantilla de la Dirección Nacional reemplazará la edición actual. ¿Continuar?'))return;
  placed.forEach(o=>objectGroup.remove(o));placed=[];selectObject(null);currentScenarioId=null;
  room={width:DEFAULT_PYRAMID_WIDTH,depth:DEFAULT_PYRAMID_DEPTH,height:DEFAULT_LEVEL_HEIGHT};
  appearance={floorType:'concrete',floorColor:'#deddd8',wallColor:'#b0a69c',deskColor:'#1559a8',chairColor:'#202a38',
    climate:'day',buildingPlan:'senati-pyramid',floorCount:6,pyramidView:'transparente',facadeColor:'#afa59b',signColor:'#1251cb',floors:Array.from({length:6},(_,i)=>({id:i+1,name:`Piso ${i+1}`,elevation:i*DEFAULT_LEVEL_HEIGHT,height:DEFAULT_LEVEL_HEIGHT,floorType:'concrete',floorColor:'#deddd8'}))};
  activeFloorIndex=0;roofVisible=false;gridVisible=false;
  $('opt-roof').checked=false;$('opt-grid').checked=false;
  $('auto-station').checked=false;$('auto-seat').checked=false;
  $('scenario-name').value='Dirección Nacional SENATI · Pirámide (maqueta)';
  $('room-width').value=room.width;$('room-depth').value=room.depth;$('room-height').value=room.height;
  document.querySelectorAll('.scenario-card').forEach(card=>card.classList.toggle('selected',card.id==='pyramid-template'));
  $('construction-floor').value='0';syncAppearanceInputs();makeRoom();
  // Seis pisos interiores con salones equipados (20 estaciones por nivel).
  populatePyramidInterior({silent:true});
  // Personas y señalización en el acceso exterior, en posiciones referenciales.
  addObject('man-senati',new THREE.Vector3(-1.8,0,room.depth/2+3.5),{silent:true});
  addObject('woman-senati',new THREE.Vector3(2,0,room.depth/2+3.1),{silent:true});
  // La puerta de entrada ya está construida en la geometría de la fachada.
  addObject('safety-exit',new THREE.Vector3(0,0,room.depth/2-1.5),{silent:true});
  selectObject(null);renderLibrary();renderObjectList();applyFloorVisibility();markDirty();
  $('scene-template-tag').textContent='Pirámide SENATI V11 · atrio abierto · 6 pisos';
  showToast('V11: tragaluz central abierto del piso 2 al techo, con barandillas perimetrales y patio de luz.');
});
['pyramid-facade-color','pyramid-sign-color'].forEach(id=>$(id)?.addEventListener('change',()=>{
  appearance.facadeColor=$('pyramid-facade-color').value;
  appearance.signColor=$('pyramid-sign-color').value;
  makeRoom();markDirty();
}));
$('pyramid-shell-mode')?.addEventListener('change',e=>{
  appearance.pyramidView=e.target.value;
  pyramidBuilding?.setMode(appearance.pyramidView,roofVisible);
  markDirty();
});
$('blank-template').addEventListener('click',()=>$('new-scene').click());

let savedOrbitView=null;
let walkVisibilitySnapshot=null;
function enterWalkMode(){
  if(walkMode&&walkControls.isLocked){walkControls.unlock();return;}
  savedOrbitView={position:camera.position.clone(),target:controls.target.clone()};
  walkMode=true;controls.enabled=false;walkFloorIndex=0;walkOnStairs=false;walkStairRoute=null;walkSmooth.set(0,0);walkDoorOpen=false;
  pyramidBuilding?.setDoorOpen?.(false);
  walkVisibilitySnapshot=placed.map(o=>o.visible);
  placed.forEach(o=>o.visible=nearestFloorIndex(o.position.y)===0);
  if(appearance.buildingPlan==='senati-pyramid'){
    camera.position.set(0,1.65,(pyramidBuilding?.entry?.frontZ??room.depth/2)+5.4);camera.rotation.set(0,0,0);
    $('walk-hud').querySelector('span').textContent='WASD · Shift correr · E puertas/ascensor · Escaleras conectan las 6 plantas · ESC salir';
  }else if(appearance.buildingPlan==='two-floor'&&getFloors().length>1){
    const stair=getStairSpec();
    camera.position.set(stair.x,1.65,Math.min(room.depth/2-.6,stair.bottomZ+2.2));
    camera.rotation.set(0,0,0); // Mirar hacia el arranque de la escalera (-Z).
    $('walk-hud').querySelector('span').textContent='W A S D para caminar y subir/bajar · Mouse para mirar · ESC para salir';
  }else{
    camera.position.set(room.width/2-1.2,1.65,-room.depth/2+1.0);
    camera.rotation.set(0,Math.PI,0);
    $('walk-hud').querySelector('span').textContent='W A S D para caminar · Mouse para mirar · ESC para salir';
  }
  $('tool-walk').classList.add('active');$('walk-hud').classList.remove('hidden');
  $('walk-crosshair').classList.remove('hidden');$('viewport-help').classList.add('hidden');
  $('viewport-status').textContent='Modo recorrido: WASD para caminar · ESC para volver';
  walkControls.lock();
}
walkControls.addEventListener('lock',()=>{
  document.body.classList.add('walk-mode');
  $('walk-exit-button')?.classList.remove('hidden');
  $('tool-walk').innerHTML='<span>↩</span> Salir';
});
walkControls.addEventListener('unlock',()=>{
  document.body.classList.remove('walk-mode');
  $('walk-exit-button')?.classList.add('hidden');
  walkMode=false;controls.enabled=true;$('tool-walk').innerHTML='<span>♙</span> Recorrer';$('tool-walk').classList.remove('active');
  $('walk-hud').classList.add('hidden');$('walk-crosshair').classList.add('hidden');
  $('viewport-help').classList.remove('hidden');$('viewport-status').textContent='Modo construcción';
  if(savedOrbitView){camera.position.copy(savedOrbitView.position);controls.target.copy(savedOrbitView.target);controls.update();savedOrbitView=null;}
  if(walkVisibilitySnapshot){placed.forEach((o,i)=>o.visible=walkVisibilitySnapshot[i]??true);walkVisibilitySnapshot=null;}
  Object.keys(walkKeys).forEach(k=>walkKeys[k]=false);walkSmooth.set(0,0);walkStairRoute=null;
});
$('walk-exit-button')?.addEventListener('click',()=>walkControls.unlock());
$('tool-walk').addEventListener('click',enterWalkMode);
document.addEventListener('keydown',e=>{
 if(!walkMode||!walkControls.isLocked)return;
 const k=e.key.toLowerCase();
 if(k==='w'||k==='arrowup'){walkKeys.forward=true;e.preventDefault();}
 if(k==='s'||k==='arrowdown'){walkKeys.backward=true;e.preventDefault();}
 if(k==='a'||k==='arrowleft'){walkKeys.left=true;e.preventDefault();}
 if(k==='d'||k==='arrowright'){walkKeys.right=true;e.preventDefault();}
 if(k==='e' && !e.repeat && appearance.buildingPlan==='senati-pyramid'){
   e.preventDefault();
   const entry=pyramidBuilding?.entry,el=pyramidBuilding?.elevator;
   if(entry&&Math.hypot(camera.position.x-entry.x,camera.position.z-entry.z)<2.7&&walkFloorIndex===0){
     walkDoorOpen=!walkDoorOpen;pyramidBuilding.setDoorOpen?.(walkDoorOpen);
     $('viewport-status').textContent=walkDoorOpen?'Puerta principal abierta.':'Puerta principal cerrada.';
   }else if(el&&Math.hypot(camera.position.x-el.x,camera.position.z-el.accessZ)<2.65){
     walkFloorIndex=(walkFloorIndex+1)%getFloors().length;
     walkStairRoute=null;
     camera.position.set(el.x,floorElevation(walkFloorIndex)+1.65,el.accessZ);
     $('viewport-status').textContent=`Ascensor didáctico · piso ${walkFloorIndex+1}`;
   }else{
     const door=pyramidBuilding?.classroomDoors?.filter(d=>d.floor===walkFloorIndex)
       .map(d=>({door:d,dist:Math.hypot(camera.position.x-d.x,camera.position.z-d.z)}))
       .sort((a,b)=>a.dist-b.dist)[0];
     if(door&&door.dist<2.15){
       pyramidBuilding.setClassroomDoorOpen(door.door.floor,door.door.id,!door.door.open);
       $('viewport-status').textContent=door.door.open?'Acceso al aula abierto.':'Acceso al aula cerrado.';
     }else $('viewport-status').textContent='Acércate a una puerta o al ascensor y pulsa E.';
   }
 }
});
document.addEventListener('keyup',e=>{
 const k=e.key.toLowerCase();
 if(k==='w'||k==='arrowup')walkKeys.forward=false;
 if(k==='s'||k==='arrowdown')walkKeys.backward=false;
 if(k==='a'||k==='arrowleft')walkKeys.left=false;
 if(k==='d'||k==='arrowright')walkKeys.right=false;
});
document.addEventListener('keydown',e=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
 if(e.key==='Delete'||e.key==='Backspace'){deleteSelected();}
 if(e.key.toLowerCase()==='r'&&selected){selected.rotation.y+=Math.PI/4;if(selectionHelper)selectionHelper.update();markDirty();}
 if(e.key==='Escape'){activePlacementKey=null;activeTool='select';renderer.domElement.style.cursor='grab';}
});

// Save/load API integration: PHP PDO + MySQL.
async function api(action, data=null, query=''){
 const token=document.querySelector('meta[name="csrf-token"]')?.content||'';
 const options=data?{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':token},body:JSON.stringify(data)}:{};
 const response=await fetch(`./api/scenarios.php?action=${action}${query}`,options);
 const payload=await response.json();
 if(!response.ok||!payload.success)throw new Error(payload.message||'No se pudo completar la operación.');
 return payload;
}
function serializeScene(){
 return {
  name:$('scenario-name').value.trim()||'Escenario sin título',
  dimensions:room,
  appearance:{...appearance,roofVisible,gridVisible,shadowsEnabled:renderer.shadowMap.enabled,realisticLighting:$('opt-realistic').checked},
  objects:placed.map(o=>({
   id:o.userData.objectId,catalogKey:o.userData.catalogKey,label:o.userData.label,
   position:{x:o.position.x,y:o.position.y,z:o.position.z},
   rotation:{x:o.rotation.x,y:o.rotation.y,z:o.rotation.z},
   scale:{x:o.scale.x,y:o.scale.y,z:o.scale.z},
   config:{accessoryOf:o.userData.accessoryOf||null,seated:Boolean(o.userData.seated),screenMode:o.userData.screenMode||null,customColor:o.userData.customColor||null,floorId:o.userData.floorId||nearestFloorIndex(o.position.y)+1}
  }))
 };
}
async function refreshScenarioList(){
 try{
  const result=await api('list');
  const select=$('saved-scenes');select.innerHTML='<option value="">Escenarios guardados</option>';
  result.scenarios.forEach(s=>{const opt=document.createElement('option');opt.value=s.id;opt.textContent=`${s.name} · ${s.width_m}×${s.depth_m} m`;select.appendChild(opt);});
 }catch(e){console.warn(e);$('save-status').textContent='BD pendiente de configurar';}
}
$('save-scene').addEventListener('click',async()=>{
 try{
  const payload=serializeScene();payload.id=currentScenarioId;
  const result=await api('save',payload);
  currentScenarioId=result.id;$('save-status').textContent='Guardado en MySQL';$('save-status').previousElementSibling.style.background='#49c58c';
  await refreshScenarioList();$('saved-scenes').value=String(currentScenarioId);showToast('Escenario guardado correctamente.');
 }catch(e){showToast(e.message);}
});
$('history-scene').addEventListener('click',async()=>{
 const id=$('saved-scenes').value||currentScenarioId;
 if(!id){showToast('Primero selecciona un escenario guardado.');return;}
 try{
  const result=await api('history',null,`&id=${encodeURIComponent(id)}`);
  if(!result.versions.length){showToast('Aún no hay versiones anteriores.');return;}
  const versions=result.versions.map(v=>`Versión ${v.revision_no} · ${v.created_at}`).join('\n');
  const selectedVersion=window.prompt(`Versiones anteriores:\n${versions}\n\nEscribe el número de versión que deseas recuperar:`);
  if(!selectedVersion)return;
  const n=Number(selectedVersion);
  if(!Number.isInteger(n)||!result.versions.some(v=>Number(v.revision_no)===n)){showToast('Versión no válida.');return;}
  if(!confirm(`¿Restaurar la versión ${n}? El estado actual se guardará como copia.`))return;
  const response=await api('restore',{id:Number(id),revision:n});
  $('saved-scenes').value=String(id);
  $('load-scene').click();
  showToast(response.message);
 }catch(e){showToast(e.message);}
});
$('load-scene').addEventListener('click',async()=>{
 const id=$('saved-scenes').value;if(!id){showToast('Selecciona un escenario guardado.');return;}
 try{
  const result=await api('load',null,`&id=${encodeURIComponent(id)}`);
  const data=result.scenario;
  room={width:Number(data.width_m),depth:Number(data.depth_m),height:Number(data.height_m)};
  let savedVisualOptions={};
  if(data.appearance_json){
    try{savedVisualOptions=JSON.parse(data.appearance_json)||{};appearance={...appearance,...savedVisualOptions};}catch(e){console.warn('Apariencia guardada no válida',e);}
  } else if(data.appearance && typeof data.appearance==='object') {
    savedVisualOptions=data.appearance;appearance={...appearance,...savedVisualOptions};
  }
  if(typeof savedVisualOptions.roofVisible==='boolean')roofVisible=savedVisualOptions.roofVisible;
  if(typeof savedVisualOptions.gridVisible==='boolean')gridVisible=savedVisualOptions.gridVisible;
  applyClimate(savedVisualOptions.climate||'day');
  $('opt-roof').checked=roofVisible;$('opt-grid').checked=gridVisible;
  if(typeof savedVisualOptions.shadowsEnabled==='boolean'){renderer.shadowMap.enabled=savedVisualOptions.shadowsEnabled;sun.castShadow=savedVisualOptions.shadowsEnabled;$('opt-shadows').checked=savedVisualOptions.shadowsEnabled;}
  if(typeof savedVisualOptions.realisticLighting==='boolean'){$('opt-realistic').checked=savedVisualOptions.realisticLighting;renderer.toneMapping=savedVisualOptions.realisticLighting?THREE.ACESFilmicToneMapping:THREE.LinearToneMapping;renderer.toneMappingExposure=savedVisualOptions.realisticLighting?1.16:1.0;}
  syncAppearanceInputs();
  activeFloorIndex=0;syncFloorControls();$('construction-floor').value='all';$('room-width').value=room.width;$('room-depth').value=room.depth;$('room-height').value=room.height;
  $('scenario-name').value=data.name;currentScenarioId=Number(data.id);
  makeRoom();$('scene-template-tag').textContent=appearance.buildingPlan==='senati-pyramid'?'Pirámide SENATI · cargada':'Escenario guardado';placed.forEach(o=>objectGroup.remove(o));placed=[];selectObject(null);
  data.objects.forEach(o=>{
   let config={};try{config=JSON.parse(o.config_json||'{}')||{};}catch(e){config={};}
   const obj=addObject(o.catalog_key,new THREE.Vector3(Number(o.pos_x),Number(o.pos_y),Number(o.pos_z)),{
    id:o.object_uuid,label:o.label,rotationY:Number(o.rot_y),scaleX:Number(o.scale_x),scaleY:Number(o.scale_y),scaleZ:Number(o.scale_z),skipAccessories:true,
    accessoryOf:config.accessoryOf||null,seated:Boolean(config.seated),screenMode:config.screenMode||'windows11',customColor:config.customColor||null
   });
   obj.userData.floorId=Number(config.floorId)||nearestFloorIndex(obj.position.y)+1;obj.userData.floorIndex=obj.userData.floorId-1;
   obj.rotation.x=Number(o.rot_x);obj.rotation.z=Number(o.rot_z);
  });
  const hasStations=placed.some(o=>o.userData.catalogKey==='aio'&&o.userData.accessoryOf);$('auto-station').checked=hasStations;
  const hasSeated=placed.some(o=>o.userData.seated);$('auto-seat').checked=hasSeated;
  placed.filter(o=>o.userData.catalogKey==='desk').forEach(d=>d.userData.stationEquipped=placed.some(o=>o.userData.catalogKey==='aio'&&o.userData.accessoryOf===d.userData.objectId));
  placed.filter(o=>o.userData.catalogKey==='chair').forEach(c=>c.userData.occupied=placed.some(o=>o.userData.accessoryOf===c.userData.objectId&&o.userData.seated));
  selectObject(null);renderObjectList();applyFloorVisibility();$('save-status').textContent='Escenario cargado';showToast('Escenario cargado.');
 }catch(e){showToast(e.message);}
});
$('scenario-name').addEventListener('input',markDirty);

// Equipamiento masivo de estaciones: un único control para todos los escritorios.
$('auto-station').addEventListener('change',e=>setAllDeskStations(e.target.checked));
$('apply-station').addEventListener('click',()=>setAllDeskStations($('auto-station').checked));
$('auto-seat').addEventListener('change',e=>setAllSeats(e.target.checked));
$('apply-seats').addEventListener('click',()=>setAllSeats($('auto-seat').checked));

// Paneles laterales: un único estado de rejilla, sin alternar display ni clases ocultas incompatibles.
let panelDrag=null;
const workspace=$('workspace');
const panelState={left:false,right:false};
function setPanelWidth(which,width){
 const other=which==='left'?'right':'left';
 const otherOpen=!panelState[other];
 const otherWidth=otherOpen?(parseFloat(getComputedStyle(document.documentElement).getPropertyValue(which==='left'?'--right-panel-width':'--left-panel-width'))||270):0;
 const max=Math.max(220,window.innerWidth-otherWidth-420);
 const value=Math.max(210,Math.min(Math.min(which==='left'?460:440,window.innerWidth*.34,max),width));
 document.documentElement.style.setProperty(which==='left'?'--left-panel-width':'--right-panel-width',`${value}px`);
}
function applyPanelState(){
 workspace.classList.toggle('left-collapsed',panelState.left);
 workspace.classList.toggle('right-collapsed',panelState.right);
 for(const which of ['left','right']){
  const collapsed=panelState[which];
  const btn=$(which==='left'?'collapse-left':'collapse-right');
  const quick=$(which==='left'?'show-left-panel':'show-right-panel');
  btn.textContent=collapsed?(which==='left'?'›':'‹'):(which==='left'?'‹':'›');
  btn.title=collapsed?'Expandir panel':'Contraer panel';
  btn.setAttribute('aria-expanded',String(!collapsed));
  quick.setAttribute('aria-expanded',String(!collapsed));
  quick.title=collapsed?'Mostrar panel':'Ocultar panel';
 }
 requestAnimationFrame(()=>requestAnimationFrame(resize));
}
function togglePanel(which){panelState[which]=!panelState[which];applyPanelState();}
function startPanelResize(e,which){
 if(panelState[which])return;
 e.preventDefault();
 const prop=which==='left'?'--left-panel-width':'--right-panel-width';
 panelDrag={which,startX:e.clientX,startWidth:parseFloat(getComputedStyle(document.documentElement).getPropertyValue(prop))||(which==='left'?292:270),pointerId:e.pointerId};
 e.currentTarget.setPointerCapture?.(e.pointerId);
 document.body.classList.add('resizing-panels');
}
$('resize-left').addEventListener('pointerdown',e=>startPanelResize(e,'left'));
$('resize-right').addEventListener('pointerdown',e=>startPanelResize(e,'right'));
window.addEventListener('pointermove',e=>{if(!panelDrag)return;const delta=e.clientX-panelDrag.startX;setPanelWidth(panelDrag.which,panelDrag.startWidth+(panelDrag.which==='left'?delta:-delta));});
function stopPanelResize(){if(!panelDrag)return;panelDrag=null;document.body.classList.remove('resizing-panels');requestAnimationFrame(resize);}
window.addEventListener('pointerup',stopPanelResize);
window.addEventListener('pointercancel',stopPanelResize);
$('collapse-left').addEventListener('click',()=>togglePanel('left'));
$('collapse-right').addEventListener('click',()=>togglePanel('right'));
$('show-left-panel').addEventListener('click',()=>togglePanel('left'));
$('show-right-panel').addEventListener('click',()=>togglePanel('right'));
$('tool-fullscreen').addEventListener('click',async()=>{
 try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage-area').requestFullscreen();}
 catch(e){showToast('El navegador no permitió pantalla completa.');}
});
document.addEventListener('fullscreenchange',()=>{
 const button=$('tool-fullscreen');
 button.innerHTML='<svg viewBox="0 0 24 24"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';
 button.title=document.fullscreenElement?'Salir de pantalla completa':'Pantalla completa';
 button.setAttribute('aria-label',button.title);
 requestAnimationFrame(resize);
});
// Inicio con una escena SENATI lista para editar, en lugar de un lienzo vacío.
makeRoom();applyClimate(appearance.climate||'day');syncAppearanceInputs();renderLibrary();renderObjectList();refreshScenarioList();
$('pyramid-template').click();
function resize(){
 const w=Math.floor(viewport.getBoundingClientRect().width);
 const h=Math.floor(viewport.getBoundingClientRect().height);
 if(w<2||h<2)return;
 camera.aspect=w/h;camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);
}
document.addEventListener('keydown',e=>{
  if(!walkMode||!walkControls.isLocked)return;
  if(e.key==='Shift')walkKeys.sprint=true;
  if(appearance.buildingPlan==='senati-pyramid' && (e.key==='PageUp'||e.key==='PageDown')){
    e.preventDefault();
    const dir=e.key==='PageUp'?1:-1;
    walkFloorIndex=THREE.MathUtils.clamp(walkFloorIndex+dir,0,getFloors().length-1);
    camera.position.y=floorElevation(walkFloorIndex)+1.65;
    $('viewport-status').textContent=`Planta ${walkFloorIndex+1} · interior esquemático`;
  }
});
document.addEventListener('keyup',e=>{if(e.key==='Shift')walkKeys.sprint=false;});
const viewportObserver=new ResizeObserver(()=>requestAnimationFrame(resize));
viewportObserver.observe(viewport);
window.addEventListener('resize',()=>requestAnimationFrame(resize));
requestAnimationFrame(resize);
renderer.setAnimationLoop(()=>{
 const dt=Math.min(walkClock.getDelta(),.05);
 if(walkMode&&walkControls.isLocked){
   const previousWalkPosition=camera.position.clone();
   const previousOnStairs=walkOnStairs;
   const forward=Number(walkKeys.forward)-Number(walkKeys.backward);
   const lateral=Number(walkKeys.right)-Number(walkKeys.left);
   const len=Math.max(1,Math.hypot(forward,lateral));
   const speed=walkKeys.sprint?10.0:6.3;
   const alpha=1-Math.exp(-11*dt);
   walkSmooth.x=THREE.MathUtils.lerp(walkSmooth.x,lateral*speed/len,alpha);
   walkSmooth.y=THREE.MathUtils.lerp(walkSmooth.y,forward*speed/len,alpha);
   walkControls.moveForward(walkSmooth.y*dt);
   walkControls.moveRight(walkSmooth.x*dt);
   const outdoor=appearance.buildingPlan==='senati-pyramid';
   if(outdoor){
     const front=pyramidBuilding?.entry?.frontZ??room.depth/2;
     const oldInside=previousWalkPosition.z<front,inside=camera.position.z<front;
     const stair=pyramidBuilding?.stairs;
     const crossing=(oldInside!==inside)&&(!walkDoorOpen||Math.abs(camera.position.x)>1.80);
     const bounds=pyramidBuilding?.walkBounds;
     const wall=inside&&bounds&&(camera.position.x<bounds.left+.24||camera.position.x>bounds.right-.24||camera.position.z<bounds.back+.24);
     if(crossing||wall){camera.position.x=previousWalkPosition.x;camera.position.z=previousWalkPosition.z;walkSmooth.multiplyScalar(.35);}
     if(stair){
       let blockedByWall=(pyramidBuilding.floorWallBoxes?.[walkFloorIndex]||[]).some(w=>
         camera.position.x>w.x0-.20&&camera.position.x<w.x1+.20&&
         camera.position.z>w.z0-.20&&camera.position.z<w.z1+.20);
       const closedDoor=pyramidBuilding.classroomDoors?.some(d=>d.floor===walkFloorIndex&&!d.open&&
         Math.abs(camera.position.z-d.z)<.22&&Math.abs(camera.position.x-d.x)<d.halfWidth+.20);
       if(blockedByWall||closedDoor){camera.position.x=previousWalkPosition.x;camera.position.z=previousWalkPosition.z;walkSmooth.multiplyScalar(.28);}
       for(const st of pyramidBuilding.staircases||[stair]){
         const wasIn=previousWalkPosition.x>st.xMin+.2&&previousWalkPosition.x<st.xMax-.2&&previousWalkPosition.z<st.zBottom&&previousWalkPosition.z>st.zTop;
         const isIn=camera.position.x>st.xMin+.2&&camera.position.x<st.xMax-.2&&camera.position.z<st.zBottom&&camera.position.z>st.zTop;
         if(isIn&&!wasIn&&camera.position.z<st.zBottom-.3&&camera.position.z>st.zTop+.3){camera.position.x=previousWalkPosition.x;camera.position.z=previousWalkPosition.z;}
         if(wasIn&&!isIn&&camera.position.z<st.zBottom-.3&&camera.position.z>st.zTop+.3){camera.position.x=previousWalkPosition.x;camera.position.z=previousWalkPosition.z;}
       }
     }
   }else{
     camera.position.x=THREE.MathUtils.clamp(camera.position.x,-room.width/2+.46,room.width/2-.46);
     camera.position.z=THREE.MathUtils.clamp(camera.position.z,-room.depth/2+.46,room.depth/2-.46);
   }
   const hasUpper=appearance.buildingPlan==='two-floor'&&getFloors().length>1;
   let floorBase=hasUpper?floorElevation(walkFloorIndex):0;
   if(hasUpper){
     const stair=getStairSpec();
     const minZ=Math.min(stair.topZ,stair.bottomZ),maxZ=Math.max(stair.topZ,stair.bottomZ);
     const stairHalf=stair.width/2-.18;
     const onRamp=camera.position.z>=minZ&&camera.position.z<=maxZ&&Math.abs(camera.position.x-stair.x)<=stairHalf;
     const insideShaft=camera.position.z>=minZ&&camera.position.z<=maxZ&&Math.abs(camera.position.x-stair.x)<=stair.width/2+.30;
     if((insideShaft&&!onRamp)||(previousOnStairs&&camera.position.z>=minZ&&camera.position.z<=maxZ&&!onRamp)){
       // El hueco del forjado no es transitable fuera de la huella útil de la escalera.
       camera.position.copy(previousWalkPosition);
       walkOnStairs=previousOnStairs;
       floorBase=previousWalkPosition.y-1.65;
     }else if(onRamp){
       const progress=THREE.MathUtils.clamp((stair.bottomZ-camera.position.z)/(stair.bottomZ-stair.topZ),0,1);
       floorBase=floorElevation(0)+(floorElevation(1)-floorElevation(0))*progress;
       walkOnStairs=true;
       if(progress>=.995)walkFloorIndex=1;
       else if(progress<=.005)walkFloorIndex=0;
     }else{
       if(previousOnStairs){
         if(camera.position.z<stair.topZ)walkFloorIndex=1;
         else if(camera.position.z>stair.bottomZ)walkFloorIndex=0;
       }
       floorBase=floorElevation(walkFloorIndex);
       walkOnStairs=false;
     }
   }
   if(appearance.buildingPlan==='senati-pyramid'){
     const stairs=pyramidBuilding?.staircases||[];
     const isInside=st=>camera.position.x>st.xMin+.2&&camera.position.x<st.xMax-.2&&
       camera.position.z<st.zBottom&&camera.position.z>st.zTop;
     const activeStair=stairs.find(isInside);
     if(activeStair&&!walkStairRoute){
       const enteredTop=previousWalkPosition.z<=activeStair.zTop+.25;
       const base=enteredTop?walkFloorIndex-1:walkFloorIndex;
       if(base>=0&&base<getFloors().length-1)walkStairRoute={base,st:activeStair};
       else{camera.position.x=previousWalkPosition.x;camera.position.z=previousWalkPosition.z;}
     }
     if(walkStairRoute){
       const st=walkStairRoute.st;
       const progress=THREE.MathUtils.clamp((st.zBottom-camera.position.z)/(st.zBottom-st.zTop),0,1);
       floorBase=(walkStairRoute.base+progress)*room.height;
       if(!isInside(st)){
         walkFloorIndex=THREE.MathUtils.clamp(walkStairRoute.base+(camera.position.z<=st.zTop?1:0),0,getFloors().length-1);
         floorBase=floorElevation(walkFloorIndex);
         walkStairRoute=null;
         $('viewport-status').textContent=`Piso ${walkFloorIndex+1} · Escalera`;
       }
     }else floorBase=floorElevation(walkFloorIndex);
     // En modo caminar, renderizar solamente el mobiliario de la planta actual.
     placed.forEach(o=>o.visible=nearestFloorIndex(o.position.y)===walkFloorIndex);
   }
   camera.position.y=floorBase+1.65;

   // Colisión por nivel: el mobiliario del piso superior no bloquea el inferior y viceversa.
   let blocked=false;
   for(const obj of placed){
     if(!obj.visible||['door','window','whiteboard','fluorescent','fan','projector','safety-exit','safety-rules','safety-first-aid','safety-electrical','safety-safe-zone','safety-evacuation'].includes(obj.userData.catalogKey))continue;
     const bounds=new THREE.Box3().setFromObject(obj);
     const feetY=camera.position.y-1.65,headY=camera.position.y;
     if(camera.position.x>bounds.min.x-.22&&camera.position.x<bounds.max.x+.22&&
        camera.position.z>bounds.min.z-.22&&camera.position.z<bounds.max.z+.22&&
        bounds.max.y>feetY+.08&&bounds.min.y<headY){blocked=true;break;}
   }
   if(blocked){camera.position.copy(previousWalkPosition);walkSmooth.multiplyScalar(.25);walkOnStairs=previousOnStairs;}
 }
 placed.forEach(o=>{if(o.userData.fanRotor)o.userData.fanRotor.rotation.y+=dt*1.15;});
 if(selectionHelper&&selected)selectionHelper.update();
 if(!walkMode)controls.update();
 renderer.render(scene,camera);
});
