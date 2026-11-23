import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildPiramideSENATI} from './piramide-senati.js';
import {EXTERIOR_INVENTORY} from './exterior-campus.js';
const stage=document.getElementById('stage');
try{
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;stage.append(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#d9e5e3');scene.fog=new THREE.Fog('#d9e5e3',180,320);
 scene.add(new THREE.HemisphereLight('#f5f6ef','#7a8175',2.5));const sun=new THREE.DirectionalLight('#fff5dc',2.3);sun.position.set(-40,70,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-85,right:85,top:75,bottom:-75});sun.shadow.bias=-.0003;scene.add(sun);
 const building=buildPiramideSENATI(scene,{mode:'exterior',roofVisible:true});
 const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,500),orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=4;orbit.maxDistance=240;orbit.maxPolarAngle=Math.PI*.49;
 const views=[[-32,3.8,35,-30,0,22],[-28,4,31,-28,0,22],[-48,4,2,-22,7,3],[-47,5,-13,-23,7,1],[3,5,-29,3,1,-15],[49,5,-23,28,1,-12],[39,5,29,29,1,8]];
 const descriptions=EXTERIOR_INVENTORY;
 function view(v){camera.position.set(...v.slice(0,3));orbit.target.set(...v.slice(3,6));orbit.update();}
 function overview(){view([-103,66,97,-3,5,0]);}overview();
 document.getElementById('overview').onclick=overview;document.getElementById('plan').onclick=()=>view([0,155,.01,0,0,0]);
 document.getElementById('entrance').onclick=()=>{
   const {x,z,approach}=building.entry;
   view([approach.x-7,2.8,z+.8,x,2.0,z+2.7]);
   document.getElementById('caption').textContent='Entrada principal de vidrio en la plaza lateral, entre las zonas de seguridad.';
 };
 const route=new THREE.Group();route.visible=false;scene.add(route);const points=building.campus.route.map(p=>new THREE.Vector3(p.x,building.campus.heightAt(p.x,p.z)+.15,p.z));
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([...points,points[0]]),new THREE.LineBasicMaterial({color:'#e09b35'}));route.add(line);
 building.campus.route.forEach((p,i)=>{
   const b=document.createElement('button');b.textContent=p.n;b.title=`Punto ${p.n} · ${p.time}`;b.onclick=()=>{view(views[i]);const item=descriptions.find(d=>d[0].includes(String(p.n)))||descriptions.at(-1);document.getElementById('caption').textContent=`${p.time} · ${item[2]}.`;};document.getElementById('points').append(b);
   const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#205b46';g.beginPath();g.arc(64,64,56,0,Math.PI*2);g.fill();g.fillStyle='#fff';g.textAlign='center';g.font='bold 76px Arial';g.fillText(String(p.n),64,91);const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));marker.position.set(p.x,2.5,p.z);marker.scale.set(2.3,2.3,1);route.add(marker);
 });
 document.getElementById('route').onchange=e=>route.visible=e.target.checked;
 document.getElementById('ghost').onchange=e=>building.setMode(e.target.checked?'transparente':'exterior',true);
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
 renderer.setAnimationLoop(()=>{orbit.update();renderer.render(scene,camera);});
 // Sólo se expone en el visor independiente para comprobar geometría y capturas.
 window.exteriorPreview={building,camera,orbit,renderer,scene,view};
}catch(err){const p=document.getElementById('error');p.style.display='block';p.textContent='No se pudo abrir la vista 3D: '+err.message;throw err;}
