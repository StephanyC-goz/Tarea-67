import * as THREE from 'three';
import { materials as m } from './materiales.js';

export const ROOM = { width: 20, depth: 12, height: 3.35 };
const box = (g,w,h,d,mat,x,y,z) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  o.position.set(x,y,z); o.castShadow=true; o.receiveShadow=true; g.add(o); return o;
};

function makeCanvasTexture(draw){
  const canvas=document.createElement('canvas');
  canvas.width=768;canvas.height=512;
  const ctx=canvas.getContext('2d');
  draw(ctx,canvas.width,canvas.height);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=8;
  return texture;
}
function createSafetyPoster(g,x,y,z){
  const texture=makeCanvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#f7f9fc';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#123e72';ctx.fillRect(0,0,w,92);
    ctx.fillStyle='#fff';ctx.font='bold 43px Arial';ctx.textAlign='center';
    ctx.fillText('NORMAS DE SEGURIDAD',w/2,59);
    const rows=[
      ['01','Utiliza correctamente los equipos'],
      ['02','No ingreses alimentos ni bebidas'],
      ['03','Mantén el orden y la limpieza'],
      ['04','Informa cualquier incidente']
    ];
    rows.forEach((r,i)=>{
      const yy=150+i*88;
      ctx.fillStyle=i%2?'#edf2f7':'#fff';ctx.fillRect(0,yy-52,w,78);
      ctx.fillStyle=i===3?'#c0392b':'#1476b8';
      ctx.beginPath();ctx.arc(65,yy-12,29,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='bold 26px Arial';ctx.fillText(r[0],65,yy-3);
      ctx.fillStyle='#26384b';ctx.textAlign='left';ctx.font='bold 25px Arial';
      ctx.fillText(r[1],112,yy-3);
    });
  });
  const frameMat=new THREE.MeshStandardMaterial({color:0x8b969f,metalness:.35,roughness:.45});
  box(g,1.25,1.02,.055,frameMat,x,y,z);
  const poster=new THREE.Mesh(new THREE.PlaneGeometry(1.16,.93),new THREE.MeshBasicMaterial({map:texture}));
  poster.position.set(x,y,z+.032);g.add(poster);
}
function createExitSign(g,x,y,z){
  const texture=makeCanvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#087443';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#fff';ctx.lineWidth=12;ctx.strokeRect(8,8,w-16,h-16);
    ctx.fillStyle='#fff';ctx.font='bold 100px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('SALIDA',w/2,h/2+2);
  });
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.0,.34),new THREE.MeshBasicMaterial({map:texture}));
  sign.position.set(x,y,z);g.add(sign);
}

function horizontalWall(g,z,openings=[]) {
  const W=ROOM.width,H=ROOM.height,T=.2;
  const sorted=[...openings].sort((a,b)=>a.center-b.center);
  let cursor=-W/2;
  for (const o of sorted) {
    const left=o.center-o.width/2, right=o.center+o.width/2;
    if(left>cursor) box(g,left-cursor,H,T,m.wall,(left+cursor)/2,H/2,z);
    const bottom=o.type==='door'?0:1.15, top=o.type==='door'?2.45:2.55;
    if(bottom>0) box(g,o.width,bottom,T,m.wall,o.center,bottom/2,z);
    if(H>top) box(g,o.width,H-top,T,m.wall,o.center,top+(H-top)/2,z);
    if(o.type==='window') {
      box(g,o.width-.12,top-bottom-.1,.045,m.glass,o.center,(top+bottom)/2,z);
      box(g,o.width+.1,.07,.1,m.frame,o.center,bottom,z);
      box(g,o.width+.1,.07,.1,m.frame,o.center,top,z);
      box(g,.07,top-bottom,.1,m.frame,o.center-o.width/2,(top+bottom)/2,z);
      box(g,.07,top-bottom,.1,m.frame,o.center+o.width/2,(top+bottom)/2,z);
    } else if(o.type==='door') {
      // Puerta de vidrio transparente con marco metálico y tirador vertical.
      const glassDoor=new THREE.Mesh(
        new THREE.BoxGeometry(o.width-.12,top-.08,.045),
        new THREE.MeshPhysicalMaterial({color:0x9ed8ed,roughness:.12,metalness:.08,transparent:true,opacity:.38,transmission:.35,side:THREE.DoubleSide})
      );
      glassDoor.position.set(o.center,(top-.08)/2,z-.015);glassDoor.castShadow=true;g.add(glassDoor);
      const frame=m.frame;
      box(g,.065,top,.09,frame,o.center-o.width/2+.025,top/2,z);
      box(g,.065,top,.09,frame,o.center+o.width/2-.025,top/2,z);
      box(g,o.width,.065,.09,frame,o.center,top-.025,z);
      box(g,.055,.82,.075,m.metal,o.center+o.width*.29,1.25,z-.07);
      box(g,.055,.82,.075,m.metal,o.center-o.width*.29,1.25,z-.07);
      box(g,.05,.12,.08,m.metal,o.center+o.width*.29,1.25,z-.09);
      // Señalización institucional a la izquierda de la puerta y sobre el dintel.
      createSafetyPoster(g,o.center-o.width/2-.78,1.95,z-.13);
      createExitSign(g,o.center,2.72,z-.14);
    }
    cursor=right;
  }
  if(cursor<W/2) box(g,W/2-cursor,H,T,m.wall,(W/2+cursor)/2,H/2,z);
}
function verticalWall(g,x,openings=[]) {
  const D=ROOM.depth,H=ROOM.height,T=.2;
  const sorted=[...openings].sort((a,b)=>a.center-b.center);
  let cursor=-D/2;
  for(const o of sorted) {
    const a=o.center-o.width/2,b=o.center+o.width/2;
    if(a>cursor) box(g,T,H,a-cursor,m.wall,x,H/2,(a+cursor)/2);
    const bottom=o.type==='door'?0:1.15,top=o.type==='door'?2.45:2.55;
    if(bottom>0) box(g,T,bottom,o.width,m.wall,x,bottom/2,o.center);
    if(H>top) box(g,T,H-top,o.width,m.wall,x,top+(H-top)/2,o.center);
    if(o.type==='window') {
      box(g,.045,top-bottom-.1,o.width-.12,m.glass,x,(top+bottom)/2,o.center);
      box(g,.1,.07,o.width+.1,m.frame,x,bottom,o.center);
      box(g,.1,.07,o.width+.1,m.frame,x,top,o.center);
    } else if(o.type==='door') {
      box(g,.075,top-.05,o.width-.1,m.door,x,(top-.05)/2,o.center);
    }
    cursor=b;
  }
  if(cursor<D/2) box(g,T,H,D/2-cursor,m.wall,x,H/2,(D/2+cursor)/2);
}

export function crearPisoYMuros(group,{roof=false}={}) {
  const {width:W,depth:D,height:H}=ROOM;
  box(group,W,.18,D,new THREE.MeshStandardMaterial({color:0xf5f6f7,roughness:.92}),0,-.09,0);
  const tileA = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: .86 });
  const tileB = new THREE.MeshStandardMaterial({ color: 0xf0f2f4, roughness: .88 });
  for (let ix=0; ix<W; ix++) {
    for (let iz=0; iz<D; iz++) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(.997,.012,.997), ((ix+iz)%2===0)?tileA:tileB);
      tile.position.set(-W/2+ix+.5,.006,-D/2+iz+.5);
      tile.receiveShadow=true;tile.castShadow=false;group.add(tile);
    }
  }
  horizontalWall(group,-D/2,[{center:9.0,width:1.6,type:'door'}]);
  horizontalWall(group,D/2,[
    {center:-6.7,width:2.0,type:'window'},
    {center:-3.2,width:2.0,type:'window'},
    {center:.3,width:2.0,type:'window'},
    {center:3.8,width:2.0,type:'window'},
    {center:7.0,width:2.0,type:'window'}
  ]);
  verticalWall(group,-W/2,[
    {center:-4.0,width:1.55,type:'window'},
    {center:-1.35,width:1.55,type:'window'},
    {center:1.35,width:1.55,type:'window'},
    {center:4.0,width:1.55,type:'window'}
  ]);
  verticalWall(group,W/2,[]);
  if(roof) {
    const ceiling=new THREE.Mesh(new THREE.BoxGeometry(W,.12,D),m.wallSide);
    ceiling.position.set(0,H,0);ceiling.receiveShadow=true;group.add(ceiling);
  }
  return ROOM;
}
