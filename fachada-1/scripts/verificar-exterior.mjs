import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {isDefaultEntrancePerson,isOldFrontExitSign} from '../src/exterior-campus.js';
import {buildPiramideSENATI} from '../src/piramide-senati.js';
import {canCrossBuilding,insideFootprint,canOccupyPyramidInterior} from '../src/exterior-navigation.js';
import {findExitInfo} from '../src/navigation.js';
// Las pruebas de geometría no requieren GPU ni un navegador.
const ctx=new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const current=buildPiramideSENATI(new THREE.Group());
const campus=current.campus;
for(const g of [campus.root,current.root])g.traverse(o=>{if(o.isMesh){assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.position.toArray().every(Number.isFinite));assert(o.scale.toArray().every(v=>v>0));}});
assert.equal(campus.route.length,7);
assert(campus.inventory.length>100);
assert.equal(campus.heightAt(0,21),0,'La vereda frontal permanece en cota cero');
assert.equal(campus.heightAt(0,-25),-1.15,'La calle entre edificios queda bajo la vereda');
assert(Math.abs(campus.heightAt(-34.4,24.8)+.575)<.04,'Escalera en el extremo izquierdo');
assert(Math.abs(campus.heightAt(33,20.5)+.575)<.04,'Escalera del tramo 7');
assert.equal(campus.heightAt(-13.5,24),-1.15,'La escalera anterior ya no ocupa la calle');

function verifyWalk(campus, from, to) {
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / .1);
  let previous = from;
  for (let step = 1; step <= steps; step++) {
    const point = {
      x: THREE.MathUtils.lerp(from.x, to.x, step / steps),
      z: THREE.MathUtils.lerp(from.z, to.z, step / steps),
    };
    assert(campus.canWalk(previous, point, .20), `Paso exterior bloqueado en ${point.x.toFixed(2)}, ${point.z.toFixed(2)}`);
    previous = point;
  }
}

for (const [width, depth] of [[56, 38], [48, 32], [64, 44]]) {
  const model = width === 56 ? current : buildPiramideSENATI(new THREE.Group(), {width, depth});
  const site = model.campus;
  const x = value => value * width / 56;
  const z = value => value * depth / 38;
  const road = {x:x(-17.9), z:z(24.35)};
  const landing = {x:x(-30.2), z:z(24.35)};
  const plaza = {x:x(-30.2), z:z(22.3)};
  verifyWalk(site, road, landing);
  verifyWalk(site, landing, road);
  verifyWalk(site, landing, plaza);
  verifyWalk(site, {x:x(-34.4),z:z(27)}, {x:x(-34.4),z:z(22.5)});
  const {entry}=model;
  const exit=findExitInfo([],width,depth,entry);
  assert.deepEqual(exit.center,{x:entry.x,z:entry.z},'La salida predeterminada usa la puerta de la fachada');
  assert.equal(exit.normal.x,-1,'La salida desemboca en la plaza lateral');
  const outer={x:entry.x-.10,z:entry.z};
  const inner={x:entry.x+.10,z:entry.z};
  assert.equal(site.heightAt(entry.approach.x,entry.approach.z),0,'El inicio del recorrido está sobre la plaza');
  verifyWalk(site,entry.approach,outer);
  verifyWalk(site,outer,entry.approach);
  assert(canCrossBuilding(outer,inner,{footprint:model.footprint,entry,doorOpen:true}),
    'La puerta lateral abierta admite el paso');
  assert(canOccupyPyramidInterior(inner.x,inner.z,{walkBounds:model.walkBounds,entry,doorOpen:true}),
    'El paso desemboca en la planta baja existente');

  // La altura de la cámara y el tablero visible deben coincidir a lo largo de la subida.
  site.root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  for (let offset = 1; offset < 10; offset++) {
    const point = {x:x(-18.8-offset), z:z(24.35)};
    ray.set(new THREE.Vector3(point.x, 3, point.z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(site.root, true)[0];
    assert(hit && Math.abs(hit.point.y - site.heightAt(point.x, point.z)) < .005,
      `La vereda tapa la rampa en ${point.x.toFixed(2)}, ${point.z.toFixed(2)}`);
  }
}
assert(isDefaultEntrancePerson({catalog_key:'man-senati',pos_x:'-1.800',pos_y:'0.000',pos_z:'22.500'},38));
assert(isDefaultEntrancePerson({catalog_key:'woman-senati',pos_x:2,pos_y:0,pos_z:22.1},38));
assert(!isDefaultEntrancePerson({catalog_key:'woman-senati',pos_x:2,pos_y:0,pos_z:14},38));
assert(isOldFrontExitSign({catalog_key:'safety-exit',pos_x:0,pos_y:0,pos_z:17.5},38));
assert(!isOldFrontExitSign({catalog_key:'safety-exit',pos_x:0,pos_y:0,pos_z:15.65},38));
console.log('Entorno OK: escalera izquierda y rampa a la cota del recorrido.');
const fp=current.footprint,entry=current.entry;
assert(!insideFootprint(-40,-10,fp),'La plaza izquierda es exterior');
assert(!insideFootprint(0,-25,fp),'El pasaje trasero es exterior');
assert(canCrossBuilding({x:-40,z:17},{x:-40,z:16},{footprint:fp,entry,doorOpen:false}),'Rodear lateral no exige abrir puerta');
const outsideDoor={x:entry.x-.10,z:entry.z};
const insideDoor={x:entry.x+.10,z:entry.z};
assert.equal(entry.side,'left');
assert(!canCrossBuilding(outsideDoor,insideDoor,{footprint:fp,entry,doorOpen:false}),'La puerta lateral cerrada impide entrar');
assert(canCrossBuilding(insideDoor,outsideDoor,{footprint:fp,entry,doorOpen:true}),'La puerta abierta permite salir a la plaza');
assert(!canCrossBuilding({x:0,z:fp.front+.2},{x:0,z:fp.front-.2},{footprint:fp,entry,doorOpen:true}),'El antiguo acceso frontal queda cerrado');
assert(!canCrossBuilding({x:fp.left-.1,z:entry.z-4},{x:fp.left+.1,z:entry.z-4},{footprint:fp,entry,doorOpen:true}),'No se atraviesa el muro lateral');
assert(!canCrossBuilding(insideDoor,outsideDoor,{footprint:fp,entry,doorOpen:true,floor:1}),'En plantas altas no se sale al vacío');
assert(!campus.canWalk({x:0,z:21},{x:0,z:19},.18),'El seto cubre el antiguo hueco frontal');

const portal=current.root.getObjectByName('Puerta principal de vidrio de dos hojas');
const leaves=[portal.getObjectByName('Hoja izquierda'),portal.getObjectByName('Hoja derecha')];
current.root.updateMatrixWorld(true);
const sightline=new THREE.Raycaster(new THREE.Vector3(entry.x-8,1.55,entry.z+.25),new THREE.Vector3(1,0,0),0,8.06);
assert(sightline.intersectObject(portal,true).length>0,'El vidrio cierra el vano cuando la puerta está cerrada');
current.setDoorOpen(true);
current.root.updateMatrixWorld(true);
assert(leaves[0].rotation.y<0&&leaves[1].rotation.y>0,'Las hojas giran hacia la plaza');
assert.equal(sightline.intersectObject(current.root,true).length,0,'El vano abierto queda despejado desde la plaza');
current.setDoorOpen(false);
// Buscar paso continuo por los puntos 1–7 y vuelta al inicio. Rejilla exterior de 25 cm.
const step=.25,minX=-55,minZ=-43,cols=477,rows=345;
const index=(x,z)=>Math.round((z-minZ)/step)*cols+Math.round((x-minX)/step);
const point=i=>({x:minX+(i%cols)*step,z:minZ+Math.floor(i/cols)*step});
const free=p=>!insideFootprint(p.x,p.z,fp)&&!campus.collisions.some(b=>p.x>b.x0-.18&&p.x<b.x1+.18&&p.z>b.z0-.18&&p.z<b.z1+.18);
const heights=new Float32Array(cols*rows),allowed=new Uint8Array(cols*rows);
for(let i=0;i<allowed.length;i++){const p=point(i);allowed[i]=free(p)?1:0;heights[i]=campus.heightAt(p.x,p.z);}
function connected(a,b){
 const start=index(a.x,a.z),goal=index(b.x,b.z);assert(allowed[start],`Punto ${a.n} no debe estar dentro de objeto`);assert(allowed[goal],`Punto ${b.n} no debe estar dentro de objeto`);
 const visited=new Uint8Array(allowed.length),q=new Int32Array(allowed.length);let h=0,t=1;q[0]=start;visited[start]=1;
 while(h<t){const i=q[h++];if(i===goal)return true;for(const d of [-1,1,-cols,cols]){const n=i+d;if(n<0||n>=allowed.length||visited[n]||!allowed[n]||Math.abs(heights[n]-heights[i])>.30)continue;if(Math.abs(point(i).x-point(n).x)>step*1.1&&Math.abs(d)===1)continue;visited[n]=1;q[t++]=n;}}
 return false;
}
for(let i=0;i<campus.route.length;i++)assert(connected(campus.route[i],campus.route[(i+1)%7]),`Debe existir paso del punto ${i+1} al ${(i+1)%7+1}`);
console.log('Exterior OK: puerta lateral operativa y recorrido 1–7 continuo en ambas direcciones.');
// Comparar las mallas interiores con la versión inmediatamente anterior al cambio de fachada.
const baselineCommit='e3f9118fbea84ccd9729db24436e0041920efe54';
let original;
try{original=execFileSync('git',['show',`${baselineCommit}:src/piramide-senati.js`],{encoding:'utf8',stdio:['ignore','pipe','ignore']});}catch{}
if(original){
 const temp=new URL(`../src/.baseline-exterior-test-${process.pid}.mjs`,import.meta.url);
 try{
  writeFileSync(temp,original);const before=(await import(temp.href)).buildPiramideSENATI(new THREE.Group());
  function digest(group){const data=[];group.traverse(o=>{if(o.isMesh)data.push({p:o.position.toArray(),r:o.quaternion.toArray(),s:o.scale.toArray(),g:o.geometry.type,vertices:Array.from(o.geometry.attributes.position.array),indices:o.geometry.index?Array.from(o.geometry.index.array):null,color:o.material.color?.getHex(),opacity:o.material.opacity});});return createHash('sha256').update(JSON.stringify(data)).digest('hex');}
  assert.equal(digest(current.interior),digest(before.interior),'Geometría y materiales de los seis pisos intactos');
  for(const name of ['floorWallBoxes','staircases','elevator','walkBounds'])assert.deepEqual(current[name],before[name]);
  console.log('Conservación OK: los seis pisos, muros interiores, escaleras y ascensor coinciden con la versión anterior.');
 }finally{if(existsSync(temp))unlinkSync(temp);}
}
