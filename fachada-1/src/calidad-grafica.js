/**
 * Presets de render 3D para Pirámide SENATI.
 * Estética estilizada, limpia y luminosa tipo videojuego 3D, sin activos de Roblox.
 * No cambia colisiones, geometría ni lógica de movimiento.
 */
import * as THREE from 'three';

export const QUALITY_PRESETS=Object.freeze({
  rendimiento:Object.freeze({label:'Rendimiento',dpr:1,shadow:768,enabled:false,exposure:1.13}),
  equilibrado:Object.freeze({label:'Equilibrado',dpr:1.35,shadow:1536,enabled:true,exposure:1.15}),
  alto:Object.freeze({label:'Alto · recomendado',dpr:1.8,shadow:2048,enabled:true,exposure:1.19}),
  ultra:Object.freeze({label:'Ultra · GPU potente',dpr:2,shadow:3072,enabled:true,exposure:1.2})
});
const KEY='senati3d.calidad-grafica';
export function recommendedQuality({mobile=false}={}){
  return mobile?'equilibrado':'alto';
}
export function normalizeQuality(value,fallback='alto'){
  return Object.prototype.hasOwnProperty.call(QUALITY_PRESETS,value)?value:fallback;
}
export function applyGraphicsQuality({renderer,sun,scene,shadowRadius=54},value){
  const key=normalizeQuality(value);
  const preset=QUALITY_PRESETS[key];
  // Cada vez que se cambie el DPR, Three.js actualiza la resolución en el
  // siguiente setSize(). No reescalar el canvas por CSS manualmente.
  const actualDpr=typeof window==='undefined'?1:(window.devicePixelRatio||1);
  renderer.setPixelRatio(Math.min(actualDpr,preset.dpr));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=preset.exposure;
  renderer.shadowMap.enabled=preset.enabled;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  if(sun){
    sun.castShadow=preset.enabled;
    const maxSize=renderer.capabilities?.maxTextureSize||4096;
    const size=Math.max(512,Math.min(preset.shadow,maxSize));
    sun.shadow.mapSize.set(size,size);
    sun.shadow.bias=-0.00028;
    sun.shadow.normalBias=.022;
    sun.shadow.radius=2.1;
    // El frustum por defecto (-5/+5) cubría solo una pequeña parte de SENATI.
    // Mantener las sombras en toda la huella de la pirámide, no solo en una mesa.
    const c=sun.shadow.camera;
    c.left=-shadowRadius;c.right=shadowRadius;c.top=shadowRadius;c.bottom=-shadowRadius;
    c.near=1;c.far=145;
    c.updateProjectionMatrix();
    if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
    sun.shadow.needsUpdate=true;
  }
  renderer.shadowMap.needsUpdate=true;
  return key;
}
function readStored(fallback){
  try{return normalizeQuality(localStorage.getItem(KEY),fallback);}
  catch{return fallback;}
}
function persist(value){try{localStorage.setItem(KEY,value);}catch{/* no storage */}}
/**
 * Añade un único selector accesible. El ajuste es local al navegador, no
 * interviene en los datos guardados de MySQL ni en los controles del recorrido.
 */
export function mountGraphicsQuality({container,renderer,sun,scene,shadowRadius=54,onChange}){
  const fallback=recommendedQuality({mobile:
    typeof window!=='undefined'&&
    (window.matchMedia?.('(pointer: coarse)').matches||window.innerWidth<750)});
  let current=readStored(fallback);
  const field=document.createElement('label');
  field.className='graphics-quality-control';
  field.htmlFor='senati-graphics-quality';
  const title=document.createElement('span');
  title.className='graphics-quality-title';
  title.textContent='Calidad gráfica 3D';
  const select=document.createElement('select');
  select.id='senati-graphics-quality';
  select.setAttribute('aria-label','Calidad gráfica del escenario 3D');
  for(const [id,preset] of Object.entries(QUALITY_PRESETS)){
    const option=document.createElement('option');option.value=id;
    option.textContent=preset.label;select.append(option);
  }
  const caption=document.createElement('small');
  caption.className='graphics-quality-caption';
  caption.textContent='Sombras suaves y superficies nítidas. Ultra consume más GPU.';
  select.value=current;
  field.append(title,select,caption);
  if(container)container.append(field);
  const apply=value=>{
    current=applyGraphicsQuality({renderer,sun,scene,shadowRadius},value);
    select.value=current;
    persist(current);
    if(typeof onChange==='function')onChange(current);
    return current;
  };
  select.addEventListener('change',()=>apply(select.value));
  apply(current);
  return {select,apply,get value(){return current;}};
}

/** Dibujo procedural de baldosas sin recursos externos, compartido por las losas. */
let sharedFloorMap=null;
export function createPolishedFloorTexture(){
  if(typeof document==='undefined')return null;
  // Reusar un solo mapa GPU al recrear escenas, evita duplicar texturas por planta.
  if(sharedFloorMap)return sharedFloorMap;
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  ctx.fillStyle='#e8edf3';ctx.fillRect(0,0,256,256);
  // Piezas cuadradas con juntas discretas: acabado limpio estilo videojuego.
  for(let y=0;y<256;y+=64)for(let x=0;x<256;x+=64){
    ctx.fillStyle=((x+y)/64)%2===0?'#e7ebf0':'#edf1f5';
    ctx.fillRect(x+2,y+2,60,60);
    ctx.fillStyle='rgba(255,255,255,0.17)';
    ctx.fillRect(x+3,y+3,58,2);
  }
  ctx.strokeStyle='rgba(74,97,123,.19)';ctx.lineWidth=2;
  for(let k=0;k<=256;k+=64){
    ctx.beginPath();ctx.moveTo(k,0);ctx.lineTo(k,256);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,k);ctx.lineTo(256,k);ctx.stroke();
  }
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.repeat.set(5,5);
  map.anisotropy=8;
  sharedFloorMap=map;
  return sharedFloorMap;
}
