/**
 * Primer piso frontal – trazado didáctico basado en el croquis del usuario (22/11/2026).
 * Negro = muros; verde = huecos de puertas.
 * Referencia visual, NO plano técnico a escala ni certificación de evacuación.
 *
 * Coordenadas de referencia (píxeles de la imagen original):
 * X: 43..947 izquierda-derecha; Y: 25..575 fondo-frente.
 * Este módulo SOLO se utiliza en la planta baja y no mueve escaleras/ascensores
 * existentes; sus posiciones reales se deberán conciliar con próximos planos.
 */
export const FRONT_REFERENCE=Object.freeze({left:43,right:947,top:25,bottom:575});

// Tramos de muro: los huecos que aparecen en verde NO están cubiertos por muros.
const BLACK_WALLS=[
  // División superior izquierda y acceso hacia su pasadizo.
  [43,160,194,160], [245,160,343,160],
  [339,25,339,82], [339,128,339,160],
  // Bloque superior central y superior derecho.
  [577,25,577,149], [577,149,725,149],
  [725,25,725,145], [790,145,947,145],
  [787,91,902,91],
  // Dos salones de la izquierda, con puertas hacia el paso central.
  [182,160,182,248], [182,297,182,520],
  [43,427,182,427],
  // Pasadizo y locales estrechos junto a los salones.
  [253,160,253,247], [253,289,253,349], [253,391,253,435],
  [253,435,253,575], [253,289,343,289],
  [253,435,343,435], [343,289,343,575],
  // Servicios sanitarios del lado derecho.
  [584,289,584,575], [584,289,733,289],
  [733,289,733,489], [733,544,733,575],
  [843,289,843,386], [843,436,843,575],
  [843,289,947,289]
];

// Cada acceso corresponde a uno de los intervalos verdes del croquis.
// side=z => abertura en muro horizontal; side=x => abertura en muro vertical.
const GREEN_DOORS=[
  {id:'acceso-superior-izquierda',label:'Acceso superior izquierdo',side:'x',a:[339,82],b:[339,128]},
  {id:'acceso-pasadizo-superior',label:'Acceso al pasadizo',side:'z',a:[194,160],b:[245,160]},
  {id:'acceso-salon-2',label:'Puerta salón 2',side:'x',a:[182,248],b:[182,297]},
  {id:'acceso-salon-1',label:'Puerta salón 1',side:'x',a:[182,520],b:[182,575]},
  {id:'acceso-local-pasadizo',label:'Acceso al ambiente del pasadizo',side:'x',a:[253,349],b:[253,391]},
  {id:'acceso-escaleras',label:'Acceso zona de escaleras',side:'z',a:[725,145],b:[790,145]},
  {id:'acceso-bano-hombres',label:'Baño hombres',side:'x',a:[733,489],b:[733,544]},
  {id:'acceso-bano-mujeres',label:'Baño mujeres',side:'x',a:[843,386],b:[843,436]}
];

const ROOM_LABELS=[
  {label:'SALÓN 2',px:110,py:275},
  {label:'SALÓN 1',px:110,py:503},
  {label:'PASADIZO',px:218,py:330},
  {label:'BAÑO HOMBRES',px:653,py:402},
  {label:'BAÑO MUJERES',px:889,py:416},
  {label:'ZONA DE ESCALERAS',px:836,py:63}
];

/**
 * Convierte croquis normalizado a metros de la huella actual del edificio.
 * Mantiene huecos en las puertas y devuelve objetos consumibles por Three.js.
 */
function clipWallsOutsideCores(walls,cores=[]){
  const pad=.15;
  let result=walls;
  for(const core of cores){
    result=result.flatMap(segment=>{
      const vertical=segment.axis==='x';
      const fixed=vertical?segment.x0:segment.z0;
      const low=vertical?core.xMin-pad:core.zTop-pad;
      const high=vertical?core.xMax+pad:core.zBottom+pad;
      if(fixed<low || fixed>high)return [segment];
      const from=vertical?segment.z0:segment.x0;
      const to=vertical?segment.z1:segment.x1;
      const cutFrom=vertical?core.zTop-pad:core.xMin-pad;
      const cutTo=vertical?core.zBottom+pad:core.xMax+pad;
      if(to<=cutFrom || from>=cutTo)return [segment];
      const pieces=[];
      const make=(a,b)=>{
        if(b-a<.12)return;
        pieces.push(vertical?
          {...segment,z0:a,z1:b}:{...segment,x0:a,x1:b});
      };
      make(from,Math.min(to,cutFrom));
      make(Math.max(from,cutTo),to);
      return pieces;
    });
  }
  return result;
}

export function getFirstFloorFrontPlan(bounds,coreKeepouts=[]){
  if(!(bounds.left<bounds.right && bounds.back<bounds.front))
    throw new Error('Límites inválidos del primer piso');
  // Ligero margen para no duplicar la envolvente exterior existente.
  const left=bounds.left+.22,right=bounds.right-.22;
  const back=bounds.back+.22,front=bounds.front-.22;
  const X=px=>left+(px-FRONT_REFERENCE.left)*(right-left)/(FRONT_REFERENCE.right-FRONT_REFERENCE.left);
  const Z=py=>back+(py-FRONT_REFERENCE.top)*(front-back)/(FRONT_REFERENCE.bottom-FRONT_REFERENCE.top);
  const walls=BLACK_WALLS.map(([ax,ay,bx,by])=>{
    if(ay===by)return {axis:'z',x0:X(ax),x1:X(bx),z0:Z(ay),z1:Z(ay)};
    if(ax===bx)return {axis:'x',x0:X(ax),x1:X(ax),z0:Z(ay),z1:Z(by)};
    throw new Error('El croquis contiene un muro no ortogonal');
  });
  const protectedWalls=clipWallsOutsideCores(walls,coreKeepouts);
  const doors=GREEN_DOORS.map(({id,label,side,a,b})=>{
    const p0={x:X(a[0]),z:Z(a[1])},p1={x:X(b[0]),z:Z(b[1])};
    const width=side==='x'?Math.abs(p1.z-p0.z):Math.abs(p1.x-p0.x);
    return {id,label,side,x:(p0.x+p1.x)/2,z:(p0.z+p1.z)/2,width};
  });
  const labels=ROOM_LABELS.map(({label,px,py})=>({label,x:X(px),z:Z(py)}));
  const entrance={
    label:'Acceso principal existente',
    x:(X(414)+X(541))/2,z:Z(575),
    // La puerta principal ya existe en la fachada y se abre con E.
    source:'facade-existing'
  };
  return {walls:protectedWalls,doors,labels,entrance,source:'croquis-frontal-22-11-2026'};
}
