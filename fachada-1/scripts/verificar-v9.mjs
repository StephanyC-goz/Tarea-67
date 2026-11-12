import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname,resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  EV52_WALL_SEGMENTS, EV52_ROOMS, EV52_DOORS,
  EV52_STAIRWELLS, EV52_ELEVATOR, ev52DeskPositions,
  getPyramidDimensions, pyramidScale,
  DEFAULT_PYRAMID_WIDTH, DEFAULT_PYRAMID_DEPTH, DEFAULT_LEVEL_HEIGHT
} from '../src/ev52-layout.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const content=file=>readFileSync(resolve(root,file),'utf8');
assert.equal(DEFAULT_PYRAMID_WIDTH,56);
assert.equal(DEFAULT_PYRAMID_DEPTH,38);
assert.equal(DEFAULT_LEVEL_HEIGHT,3.8);
assert.equal(EV52_ROOMS.length,10,'Diez ambientes independientes');
assert.equal(EV52_STAIRWELLS.length,2,'Dos núcleos de escalera');
assert.equal(EV52_DOORS.length,EV52_ROOMS.length+1,'Una puerta por salón más servicios');
assert(EV52_WALL_SEGMENTS.length>=50&&EV52_WALL_SEGMENTS.length<90,'Trazado modular simplificado');
assert.equal(ev52DeskPositions().length,20,'20 escritorios didácticos');
const rooms=new Set(EV52_ROOMS.map(r=>r.id));
for(const r of EV52_ROOMS){
  assert(r.x0<r.x1&&r.z0<r.z1,`${r.id}: superficie positiva`);
  const door=EV52_DOORS.find(d=>d.id==='aula-'+r.id);
  assert(door,`${r.id}: tiene puerta`);
  assert(door.x>r.x0&&door.x<r.x1,`${r.id}: hueco centrado`);
  assert(Math.abs(door.z-(r.side==='upper'?r.z1:r.z0))<1e-8,`${r.id}: puerta hacia pasillo`);
}
for(const point of ev52DeskPositions()){
  assert(rooms.has(point.room));
  const r=EV52_ROOMS.find(r=>r.id===point.room);
  assert(point.x>r.x0+.40&&point.x<r.x1-.40,`${r.id}: PC interior X`);
  assert(point.z>r.z0+.50&&point.z<r.z1-.30,`${r.id}: PC interior Z`);
}
for(const seg of EV52_WALL_SEGMENTS){
  for(const key of ['x0','x1','z0','z1'])assert(Number.isFinite(seg[key]),'Coordenadas finitas');
  assert(Math.hypot(seg.x1-seg.x0,seg.z1-seg.z0)>.045,'No hay paredes de longitud cero');
}
for(const stair of EV52_STAIRWELLS){
  assert(stair.xMin<stair.xMax&&stair.zTop<stair.zBottom);
  for(const wall of EV52_WALL_SEGMENTS){
    const overlapX=Math.max(stair.xMin,Math.min(wall.x0,wall.x1))<Math.min(stair.xMax,Math.max(wall.x0,wall.x1));
    const overlapZ=Math.max(stair.zTop,Math.min(wall.z0,wall.z1))<Math.min(stair.zBottom,Math.max(wall.z0,wall.z1));
    assert(!(overlapX&&overlapZ),`Muro no debe cruzar escalera ${stair.name}`);
  }
}
for(const wall of EV52_WALL_SEGMENTS){
  const overlapX=Math.max(EV52_ELEVATOR.xMin,Math.min(wall.x0,wall.x1))<Math.min(EV52_ELEVATOR.xMax,Math.max(wall.x0,wall.x1));
  const overlapZ=Math.max(EV52_ELEVATOR.zTop,Math.min(wall.z0,wall.z1))<Math.min(EV52_ELEVATOR.zBottom,Math.max(wall.z0,wall.z1));
  assert(!(overlapX&&overlapZ),'No hay muros que atraviesen hueco del ascensor');
}
const m=getPyramidDimensions(56,38), scale=pyramidScale(56,38);
assert.equal(scale.x,56/34);assert.equal(scale.z,38/20);
assert(m.exampleClassroom.width>=5&&m.exampleClassroom.depth>=6);
assert(m.corridorWidth>=3&&m.staircase.width>=3.5&&m.elevator.width>=2);
assert.equal(m.rooms.length,10);
for(const doc of ['VISTA_DIMENSIONES_V9.html','INSTRUCCIONES_V9.md','assets/ev52-layout-public.js','src/piramide-senati.js','src/editor.js','src/recorrer.js'])assert(existsSync(resolve(root,doc)),`Existe: ${doc}`);
const view=content('VISTA_DIMENSIONES_V9.html');
assert(view.includes("'./assets/ev52-layout-public.js'"),'Visor utiliza módulo público accesible en Apache');
assert.equal(content('assets/ev52-layout-public.js'),content('src/ev52-layout.js'),'El visor comparte el código geométrico de la escena');
const match=view.match(/<script type="module">([\s\S]*?)<\/script>/);
assert(match,'Visor tiene módulo Javascript');
const temp=resolve(root,'scripts/.verificador-temporal-view.mjs');
// Analizar código del visor sin ejecutarlo en node (requiere DOM).
const {writeFileSync,unlinkSync}=await import('node:fs');
try{writeFileSync(temp,match[1]);execFileSync(process.execPath,['--check',temp]);}
finally{if(existsSync(temp))unlinkSync(temp);}
for(const f of ['src/ev52-layout.js','src/piramide-senati.js','src/editor.js','src/recorrer.js','src/simulator.js','src/scene-models.js'])execFileSync(process.execPath,['--check',resolve(root,f)]);
assert(content('src/editor.js').includes('apply-dimensions'),'Editor mantiene escalado configurable');
assert(content('src/recorrer.js').includes('takeElevator()'),'Recorrido tiene transporte simulado en ascensor');
assert(content('src/piramide-senati.js').includes('floorWallBoxes'),'Colisiones por piso preservadas');
console.log(`V9 OK: ${m.width}×${m.depth} m, ${EV52_ROOMS.length} salones/ambientes, ${EV52_WALL_SEGMENTS.length} tramos de paredes, ${EV52_STAIRWELLS.length} escaleras, 1 ascensor y ${ev52DeskPositions().length} estaciones por piso.`);
console.log(`Ejemplo aula N3: ${m.exampleClassroom.width.toFixed(2)}×${m.exampleClassroom.depth.toFixed(2)} m; pasadizo ${m.corridorWidth.toFixed(2)} m; escalera ${m.staircase.width.toFixed(2)}×${m.staircase.length.toFixed(2)} m; ascensor ${m.elevator.width.toFixed(2)}×${m.elevator.depth.toFixed(2)} m.`);
