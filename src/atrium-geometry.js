/**
 * Divide una losa rectangular en piezas macizas sin cubrir los huecos.
 * Algoritmo geométrico puro, compartido por la escena y el verificador V11.
 * Rectángulos en metros de maqueta {left,right,back,front}.
 */
export function carveSlab(bounds,holes=[]){
  const eps=1e-7;
  if(!(bounds.left<bounds.right&&bounds.back<bounds.front))throw new Error('Límites de losa inválidos');
  let pieces=[{...bounds}];
  for(const hole of holes){
    if(!(hole.x0<hole.x1&&hole.z0<hole.z1))throw new Error('Hueco inválido');
    const next=[];
    for(const p of pieces){
      const x0=Math.max(p.left,hole.x0),x1=Math.min(p.right,hole.x1);
      const z0=Math.max(p.back,hole.z0),z1=Math.min(p.front,hole.z1);
      if(x1<=x0+eps||z1<=z0+eps){next.push(p);continue;}
      const add=(left,right,back,front)=>{
        if(right-left>eps&&front-back>eps)next.push({left,right,back,front});
      };
      add(p.left,x0,p.back,p.front);
      add(x1,p.right,p.back,p.front);
      add(x0,x1,p.back,z0);
      add(x0,x1,z1,p.front);
    }
    pieces=next;
  }
  return pieces;
}
export const rectangleArea=p=>(p.right-p.left)*(p.front-p.back);
