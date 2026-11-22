import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {carveSlab,rectangleArea} from '../src/atrium-geometry.js';
import {EV52_ATRIUM,EV52_ROOMS,EV52_STAIRWELLS,EV52_ELEVATORS,getPyramidDimensions,DEFAULT_PYRAMID_WIDTH,DEFAULT_PYRAMID_DEPTH} from '../src/ev52-layout.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=name=>readFileSync(resolve(root,name),'utf8');
const a=EV52_ATRIUM;
const area=p=>(p.x1-p.x0)*(p.z1-p.z0);
const almost=(x,y,delta=1e-6)=>assert(Math.abs(x-y)<delta,`${x} ≈ ${y}`);
const overlaps=(a,b)=>a.x0<b.x1&&a.x1>b.x0&&a.z0<b.z1&&a.z1>b.z0;
const bounds={left:-21.45,right:23.85,back:-16.53,front:16.53};
const roofBounds={left:-26.1,right:26.5,back:-17.95,front:17.95};
const stairHoles=EV52_STAIRWELLS.map(st=>({x0:st.xMin,x1:st.xMax,z0:st.zTop,z1:st.zBottom}));
const liftHoles=EV52_ELEVATORS.map(l=>({x0:l.xMin,x1:l.xMax,z0:l.zTop,z1:l.zBottom}));
const allHoles=[...stairHoles,...liftHoles,a];

assert(a.x0<a.x1&&a.z0<a.z1,'El tragaluz mantiene un vano positivo');
almost(a.x1-a.x0,12.8);almost(a.z1-a.z0,6.2);
assert.equal(EV52_STAIRWELLS.length,2,'Hay dos escaleras');
assert.equal(EV52_ELEVATORS.length,2,'Hay dos ascensores');
assert(EV52_STAIRWELLS.every(s=>s.xMax-s.xMin>=2.8-1e-6),'Cada escalera tiene 2.8 m de ancho nominal');
assert(EV52_STAIRWELLS.every(s=>s.xMax<a.x0||s.xMin>a.x1),'Escaleras fuera del tragaluz');
assert(EV52_ELEVATORS.every(e=>e.xMin>a.x1),'Los dos ascensores están fuera del tragaluz y en el lateral derecho');
assert(EV52_ELEVATORS[0].xMax<EV52_ELEVATORS[1].xMin,'Pozos de ascensor no se solapan');
assert(EV52_STAIRWELLS.every(s=>s.xMin>=bounds.left&&s.xMax<=bounds.right),'Escaleras dentro de la planta');
assert(EV52_ELEVATORS.every(e=>e.xMin>=bounds.left&&e.xMax<=bounds.right),'Ascensores dentro de la planta');
for(const room of EV52_ROOMS)assert(!overlaps(room,a),`El tragaluz no invade el salón ${room.id}`);
for(const h of [...stairHoles,...liftHoles])assert(!overlaps(h,a),'Ningún núcleo invade el espacio central');
for(let i=0;i<allHoles.length;i++)for(let j=i+1;j<allHoles.length;j++)assert(!overlaps(allHoles[i],allHoles[j]),'Núcleos y tragaluz no se superponen');

const ground=carveSlab(bounds);
const upper=carveSlab(bounds,allHoles);
const roof=carveSlab(roofBounds,[a]);
almost(ground.reduce((sum,p)=>sum+rectangleArea(p),0),rectangleArea(bounds));
almost(upper.reduce((sum,p)=>sum+rectangleArea(p),0),rectangleArea(bounds)-allHoles.reduce((sum,h)=>sum+area(h),0));
almost(roof.reduce((sum,p)=>sum+rectangleArea(p),0),rectangleArea(roofBounds)-area(a));
for(const p of [...upper,...roof]){
  assert(p.right<=a.x0+1e-7||p.left>=a.x1-1e-7||p.front<=a.z0+1e-7||p.back>=a.z1-1e-7,'Ninguna losa cubre el tragaluz');
}

const model=src('src/piramide-senati.js');
const walk=src('src/recorrer.js');
const multiplayer=src('api/multiplayer.php');
assert(model.includes('levels=8'),'Modelo 3D con ocho plantas por defecto');
assert(model.includes('...liftLayouts.map'),'Los dos pozos de ascensor se recortan en cada losa');
assert(model.includes('const elevators=liftLayouts.map'),'Se construyen dos cabinas');
assert(model.includes('setElevatorCabinLevel'),'Cabinas con movimiento vertical');
assert(model.includes('if(f>0)addAtriumRailing(base,f)'),'Barandas alrededor del tragaluz en pisos superiores');
assert(!model.includes('coreConcrete')&&!model.includes('const coreX')&&!model.includes('skyGlass'),'Atrio sin núcleo ni paños de vidrio encima');
assert(model.includes('makeSlab(H+.15,true,roof,.45,roofBounds,concreteLight)'),'Azotea recortada para el tragaluz');
assert(walk.includes('totalFloors=kind===\'piramide\'?8:1'),'Recorrido habilita ocho pisos');
assert(walk.includes('updateElevatorRide(dt)'),'Recorrido anima el ascensor');
assert(walk.includes('connectMultiplayer()'),'Recorrido conecta el multijugador');
assert(walk.includes('createRemotePlayer(player)'),'Se muestran avatares de otros jugadores');
assert(multiplayer.includes('walk_players'),'API sincroniza posiciones en MySQL');
assert(src('database/schema.sql').includes('CREATE TABLE IF NOT EXISTS walk_players'),'Base nueva incluye tabla multijugador');
assert(src('database/ACTUALIZAR_BD_EXISTENTE.sql').includes('CREATE TABLE IF NOT EXISTS walk_players'),'Base existente tiene migración multijugador');

for(const pathname of [
  'VISTA_DIMENSIONES_V12.html','INSTRUCCIONES_V12.md','api/multiplayer.php',
  'src/atrium-geometry.js','assets/ev52-layout-public.js','database/ACTUALIZAR_BD_EXISTENTE.sql'
])assert(existsSync(resolve(root,pathname)),`Incluye ${pathname}`);
assert.equal(src('src/ev52-layout.js'),src('assets/ev52-layout-public.js'),'Layout del motor y visor 2D idénticos');
for(const file of ['src/atrium-geometry.js','src/ev52-layout.js','src/piramide-senati.js','src/editor.js','src/recorrer.js','src/simulator.js','scripts/verificar-v12.mjs'])
  execFileSync(process.execPath,['--check',resolve(root,file)]);

const dimensions=getPyramidDimensions(DEFAULT_PYRAMID_WIDTH,DEFAULT_PYRAMID_DEPTH);
almost(dimensions.atrium.width,12.8);almost(dimensions.atrium.depth,6.2);
assert.equal(dimensions.elevators.length,2);
assert(dimensions.staircase.width>=2.8);
console.log(`V12 OK: tragaluz ${dimensions.atrium.width.toFixed(1)} × ${dimensions.atrium.depth.toFixed(1)} m libre, 8 pisos, 2 escaleras de 2.8 m y 2 ascensores laterales. Losas superiores: ${upper.length} piezas; azotea: ${roof.length} piezas.`);
