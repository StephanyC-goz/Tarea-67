import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export function createSceneModel(key, options = {}) {
  const seated=Boolean(options.seated);
  const room={width:Number(options.width)||20,depth:Number(options.depth)||12,height:Number(options.height)||3.35};
  const appearance={floorType:'tile',floorColor:'#f2f4f7',wallColor:'#f1f3f6',deskColor:'#1559a8',chairColor:'#202a38',...(options.appearance||{})};
  const DESK_LENGTH=1.58,DESK_DEPTH=.72;
  const mat=(color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const mats={desk:mat(0x164b82,.48),deskEdge:mat(0x0d3159,.55),black:mat(0x171c24,.75),metal:mat(0x6f7b88,.42,.55),blue:mat(0x07549b,.68),yellow:mat(0xf3c34b,.5),skin:mat(0xc88f6b,.85),white:mat(0xf6f7f8,.5),glass:new THREE.MeshPhysicalMaterial({color:0xbfe9f7,roughness:.06,metalness:0,transparent:true,opacity:.24,transmission:.72,thickness:.06,ior:1.46,depthWrite:false,side:THREE.DoubleSide}),wall:mat(0xe3e7eb,.9),green:mat(0x327f5a,.85),brown:mat(0x8a6245,.8)};
  function mesh(parent,geometry,material,x=0,y=0,z=0,cast=true){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;}
  function box(parent,w,h,d,material,x,y,z){return mesh(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z);}
  function cylinder(parent,rt,rb,h,material,x,y,z,segments=16){return mesh(parent,new THREE.CylinderGeometry(rt,rb,h,segments),material,x,y,z);}
function createPerson(key, seated=false) {
  // Figura estilizada con cuello anatómico estrecho y articulaciones integradas.
  const g=new THREE.Group();
  const isTeacher=key==='teacher'||key==='teacher-f', isWoman=key.startsWith('woman')||key==='teacher-f', isSenati=key.endsWith('-senati');
  const casualColors=isWoman?[0x2b9f98,0x9b6ac4,0xd16b83,0x3c83bd]:[0x367fc0,0x3c9b76,0xb56b42,0x6b78a8];
  const shirtColor=isTeacher?0x24364b:(isSenati?0x123f72:casualColors[Math.floor(Math.random()*casualColors.length)]);
  const skin=mat(isWoman?0xd9a27e:0xc98e69,.88);
  const shirt=mat(shirtColor,.78);
  const pants=mat(isTeacher?0x202b39:(isWoman?0x263448:0x202b3b),.88);
  const hair=mat(isWoman?0x75402f:(isTeacher?0x292522:0x292724),.94);
  const shoe=mat(0x17202b,.72), eye=mat(0x292b30,.7);
  const capsule=(parent,r,material,a,b)=>{
    const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),dir=vb.clone().sub(va);
    const m=mesh(parent,new THREE.CapsuleGeometry(r,Math.max(.01,dir.length()-2*r),10,20),material);
    m.position.copy(va.add(vb).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return m;
  };
  const ellipsoid=(parent,scale,material,pos)=>{const m=mesh(parent,new THREE.SphereGeometry(1,32,24),material,...pos);m.scale.set(...scale);return m;};
  const topY=seated?.82:1.08;
  ellipsoid(g,[.235,seated?.30:.34,.15],shirt,[0,topY,0]);
  if(isSenati){
    const badgeCanvas=document.createElement('canvas');badgeCanvas.width=512;badgeCanvas.height=180;
    const bc=badgeCanvas.getContext('2d');bc.fillStyle='#123f72';bc.fillRect(0,0,512,180);bc.fillStyle='#fff';bc.font='bold 82px Arial';bc.textAlign='center';bc.textBaseline='middle';bc.fillText('SENATI',256,90);
    const badgeTex=new THREE.CanvasTexture(badgeCanvas);badgeTex.colorSpace=THREE.SRGBColorSpace;
    mesh(g,new THREE.PlaneGeometry(.145,.052),new THREE.MeshBasicMaterial({map:badgeTex,transparent:false}),.105,topY+.10,.151,false);
  }
  // Cuello cilíndrico y ligeramente cónico: evita la apariencia de una bola entre cabeza y torso.
  const neck=mesh(g,new THREE.CylinderGeometry(.072,.085,.16,20),skin,0,topY+.39,.005);neck.rotation.x=-.05;
  const headY=topY+.64;
  ellipsoid(g,[.174,.19,.16],skin,[0,headY,.012]);
  for(const x of [-.174,.174])ellipsoid(g,[.035,.052,.027],skin,[x,headY,0]);
  for(const x of [-.057,.057])ellipsoid(g,[.014,.018,.009],eye,[x,headY+.025,.164]);
  ellipsoid(g,[.018,.024,.018],skin,[0,headY-.03,.17]);
  const smilePts=[new THREE.Vector3(-.035,headY-.075,.161),new THREE.Vector3(0,headY-.09,.17),new THREE.Vector3(.035,headY-.075,.161)];
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smilePts),10,.004,5,false),eye));
  // Cabello diferenciado; el docente lleva un corte corto y peinado lateral.
  ellipsoid(g,[.178,.105,.166],hair,[0,headY+.14,-.012]);
  ellipsoid(g,[.18,.065,.08],hair,[0,headY+.095,.105]);
  if(isWoman){ellipsoid(g,[.085,.19,.085],hair,[.13,headY-.05,-.075]);ellipsoid(g,[.085,.19,.085],hair,[-.13,headY-.05,-.075]);}
  if(isTeacher){
    // Chaqueta, solapas, camisa clara, corbata y credencial para distinguir al profesor.
    ellipsoid(g,[.105,.285,.018],mat(0xf2f4f6,.72),[0,topY,.148]);
    const lapel=mat(0x314c68,.58);
    const l1=mesh(g,new THREE.ConeGeometry(.085,.25,4),lapel,-.085,topY+.13,.16);l1.rotation.z=-.30;
    const l2=mesh(g,new THREE.ConeGeometry(.085,.25,4),lapel,.085,topY+.13,.16);l2.rotation.z=.30;
    if(!isWoman)mesh(g,new THREE.CylinderGeometry(.018,.045,.25,12),mat(0x9b4050,.55),0,topY-.02,.174);
    ellipsoid(g,[.032,.026,.012],mat(0xe5edf4,.5),[.13,topY+.11,.157]);
    // Montura fina de gafas.
    for(const x of [-.057,.057]){
      const lens=mesh(g,new THREE.TorusGeometry(.035,.004,6,18),mat(0x344454,.35,.3),x,headY+.025,.171);lens.scale.set(1,.72,1);
    }
  }
  for(const side of [-1,1]){
    if(seated){
      // Postura de trabajo: brazos flexionados hacia delante y palmas apoyadas sobre el escritorio.
      const shoulder=[side*.205,topY+.18,.015],elbow=[side*.285,topY+.08,.40],wrist=[side*.30,topY-.035,.76];
      capsule(g,.073,shirt,shoulder,elbow);ellipsoid(g,[.074,.074,.074],shirt,elbow);
      capsule(g,.057,shirt,elbow,wrist);ellipsoid(g,[.074,.034,.058],skin,[...wrist]);
      for(let finger=0;finger<3;finger++)ellipsoid(g,[.018,.018,.045],skin,[wrist[0]+(finger-1)*.026,wrist[1]-.002,wrist[2]+.045]);
    }else{
      const shoulder=[side*.205,topY+.20,0],elbow=[side*.32,topY-.06,.015],wrist=[side*.34,topY-.30,.055];
      capsule(g,.075,shirt,shoulder,elbow);ellipsoid(g,[.076,.076,.076],shirt,elbow);
      capsule(g,.061,shirt,elbow,wrist);ellipsoid(g,[.067,.06,.07],skin,[...wrist]);
      ellipsoid(g,[.025,.035,.027],skin,[wrist[0]+side*.035,wrist[1]+.015,wrist[2]+.035]);
    }
  }
  if(isWoman&&!seated&&!isTeacher){const skirt=mesh(g,new THREE.CylinderGeometry(.15,.235,.30,24),mat(0x263d5c,.85),0,.55,0);skirt.scale.set(1,.95,1);}
  else ellipsoid(g,[.19,seated?.12:.17,.14],pants,[0,seated?.57:.79,0]);
  for(const side of [-1,1]){
    if(seated){
      const hip=[side*.105,.57,0],knee=[side*.11,.51,.32],ankle=[side*.11,.14,.34];
      capsule(g,.078,pants,hip,knee);ellipsoid(g,[.078,.075,.078],pants,knee);
      capsule(g,.066,pants,knee,ankle);ellipsoid(g,[.105,.055,.17],shoe,[side*.11,.08,.41]);
    }else{
      const hip=[side*.105,isWoman?.49:.66,0],knee=[side*.11,.31,.012],ankle=[side*.11,.105,.025];
      capsule(g,.075,pants,hip,knee);ellipsoid(g,[.078,.075,.078],pants,knee);
      capsule(g,.064,pants,knee,ankle);ellipsoid(g,[.095,.055,.16],shoe,[side*.11,.055,.095]);
    }
  }
  ellipsoid(g,[.035,.035,.008],mat(0xeaf4fa,.5),[.105,topY+.12,.137]);
  g.userData.kind=key;g.userData.seated=seated;g.userData.rig={animated:true};
  return g;
}
function createModel(key, seated=false) {
  const g=new THREE.Group();
  const deskTopY=.78;
  switch(key){
    case 'desk': {
      const deskMat=mat(appearance.deskColor,.48);
      const deskEdgeMat=mat(appearance.deskColor,.58);
      g.userData.primaryColorMaterial=deskMat;
      g.userData.secondaryColorMaterial=deskEdgeMat;
      // Escritorio con orientación local inequívoca: frente = +Z, posterior = -Z.
      // La huella es idéntica en todas las instancias: 158 x 72 cm.
      mesh(g,new RoundedBoxGeometry(DESK_LENGTH,.10,DESK_DEPTH,.035,4),deskMat,0,deskTopY,0);
      box(g,DESK_LENGTH+.025,.025,DESK_DEPTH+.02,deskEdgeMat,0,deskTopY-.065,0);
      // Canal posterior para cableado: identifica el lado donde va el monitor.
      box(g,.92,.012,.045,mat(0x343b43,.8),0,.837,-.315);
      // Zona de teclado marcada sobre la superficie (sin relieve molesto).
      box(g,.72,.004,.245,mat(0xc7b99e,.9),-.055,.833,.105);
      // Línea frontal discreta y redondeada visualmente mediante una moldura fina.
      box(g,1.34,.012,.018,mat(0x9b805e,.72),0,.837,.345);
      // Patas y travesaños simétricos para mantener una geometría consistente.
      for(const x of [-.70,.70]) for(const z of [-.27,.27]) box(g,.055,.72,.055,mats.metal,x,.36,z);
      box(g,1.28,.045,.035,mats.metal,0,.39,-.27);
      g.userData.deskOrientation={front:'+Z',rear:'-Z',standardLength:DESK_LENGTH,standardDepth:DESK_DEPTH};
      break;
    }
    case 'chair': {
      const chairMat=mat(appearance.chairColor,.78);
      g.userData.primaryColorMaterial=chairMat;
      box(g,.48,.12,.48,chairMat,0,.56,0);
      const back=box(g,.08,.56,.46,chairMat,-.20,.88,0);back.rotation.z=-.08;
      cylinder(g,.045,.045,.35,mats.metal,0,.28,0);
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const leg=box(g,.48,.04,.055,mats.metal,Math.cos(a)*.24,.09,Math.sin(a)*.24);leg.rotation.y=-a;cylinder(g,.055,.055,.07,chairMat,Math.cos(a)*.48,.055,Math.sin(a)*.48,12);}
      break;
    }
    case 'aio': {
      // All-in-One XL: pantalla ampliada para que se lea claramente en aulas amplias.
      // Huella visual aproximada: 0.88 x 0.50 m; base y soporte proporcionales.
      box(g,.92,.535,.072,mats.black,0,1.185,0);
      box(g,.892,.507,.009,mat(0x080d16,.35),0,1.188,.039);
      const screen=box(g,.868,.488,.008,mat(0x0c3155,.25),0,1.188,.046);
      const stand=box(g,.095,.275,.082,mat(0x9aa6b2,.38,.35),0,.91,-.008);
      // Base ancha, con apoyo metálico visible y centrado sobre la mesa.
      const base=box(g,.405,.032,.245,mat(0x788694,.42,.28),0,.845,.045);base.rotation.x=-.035;
      box(g,.355,.014,.205,mat(0xc2cbd3,.36,.25),0,.868,.045);
      // Pantalla personalizable: Windows 11, SENATI o pantalla neutra.
      const c=document.createElement('canvas');c.width=768;c.height=432;
      const ctx=c.getContext('2d');
      const drawScreen=(mode='windows11')=>{
        ctx.clearRect(0,0,768,432);
        if(mode==='windows11'){
          const gr=ctx.createLinearGradient(0,0,768,432);gr.addColorStop(0,'#061a49');gr.addColorStop(.55,'#0876bd');gr.addColorStop(1,'#46c5dc');ctx.fillStyle=gr;ctx.fillRect(0,0,768,432);
          ctx.fillStyle='rgba(255,255,255,.16)';ctx.beginPath();ctx.ellipse(405,200,250,130,-.35,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#fff';ctx.font='500 25px Segoe UI,Arial';ctx.fillText('12:45',34,48);ctx.font='18px Segoe UI,Arial';ctx.fillText('Lunes, 2 de noviembre',34,78);
          ctx.fillStyle='rgba(18,34,63,.82)';ctx.beginPath();ctx.roundRect(180,374,408,42,18);ctx.fill();
          // Icono Windows de cuatro paneles y campo Buscar, dibujados sin depender de fuentes instaladas.
          ctx.fillStyle='#f5fbff';ctx.fillRect(300,386,11,11);ctx.fillRect(314,386,11,11);ctx.fillRect(300,400,11,11);ctx.fillRect(314,400,11,11);
          ctx.fillStyle='#fff';ctx.font='bold 19px Segoe UI,Arial';ctx.fillText('Buscar',345,403);ctx.font='20px Arial';ctx.fillText('···',520,403);
        } else if(mode==='senati'){
          const gr=ctx.createLinearGradient(0,0,768,432);gr.addColorStop(0,'#08264b');gr.addColorStop(1,'#1265a5');ctx.fillStyle=gr;ctx.fillRect(0,0,768,432);
          // Emblema institucional estilizado junto al nombre; se dibuja en canvas para verse en el monitor.
          ctx.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3,x=384+Math.cos(a)*70,y=132+Math.sin(a)*70;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fillStyle='#ffffff';ctx.fill();
          ctx.fillStyle='#125b9b';ctx.font='900 92px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('S',384,132);
          ctx.fillStyle='#fff';ctx.font='bold 84px Arial';ctx.textBaseline='alphabetic';ctx.fillText('SENATI',384,286);ctx.fillStyle='#6bd2ed';ctx.fillRect(240,316,288,7);
          ctx.font='600 22px Arial';ctx.fillStyle='#d8efff';ctx.fillText('FORMACIÓN PROFESIONAL',384,357);ctx.textAlign='left';
        } else {ctx.fillStyle='#eef3f8';ctx.fillRect(0,0,768,432);ctx.fillStyle='#164b82';ctx.font='bold 48px Arial';ctx.textAlign='center';ctx.fillText('Pantalla de presentación',384,220);ctx.textAlign='left';}
      };
      drawScreen('windows11');
      const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
      const plane=mesh(g,new THREE.PlaneGeometry(.868,.488),new THREE.MeshBasicMaterial({map:tex}),0,1.188,.052);
      g.userData.screenCanvas=c;g.userData.screenTexture=tex;g.userData.drawScreen=drawScreen;g.userData.screenMode='windows11';
      break;
    }
    case 'keyboard': {
      box(g,.52,.026,.18,mats.black,0,.83,0);
      const keyMat=mat(0xd2d8df,.7);
      // Instancias: 56 teclas en una sola llamada de dibujo por teclado.
      const keys=new THREE.InstancedMesh(new THREE.BoxGeometry(.023,.008,.019),keyMat,56);
      const transform=new THREE.Object3D();let index=0;
      for(let r=0;r<4;r++)for(let i=0;i<14;i++){
        transform.position.set(-.245+i*.036,.849,-.062+r*.041);
        transform.updateMatrix();keys.setMatrixAt(index++,transform.matrix);
      }
      keys.instanceMatrix.needsUpdate=true;keys.castShadow=false;g.add(keys);
      break;
    }
    case 'mouse': {
      const m=mesh(g,new THREE.SphereGeometry(1,16,12),mats.black,0,.84,0);m.scale.set(.05,.027,.075);
      break;
    }
    case 'man': case 'woman': case 'man-senati': case 'woman-senati': case 'teacher': case 'teacher-f': {
      return createPerson(key, seated);
    }
    case 'wall': {
      const wallMat=mat(appearance.wallColor,.9);
      g.userData.primaryColorMaterial=wallMat;
      box(g,2.5,room.height,.16,wallMat,0,room.height/2,0);
      break;
    }
    case 'door': {
      const frame=mat(0x485a6d,.36,.55),handle=mat(0xc2ccd6,.24,.82);
      box(g,1.42,2.48,.085,frame,0,1.24,0);
      const pane=mesh(g,new THREE.BoxGeometry(1.28,2.34,.018),mats.glass,0,1.24,.052);pane.renderOrder=3;
      box(g,.035,2.34,.055,frame,-.62,1.24,.065);box(g,.035,2.34,.055,frame,.62,1.24,.065);
      box(g,1.26,.035,.055,frame,0,2.40,.065);box(g,1.26,.035,.055,frame,0,.08,.065);
      box(g,.025,2.28,.045,frame,0,1.24,.075);
      box(g,.035,.74,.075,handle,.47,1.18,.12);cylinder(g,.025,.025,.035,handle,.45,1.18,.15,16);
      box(g,1.30,.045,.07,handle,0,.035,.08);
      break;
    }
    case 'window': {
      const frame=mat(0x485a6d,.34,.58),seal=mat(0xe8eef4,.58);
      const pane=mesh(g,new THREE.BoxGeometry(2.08,1.35,.018),mats.glass,0,1.84,.04);pane.renderOrder=3;
      box(g,2.18,.055,.09,frame,0,2.53,0);box(g,2.18,.055,.09,frame,0,1.15,0);
      box(g,.055,1.42,.09,frame,-1.06,1.84,0);box(g,.055,1.42,.09,frame,1.06,1.84,0);
      box(g,.035,1.32,.07,frame,0,1.84,.045);
      box(g,2.08,.025,.055,seal,0,1.84,.065);
      break;
    }
    case 'safety-exit': case 'safety-rules': case 'safety-first-aid': case 'safety-electrical': case 'safety-safe-zone': case 'safety-evacuation': {
      const isExit=key==='safety-exit', isRules=key==='safety-rules';
      const presets={
        'safety-exit':{w:.82,h:.42,bg:'#087a45',fg:'#ffffff',title:'SALIDA'},
        'safety-rules':{w:1.02,h:.72,bg:'#f7f9fb',fg:'#17324d',title:'REGLAS DE SEGURIDAD'},
        'safety-first-aid':{w:.62,h:.52,bg:'#087a45',fg:'#ffffff',title:'BOTIQUÍN',symbol:'✚'},
        'safety-electrical':{w:.66,h:.58,bg:'#ffd22e',fg:'#1e293b',title:'RIESGO ELÉCTRICO',symbol:'⚡'},
        'safety-safe-zone':{w:.76,h:.58,bg:'#087a45',fg:'#ffffff',title:'ZONA SEGURA',symbol:'✚'},
        'safety-evacuation':{w:.82,h:.42,bg:'#087a45',fg:'#ffffff',title:'RUTA DE EVACUACIÓN',symbol:'➜'}
      };
      const p=presets[key];
      box(g,p.w,p.h,.055,mat(p.bg,.55),0,1.72,0);
      const c=document.createElement('canvas');c.width=640;c.height=420;const ctx=c.getContext('2d');
      ctx.fillStyle=p.bg;ctx.fillRect(0,0,640,420);ctx.strokeStyle=p.fg;ctx.lineWidth=13;ctx.strokeRect(8,8,624,404);
      ctx.fillStyle=p.fg;ctx.textAlign='center';
      if(isRules){
        ctx.font='bold 39px Arial';ctx.fillText(p.title,320,65);ctx.textAlign='left';ctx.font='bold 29px Arial';
        ['Mantén libre la salida','No bloquees los pasillos','Cuida cables y equipos','Sigue las indicaciones'].forEach((t,i)=>ctx.fillText('• '+t,35,135+i*66));
      } else if(isExit){
        // Rótulo de texto limpio, sin flecha; se coloca centrado sobre la puerta.
        ctx.font='bold 112px Arial';ctx.textBaseline='middle';ctx.fillText('SALIDA',320,220);ctx.textBaseline='alphabetic';
      } else {
        ctx.font=`bold ${key==='safety-evacuation'?47:58}px Arial`;ctx.fillText(p.title,320,key==='safety-electrical'?82:90);
        ctx.font='bold 190px Arial';ctx.fillText(p.symbol||'',320,300);
      }
      const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
      const plane=mesh(g,new THREE.PlaneGeometry(p.w-.025,p.h-.025),new THREE.MeshBasicMaterial({map:tex}),0,1.72,.031);plane.renderOrder=4;
      g.userData.safetySign=true;
      break;
    }
    case 'fire-extinguisher': {
      const red=mat(0xc62828,.42),dark=mat(0x283443,.5),metal=mat(0xaeb8c2,.32,.65);
      cylinder(g,.105,.12,.62,red,0,.40,0,24);
      cylinder(g,.105,.105,.045,mat(0x9f1d1d,.45),0,.72,0,24);
      cylinder(g,.035,.035,.09,metal,0,.79,0,16);
      const handle=box(g,.19,.035,.045,dark,.055,.84,0);handle.rotation.z=-.12;
      const hose=mesh(g,new THREE.TorusGeometry(.105,.012,8,24,Math.PI*1.35),dark,-.11,.70,.025);hose.rotation.z=Math.PI/2;
      box(g,.27,.035,.035,metal,0,.06,0);
      const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=128;const lc=labelCanvas.getContext('2d');
      lc.fillStyle='#fff';lc.fillRect(0,0,256,128);lc.fillStyle='#c62828';lc.font='bold 31px Arial';lc.textAlign='center';lc.fillText('EXTINTOR',128,49);lc.font='bold 23px Arial';lc.fillText('ABC',128,88);
      const labelTex=new THREE.CanvasTexture(labelCanvas);labelTex.colorSpace=THREE.SRGBColorSpace;
      mesh(g,new THREE.PlaneGeometry(.18,.09),new THREE.MeshBasicMaterial({map:labelTex}),0,.43,.122);
      g.userData.safetyEquipment=true;
      break;
    }
    case 'whiteboard': {
      box(g,2.4,1.25,.08,mats.metal,0,1.65,0);
      box(g,2.28,1.13,.035,mats.white,0,1.65,.05);
      break;
    }
    case 'fluorescent': {
      const frame=mat(0x64748b,.4,.45),emitter=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:2.3,roughness:.25});
      box(g,1.48,.065,.30,frame,0,room.height-.15,0);
      box(g,1.32,.025,.20,emitter,0,room.height-.105,0);
      const light=new THREE.PointLight(0xfff9ed,3.8,6.8,1.7);light.position.set(0,room.height-.28,0);light.castShadow=false;g.add(light);
      break;
    }
    case 'fan': {
      // Mounting plate, downrod and motor are fixed; blades share one centered rotor.
      const ceilingY=room.height-.08;
      cylinder(g,.24,.24,.055,mats.metal,0,ceilingY,0,32);
      cylinder(g,.045,.045,.34,mats.metal,0,room.height-.27,0,20);
      cylinder(g,.19,.19,.20,mat(0x66717d,.42,.45),0,room.height-.49,0,32);
      cylinder(g,.105,.105,.08,mat(0x9da8b3,.35,.5),0,room.height-.63,0,24);
      const rotor=new THREE.Group();
      rotor.position.y=room.height-.64;
      const bladeShape=new THREE.Shape();
      bladeShape.moveTo(-.085,.10);
      bladeShape.quadraticCurveTo(-.17,.42,-.105,.91);
      bladeShape.quadraticCurveTo(-.02,1.10,.105,1.02);
      bladeShape.quadraticCurveTo(.15,.60,.085,.10);
      bladeShape.closePath();
      const bladeGeo=new THREE.ExtrudeGeometry(bladeShape,{depth:.035,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.012,bevelThickness:.008});
      bladeGeo.rotateX(-Math.PI/2);
      const bladeMat=mat(0xe7ebef,.48,.18);
      for(let i=0;i<3;i++){
        const blade=mesh(rotor,bladeGeo,bladeMat,0,0,0);
        blade.rotation.y=i*Math.PI*2/3;
      }
      cylinder(rotor,.125,.125,.09,mat(0x7d8995,.35,.5),0,.035,0,24);
      g.add(rotor);
      g.userData.fanRotor=rotor;
      break;
    }
    case 'projector': {
      box(g,.48,.18,.42,mats.white,0,room.height-.22,0);
      cylinder(g,.08,.08,.07,mats.black,.23,room.height-.22,0,16).rotation.z=Math.PI/2;
      break;
    }
    case 'plant': {
      cylinder(g,.22,.27,.35,mat(0x9b6546,.85),0,.18,0);
      for(let i=0;i<7;i++){const leaf=mesh(g,new THREE.SphereGeometry(.13,12,8),mat(0x3d8158,.8),Math.cos(i)*.18,.55+Math.sin(i*1.3)*.18,Math.sin(i)*.18);leaf.scale.set(.65,1.5,.65);}
      break;
    }
  }
  return g;
}

  const model=createModel(key,seated);
  if(options.screenMode && model.userData.drawScreen){model.userData.drawScreen(options.screenMode);if(model.userData.screenTexture)model.userData.screenTexture.needsUpdate=true;model.userData.screenMode=options.screenMode;}
  return model;
}
