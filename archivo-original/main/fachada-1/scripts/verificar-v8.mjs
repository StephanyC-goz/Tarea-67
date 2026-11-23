import assert from 'node:assert/strict';
import {EV52_WALL_SEGMENTS,EV52_ROOMS,EV52_STAIRWELLS,ev52DeskPositions} from '../src/ev52-layout.js';
assert(EV52_WALL_SEGMENTS.length>=110,'El croquis debe conservar los trazos principales');
assert(EV52_ROOMS.length>=9,'Se esperan cinco sectores superiores y varios inferiores');
assert.equal(ev52DeskPositions().length,20,'Se deben conservar los 20 puestos de la demo');
assert.equal(EV52_STAIRWELLS.length,2,'Dos núcleos de escalera');
for(const s of EV52_WALL_SEGMENTS){
  for(const key of ['x0','x1','z0','z1'])assert(Number.isFinite(s[key]),'Coordenadas finitas');
  assert(Math.hypot(s.x1-s.x0,s.z1-s.z0)>.05,'Sin segmentos nulos');
  assert(s.axis==='x'||s.axis==='z','Muro alineado');
}
for(const p of ev52DeskPositions()){
  const r=EV52_ROOMS.find(r=>r.id===p.room);
  assert(r,'Ambiente asociado a cada equipo');
  assert(p.x>r.x0+.5&&p.x<r.x1-.5,'PC dentro de la anchura del ambiente');
  assert(p.z>r.z0+.2&&p.z<r.z1-.2,'PC dentro de la profundidad del ambiente');
}
console.log(`V8 OK: ${EV52_WALL_SEGMENTS.length} muros trazados, ${EV52_ROOMS.length} sectores, 20 estaciones educativas, 2 escaleras.`);
