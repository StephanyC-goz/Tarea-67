/**
 * V12: Interpretación del plano aportado en METROS, sin escalado de objetos 3D.
 * No equivale a cotas, normativa, aforo ni plano técnico real de SENATI.
 * Las habitaciones, huecos y núcleos están dispuestos para no superponerse.
 * Los otros cinco niveles reutilizan esta distribución virtual.
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
function planFloorV12(){
 const rooms=[],bathrooms=[],support=[],walls=[],doors=[],raw=[];
 const add=(list,id,label,x0,x1,z0,z1,pcs,side,kind)=>list.push(Object.freeze({id,label,x0,x1,z0,z1,pcs,side,kind}));
 const top=[-20.4,-13.1,-5.75,1.5,8.9,16.3],bottom=[-12.7,-5.35,1.8,9.1,16.3,22.9];
 for(let i=0;i<5;i++)add(rooms,'N'+(i+1),'Aula '+(i+1),top[i],top[i+1],-14.5,i===0?-5:-7.8,4,'upper','classroom');
 for(let i=0;i<3;i++)add(rooms,'S'+(i+1),'Aula '+(i+6),bottom[i],bottom[i+1],8.5,14.6,4,'lower','classroom');
 add(rooms,'S4','Ambiente común',9.1,16.3,9.35,15.35,0,'lower','common');
 add(rooms,'S5','Ambiente de trabajo',16.3,22.9,9.35,15.35,4,'lower','classroom');
 add(bathrooms,'WC-N','SS. HH. 1',15,21.5,-3.9,-.25,0,'lower','bathroom');
 add(bathrooms,'WC-S','SS. HH. 2',15,21.5,.65,4.6,0,'upper','bathroom');
 add(support,'AP-1','Ambiente de apoyo 1',-18.9,-16,-3.3,1.3,0,'upper','support');
 add(support,'AP-2','Ambiente de apoyo 2',-16,-12.5,-3.3,1.3,0,'upper','support');
 add(support,'AP-3','Ambiente de apoyo 3',16.8,20,-7.5,-4.9,0,'lower','support');
 add(support,'AP-4','Ambiente de apoyo 4',12.9,15,5.9,7.8,0,'upper','support');
 add(support,'AP-5','Ambiente de apoyo 5',15,18.6,5.9,7.8,0,'upper','support');
 add(support,'AP-6','Ambiente de apoyo 6',18.6,22.8,5.9,7.8,0,'upper','support');
 function wall(axis,x0,z0,x1,z1){if(Math.hypot(x1-x0,z1-z0)>.04)raw.push({axis,x0,z0,x1,z1})}
 for(const r of [...rooms,...bathrooms,...support]){const {x0,x1,z0,z1,side}=r,cx=(x0+x1)/2,d=side==='upper'?z1:z0,back=side==='upper'?z0:z1;wall('z',x0,back,x1,back);wall('x',x0,z0,x0,z1);wall('x',x1,z0,x1,z1);wall('z',x0,d,cx-.72,d);wall('z',cx+.72,d,x1,d);doors.push(Object.freeze({id:(r.kind==='bathroom'?'bano-':r.kind==='support'?'apoyo-':'aula-')+r.id,label:r.label,x:cx,z:d,side:'z',roomSide:side,kind:r.kind}))}
 const lines=new Map();for(const w of raw){const k=w.axis+':'+(w.axis==='x'?w.x0:w.z0).toFixed(5);if(!lines.has(k))lines.set(k,[]);lines.get(k).push(w.axis==='x'?[w.z0,w.z1]:[w.x0,w.x1])}
 for(const [k,segments] of lines){const [axis,val]=k.split(':'),fixed=Number(val),merged=[];segments.sort((a,b)=>a[0]-b[0]);for(const seg of segments){const prev=merged.at(-1);if(prev&&seg[0]<=prev[1]+1e-5)prev[1]=Math.max(prev[1],seg[1]);else merged.push([...seg])}for(const [a,b] of merged)walls.push(Object.freeze(axis==='x'?{axis,x0:fixed,x1:fixed,z0:a,z1:b}:{axis,x0:a,x1:b,z0:fixed,z1:fixed}))}
 const stairs=[{id:'escalera-1',name:'Escalera de emergencia A',x:-6.9,xMin:-8.7,xMax:-5.1,zTop:-6,zBottom:0},{id:'escalera-2',name:'Escalera de emergencia B',x:10.2,xMin:8.4,xMax:12,zTop:-6,zBottom:0}];
 const elevators=[{id:'ascensor-A',x:-6.9,z:3.1,xMin:-8.15,xMax:-5.65,zTop:1.8,zBottom:4.4,accessZ:5.5},{id:'ascensor-B',x:10.2,z:3.1,xMin:8.95,xMax:11.45,zTop:1.8,zBottom:4.4,accessZ:5.5}];
 return {rooms:Object.freeze(rooms),bathrooms:Object.freeze(bathrooms),support:Object.freeze(support),walls:Object.freeze(walls),doors:Object.freeze(doors),stairs:Object.freeze(stairs.map(Object.freeze)),elevators:Object.freeze(elevators.map(Object.freeze))};
}
const modular=planFloorV12();
export const EV52_ROOMS=modular.rooms;
export const EV52_BATHROOMS=modular.bathrooms;
export const EV52_SUPPORT_ROOMS=modular.support;
export const EV52_WALL_SEGMENTS=modular.walls;
export const EV52_DOORS=modular.doors;
export const EV52_STAIRWELLS=modular.stairs;
export const EV52_ELEVATORS=modular.elevators;
export const EV52_ELEVATOR=EV52_ELEVATORS[0];

/** Posiciones de muebles en unidades REALES del escenario ya escalado. */
export function ev52DeskPositions(scaleX=1,scaleZ=1){
  const result=[];
  for(const r of EV52_ROOMS.filter(r=>r.pcs)){
    const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2;
    for(const dz of [-1.35,1.05])for(const dx of [-1.55,1.55]){
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
    bathrooms:EV52_BATHROOMS,support:EV52_SUPPORT_ROOMS,elevators:EV52_ELEVATORS,
    rooms:EV52_ROOMS.map(r=>({...r,width:(r.x1-r.x0)*s.x,depth:(r.z1-r.z0)*s.z}))
  };
}
