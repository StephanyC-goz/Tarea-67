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
// Escala lógica para recalcular posiciones entre distintas plantas. Nunca aplicar
// estos factores a la escala de un grupo Three.js: deformaría puertas y escaleras.
export const pyramidScale=(w=DEFAULT_PYRAMID_WIDTH,d=DEFAULT_PYRAMID_DEPTH)=>({
  x:w/DEFAULT_PYRAMID_WIDTH,z:d/DEFAULT_PYRAMID_DEPTH
});
export const planToWorld=(px,py)=>({
  x:(WX0+(px-X0)*(WX1-WX0)/(X1-X0))*(DEFAULT_PYRAMID_WIDTH/PYRAMID_BASE_WIDTH),
  z:(WZ0+(py-Y0)*(WZ1-WZ0)/(Y1-Y0))*(DEFAULT_PYRAMID_DEPTH/PYRAMID_BASE_DEPTH)
});
function modularFloorV11(){
const rooms=[],bathrooms=[],walls=[],doors=[],seen=new Set();
const room=(id,label,x0,x1,z0,z1,pcs,side,kind)=>Object.freeze({id,label,x0,x1,z0,z1,pcs,side,kind});
for(let i=0;i<5;i++){let a=-13.7+5.8*i,b=-13.7+5.8*(i+1);rooms.push(room('N'+(i+1),'Aula '+(i+1),a,b,-14.5,-6.5,4,'upper','classroom'),room('S'+(i+1),'Aula '+(i+6),a,b,6.5,14.5,4,'lower','classroom'))}
bathrooms.push(room('WC-N','SS. HH. Mujeres',-20.4,-14.5,-14.5,-6.5,0,'upper','bathroom'),room('WC-S','SS. HH. Hombres',-20.4,-14.5,6.5,14.5,0,'lower','bathroom'));
function wall(axis,x0,z0,x1,z1){const k=[axis,x0,z0,x1,z1].map(v=>typeof v==='number'?v.toFixed(6):v).join(':');if(seen.has(k))return;seen.add(k);walls.push(Object.freeze({axis,x0,z0,x1,z1}))}
for(const r of [...rooms,...bathrooms]){const {x0,x1,z0,z1,side}=r,cx=(x0+x1)/2,d=side==='upper'?z1:z0,back=side==='upper'?z0:z1;wall('z',x0,back,x1,back);wall('x',x0,z0,x0,z1);wall('x',x1,z0,x1,z1);wall('z',x0,d,cx-.72,d);wall('z',cx+.72,d,x1,d);doors.push(Object.freeze({id:(r.kind==='bathroom'?'bano-':'aula-')+r.id,label:r.label,x:cx,z:d,side:'z',roomSide:side,kind:r.kind}))}
const stairs=[{id:'escalera-1',name:'Escalera de emergencia A',x:-10.65*56/34,xMin:-11.75*56/34,xMax:-9.55*56/34,zTop:-2.30*38/20,zBottom:1.72*38/20},{id:'escalera-2',name:'Escalera de emergencia B',x:10.50*56/34,xMin:9.40*56/34,xMax:11.60*56/34,zTop:-2.30*38/20,zBottom:1.72*38/20}];
const elevators=[{id:'ascensor-A',x:12.83*56/34,z:-.49*38/20,xMin:12.10*56/34,xMax:13.56*56/34,zTop:-1.15*38/20,zBottom:.18*38/20,accessZ:1.02*38/20},{id:'ascensor-B',x:12.6,z:-1,xMin:11.4,xMax:13.8,zTop:-2.35,zBottom:.35,accessZ:2}];
return {rooms:Object.freeze(rooms),bathrooms:Object.freeze(bathrooms),walls:Object.freeze(walls),doors:Object.freeze(doors),stairs:Object.freeze(stairs.map(Object.freeze)),elevators:Object.freeze(elevators.map(Object.freeze))}
}
const modular=modularFloorV11();
export const EV52_ROOMS=modular.rooms;
export const EV52_BATHROOMS=modular.bathrooms;
export const EV52_WALL_SEGMENTS=modular.walls;
export const EV52_DOORS=modular.doors;
export const EV52_STAIRWELLS=modular.stairs;
export const EV52_ELEVATORS=modular.elevators;
export const EV52_ELEVATOR=EV52_ELEVATORS[0];

function groundPlanV13(){
 const rooms=[],bathrooms=[],doors=[],walls=[],seen=new Set();
 const add=(list,id,label,x0,x1,z0,z1,pcs,side,kind)=>list.push({id,label,x0,x1,z0,z1,pcs,side,kind});
 add(rooms,'AUD','Auditorio',-20.1,-13.2,-14.5,-6.8,0,'upper','auditorium');
 const top=[-13.2,-5.85,1.5,8.85,16.2],bottom=[-12.7,-5.4,1.9,9.2];
 for(let i=0;i<4;i++)add(rooms,'N'+(i+1),'Salón '+(i+1),top[i],top[i+1],-14.5,-7.8,4,'upper','classroom');
 for(let i=0;i<3;i++)add(rooms,'S'+(i+1),'Salón '+(i+5),bottom[i],bottom[i+1],8.2,14.6,4,'lower','classroom');
 add(rooms,'LAB','Laboratorios',9.2,22.4,8.2,15,4,'lower','lab');
 add(bathrooms,'WC1','Baños 1',15.1,20.5,-4.6,-.65,0,'lower','bathroom');
 add(bathrooms,'WC2','Baños 2',15.1,20.5,.8,4.9,0,'upper','bathroom');
 const stairs=[{id:'escalera-1',name:'Escalera central A',x:-7.2,xMin:-9,xMax:-5.4,zTop:-4.9,zBottom:1.8},{id:'escalera-2',name:'Escalera central B',x:9.1,xMin:7.3,xMax:10.9,zTop:-4.9,zBottom:1.8}];
 const elevators=[{id:'ascensor-A',x:-17.4,xMin:-18.6,xMax:-16.2,z:-2.7,zTop:-4.05,zBottom:-1.35,accessZ:-.15},{id:'ascensor-B',x:-14.5,xMin:-15.7,xMax:-13.3,z:-2.7,zTop:-4.05,zBottom:-1.35,accessZ:-.15}];
 const skylight={x0:-4.9,x1:6.9,z0:-4.8,z1:5.9},patio={x0:21.1,x1:23.3,z0:-6.5,z1:6.9};
 function wall(axis,x0,z0,x1,z1){const key=[axis,x0,z0,x1,z1].join(':');if(seen.has(key))return;seen.add(key);walls.push({axis,x0,z0,x1,z1})}
 for(const r of [...rooms,...bathrooms]){
  const {x0,x1,z0,z1,side}=r,cx=(x0+x1)/2,d=side==='upper'?z1:z0,back=side==='upper'?z0:z1;
  wall('z',x0,back,x1,back);wall('x',x0,z0,x0,z1);wall('x',x1,z0,x1,z1);wall('z',x0,d,cx-.72,d);wall('z',cx+.72,d,x1,d);
  doors.push({id:'p1-'+r.id,label:r.label,x:cx,z:d,side:'z',roomSide:side,kind:r.kind});
 }
 return {rooms,bathrooms,doors,walls,stairs,elevators,skylight,patio};
}
export const EV52_GROUND=groundPlanV13();
export const roomsForFloor=(floor=1)=>floor===0?EV52_GROUND.rooms:EV52_ROOMS;

/** Posiciones de muebles en unidades REALES del escenario ya escalado. */
export function ev52DeskPositions(scaleX=1,scaleZ=1,floor=1){
  const result=[];
  for(const r of roomsForFloor(floor).filter(r=>r.pcs)){
    const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2;
    for(const dz of [-1.35,1.05])for(const dx of (floor===0?[-1.6,1.6]:[-1.25,1.25])){
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
    staircase:{width:(EV52_STAIRWELLS[1].xMax-EV52_STAIRWELLS[1].xMin)*s.x,length:(EV52_STAIRWELLS[1].zBottom-EV52_STAIRWELLS[1].zTop)*s.z},
    elevator:{width:(EV52_ELEVATOR.xMax-EV52_ELEVATOR.xMin)*s.x,depth:(EV52_ELEVATOR.zBottom-EV52_ELEVATOR.zTop)*s.z},
    bathrooms:EV52_BATHROOMS,elevators:EV52_ELEVATORS,
    rooms:EV52_ROOMS.map(r=>({...r,width:(r.x1-r.x0)*s.x,depth:(r.z1-r.z0)*s.z}))
  };
}
