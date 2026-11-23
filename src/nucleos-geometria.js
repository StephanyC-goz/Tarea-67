/**
 * Zonas reservadas para escaleras y ascensores del modelo SENATI.
 * Todas las plantas usan estas mismas exclusiones en metros de maqueta;
 * paredes 3D y colisiones se construyen con los mismos tramos recortados.
 * NO reemplaza las paredes perimetrales propias de las cabinas o pozos.
 */
export function coreRects(stairs=[],elevators=[]){
  return [...stairs,...elevators].map(core=>({
    id:core.id,
    x0:core.xMin,x1:core.xMax,
    z0:core.zTop,z1:core.zBottom
  }));
}

export function intersects(a,b,margin=0){
  return a.x0<b.x1+margin&&a.x1>b.x0-margin&&
    a.z0<b.z1+margin&&a.z1>b.z0-margin;
}

export function segmentFootprint(segment,thickness=.12){
  const t=thickness/2;
  return {
    x0:Math.min(segment.x0,segment.x1)-t,
    x1:Math.max(segment.x0,segment.x1)+t,
    z0:Math.min(segment.z0,segment.z1)-t,
    z1:Math.max(segment.z0,segment.z1)+t
  };
}

/** Resta rectángulos de un segmento ortogonal, protegiendo espesor de pared. */
export function clipWallsAgainstCores(segments,cores,clearance=.20){
  let output=segments.map(s=>({...s}));
  for(const c of cores){
    if(!(c.x0<c.x1&&c.z0<c.z1))throw new Error('Núcleo inválido: '+(c.id||'?'));
    output=output.flatMap(s=>{
      if(s.axis!=='x'&&s.axis!=='z')throw new Error('Muro no ortogonal');
      const vertical=s.axis==='x';
      const fixed=vertical?s.x0:s.z0;
      const t=.06; // Mitad del espesor del mesh (0.12 m).
      const cross0=vertical?c.x0:c.z0;
      const cross1=vertical?c.x1:c.z1;
      if(fixed+t<=cross0-clearance||fixed-t>=cross1+clearance)return [s];
      const low=vertical?Math.min(s.z0,s.z1):Math.min(s.x0,s.x1);
      const high=vertical?Math.max(s.z0,s.z1):Math.max(s.x0,s.x1);
      const cut0=(vertical?c.z0:c.x0)-clearance-t;
      const cut1=(vertical?c.z1:c.x1)+clearance+t;
      if(high<=cut0||low>=cut1)return [s];
      const make=(a,b)=> b-a>.045?
        [vertical?{...s,z0:a,z1:b}:{...s,x0:a,x1:b}]:[];
      return [...make(low,Math.min(high,cut0)),
        ...make(Math.max(low,cut1),high)];
    });
  }
  return output;
}

export function doorFootprint(door,thickness=.12){
  const half=Math.max(.85,Math.min(3.65,Number(door.width)||1.40))/2;
  const t=thickness/2;
  return door.side==='x'
    ?{x0:door.x-t,x1:door.x+t,z0:door.z-half,z1:door.z+half}
    :{x0:door.x-half,x1:door.x+half,z0:door.z-t,z1:door.z+t};
}

/** Suprime solamente puertas antiguas que invadirían un núcleo de circulación. */
export function doorsOutsideCores(doors,cores,clearance=.18){
  return doors.filter(door=>cores.every(core=>!intersects(doorFootprint(door),core,clearance)));
}
