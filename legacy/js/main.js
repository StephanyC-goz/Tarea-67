import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { crearEscenaSinTecho } from './scenes/aula_sin_techo.js';
import { crearEscenaConTecho } from './scenes/aula_con_techo.js';

const viewport=document.querySelector('#viewport');
const status=document.querySelector('#status');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111a2b);
const camera=new THREE.PerspectiveCamera(48,1,.1,120);
const homePosition=new THREE.Vector3(1.5,27,9.5);
camera.position.copy(homePosition);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
renderer.xr.enabled=true;viewport.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,.8,0);controls.enableDamping=true;controls.dampingFactor=.065;
controls.minDistance=7;controls.maxDistance=38;controls.maxPolarAngle=Math.PI*.47;

scene.add(new THREE.HemisphereLight(0xe4efff,0x786b59,2.0));
const sun=new THREE.DirectionalLight(0xffedcf,2.1);sun.position.set(-7,15,8);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;scene.add(sun);
const fill=new THREE.DirectionalLight(0x9dbdff,.75);fill.position.set(8,8,-8);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x202c40,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.22;ground.receiveShadow=true;scene.add(ground);

const scenes=[crearEscenaSinTecho(),crearEscenaConTecho()];
let current=0;scene.add(scenes[current]);
const label=document.querySelector('#scene-label');
const roofButton=document.querySelector('#toggle-roof');
const roofSwitch=document.querySelector('#roof-switch');
function setRoof(enabled){
 const next=enabled?1:0;
 if(next!==current){scene.remove(scenes[current]);current=next;scene.add(scenes[current]);}
 const hasRoof=current===1;
 label.textContent=hasRoof?'Vista con techo':'Vista sin techo';
 roofButton.textContent=hasRoof?'Ocultar techo':'Activar techo';
 roofSwitch.checked=hasRoof;
 status.textContent=hasRoof?'Escena con techo activa':'Escena sin techo activa';
}
roofButton.addEventListener('click',()=>setRoof(current===0));
roofSwitch.addEventListener('change',e=>setRoof(e.target.checked));
document.querySelector('#reset-camera').addEventListener('click',()=>{
 camera.position.copy(homePosition);controls.target.set(0,.8,0);controls.update();
});
document.querySelector('#collapse-panel').addEventListener('click',()=>{
 document.querySelector('.sidebar').classList.toggle('collapsed');
});
for(const input of document.querySelectorAll('[data-feature]')){
 input.addEventListener('change',()=>{
  const name=input.dataset.feature;
  scenes.forEach(s=>{const object=s.getObjectByName(name);if(object)object.visible=input.checked;});
  status.textContent=`${name}: ${input.checked?'activado':'desactivado'}`;
 });
}
document.querySelector('#shadow-switch').addEventListener('change',e=>{
 renderer.shadowMap.enabled=e.target.checked;
 scenes.forEach(s=>s.traverse(o=>{if(o.isMesh)o.castShadow=e.target.checked;}));
});

const vrButton=VRButton.createButton(renderer);
vrButton.id='vr-button';viewport.appendChild(vrButton);
document.querySelector('#vr-fallback').addEventListener('click',()=>vrButton.click());

const pressed=new Set();
const ignoredTarget=t=>t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLButtonElement;
window.addEventListener('keydown',e=>{
 if(ignoredTarget(e.target))return;
 const key=e.key.toLowerCase();
 if(['w','a','s','d','q','e','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){
  e.preventDefault();pressed.add(key);
 }
 if(key==='r'){camera.position.copy(homePosition);controls.target.set(0,.8,0);controls.update();}
});
window.addEventListener('keyup',e=>pressed.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>pressed.clear());

function keyboardMove(dt){
 if(renderer.xr.isPresenting)return;
 const speed=(pressed.has('shift')?7:3.4)*dt;
 const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();
 const right=new THREE.Vector3().crossVectors(forward,camera.up).normalize().negate();
 const delta=new THREE.Vector3();
 if(pressed.has('w')||pressed.has('arrowup'))delta.addScaledVector(forward,speed);
 if(pressed.has('s')||pressed.has('arrowdown'))delta.addScaledVector(forward,-speed);
 if(pressed.has('a'))delta.addScaledVector(right,-speed);
 if(pressed.has('d'))delta.addScaledVector(right,speed);
 if(delta.lengthSq()){
  camera.position.add(delta);controls.target.add(delta);
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-16,16);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,-10,10);
 }
 if(pressed.has('q')){camera.position.y-=speed;controls.target.y-=speed;}
 if(pressed.has('e')){camera.position.y+=speed;controls.target.y+=speed;}
 if(pressed.has('arrowleft')||pressed.has('arrowright')){
  const angle=(pressed.has('arrowleft')?1:-1)*dt*1.25;
  const offset=camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),angle);
  camera.position.copy(controls.target).add(offset);
 }
 if(pressed.has('arrowup')||pressed.has('arrowdown')){
  const angle=(pressed.has('arrowup')?1:-1)*dt*.8;
  const offset=camera.position.clone().sub(controls.target);
  const axis=new THREE.Vector3().crossVectors(offset,new THREE.Vector3(0,1,0)).normalize();
  offset.applyAxisAngle(axis,angle);camera.position.copy(controls.target).add(offset);
 }
}
let last=performance.now();
renderer.setAnimationLoop(()=>{
 const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;
 keyboardMove(dt);
 const fanGroup=scenes[current].getObjectByName('Ventiladores');
 if(fanGroup&&fanGroup.visible)fanGroup.children.forEach(f=>{if(f.userData.rotor)f.userData.rotor.rotation.y+=dt*30;});
 const peopleGroup=scenes[current].getObjectByName('Personas');
 if(peopleGroup&&peopleGroup.visible)peopleGroup.children.forEach(person=>{if(person.userData.animate)person.userData.animate(now/1000);});
 controls.update();renderer.render(scene,camera);
});
function resize(){
 const w=viewport.clientWidth,h=viewport.clientHeight;
 camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.setSize(w,h);
}
new ResizeObserver(resize).observe(viewport);resize();
status.textContent='Aula 20 × 12 m lista';
