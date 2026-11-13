/**
 * Dirección Nacional SENATI – recreación exterior e interior ESQUEMÁTICO.
 * Basado únicamente en dos fotografías aportadas por el usuario (2018 y otra vista).
 * NO representa planos arquitectónicos ni estructuras certificadas.
 * Las medidas están elegidas para una maqueta de demostración.
 */
import * as THREE from 'three';
import {carveSlab} from './atrium-geometry.js';
import {EV52_ROOMS, EV52_DOORS, EV52_ELEVATOR, EV52_STAIRWELLS, EV52_WALL_SEGMENTS, EV52_ATRIUM, pyramidScale} from './ev52-layout.js';

const standard = (c,r=.77,met=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:met});
function box(parent,w,h,d,x,y,z,material,casts=true){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.005,w),Math.max(.005,h),Math.max(.005,d)),material);
  mesh.position.set(x,y,z);mesh.castShadow=casts;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function beam(parent,a,b,r,material){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.87,r,delta.length(),10),material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  mesh.castShadow=true;parent.add(mesh);return mesh;
}
function signTexture(signColor='#1251cb'){
  const c=document.createElement('canvas');c.width=2800;c.height=350;
  const ctx=c.getContext('2d');ctx.fillStyle=signColor;ctx.fillRect(0,0,c.width,c.height);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='white';
  ctx.font='900 260px Arial, sans-serif';ctx.fillText('SENATI',1400,174);
  ctx.font='500 43px Arial, sans-serif';ctx.fillText('DIRECCIÓN NACIONAL · MAQUETA CONCEPTUAL',1400,315);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}
function useMode({shell,envelope,roof,interior,mode='exterior',roofVisible=false}){
  for(const group of [shell,envelope]) group.traverse(o=>{if(o.isMesh&&o.userData.originalMaterial){o.material=mode==='transparente'?o.userData.ghostMaterial:o.userData.originalMaterial;}});
  shell.visible=mode!=='estructura';
  envelope.visible=mode!=='estructura';
  interior.visible=mode!=='exterior';
  // El último piso tiene cubierta modelada; la opción Mostrar/Ocultar techo controla su visibilidad.
  roof.visible=Boolean(roofVisible)&&mode!=='estructura';
}

export function buildPiramideSENATI(parent,{width=56,depth=38,levelHeight=3.8,levels=6,mode='exterior',roofVisible=false,facadeColor='#afa59b',signColor='#1251cb'}={}){
  const root=new THREE.Group();root.name='Dirección Nacional SENATI · V11: atrio y tragaluz abiertos';parent.add(root);
  // V10: no estirar la escena, ya que Three.js también estira puertas, escaleras,
  // ventanales y carteles. Recalculamos las coordenadas físicas en metros.
  const {x:scaleX,z:scaleZ}=pyramidScale(width,depth);
  root.scale.set(1,1,1);
  const X=v=>v*scaleX, Z=v=>v*scaleZ;
  const rooms=EV52_ROOMS.map(r=>({...r,x0:X(r.x0),x1:X(r.x1),z0:Z(r.z0),z1:Z(r.z1)}));
  const doors=EV52_DOORS.map(d=>({...d,x:X(d.x),z:Z(d.z)}));
  const wallSegments=EV52_WALL_SEGMENTS.map(s=>({axis:s.axis,x0:X(s.x0),x1:X(s.x1),z0:Z(s.z0),z1:Z(s.z1)}));
  const stairsLayout=EV52_STAIRWELLS.map(st=>({...st,x:X(st.x),xMin:X(st.xMin),xMax:X(st.xMax),zTop:Z(st.zTop),zBottom:Z(st.zBottom)}));
  const liftLayout={...EV52_ELEVATOR,x:X(EV52_ELEVATOR.x),xMin:X(EV52_ELEVATOR.xMin),xMax:X(EV52_ELEVATOR.xMax),z:Z(EV52_ELEVATOR.z),zTop:Z(EV52_ELEVATOR.zTop),zBottom:Z(EV52_ELEVATOR.zBottom),accessZ:Z(EV52_ELEVATOR.accessZ)};
  const atrium={...EV52_ATRIUM,x0:X(EV52_ATRIUM.x0),x1:X(EV52_ATRIUM.x1),z0:Z(EV52_ATRIUM.z0),z1:Z(EV52_ATRIUM.z1)};
  const shell=new THREE.Group();shell.name='Fachada';root.add(shell);
  const structure=new THREE.Group();structure.name='Soportes inclinados visibles';root.add(structure);
  const envelope=new THREE.Group();envelope.name='Muros envolventes';root.add(envelope);
  const interior=new THREE.Group();interior.name='Losas con vacío central para tragaluz · plantas 2-6';root.add(interior);
  const roof=new THREE.Group();roof.name='Azotea';root.add(roof);
  const environment=new THREE.Group();environment.name='Acceso y entorno referencial';root.add(environment);

  const concrete=standard(facadeColor,.88),concreteLight=standard(new THREE.Color(facadeColor).lerp(new THREE.Color(0xffffff),.32),.82);
  const white=standard(0xecf0f1,.68),band=standard(0xf6f7f6,.65);
  const blue=standard(signColor,.48),deepBlue=standard(new THREE.Color(signColor).multiplyScalar(.64),.52);
  const dark=standard(0x35424c,.58,.2),metal=standard(0x576775,.38,.45);
  const glass=new THREE.MeshPhysicalMaterial({color:0x84bdd4,roughness:.16,metalness:.08,transparent:true,opacity:.63,depthWrite:false,side:THREE.DoubleSide});
  const ground=standard(0xa9b2a6,.97),paving=standard(0xd4d1c8,.9),grass=standard(0x698764,.98);
  const H=levelHeight*levels;
  const baseWidth=width,baseDepth=depth;
  const front=baseDepth/2-2.2;
  const centerX=1.15*scaleX;
  const facadeWidth=width*(27.8/34);
  const mainLeft=centerX-facadeWidth/2;
  const mainRight=centerX+facadeWidth/2;
  const towerX=mainLeft-3.3;

  // Terreno y volumen: paredes posteriores y laterales (sin asumir muros internos).
  box(envelope,facadeWidth,.48,baseDepth-2.4,centerX,-.15,0,concreteLight);
  // Acceso lateral al núcleo de la Escalera 1 (hueco en planta baja).
  box(envelope,.35,H-levelHeight,baseDepth-2.8,mainLeft,levelHeight+(H-levelHeight)/2,-.2,concrete);
  box(envelope,.35,levelHeight,7.0,mainLeft,levelHeight/2,-5.15,concrete);
  box(envelope,.35,levelHeight,5.2,mainLeft,levelHeight/2,5.20,concrete);
  box(envelope,.35,levelHeight-2.40,2.3,mainLeft,2.40+(levelHeight-2.40)/2,.9,concrete);
  box(envelope,.35,H,baseDepth-2.8,mainRight,H/2,-.2,concrete);
  box(envelope,facadeWidth,H,.28,centerX,H/2,-baseDepth/2+1.3,concreteLight);
  // Frente estriado por niveles: ventanales, parteluces y franjas horizontales.
  const bays=13;
  for(let floor=0;floor<levels;floor++){
    const base=floor*levelHeight;
    const glassY=base+1.78;
    if(floor===0){
      const doorLeft=-1.23, doorRight=1.23;
      box(shell,doorLeft-mainLeft,.70,.38,(mainLeft+doorLeft)/2,base+.50,front,concreteLight);
      box(shell,mainRight-doorRight,.70,.38,(doorRight+mainRight)/2,base+.50,front,concreteLight);
    }else box(shell,facadeWidth,.70,.38,centerX,base+.50,front,concreteLight);
    box(shell,facadeWidth,.30,.39,centerX,base+levelHeight-.25,front,band);
    for(let col=0;col<bays;col++){
      const bayW=facadeWidth/bays;
      const x=mainLeft+(col+.5)*bayW;
      if(floor>0 || Math.abs(x)>2.1) box(shell,bayW-.11,1.87,.095,x,glassY,front+.19,glass,false);
      box(shell,.055,1.97,.17,x+bayW/2-.045,glassY,front+.27,dark,false);
      box(shell,bayW-.12,.035,.14,x,glassY+.26,front+.27,dark,false);
      box(shell,bayW-.12,.025,.14,x,glassY-.35,front+.27,dark,false);
    }
    box(shell,facadeWidth,.24,.43,centerX,base+levelHeight-.66,front+.14,white);
  }
  // Volumen lateral macizo, huecos verticales y recessos azules, como en las fotos.
  box(envelope,5.3,H+.55,baseDepth-2.5,towerX,H/2+.20,-.22,concrete);
  box(shell,2.05,H*.35,.16,towerX-.15,H*.40,front+.17,deepBlue);
  for(let f=0;f<levels;f++){
    box(shell,.84,.39,.18,towerX+.15,(f+.5)*levelHeight,front+.24,dark,false);
  }
  box(envelope,4.75,1.55,2.7,towerX-1.2,H-.47,front+.65,white);
  // Contrafuertes inclinados de la fachada: elementos visibles en fotos, no cálculo estructural.
  for(const x of [mainLeft+2.0,mainLeft+facadeWidth*.30,mainLeft+facadeWidth*.62,mainRight-2.0]){
    beam(structure,[x-.65,1.0,front+1.65],[x+.40,H-.2,front+.22],.25,concreteLight);
    box(structure,.86,.42,1.35,x-.65,.22,front+1.65,concrete);
  }
  // Remate azul estrecho del frente: evita un bloque ciego sobredimensionado.
  box(envelope,1.08,H,2.65,mainRight+.76,H/2,front-1.05,blue);
  for(let f=1;f<levels;f++){
    box(shell,.095,.78,2.23,mainRight+1.37,(f+.35)*levelHeight,front-1.05,glass,false);
  }

  // V10: un mismo replanteo para los seis pisos; pasillos despejados, núcleos sin
  // tabiques que los crucen, y superficies de paso en dimensiones proporcionales.
  const slab=standard(0xb3bac0,.85),railing=standard(0x506573,.58,.26);
  const stairMat=standard(0xe4e8eb,.63),roomWall=standard(0xf2f0ea,.88);
  const boardSurface=standard(0xf8fafb,.43),deskWood=standard(0x946c4a,.77);
  const mark=standard(0x477da7,.73),elevatorMetal=standard(0x53677b,.34,.62);
  const atriumGroup=new THREE.Group();atriumGroup.name='ATRIO CENTRAL · hueco real entre pisos 2-6';interior.add(atriumGroup);
  const railingGlass=new THREE.MeshPhysicalMaterial({color:0x9bc8e2,metalness:.04,roughness:.23,transparent:true,opacity:.32,depthWrite:false,side:THREE.DoubleSide});
  const railingBlue=standard(0x1450a1,.44,.24);
  const skylightBorder=standard(0x4e6474,.5,.38);
  const coreConcrete=standard(0xabb6b8,.89);

  const stairGroup=new THREE.Group();stairGroup.name='Dos escaleras · comunicación vertical';interior.add(stairGroup);
  const elevatorGroup=new THREE.Group();elevatorGroup.name='Ascensor didáctico · cabina y puertas';interior.add(elevatorGroup);
  const classroomDoors=[],floorWallBoxes=Array.from({length:levels},()=>[]);
  const wallThickness=.12,wallHeight=levelHeight-.17;
  const floorBounds={left:X(-13.02*56/34),right:X(14.48*56/34),back:Z(-8.70*38/20),front:Z(8.70*38/20)};
  const holes=[...stairsLayout.map(st=>({x0:st.xMin,x1:st.xMax,z0:st.zTop,z1:st.zBottom})),
    {x0:liftLayout.xMin,x1:liftLayout.xMax,z0:liftLayout.zTop,z1:liftLayout.zBottom},atrium];
  // Cortar las losas, sin cubrir accidentalmente los huecos del elevador y escaleras.
  // Se cortan rectángulos de losa reales, no se ocultan con texturas.
  function makeSlab(y,withHoles,target=interior,thickness=.15,bounds=floorBounds,material=slab){
    // Solo se abre el patio de luz en la CUBIERTA. Los huecos de las
    // escaleras y del ascensor terminan debajo de cubierta, resguardados.
    const openings=withHoles?(target===roof?[atrium]:holes):[];
    for(const p of carveSlab(bounds,openings)){
      const w=p.right-p.left,d=p.front-p.back;
      box(target,w,thickness,d,(p.left+p.right)/2,y,(p.back+p.front)/2,material,false);
    }
  }
  // Antepechos/barandillas a 1.12 m en plantas 2-6. Las 4 aristas del
  // hueco se registran como colisiones para impedir que la cámara lo cruce.
  function addAtriumRailing(base,f){
    const {x0,x1,z0,z1}=atrium;
    const low=base+.09, top=low+1.14,mid=low+.61;
    const sides=[
      {x0,x1,z0:z0-.08,z1:z0+.08},
      {x0,x1,z0:z1-.08,z1:z1+.08},
      {x0:x0-.08,x1:x0+.08,z0,z1},
      {x0:x1-.08,x1:x1+.08,z0,z1}
    ];
    floorWallBoxes[f].push(...sides);
    for(const z of [z0,z1]){
      box(atriumGroup,x1-x0,.085,.10,(x0+x1)/2,top,z,railingBlue,false);
      box(atriumGroup,x1-x0,.075,.09,(x0+x1)/2,low+.16,z,railingBlue,false);
      box(atriumGroup,x1-x0,.83,.030,(x0+x1)/2,mid,z,railingGlass,false);
      for(let x=x0;x<x1+.001;x+=(x1-x0)/8)
        box(atriumGroup,.043,1.14,.055,x,low+.57,z,skylightBorder,false);
    }
    for(const x of [x0,x1]){
      box(atriumGroup,.10,.085,z1-z0,x,top,(z0+z1)/2,railingBlue,false);
      box(atriumGroup,.10,.075,z1-z0,x,low+.16,(z0+z1)/2,railingBlue,false);
      box(atriumGroup,.030,.83,z1-z0,x,mid,(z0+z1)/2,railingGlass,false);
      for(let z=z0;z<z1+.001;z+=(z1-z0)/4)
        box(atriumGroup,.055,1.14,.043,x,low+.57,z,skylightBorder,false);
    }
  }
  // Núcleo en el extremo opuesto del eje largo del atrio, según corrección del usuario.
  // La orientación y proporciones son interpretativas, no cotas del edificio real.
  const coreZ=(atrium.z0+atrium.z1)/2;
  const coreWidth=(atrium.z1-atrium.z0)*.80;
  const core={x0:atrium.x0+.20*scaleX,x1:atrium.x0+1.80*scaleX,
    z0:coreZ-coreWidth/2,z1:coreZ+coreWidth/2};
  const coreX=(core.x0+core.x1)/2,coreH=H-.35;
  const brownConcrete=standard(0x756a60,.94);
  const coreFace=core.x1+.035;
  box(atriumGroup,core.x1-core.x0,coreH,coreWidth,coreX,coreH/2,coreZ,brownConcrete,false);
  // Banda gris continua y rejillas visibles desde el vestíbulo.
  box(atriumGroup,.07,coreH,coreWidth*.32,coreFace,coreH/2,coreZ,coreConcrete,false);
  const ventFrame=standard(0xc7c9c5,.65),ventDark=standard(0x5b6465,.89);
  for(const y of [coreH*.29,coreH*.84]){
    box(atriumGroup,.025,.34,.43,core.x1+.082,y,coreZ,ventFrame,false);
    for(let i=0;i<7;i++)box(atriumGroup,.028,.017,.34,core.x1+.098,y-.112+i*.037,coreZ,ventDark,false);
  }
  for(let f=0;f<levels;f++){
    floorWallBoxes[f].push({...core,x1:core.x1+.115});
  }
  const wallX=(g,x,z0,z1,y,h=wallHeight)=>{
    if(z1-z0>.04)box(g,wallThickness,h,z1-z0,x,y+h/2,(z0+z1)/2,roomWall,false);
  };
  const wallZ=(g,z,x0,x1,y,h=wallHeight)=>{
    if(x1-x0>.04)box(g,x1-x0,h,wallThickness,(x0+x1)/2,y+h/2,z,roomWall,false);
  };
  function signCanvas(label,color='#24527a'){
    const c=document.createElement('canvas');c.width=1024;c.height=192;
    const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,c.width,c.height);
    g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='bold 79px Arial';g.fillText(label,512,96,996);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
  }
  function placeFloorLabel(g,label,x,z,w=2.7,color='#24527a',y=.06){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,.36),signCanvas(label,color));
    m.rotation.x=-Math.PI/2;m.position.set(x,y,z);g.add(m);
  }
  function addDoor(g,door,f,base){
    // Puerta de 1.40 × 2.40 m, independientemente de ancho y fondo globales.
    const pivot=new THREE.Group();pivot.position.set(door.x-.70,base,door.z);g.add(pivot);
    box(pivot,1.36,2.40,.052,.68,1.22,0,glass,false);
    box(pivot,.04,2.40,.07,1.34,1.22,0,elevatorMetal,false);
    classroomDoors.push({floor:f,id:door.id,label:door.label,
      x:door.x,z:door.z,side:'z',pivot,rotation:-Math.PI*.47,open:false,
      halfWidth:.72});
    wallZ(g,door.z,door.x-.72,door.x+.72,base+2.44,Math.max(.05,wallHeight-2.44));
  }
  for(let f=0;f<levels;f++){
    const base=f*levelHeight;
    makeSlab(base,f!==0); // Solo planta baja conserva el suelo en el atrio
    const floor=new THREE.Group();floor.name=`Planta ${f+1} · salas, pasillos, dos escaleras y ascensor`;interior.add(floor);
    for(const s of wallSegments){
      if(s.axis==='z')wallZ(floor,s.z0,s.x0,s.x1,base);
      else wallX(floor,s.x0,s.z0,s.z1,base);
      floorWallBoxes[f].push({
        x0:Math.min(s.x0,s.x1)-.11,x1:Math.max(s.x0,s.x1)+.11,
        z0:Math.min(s.z0,s.z1)-.11,z1:Math.max(s.z0,s.z1)+.11
      });
    }
    // El ascensor conserva su caja cerrada: no es atravesable caminando.
    const lf=liftLayout;
    floorWallBoxes[f].push(
      {x0:lf.xMin-.12,x1:lf.xMin+.12,z0:lf.zTop-.12,z1:lf.zBottom+.12},
      {x0:lf.xMax-.12,x1:lf.xMax+.12,z0:lf.zTop-.12,z1:lf.zBottom+.12},
      {x0:lf.xMin-.12,x1:lf.xMax+.12,z0:lf.zTop-.12,z1:lf.zTop+.12},
      {x0:lf.xMin-.12,x1:lf.xMax+.12,z0:lf.zBottom-.12,z1:lf.zBottom+.12}
    );
    if(f>0)addAtriumRailing(base,f);
    for(const door of doors)addDoor(floor,door,f,base);
    for(const r of rooms){
      const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2;
      placeFloorLabel(floor,`${f+1} · ${r.label}`,cx,cz,Math.min(2.8,r.x1-r.x0-.20),'#2e5680',base+.09);
      if(r.pcs){
        box(floor,Math.min(1.60,r.x1-r.x0-.22),.80,.07,cx,base+1.69,r.z0+.18,boardSurface,false);
        box(floor,1.05,.08,.56,cx,base+.78,r.z0+.75,deskWood);
      }
    }
    // Pasillo continuo por detrás del atrio, sin tapar el vacío.
    const corridorBack=rooms[0].z1+.18;
    const corridorFront=atrium.z0-.18;
    const corridorDepth=Math.max(.15,corridorFront-corridorBack);
    box(floor,atrium.x1-atrium.x0+5,.018,corridorDepth,(atrium.x0+atrium.x1)/2,base+.088,(corridorBack+corridorFront)/2,standard(0xb4d7ce,.95),false);
    placeFloorLabel(floor,'PASADIZO AL TRAGALUZ',atrium.x1+2.2,(corridorBack+corridorFront)/2,3.9,'#246a61',base+.108);
    if(f===0){
      box(floor,atrium.x1-atrium.x0,.024,atrium.z1-atrium.z0,(atrium.x0+atrium.x1)/2,base+.101,(atrium.z0+atrium.z1)/2,standard(0xd5d4cf,.88),false);
      placeFloorLabel(floor,'PATIO INTERIOR · PLANTA BAJA',(core.x1+atrium.x1)/2,.40,Math.min(5.0,atrium.x1-core.x1-.3),'#246a61',base+.131);
    }else{
      // El centro es un hueco: la etiqueta se coloca en suelo FIRME junto a la baranda.
      placeFloorLabel(floor,'ATRIO ABIERTO · PISO '+(f+1),atrium.x1+3.25,0,4.8,'#246a61',base+.108);
    }
    placeFloorLabel(floor,'ESCALERA A',stairsLayout[0].x,Z(2.7*38/20),2.40,'#475a70',base+.07);
    placeFloorLabel(floor,'ESCALERA B',stairsLayout[1].x,Z(2.7*38/20),2.40,'#475a70',base+.07);
    placeFloorLabel(floor,'ASCENSOR',liftLayout.x,liftLayout.accessZ+.20,1.85,'#126f7a',base+.075);
    // Letreros de llegada por nivel en el ascensor; las puertas son visuales.
    const label=new THREE.Mesh(new THREE.PlaneGeometry(1.65,.40),signCanvas(`ASCENSOR · ${f+1}`,'#125b71'));
    label.position.set(liftLayout.x,base+2.90,liftLayout.zBottom+.08);floor.add(label);
  }
  // Las dos escaleras tienen peldaños con alturas coherentes con cada nivel.
  for(const st of stairsLayout){
    const steps=21,stepZ=(st.zBottom-st.zTop)/steps;
    for(let f=0;f<levels-1;f++)for(let i=0;i<steps;i++){
      const rise=(i+1)*levelHeight/steps,z=st.zBottom-(i+.5)*stepZ;
      box(stairGroup,st.xMax-st.xMin-.16,.13,stepZ+.02,st.x,f*levelHeight+rise-.06,z,stairMat,false);
      if(i%4===0)for(const xx of [st.xMin+.10,st.xMax-.10])
        beam(stairGroup,[xx,f*levelHeight+rise+.06,z],[xx,f*levelHeight+rise+1.03,z],.019,railing);
    }
    for(let f=0;f<levels-1;f++)for(const xx of [st.xMin+.10,st.xMax-.10])
      beam(stairGroup,[xx,f*levelHeight+1.11,st.zBottom],[xx,(f+1)*levelHeight+1.11,st.zTop],.030,railing);
  }
  // Ascensor visible en las seis plantas; el recorrido permite escoger el piso
  // desde el área de acceso mediante la tecla E. No se simula una cabina real en movimiento.
  const lift=liftLayout;
  for(const x of [lift.xMin,lift.xMax])
    box(elevatorGroup,.11,H,lift.zBottom-lift.zTop,x,H/2,(lift.zBottom+lift.zTop)/2,elevatorMetal,false);
  box(elevatorGroup,lift.xMax-lift.xMin,H,.11,lift.x,H/2,lift.zTop,elevatorMetal,false);
  for(let f=0;f<levels;f++){
    const base=f*levelHeight;
    for(const x of [lift.x-.5,lift.x+.5])
      box(elevatorGroup,.96,2.48,.07,x,base+1.28,lift.zBottom,glass,false);
    box(elevatorGroup,lift.xMax-lift.xMin,.12,.08,lift.x,base+2.57,lift.zBottom,elevatorMetal,false);
    box(elevatorGroup,.14,.38,.10,lift.xMax+.12,base+1.35,lift.zBottom+.22,blue,false);
  }
  function setClassroomDoorOpen(floor,id,opened){
    const door=classroomDoors.find(o=>o.floor===floor&&o.id===id);
    if(!door)return false;
    door.open=Boolean(opened);door.pivot.rotation.y=door.open?door.rotation:0;return true;
  }
  const staircases=stairsLayout;
  const elevator=lift;
  const corridorBounds={left:X(-8.70*56/34),right:X(8.45*56/34),back:Z(-3.15*38/20),front:Z(2.30*38/20)};

  // La azotea conserva el vano real; solo se cubre con paños de vidrio y marcos.
  const roofBounds={left:centerX-1.7-(facadeWidth+6.8)/2,right:centerX-1.7+(facadeWidth+6.8)/2,back:-(baseDepth-2.1)/2-.10,front:(baseDepth-2.1)/2-.10};
  makeSlab(H+.15,true,roof,.45,roofBounds,concreteLight);
  for(const z of [atrium.z0,atrium.z1])
    box(roof,atrium.x1-atrium.x0+.32,.24,.17,(atrium.x0+atrium.x1)/2,H+.50,z,skylightBorder,false);
  for(const x of [atrium.x0,atrium.x1])
    box(roof,.17,.24,atrium.z1-atrium.z0+.32,x,H+.50,(atrium.z0+atrium.z1)/2,skylightBorder,false);
  const skyGlass=new THREE.MeshPhysicalMaterial({color:0xd9e8ed,transparent:true,
    opacity:.28,roughness:.23,depthWrite:false,side:THREE.DoubleSide});
  const aw=atrium.x1-atrium.x0,ad=atrium.z1-atrium.z0;
  const ax=(atrium.x0+atrium.x1)/2,az=(atrium.z0+atrium.z1)/2;
  const skylight=new THREE.Group();skylight.name='Tragaluz acristalado · retícula metálica';roof.add(skylight);
  const cols=8,rows=3;
  const paneW=aw/cols,paneD=ad/rows;
  for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
    box(skylight,Math.max(.005,paneW-.075),.035,Math.max(.005,paneD-.075),
      atrium.x0+(i+.5)*paneW,H+.52,atrium.z0+(j+.5)*paneD,skyGlass,false);
  }
  for(let i=1;i<cols;i++)box(skylight,.075,.11,ad,atrium.x0+i*paneW,H+.55,az,skylightBorder,false);
  for(let j=1;j<rows;j++)box(skylight,aw,.11,.075,ax,H+.55,atrium.z0+j*paneD,skylightBorder,false);
  const signY=H+2.02;
  const billboardWidth=Math.min(31,facadeWidth*.78);
  box(shell,billboardWidth,3.65,.30,centerX,signY,front+.20,blue);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(billboardWidth-.25,3.42),new THREE.MeshBasicMaterial({map:signTexture(signColor),side:THREE.DoubleSide}));
  sign.position.set(centerX,signY,front+.39);shell.add(sign);
  for(const x of [mainLeft+1,mainLeft+7,mainRight-6,mainRight-1])box(shell,.14,1.2,.17,x,H+.65,front+.17,metal);

  // Exterior referencia: marquesina de recepción, accesos y un tramo de reja.
  const canopyZ=front+4.7;
  box(environment,18.0,.30,5.9,4.0,3.75,canopyZ,blue);
  box(environment,18.25,.10,6.05,4.0,3.96,canopyZ,white);
  for(const x of [-3.9,2.0,7.7,12.1])box(environment,.13,3.7,.13,x,1.85,canopyZ+2.65,metal);
  // Portal principal con dos hojas: la tecla E acciona este acceso en el recorrido.
  const doorRoot=new THREE.Group();doorRoot.name='Entrada principal interactiva';environment.add(doorRoot);
  const entryZ=front+.37,entryFrame=standard(0x4b626c,.38,.46);
  box(doorRoot,.08,2.58,.12,-1.24,1.29,entryZ,entryFrame);
  box(doorRoot,.08,2.58,.12,1.24,1.29,entryZ,entryFrame);
  box(doorRoot,2.55,.10,.12,0,2.55,entryZ,entryFrame);
  const leafL=new THREE.Group();leafL.position.set(-1.20,0,entryZ);doorRoot.add(leafL);
  const leafR=new THREE.Group();leafR.position.set(1.20,0,entryZ);doorRoot.add(leafR);
  box(leafL,1.15,2.37,.045,.575,1.22,0,glass,false);
  box(leafR,1.15,2.37,.045,-.575,1.22,0,glass,false);
  for(const [g,sign] of [[leafL,1],[leafR,-1]]){
    box(g,.042,2.37,.055,sign*.575,1.22,0,metal,false);
    box(g,.04,.035,.09,sign*.95,1.10,.09,metal,false);
  }
  function setDoorOpen(open){leafL.rotation.y=open?-Math.PI*.48:0;leafR.rotation.y=open?Math.PI*.48:0;}
  setDoorOpen(false);
  for(let i=0;i<6;i++){
    const x=-3.2+i*2.7;
    if(Math.abs(x)>2.75) box(environment,2.57,3.1,.12,x,1.55,front+.29,glass,false);
    box(environment,.06,3.12,.16,x+1.28,1.55,front+.37,dark,false);
  }
  box(environment,baseWidth+8,.08,8,0,.005,baseDepth/2+4.3,paving,false);
  box(environment,baseWidth+7,.08,5,0,.025,baseDepth/2+11.1,grass,false);
  const fenceZ=baseDepth/2+7.8;
  for(let x=-baseWidth/2-3;x<baseWidth/2+3;x+=2.2)box(environment,.06,2.25,.06,x,1.20,fenceZ,dark,false);
  box(environment,baseWidth+6,.05,.05,0,.68,fenceZ,metal,false);
  box(environment,baseWidth+6,.05,.05,0,2.26,fenceZ,metal,false);
  box(environment,baseWidth+6,.48,.32,0,.30,fenceZ+.25,standard(0xd9a229,.78),false);

  // Materiales translúcidos propios de la envolvente para vista 'transparente'.
  // Se preserva el material base y así el modo exterior no pierde calidad.
  for(const layer of [shell,envelope]) layer.traverse(o=>{
    if(o.isMesh && o.material){
      if(o.position.y>H+.45)return; // El cartel SENATI permanece nítido incluso con la fachada transparente.
      o.userData.originalMaterial=o.material;
      const ghost=o.material.clone();ghost.transparent=true;ghost.opacity=.20;ghost.depthWrite=false;
      o.userData.ghostMaterial=ghost;
    }
  });
  useMode({shell,envelope,roof,interior,mode,roofVisible});
  return {root,roof,shell,envelope,interior,structure,environment,classroomDoors,setClassroomDoorOpen,
    classroomBounds:corridorBounds,scaleX,scaleZ,width,depth,atrium,atriumGroup,
    setDoorOpen,entry:{x:0,z:entryZ,frontZ:front},stairs:staircases[1],staircases,elevator,
    firstFloorWalls:floorWallBoxes[0],floorWallBoxes,firstFloorIsEV52:true,
    walkBounds:{left:floorBounds.left,right:floorBounds.right,back:floorBounds.back},
    setMode(nextMode,nextRoof){useMode({shell,envelope,roof,interior,mode:nextMode,roofVisible:nextRoof});}};
}
