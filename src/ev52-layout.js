/**
 * V10: Interpretación modular en METROS, sin escalado de objetos 3D.
 * No equivale a cotas, normativa, aforo ni plano técnico real de SENATI.
 * Las habitaciones, huecos y núcleos están dispuestos para no superponerse.
 * Se conserva el sistema de coordenadas del primer piso para compatibilidad.
 */
const X0=215, X1=1105, WX0=-8.4, WX1=9.45;
const Y0=97, Y1=916, WZ0=-7.55, WZ1=6.40;
export const PYRAMID_BASE_WIDTH=34;
export const PYRAMID_BASE_DEPTH=20;
export const DEFAULT_PYRAMID_WIDTH=56;
export const DEFAULT_PYRAMID_DEPTH=38;
export const DEFAULT_LEVEL_HEIGHT=3.8;
/**
 * V11: patio de luz vertical (hueco abierto), expresado en coordenadas reales
 * del módulo 56 × 38 m. No tapa el suelo de planta baja; se recortan las
 * losas de las plantas 2 a 6 y la cubierta. No procede de medidas certificadas.
 * El pasillo frontal del aula superior conserva 2.44 m y el inferior 2.07 m.
 */
export const EV52_ATRIUM=Object.freeze({
  x0:-6.4,x1:6.4,z0:-3.75,z1:2.45,
  label:'Tragaluz / atrio central abierto'
});

// Escala lógica para recalcular posiciones entre distintas plantas. Nunca aplicar
// estos factores a la escala de un grupo Three.js: deformaría puertas y escaleras.
export const pyramidScale=(w=DEFAULT_PYRAMID_WIDTH,d=DEFAULT_PYRAMID_DEPTH)=>({
  x:w/DEFAULT_PYRAMID_WIDTH,z:d/DEFAULT_PYRAMID_DEPTH
});
export const planToWorld=(px,py)=>({
  x:(WX0+(px-X0)*(WX1-WX0)/(X1-X0))*(DEFAULT_PYRAMID_WIDTH/PYRAMID_BASE_WIDTH),
  z:(WZ0+(py-Y0)*(WZ1-WZ0)/(Y1-Y0))*(DEFAULT_PYRAMID_DEPTH/PYRAMID_BASE_DEPTH)
});
function room(id,label,px0,px1,py0,py1,pcs=0,side='upper'){
  const a=planToWorld(px0,py0),b=planToWorld(px1,py1);
  return Object.freeze({id,label,x0:a.x,x1:b.x,z0:a.z,z1:b.z,pcs,side});
}
// Las aulas superiores y los ambientes inferiores tienen un pasillo / vestíbulo
// central despejado. No se asignan nombres académicos que no aparezcan en el croquis.
export const EV52_ROOMS=Object.freeze([
  room('N1','Ambiente superior 1',215,400,97,349,4),
  room('N2','Ambiente superior 2',400,564,97,349,4),
  room('N3','Ambiente superior 3',564,750,97,349,4),
  room('N4','Ambiente superior 4',750,925,97,349,4),
  room('N5','Ambiente superior 5',925,1105,97,349,4),
  room('S1','Ambiente inferior 1',400,575,680,916,0,'lower'),
  room('S2','Ambiente inferior 2',575,746,680,916,0,'lower'),
  room('S3','Ambiente inferior 3',746,920,680,916,0,'lower'),
  room('S4','Ambiente inferior 4',978,1148,680,916,0,'lower'),
  room('S5','Ambiente inferior 5',1148,1290,680,916,0,'lower')
]);
const walls=[],doors=[];
function wallZ(z,x0,x1){
  if(x1-x0<.05)return;
  walls.push({x0,z0:z,x1,z1:z,axis:'z'});
}
function wallX(x,z0,z1){
  if(z1-z0<.05)return;
  walls.push({x0:x,z0,x1:x,z1,axis:'x'});
}
const DOOR_HALF=.72; // Acceso de 1.44 m construido en unidades reales.
// Fila superior: muros laterales y fachada posterior; hueco central en cada acceso.
for(const r of EV52_ROOMS){
  // La pared trasera de las salas inferiores es z1; el acceso queda libre en z0.
  wallZ(r.side==='upper'?r.z0:r.z1,r.x0,r.x1);
  wallX(r.x0,r.z0,r.z1);
  wallX(r.x1,r.z0,r.z1);
  const center=(r.x0+r.x1)/2;
  const doorwayZ=r.side==='upper'?r.z1:r.z0;
  wallZ(doorwayZ,r.x0,center-DOOR_HALF);
  wallZ(doorwayZ,center+DOOR_HALF,r.x1);
  doors.push(Object.freeze({id:'aula-'+r.id,label:r.label,x:center,z:doorwayZ,side:'z'}));
}
// Dos locales pequeños a la izquierda del croquis; el pasillo es accesible.
const utilityX0=-12.55*56/34,utilityX1=-8.85*56/34,utilityBack=-7.55*38/20,utilityFront=-4.15*38/20;
wallX(utilityX0,utilityBack,utilityFront);
wallX(utilityX1,utilityBack,utilityFront);
wallZ(utilityBack,utilityX0,utilityX1);
wallZ(utilityFront,utilityX0,-11.38*56/34);
wallZ(utilityFront,-10.02*56/34,utilityX1);
// Un espacio libre detrás del acceso; no colocar tabique atravesando la puerta.
doors.push(Object.freeze({id:'servicios-izquierda',label:'Servicios',x:-10.70*56/34,z:utilityFront,side:'z'}));

// Los núcleos de escalera ocupan huecos exclusivos, SIN tabiques del croquis atravesándolos.
// El modelo usa tramos orientativos que conectan las seis plantas.
export const EV52_STAIRWELLS=Object.freeze([
  Object.freeze({id:'escalera-1',name:'Escalera izquierda',x:-10.65*56/34,xMin:-11.75*56/34,xMax:-9.55*56/34,zTop:-2.30*38/20,zBottom:1.72*38/20}),
  Object.freeze({id:'escalera-2',name:'Escalera derecha',x:10.50*56/34,xMin:9.40*56/34,xMax:11.60*56/34,zTop:-2.30*38/20,zBottom:1.72*38/20})
]);
// Hueco de ascensor al costado de la escalera derecha; es una maqueta de traslado
// entre pisos, no un simulador físico ni un dispositivo de seguridad certificado.
export const EV52_ELEVATOR=Object.freeze({
  x:12.83*56/34,z:-.49*38/20,xMin:12.10*56/34,xMax:13.56*56/34,zTop:-1.15*38/20,zBottom:.18*38/20,accessZ:1.02*38/20
});
export const EV52_WALL_SEGMENTS=Object.freeze(walls.map(w=>Object.freeze(w)));
export const EV52_DOORS=Object.freeze(doors);

/** Posiciones de muebles en unidades REALES del escenario ya escalado. */
export function ev52DeskPositions(scaleX=1,scaleZ=1){
  const result=[];
  for(const r of EV52_ROOMS.filter(r=>r.pcs)){
    const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2;
    for(const dz of [-1.35,1.05])for(const dx of [-1.25,1.25]){
      result.push({x:(cx+dx)*scaleX,z:(cz+dz)*scaleZ,room:r.id});
    }
  }
  return result;
}
export function getPyramidDimensions(width=DEFAULT_PYRAMID_WIDTH,depth=DEFAULT_PYRAMID_DEPTH){
  const s=pyramidScale(width,depth);
  const upper=EV52_ROOMS.find(r=>r.id==='N3');
  const corridorZ=EV52_ROOMS.find(r=>r.id==='S1').z0-upper.z1;
  return {
    width,depth,scaleX:s.x,scaleZ:s.z,
    exampleClassroom:{width:(upper.x1-upper.x0)*s.x,depth:(upper.z1-upper.z0)*s.z},
    centralHallWidth:corridorZ*s.z,
    corridorWidth:3.23*s.z,
    atrium:{width:(EV52_ATRIUM.x1-EV52_ATRIUM.x0)*s.x,depth:(EV52_ATRIUM.z1-EV52_ATRIUM.z0)*s.z},
    staircase:{width:(EV52_STAIRWELLS[1].xMax-EV52_STAIRWELLS[1].xMin)*s.x,length:(EV52_STAIRWELLS[1].zBottom-EV52_STAIRWELLS[1].zTop)*s.z},
    elevator:{width:(EV52_ELEVATOR.xMax-EV52_ELEVATOR.xMin)*s.x,depth:(EV52_ELEVATOR.zBottom-EV52_ELEVATOR.zTop)*s.z},
    rooms:EV52_ROOMS.map(r=>({...r,width:(r.x1-r.x0)*s.x,depth:(r.z1-r.z0)*s.z}))
  };
}
