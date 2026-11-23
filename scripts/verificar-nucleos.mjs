import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {EV52_ATRIUM,EV52_WALL_SEGMENTS,EV52_DOORS,
 EV52_STAIRWELLS,EV52_ELEVATORS} from '../src/ev52-layout.js';
import {getFirstFloorFrontPlan} from '../src/primer-piso-frente.js';
import {coreRects,clipWallsAgainstCores,doorsOutsideCores,
 segmentFootprint,doorFootprint,intersects} from '../src/nucleos-geometria.js';
import {carveSlab} from '../src/atrium-geometry.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const model=readFileSync(resolve(root,'src/piramide-senati.js'),'utf8');
const walk=readFileSync(resolve(root,'src/recorrer.js'),'utf8');
const tol=1e-7;
let checks=0;
const validate=(value,msg)=>{assert(value,msg);checks++;};
const scaled=(v,s)=>v*s;
const baseBounds={left:-21.45,right:23.85,back:-16.53,front:16.53};
const configs=[
  {width:56,depth:38},{width:48,depth:36},{width:64,depth:44}
];
for(const {width,depth} of configs){
  const sx=width/56,sz=depth/38;
  const bounds={left:scaled(baseBounds.left,sx),right:scaled(baseBounds.right,sx),
    back:scaled(baseBounds.back,sz),front:scaled(baseBounds.front,sz)};
  const stairs=EV52_STAIRWELLS.map(v=>({...v,
    xMin:scaled(v.xMin,sx),xMax:scaled(v.xMax,sx),
    zTop:scaled(v.zTop,sz),zBottom:scaled(v.zBottom,sz)}));
  const elevators=EV52_ELEVATORS.map(v=>({...v,
    xMin:scaled(v.xMin,sx),xMax:scaled(v.xMax,sx),
    zTop:scaled(v.zTop,sz),zBottom:scaled(v.zBottom,sz)}));
  const cores=coreRects(stairs,elevators);
  const plan=getFirstFloorFrontPlan(bounds,[...stairs,...elevators]);
  const walls=EV52_WALL_SEGMENTS.map(v=>({...v,
    x0:scaled(v.x0,sx),x1:scaled(v.x1,sx),
    z0:scaled(v.z0,sz),z1:scaled(v.z1,sz)}));
  const doors=EV52_DOORS.map(v=>({...v,
    x:scaled(v.x,sx),z:scaled(v.z,sz)}));
  for(let f=0;f<8;f++){
    const segments=clipWallsAgainstCores(f===0?plan.walls:walls,cores);
    const usableDoors=doorsOutsideCores(f===0?plan.doors:doors,cores);
    validate(segments.length>0&&usableDoors.length>0,
      `Planta ${f+1} sin muros ni puertas en ${width}x${depth}`);
    if(f===0){
      validate(usableDoors.length===8,'No eliminar puertas verdes de planta baja');
      // La pared frontal del bloque superior derecho debe permanecer ENTERA.
      const frontal=segments.find(w=>w.axis==='z'&&w.x0>12*sx&&w.x1>22*sx
        &&w.z0<-7*sz&&w.z0>-11*sz);
      validate(Boolean(frontal),'Se perdio el muro frontal de la zona de escaleras');
      validate(stairs.every(st=>st.zBottom<frontal.z0-.25*sz),
        'Los peldaños sobresalen al pasadizo y atraviesan la pared frontal');
    }
    for(const wall of segments)for(const c of cores)
      validate(!intersects(segmentFootprint(wall),c,.19),
        `Muro atravesando ${c.id} en planta ${f+1} (${width}x${depth})`);
    for(const door of usableDoors)for(const c of cores)
      validate(!intersects(doorFootprint(door),c,.17),
        `Puerta atravesando ${c.id} en planta ${f+1} (${width}x${depth})`);
    if(f>0){
      const holes=[...cores.map(c=>({...c})),
        {x0:scaled(EV52_ATRIUM.x0,sx),x1:scaled(EV52_ATRIUM.x1,sx),
         z0:scaled(EV52_ATRIUM.z0,sz),z1:scaled(EV52_ATRIUM.z1,sz)}];
      const pieces=carveSlab(bounds,holes.map(x=>({...x})));
      for(const slab of pieces)for(const core of cores)
        validate(!intersects({x0:slab.left,x1:slab.right,z0:slab.back,z1:slab.front},core,-tol),
          `Losa atraviesa ${core.id} en planta ${f+1} (${width}x${depth})`);
    }
  }
  validate(cores.every(core=>core.x0>=bounds.left&&core.x1<=bounds.right&&
    core.z0>=bounds.back&&core.z1<=bounds.front),'Núcleos fuera de la planta');
}
validate(model.includes('clipWallsAgainstCores(f===0?firstFloorPlan.walls:wallSegments,coreExclusions)'),
  'Se debe recortar la geometria REAL antes de dibujar las paredes');
validate(model.includes('doorsOutsideCores(f===0?firstFloorPlan.doors:doors,coreExclusions)'),
  'Las puertas deben respetar los nucleos');
validate(walk.includes('const insideZ=el.zBottom-Math.min('),'Ascensor debe subir al jugador DENTRO de la cabina');
validate(!walk.includes('el.zBottom+.62'),'No se debe iniciar el viaje fuera del ascensor');
console.log(`NÚCLEOS OK: ${checks} comprobaciones geométricas; 8 pisos x 3 tamaños, escaleras, ascensores, muros, puertas y losas.`);
