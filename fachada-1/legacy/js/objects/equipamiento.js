import * as THREE from 'three';
import { materials as m } from './materiales.js';
import { ROOM } from './paredes.js';

const add=(g,geo,mat,x,y,z)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
const mat=(color,roughness=.7)=>new THREE.MeshStandardMaterial({color,roughness});
function seatedPerson(g,x,z,index=0){
 const p=new THREE.Group();p.position.set(x,0,z);g.add(p);
 const blue=mat(0x07529a,.72),yellow=mat(0xf4c542,.48),hair=mat(0x171d25,.88);
 add(p,new THREE.CylinderGeometry(.16,.19,.56,10),blue,0,1.00,0);
 add(p,new THREE.CylinderGeometry(.055,.055,.12,12),yellow,0,1.34,0);
 const head=add(p,new THREE.CylinderGeometry(.135,.135,.27,16),yellow,0,1.535,0);
 // Cara de estilo minifigura, orientada hacia +X, directamente al monitor.
 const faceCanvas=document.createElement('canvas');faceCanvas.width=256;faceCanvas.height=256;
 const fc=faceCanvas.getContext('2d');
 fc.fillStyle='#f4c542';fc.fillRect(0,0,256,256);
 fc.fillStyle='#20252c';
 fc.beginPath();fc.arc(82,100,12,0,Math.PI*2);fc.arc(174,100,12,0,Math.PI*2);fc.fill();
 fc.strokeStyle='#20252c';fc.lineWidth=10;fc.lineCap='round';
 fc.beginPath();fc.arc(128,132,47,.18,Math.PI-.18);fc.stroke();
 const faceTex=new THREE.CanvasTexture(faceCanvas);faceTex.colorSpace=THREE.SRGBColorSpace;
 const face=new THREE.Mesh(new THREE.PlaneGeometry(.235,.235),new THREE.MeshBasicMaterial({map:faceTex,side:THREE.DoubleSide}));
 face.rotation.y=Math.PI/2;face.position.set(.136,1.535,0);p.add(face);
 const hairCap=add(p,new THREE.SphereGeometry(.142,16,10),hair,0,1.68,-.008);
 hairCap.scale.set(1,.48,1.03);
 // Distintivo SENATI sobre el polo azul.
 const logoCanvas=document.createElement('canvas');logoCanvas.width=512;logoCanvas.height=256;
 const lc=logoCanvas.getContext('2d');
 lc.clearRect(0,0,512,256);lc.fillStyle='#fff';lc.textAlign='center';
 lc.font='bold 104px Arial';lc.fillText('S',100,160);
 lc.font='bold 72px Arial';lc.fillText('SENATI',330,155);
 const logoTex=new THREE.CanvasTexture(logoCanvas);logoTex.colorSpace=THREE.SRGBColorSpace;
 const logo=new THREE.Mesh(new THREE.PlaneGeometry(.22,.11),new THREE.MeshBasicMaterial({map:logoTex,transparent:true,side:THREE.DoubleSide}));
 logo.rotation.y=Math.PI/2;logo.position.set(.166,1.10,0);p.add(logo);
 const arms=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(.02,1.22,side*.15);p.add(arm);
  const sleeve=add(arm,new THREE.CylinderGeometry(.055,.06,.29,10),blue,.14,-.13,.17);
  sleeve.rotation.z=-1.0;
  const forearm=add(arm,new THREE.CylinderGeometry(.047,.05,.27,10),yellow,.36,-.27,.31);
  forearm.rotation.z=-.20;
  add(arm,new THREE.SphereGeometry(.052,10,8),yellow,.48,-.34,.34);
  arms.push(arm);
  add(p,new THREE.BoxGeometry(.34,.13,.13),mat(0x1c2e43,.85),.22,.57,side*.105);
  add(p,new THREE.BoxGeometry(.12,.27,.13),mat(0x1c2e43,.85),.40,.36,side*.105);
  add(p,new THREE.BoxGeometry(.16,.07,.14),mat(0x171d25,.9),.47,.20,side*.105);
 }
 const phase=index*.61;
 p.userData.animate=(time)=>{
  const pulse=Math.sin(time*7.5+phase);
  arms.forEach((arm,i)=>{
   arm.rotation.z=-.04+pulse*.10+Math.sin(time*2.7+phase+i)*.025;
   arm.rotation.x=(i===0?1:-1)*(.035+Math.sin(time*5.1+phase)*.025);
  });
  head.rotation.z=Math.sin(time*1.5+phase)*.018;
  face.rotation.z=head.rotation.z;
  hairCap.rotation.copy(head.rotation);
 };
}

export function crearPersonas(){
 const g=new THREE.Group();g.name='Personas';
 const xs=[-6.7,-2.7,1.3,5.3];let n=0;
 xs.forEach(x=>{for(let i=0;i<3;i++)seatedPerson(g,x-1.15,-3.0-4.65/2+(4.65/3)*(i+.5),n++);});
 xs.forEach(x=>{for(let i=0;i<2;i++)seatedPerson(g,x-1.15,3.65-3.25/2+(3.25/2)*(i+.5),n++);});
 return g;
}
function createFan(g,x,z){
 // Montaje continuo: soporte pegado al techo, varilla conectada al motor y rotor centrado.
 const fan=new THREE.Group();
 fan.position.set(x,ROOM.height-.08,z);
 g.add(fan);
 add(fan,new THREE.CylinderGeometry(.22,.22,.07,20),m.fan,0,0,0); // base de techo
 add(fan,new THREE.CylinderGeometry(.045,.045,.38,12),m.fan,0,-.22,0); // varilla
 const rotor=new THREE.Group();
 rotor.position.set(0,-.43,0);
 fan.add(rotor);
 add(rotor,new THREE.CylinderGeometry(.22,.18,.22,20),m.fan,0,0,0); // carcasa del motor
 add(rotor,new THREE.SphereGeometry(.12,16,12),m.fan,0,-.12,0);
 for(let i=0;i<3;i++){
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.20,.045,1.28),m.fan);
  blade.position.set(0,-.015,.68);
  blade.rotation.y=i*Math.PI*2/3;
  blade.castShadow=true;blade.receiveShadow=true;
  rotor.add(blade);
 }
 fan.userData.rotor=rotor;
}
export function crearVentiladores(){
 const g=new THREE.Group();g.name='Ventiladores';
 createFan(g,-2.3,-.1);createFan(g,2.3,-.1);return g;
}
export function crearFluorescentes(){
 const g=new THREE.Group();g.name='Fluorescentes';
 const fixtureMat=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:1.6});
 const lightMat=new THREE.PointLight(0xfff4dc,35,7,2);
 for(const [x,z] of [[-6,-4.2],[2,-4.2],[-6,4.2],[2,4.2]]){
  add(g,new THREE.BoxGeometry(1.65,.10,.42),m.boardFrame,x,ROOM.height-.13,z);
  add(g,new THREE.BoxGeometry(1.52,.035,.30),fixtureMat,x,ROOM.height-.065,z);
  const l=lightMat.clone();l.position.set(x,ROOM.height-.35,z);g.add(l);
 }
 return g;
}
export function crearProyector(){
 const g=new THREE.Group();g.name='Proyector';
 const py=ROOM.height-.32,px=5.45,pz=.25;
 add(g,new THREE.BoxGeometry(.62,.22,.48),m.metal,px,py,pz);
 // Lente en el frente derecho del proyector, orientado hacia la pizarra de la pared derecha.
 const lens=add(g,new THREE.CylinderGeometry(.105,.105,.09,20),mat(0x18202b,.22),px+.34,py,pz);
 lens.rotation.z=-Math.PI/2;
 const glow=new THREE.MeshBasicMaterial({color:0xb8d9ff});
 add(g,new THREE.SphereGeometry(.065,16,12),glow,px+.40,py,pz);
 // Haz ancho que sale del proyector y termina sobre la pizarra.
 const beam=new THREE.Mesh(new THREE.ConeGeometry(1.35,4.0,28,1,true),new THREE.MeshBasicMaterial({color:0xb8d9ff,transparent:true,opacity:.09,side:THREE.DoubleSide}));
 beam.position.set(7.85,py,.25);beam.rotation.z=-Math.PI/2;g.add(beam);
 return g;
}
