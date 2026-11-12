/**
 * Dirección Nacional SENATI – recreación exterior e interior ESQUEMÁTICO.
 * La envolvente exterior sigue las fotos y los recorridos aportados por el usuario.
 * NO representa planos arquitectónicos ni estructuras certificadas.
 * Las medidas están elegidas para una maqueta de demostración.
 */
import * as THREE from 'three';
import { buildCampusExterior } from './exterior-campus.js';
import {EV52_ROOMS, EV52_DOORS, EV52_ELEVATOR, EV52_STAIRWELLS, EV52_WALL_SEGMENTS, pyramidScale} from './ev52-layout.js';

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
function sideVolume(parent, name, xMin, xMax, profile, material) {
  const shape = new THREE.Shape();
  profile.forEach(([z, y], i) => i ? shape.lineTo(-z, y) : shape.moveTo(-z, y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {depth:xMax-xMin, bevelEnabled:false});
  geometry.rotateY(Math.PI / 2);
  geometry.translate(xMin, 0, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function drawSenatiMark(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = '#fff';
  // Contorno de la marca visible en la fotografía de referencia del proyecto.
  const outline = [[-.38,.193],[-.49,0],[-.234,-.428],[.255,-.428],[.345,-.255],
    [-.166,-.255],[-.276,-.069],[-.172,.117],[.097,.117],[.117,.08],[.083,.041],
    [-.131,.034],[-.186,-.069],[-.124,-.179],[.393,-.179],[.503,.021],[.262,.441],
    [-.241,.441],[-.334,.276],[.186,.276],[.29,.076],[.179,-.103],[-.069,-.103],
    [-.097,-.069],[-.076,-.028],[.138,-.028],[.207,.08],[.145,.193]];
  ctx.beginPath();
  outline.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function concreteGrain() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f0efec';
  ctx.fillRect(0,0,128,128);
  let seed = 812;
  const next = () => {
    seed = (Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  };
  for (let grain=0;grain<2100;grain++) {
    ctx.fillStyle = grain%3===0?'#ffffff60':'#60564c23';
    ctx.fillRect(next()*128,next()*128,1+next()*2,1+next()*2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3,3);
  return texture;
}

function signPanel(parent, {width, height, x, y, z, rotation=0, color, lines=[]}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = Math.min(1600, Math.max(140, Math.round(1600*height/width)));
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  if (color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.textBaseline = 'middle';
  if (lines.length) {
    const brandSize = h * .135;
    drawSenatiMark(ctx, w*.14, h*.16, brandSize);
    ctx.fillStyle = 'white';
    ctx.font = `800 ${brandSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('SENATI', w*.23, h*.16, w*.68);
    ctx.font = `600 ${h*.087}px Arial`;
    lines.forEach((line,i) => ctx.fillText(line,w*.095,h*(.35+.109*i),w*.83));
  } else {
    drawSenatiMark(ctx, w*.25, h*.5, h*.70);
    ctx.fillStyle = 'white';
    ctx.font = `900 ${h*.92}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('SENATI',w*.56,h*.51,w*.61);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({map:texture,transparent:!color,depthWrite:Boolean(color)});
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
  panel.position.set(x,y,z);
  panel.rotation.y = rotation;
  parent.add(panel);
  return panel;
}

function buildPyramidExterior({shell,envelope,structure,roof,width,depth,levelHeight,levels,front,back,walkBounds,facadeColor,signColor}) {
  const X = value => value * width / 56;
  const Z = value => value * depth / 38;
  const height = levelHeight * levels;
  const facadeWidth = width * (27.8 / 34);
  const centerX = X(1.15);
  const mainLeft = centerX - facadeWidth / 2;
  const mainRight = centerX + facadeWidth / 2;
  const concrete = standard(facadeColor,.91);
  const spandrel = standard(new THREE.Color(facadeColor).lerp(new THREE.Color('#d5d0c7'),.30),.87);
  concrete.map = spandrel.map = concreteGrain();
  const shadow = standard('#242c2e',.94);
  const trim = standard('#a8aba9',.56,.25);
  const aluminum = standard('#d4d9da',.40,.38);
  const white = standard('#e5e7e7',.74);
  const blue = standard(signColor,.65);
  const darkBlue = standard(new THREE.Color(signColor).multiplyScalar(.64),.70);
  const windowTones = ['#2d434d','#455860','#5b727b','#27333a'].map(color=>standard(color,.29,.13));
  const entryGlass = new THREE.MeshPhysicalMaterial({color:'#90aeb9',roughness:.18,metalness:.04,transparent:true,opacity:.49,depthWrite:false,side:THREE.DoubleSide});
  const frost = new THREE.MeshStandardMaterial({color:'#dce3e6',roughness:.57,transparent:true,opacity:.79});
  const obstacles = [];

  // Los ventanales de ambos lados largos se apoyan en franjas de concreto.
  // La envolvente retrocede en altura y los apoyos siguen esa inclinación.
  const outerFace = (side,y) => (side>0?front:back) + side*Z(.14+1.15*(1-y/height));
  box(envelope,facadeWidth,.48,depth-2.4,centerX,-.15,0,spandrel);
  for (const side of [1,-1]) {
    const wallSide = new THREE.Group();
    wallSide.name = side>0?'Fachada larga del jardín frontal':'Fachada larga del pasaje de talleres';
    shell.add(wallSide);
    const bays = 15;
    const bayWidth = facadeWidth / bays;
    for (let floor = 0; floor < levels; floor++) {
      const base = floor * levelHeight;
      const lowerBandY = base + levelHeight*.18;
      const windowY = base + levelHeight*.575;
      const windowHeight = levelHeight*.39;
      const upperBandY = base + levelHeight*.90;
      const windowZ = outerFace(side,windowY) - side*.12;
      box(wallSide,facadeWidth,levelHeight*.36,.38,centerX,lowerBandY,outerFace(side,lowerBandY),spandrel);
      box(wallSide,facadeWidth,levelHeight*.44+.04,.18,centerX,base+levelHeight*.58,windowZ-side*.10,shadow,false);
      box(wallSide,facadeWidth,levelHeight*.20,.35,centerX,upperBandY,outerFace(side,upperBandY),concrete);
      for (let bay=0;bay<bays;bay++) {
        const x = mainLeft + bayWidth*(bay+.5);
        const glazing = windowTones[(floor*3+bay*7+(side>0?0:2))%windowTones.length];
        box(wallSide,bayWidth-.085,windowHeight-.075,.055,x,windowY,windowZ+side*.035,glazing,false);
        box(wallSide,.045,windowHeight,.11,x+bayWidth/2-.025,windowY,windowZ+side*.08,trim,false);
        box(wallSide,bayWidth-.04,.055,.11,x,windowY+windowHeight*.26,windowZ+side*.08,trim,false);
        if ((bay+floor)%3===0) box(wallSide,.038,windowHeight*.74,.085,x,windowY-windowHeight*.11,windowZ+side*.075,trim,false);
      }
      for (const y of [windowY-windowHeight/2,windowY+windowHeight/2]) {
        box(wallSide,facadeWidth,.075,.23,centerX,y,windowZ+side*.06,trim,false);
      }
    }
    for (let rib=0;rib<=5;rib++) {
      const x = mainLeft + facadeWidth * rib / 5;
      const bottomZ = outerFace(side,0) + side*.36;
      const topZ = outerFace(side,height) + side*.24;
      const bottom = [bottomZ-.48,bottomZ+.48];
      const top = [topZ-.25,topZ+.25];
      sideVolume(structure,'Contrafuerte de concreto inclinado',x-X(.38),x+X(.38),
        [[bottom[0],0],[bottom[1],0],[top[1],height+.10],[top[0],height+.10]],concrete);
    }
    // Condensadoras visibles en el recorrido, colocadas en los tramos de ventanas.
    for (const [bay,floor] of [[1,1],[4,2],[8,1],[12,3]]) {
      if (floor>=levels) continue;
      const x = mainLeft+bayWidth*(bay+.33);
      const y = levelHeight*(floor+.55);
      const z = outerFace(side,y)+side*.29;
      box(wallSide,.88,.49,.35,x,y,z,white);
      const grille = new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.024,14),shadow);
      grille.rotation.x = Math.PI/2;
      grille.position.set(x-.13,y,z+side*.184);
      wallSide.add(grille);
      for (let line=0;line<4;line++) box(wallSide,.19,.018,.026,x+.22,y-.12+.08*line,z+side*.184,trim,false);
    }
    const roofZ = outerFace(side,height)+side*.13;
    const signWidth = facadeWidth*.97;
    const signHeight = Math.min(4.25,levelHeight*1.1);
    const signY = height+signHeight/2+.17;
    box(shell,signWidth,signHeight,.28,centerX,signY,roofZ,blue);
    signPanel(shell,{width:signWidth-.16,height:signHeight-.14,x:centerX,y:signY,z:roofZ+side*.151,
      rotation:side>0?0:Math.PI,color:signColor});
    for (let post=0;post<10;post++) {
      const x = centerX+(post/9-.5)*signWidth*.94;
      box(shell,.09,.27,.13,x,height+.14,roofZ,shadow);
      beam(shell,[x,height+.08,roofZ-side*1.2],[x,signY+.18,roofZ-side*.15],.028,shadow);
    }
    obstacles.push({x0:mainLeft,x1:mainRight,z0:Math.min(side>0?front:back,outerFace(side,0)),z1:Math.max(side>0?front:back,outerFace(side,0))});
  }

  // El extremo de la plaza tiene dos masas de concreto y un cuerpo central retirado.
  const entryX = walkBounds.left;
  const westX = entryX-X(4.6);
  const recessStart = Z(-3.25);
  const recessEnd = Z(10.6);
  const westSpan = recessEnd-recessStart;
  const westCenter = (recessStart+recessEnd)/2;
  const doorZ = Z(-.75);
  const halfWidth = Math.min(1.32,westSpan*.113);
  const doorHeight = Math.min(2.51,levelHeight*.83);
  const canopyY = levelHeight*1.29;
  const glassTop = canopyY-.29;
  const glassWidth = halfWidth*2+Math.min(.85,westSpan*.067);
  const glassStart = doorZ-glassWidth/2;
  const glassEnd = doorZ+glassWidth/2;
  const wallBack = outerFace(-1,0),wallFront = outerFace(1,0);
  const rearWing = [[wallBack,0],[recessStart,0],[recessStart,height+.21],[outerFace(-1,height),height+.21]];
  const frontWing = [[recessEnd,0],[wallFront,0],[outerFace(1,height),height+.78],[recessEnd,height+.78]];
  sideVolume(envelope,'Muro lateral de concreto junto a la entrada',westX,entryX+.10,rearWing,concrete);
  sideVolume(envelope,'Volumen inclinado a la derecha de la entrada',westX,entryX+.10,frontWing,concrete);
  obstacles.push({x0:westX,x1:entryX,z0:wallBack,z1:recessStart},{x0:westX,x1:entryX,z0:recessEnd,z1:wallFront});

  const fascia = new THREE.Group();
  fascia.name = 'Entrada principal · plaza lateral';
  fascia.position.set(entryX,0,doorZ);
  fascia.rotation.y = -Math.PI/2;
  shell.add(fascia);
  // Las dos hojas abren hacia la plaza. Las divisiones de aluminio continúan en el paño superior.
  const portal = new THREE.Group();
  portal.name = 'Puerta principal de vidrio de dos hojas';
  fascia.add(portal);
  const leaves = [];
  for (const side of [-1,1]) {
    const leaf = new THREE.Group();
    leaf.name = side<0?'Hoja izquierda':'Hoja derecha';
    leaf.position.x = side*halfWidth;
    portal.add(leaf);
    leaves.push(leaf);
    const center = -side*(halfWidth-.027)/2;
    const width = halfWidth-.035;
    box(leaf,width-.075,doorHeight-.11,.043,center,doorHeight/2,0,entryGlass,false);
    for (const edge of [-1,1]) box(leaf,.047,doorHeight,.071,center+edge*width/2,doorHeight/2,0,aluminum,false);
    for (const y of [.035,doorHeight-.025]) box(leaf,width,.054,.071,center,y,0,aluminum,false);
    box(leaf,width-.087,.29,.015,center,1.08,.027,frost,false);
    const handleX = -side*(halfWidth-.16);
    beam(leaf,[handleX,.93,.075],[handleX,1.30,.075],.018,aluminum);
    for (const y of [.96,1.27]) box(leaf,.028,.025,.063,handleX,y,.05,aluminum,false);
  }
  function setDoorOpen(open) {
    leaves[0].rotation.y = open ? -Math.PI*.49 : 0;
    leaves[1].rotation.y = open ? Math.PI*.49 : 0;
  }
  const margin = glassWidth/2-halfWidth;
  for (const side of [-1,1]) {
    box(portal,margin-.035,doorHeight,.049,side*(halfWidth+margin/2),doorHeight/2,0,entryGlass,false);
    box(portal,.063,glassTop,.094,side*glassWidth/2,glassTop/2,0,aluminum,false);
    box(portal,.061,doorHeight,.097,side*(halfWidth+.04),doorHeight/2,0,aluminum,false);
  }
  const transomHeight = glassTop-doorHeight;
  box(portal,glassWidth,transomHeight,.06,0,doorHeight+transomHeight/2,0,entryGlass,false);
  for (let col=1;col<4;col++) box(portal,.052,transomHeight,.10,-glassWidth/2+glassWidth*col/4,doorHeight+transomHeight/2,.01,aluminum,false);
  for (let row=0;row<=3;row++) box(portal,glassWidth,.055,.10,0,doorHeight+transomHeight*row/3,.01,aluminum,false);
  const entrySignHeight = Math.min(.53,transomHeight*.29);
  box(portal,2*halfWidth,entrySignHeight,.075,0,doorHeight+entrySignHeight/2+.09,.058,darkBlue);
  signPanel(portal,{width:2*halfWidth-.045,height:entrySignHeight-.03,x:0,y:doorHeight+entrySignHeight/2+.09,z:.099,color:signColor});

  const blueStart = glassEnd+.045;
  const blueSpan = recessEnd-blueStart;
  const slitCenter = blueStart+blueSpan*.53;
  const slitWidth = Math.min(.75,blueSpan*.13);
  const groundWallHeight = canopyY-.22;
  const slitBottom = groundWallHeight*.56;
  const ground = new THREE.Group();
  ground.name = 'Muro azul y directorio de escuelas';
  shell.add(ground);
  box(ground,.23,groundWallHeight,slitCenter-slitWidth/2-blueStart,entryX-.12,groundWallHeight/2,(blueStart+slitCenter-slitWidth/2)/2,blue);
  box(ground,.23,groundWallHeight,recessEnd-slitCenter-slitWidth/2,entryX-.12,groundWallHeight/2,(recessEnd+slitCenter+slitWidth/2)/2,blue);
  box(ground,.23,slitBottom,slitWidth,entryX-.12,slitBottom/2,slitCenter,blue);
  box(ground,.09,groundWallHeight-slitBottom,slitWidth,entryX+.02,(slitBottom+groundWallHeight)/2,slitCenter,shadow);
  box(ground,.28,groundWallHeight,glassStart-recessStart,entryX-.04,groundWallHeight/2,(glassStart+recessStart)/2,concrete);
  const directoryWidth = (slitCenter-slitWidth/2-blueStart)*.91;
  signPanel(ground,{width:directoryWidth,height:groundWallHeight*.69,x:entryX-.242,
    y:groundWallHeight*.60,z:blueStart+directoryWidth*.54,rotation:-Math.PI/2,
    lines:['› Escuela de Tecnologías','  de la Información','› Escuela de Confecciones','› Centro de Tecnologías']});

  const recessDepth = entryX-westX;
  const balcony = new THREE.Group();
  balcony.name = 'Vuelos, barandas y paños azules del lateral';
  envelope.add(balcony);
  const ledgeY = [canopyY,levelHeight*3.52,levelHeight*4.48];
  for (const y of ledgeY) {
    if (y>=height-.55) continue;
    box(balcony,recessDepth+.75,.63,westSpan,westX+(recessDepth-.75)/2,y,westCenter,concrete);
    box(balcony,recessDepth+.68,.10,westSpan,westX+(recessDepth-.68)/2,y-.36,westCenter,white);
    box(balcony,.31,.55,westSpan,westX-.57,y+.49,westCenter,concrete);
    const railingX = westX-.58;
    for (const railY of [y+.84,y+1.05]) beam(balcony,[railingX,railY,recessStart+.12],[railingX,railY,recessEnd-.12],.024,aluminum);
    for (let post=0;post<=8;post++) {
      const z = recessStart+.12+(westSpan-.24)*post/8;
      beam(balcony,[railingX,y+.75,z],[railingX,y+1.08,z],.027,aluminum);
    }
  }
  const upperPanelBottom = canopyY+.35;
  const upperPanelTop = Math.min(height-.55,levelHeight*3.52-.33);
  if (upperPanelTop>upperPanelBottom) {
    const middleGap = Math.min(.70,westSpan*.064);
    const panelWidth = (westSpan-middleGap)/2;
    for (const side of [-1,1]) box(balcony,.30,upperPanelTop-upperPanelBottom,panelWidth,entryX-.22,
      (upperPanelTop+upperPanelBottom)/2,westCenter+side*(middleGap+panelWidth)/2,blue);
    box(balcony,.09,upperPanelTop-upperPanelBottom,middleGap,entryX+.03,(upperPanelTop+upperPanelBottom)/2,westCenter,shadow);
  }
  box(balcony,.24,height-upperPanelTop,westSpan,entryX+.06,(height+upperPanelTop)/2,westCenter,concrete);
  for (const y of [levelHeight*4.02,levelHeight*4.94]) {
    if (y>=height-.65) continue;
    const count = 10;
    const paneWidth = westSpan/count;
    for (let i=0;i<count;i++) {
      const z = recessStart+(i+.5)*paneWidth;
      box(balcony,.085,.82,paneWidth-.032,entryX-.25,y,z,windowTones[i%windowTones.length],false);
      box(balcony,.12,.86,.035,entryX-.29,y,z+paneWidth/2,aluminum,false);
    }
  }
  const cantileverHeight = Math.min(2.8,levelHeight*.77);
  const cantileverY = height-cantileverHeight/2+.12;
  box(envelope,recessDepth+1.64,cantileverHeight,westSpan-.11,westX+(recessDepth-1.64)/2,cantileverY,westCenter,white);
  for (let seam=1;seam<13;seam++) box(envelope,.018,cantileverHeight-.07,.022,westX-1.65,cantileverY,recessStart+westSpan*seam/13,trim,false);

  // El extremo opuesto conserva el remate azul vertical y las ventanas estrechas.
  box(envelope,.43,height,front-back,mainRight+.11,height/2,(front+back)/2,concrete);
  box(envelope,1.21,height,2.65,mainRight+.67,height/2,front-1.20,darkBlue);
  for (let floor=1;floor<levels;floor++) {
    const y = levelHeight*(floor+.39);
    box(shell,.096,.83,2.2,mainRight+1.3,y,front-1.20,windowTones[floor%4],false);
    box(shell,.28,.23,2.64,mainRight+1.26,y+.59,front-1.20,white);
  }
  const roofLeft=westX-.13, roofRight=mainRight+1.35;
  box(roof,roofRight-roofLeft,.45,front-back+.35,(roofLeft+roofRight)/2,height+.15,(front+back)/2,spandrel);

  return {
    entry:{side:'left',x:entryX,z:doorZ,halfWidth,frontZ:front,approach:{x:westX-X(6.6),z:doorZ,yaw:-Math.PI/2}},
    entranceLayout:{westX,recessStart,recessEnd,blueStart,doorX:entryX,doorZ,halfWidth},
    rightBoundary: mainRight+1.3,
    obstacles,
    setDoorOpen,
  };
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
  const root=new THREE.Group();root.name='Dirección Nacional SENATI · V10: geometría a escala humana';parent.add(root);
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
  const shell=new THREE.Group();shell.name='Fachada';root.add(shell);
  const structure=new THREE.Group();structure.name='Soportes inclinados visibles';root.add(structure);
  const envelope=new THREE.Group();envelope.name='Muros envolventes';root.add(envelope);
  const interior=new THREE.Group();interior.name='Losas esquemáticas (no verificadas)';root.add(interior);
  const roof=new THREE.Group();roof.name='Azotea';root.add(roof);
  const environment=new THREE.Group();environment.name='Acceso y entorno referencial';root.add(environment);

  const blue=standard(signColor,.48);
  const glass=new THREE.MeshPhysicalMaterial({color:0x84bdd4,roughness:.16,metalness:.08,transparent:true,opacity:.63,depthWrite:false,side:THREE.DoubleSide});
  const H=levelHeight*levels;
  const floorBounds={left:X(-13.02*56/34),right:X(14.48*56/34),back:Z(-8.70*38/20),front:Z(8.70*38/20)};
  const front=Math.max(depth/2-2.2,floorBounds.front+.20);
  const back=Math.min(-depth/2+1.16,floorBounds.back-.20);
  const exterior=buildPyramidExterior({shell,envelope,structure,roof,width,depth,levelHeight,levels,
    front,back,walkBounds:floorBounds,facadeColor,signColor});

  // V10: un mismo replanteo para los seis pisos; pasillos despejados, núcleos sin
  // tabiques que los crucen, y superficies de paso en dimensiones proporcionales.
  const slab=standard(0xb3bac0,.85),railing=standard(0x506573,.58,.26);
  const stairMat=standard(0xe4e8eb,.63),roomWall=standard(0xf2f0ea,.88);
  const boardSurface=standard(0xf8fafb,.43),deskWood=standard(0x946c4a,.77);
  const mark=standard(0x477da7,.73),elevatorMetal=standard(0x53677b,.34,.62);
  const stairGroup=new THREE.Group();stairGroup.name='Dos escaleras · comunicación vertical';interior.add(stairGroup);
  const elevatorGroup=new THREE.Group();elevatorGroup.name='Ascensor didáctico · cabina y puertas';interior.add(elevatorGroup);
  const classroomDoors=[],floorWallBoxes=Array.from({length:levels},()=>[]);
  const wallThickness=.12,wallHeight=levelHeight-.17;
  const holes=[...stairsLayout.map(st=>({x0:st.xMin,x1:st.xMax,z0:st.zTop,z1:st.zBottom})),
    {x0:liftLayout.xMin,x1:liftLayout.xMax,z0:liftLayout.zTop,z1:liftLayout.zBottom}];
  // Cortar las losas, sin cubrir accidentalmente los huecos del elevador y escaleras.
  function makeSlab(y,withHoles){
    const xs=[floorBounds.left,floorBounds.right,...(withHoles?holes.flatMap(h=>[h.x0,h.x1]):[])].sort((a,b)=>a-b);
    const zs=[floorBounds.back,floorBounds.front,...(withHoles?holes.flatMap(h=>[h.z0,h.z1]):[])].sort((a,b)=>a-b);
    for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
      const x0=xs[i],x1=xs[i+1],z0=zs[j],z1=zs[j+1],cx=(x0+x1)/2,cz=(z0+z1)/2;
      if(withHoles&&holes.some(h=>cx>h.x0&&cx<h.x1&&cz>h.z0&&cz<h.z1))continue;
      if(x1-x0<.01||z1-z0<.01)continue;
      box(interior,x1-x0,.15,z1-z0,cx,y,(z0+z1)/2,slab,false);
    }
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
    makeSlab(base,f!==0);
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
    for(const door of doors)addDoor(floor,door,f,base);
    for(const r of rooms){
      const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2;
      placeFloorLabel(floor,`${f+1} · ${r.label}`,cx,cz,Math.min(2.8,r.x1-r.x0-.20),'#2e5680',base+.09);
      if(r.pcs){
        box(floor,Math.min(1.60,r.x1-r.x0-.22),.80,.07,cx,base+1.69,r.z0+.18,boardSurface,false);
        box(floor,1.05,.08,.56,cx,base+.78,r.z0+.75,deskWood);
      }
    }
    // Franja continua de circulación: ~3,23 m en la escala 56 × 38.
    box(floor,X(17.9*56/34),.018,Z(1.70*38/20),X(.40*56/34),base+.088,Z(-2.36*38/20),standard(0xb4d7ce,.95),false);
    placeFloorLabel(floor,'PASADIZO · 3,2 m APROX.',0,Z(-2.36*38/20),4.60,'#246a61',base+.108);
    placeFloorLabel(floor,f===0?'VESTÍBULO CENTRAL':'VESTÍBULO · PISO '+(f+1),0,.15,4.10,'#246a61',base+.055);
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

  const campus=buildCampusExterior(environment,{width,depth,signColor,
    entrance:exterior.entranceLayout,buildingObstacles:exterior.obstacles});
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
  return {root,roof,shell,envelope,interior,structure,environment,campus,
    footprint:{left:floorBounds.left,right:exterior.rightBoundary,back,front},classroomDoors,setClassroomDoorOpen,
    classroomBounds:corridorBounds,scaleX,scaleZ,width,depth,
    setDoorOpen:exterior.setDoorOpen,entry:exterior.entry,stairs:staircases[1],staircases,elevator,
    firstFloorWalls:floorWallBoxes[0],floorWallBoxes,firstFloorIsEV52:true,
    walkBounds:{left:floorBounds.left,right:floorBounds.right,back:floorBounds.back},
    setMode(nextMode,nextRoof){useMode({shell,envelope,roof,interior,mode:nextMode,roofVisible:nextRoof});}};
}
