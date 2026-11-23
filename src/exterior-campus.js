/** Entorno del recorrido de noviembre de 2026. Metros aproximados; no altera el edificio.
 * Planta del boceto: +Z inicio/final, -X zonas de seguridad, -Z talleres, +X plaza/rampas.
 * Las personas y vehículos son representaciones genéricas de los objetos visibles.
 */
import * as THREE from 'three';

export const EXTERIOR_INVENTORY = [
  ['1–2', '00:00–00:32', 'Calle, cruce peatonal, muro azul, escalinata amarilla, pasamanos y rampas'],
  ['3–4', '00:33–01:32', 'Plaza de las zonas de seguridad, entrada principal de vidrio, bancas, jardineras y carteles'],
  ['5', '01:33–02:57', 'Taller acristalado con persianas azules, camiones, conos, canaleta, césped, palmeras y gabinete contra incendios'],
  ['6', '03:00–03:41', 'Estacionamiento, autos y furgón, cruces, franjas amarillas y veredas adoquinadas'],
  ['6–7', '03:42–04:47', 'Escaleras grises, rampas en retorno, barandas, bancas, monolito rojizo y jardines'],
  ['7–1', '04:48–05:32', 'Sombra azul, jardín exterior, carretilla, bolsas verdes, poste rojo y seto con flores violetas']
];

const mat=(color,roughness=.83,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const clamp=THREE.MathUtils.clamp;

export function isDefaultEntrancePerson(object, depth) {
  const placement = {
    'man-senati': {x: -1.8, frontOffset: 3.5},
    'woman-senati': {x: 2, frontOffset: 3.1},
  }[object.catalog_key];
  if (!placement) return false;
  return Math.abs(Number(object.pos_x) - placement.x) < .03
    && Math.abs(Number(object.pos_y)) < .03
    && Math.abs(Number(object.pos_z) - (depth / 2 + placement.frontOffset)) < .03;
}

export function isOldFrontExitSign(object, depth) {
  return object.catalog_key==='safety-exit'
    && Math.abs(Number(object.pos_x))<.03
    && Math.abs(Number(object.pos_y))<.03
    && Math.abs(Number(object.pos_z)-(depth/2-1.5))<.03;
}

function slopeBlock(width, run, low, high, bottomLow, bottomHigh) {
  const x = width / 2;
  const z = run / 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -x, bottomHigh, -z,  x, bottomHigh, -z,
     x, bottomLow,   z, -x, bottomLow,   z,
    -x, high,       -z,  x, high,       -z,
     x, low,         z, -x, low,         z,
  ], 3));
  geometry.setIndex([
    4, 7, 6, 4, 6, 5,
    0, 1, 2, 0, 2, 3,
    3, 2, 6, 3, 6, 7,
    1, 0, 4, 1, 4, 5,
    0, 3, 7, 0, 7, 4,
    2, 1, 5, 2, 5, 6,
  ]);
  const block = geometry.toNonIndexed();
  block.computeVertexNormals();
  return block;
}

export function buildCampusExterior(parent,{width=56,depth=38,signColor='#1251cb',entrance,buildingObstacles=[]}={}){
  const root=new THREE.Group();root.name='Exterior · recorrido del video 1–7';parent.add(root);
  // Escalar coordenadas de implantación sin deformar mobiliario ni personas.
  const sx=width/56,sz=depth/38,X=v=>v*sx,Z=v=>v*sz;
  const collisions=[...buildingObstacles],surfaces=[],inventory=[];
  const M={blue:mat(signColor),white:mat('#ecece6'),concrete:mat('#aaa79e'),stone:mat('#6c706e'),yellow:mat('#d6ad59'),
    steel:mat('#adb7b9',.29,.75),black:mat('#232e34'),red:mat('#a53b34'),green:mat('#78a349'),grass:mat('#648c40'),
    foliage:mat('#34633d'),leaf:mat('#487a44'),trunk:mat('#75634d'),glass:mat('#253d42',.26,.3),orange:mat('#ed783a'),bag:mat('#40ac69'),violet:mat('#a29dc4'),lilac:mat('#c0badb')};
  const boxGeo=new THREE.BoxGeometry(1,1,1),leafGeo=new THREE.IcosahedronGeometry(1,1);
  function box(g,w,h,d,x,y,z,m,solid=false){
    const o=new THREE.Mesh(boxGeo,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.castShadow=h>.15;o.receiveShadow=true;g.add(o);
    if(solid){o.updateWorldMatrix(true,false);const b=new THREE.Box3().setFromObject(o);collisions.push({x0:b.min.x,x1:b.max.x,z0:b.min.z,z1:b.max.z});}return o;
  }
  function group(name,x=0,y=0,z=0){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);root.add(g);inventory.push(name);return g;}
  function beam(g,a,b,r=.035,m=M.steel){
    const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);
    const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),6),m);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());g.add(o);return o;
  }
  function texture(kind){
    const c=document.createElement('canvas');c.width=c.height=256;const t=c.getContext('2d');
    t.fillStyle=kind==='brick'?'#8d9290':kind==='grass'?'#6f9245':kind==='tile'?'#bcbeb9':'#b5b4ad';t.fillRect(0,0,256,256);
    // Semilla fija: el mismo entorno en cada carga.
    let seed=78;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<2400;i++){const a=rand();t.fillStyle=`rgba(${a>.5?'255,255,230':'40,48,30'},.09)`;t.fillRect(rand()*256,rand()*256,1+rand()*3,1+rand()*3);}
    t.strokeStyle=kind==='brick'?'#616a68':'#92948e';t.lineWidth=1;
    if(kind==='brick'){for(let y=-32;y<288;y+=32)for(let x=-64;x<288;x+=64){t.strokeRect(x+(y%64?32:0),y,64,32);}}
    else if(kind==='tile'){for(let i=0;i<4;i++)t.strokeRect(i*64,0,64,256);}
    else if(kind!=='grass'){t.strokeRect(0,0,256,256);}
    const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;tx.wrapS=tx.wrapT=THREE.RepeatWrapping;return tx;
  }
  const textures={brick:texture('brick'),concrete:texture('concrete'),grass:texture('grass'),tile:texture('tile')};
  const surfaceMaterials=new Map();
  function surface(name,x,z,w,d,y=0,kind='concrete'){
    x=X(x);z=Z(z);w=X(w);d=Z(d);
    const key=`${kind}:${w}:${d}`;
    if(!surfaceMaterials.has(key)){
      const tx=textures[kind].clone();
      const tileWidth=kind==='tile'?4:kind==='brick'?2:4;
      const tileDepth=kind==='tile'?1.18:tileWidth;
      tx.repeat.set(w/tileWidth,d/tileDepth);
      surfaceMaterials.set(key,new THREE.MeshStandardMaterial({map:tx,roughness:.97}));
    }
    // Separación subcentimétrica para evitar parpadeo en cruces de pavimentos.
    const o=box(root,w,.12,d,x,y-.06+(surfaces.length+1)*.00015,z,surfaceMaterials.get(key));o.name=name;
    surfaces.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,y});return o;
  }
  function board(g,text,w,h,x,y,z,color='#1251cb',rotation=0){
    const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');
    ctx.fillStyle=color;ctx.fillRect(0,0,1024,512);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
    const lines=text.split('\n');ctx.font=`bold ${lines.length>3?49:68}px Arial`;
    lines.forEach((l,i)=>ctx.fillText(l,512,256+(i-(lines.length-1)/2)*86,970));
    const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;
    const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tx,side:THREE.DoubleSide}));o.position.set(x,y,z);o.rotation.y=rotation;g.add(o);return o;
  }
  function rail(g,a,b){beam(g,[a[0],a[1]+1.0,a[2]],[b[0],b[1]+1.0,b[2]]);const n=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/1.8);for(let i=0;i<=n;i++){let k=i/n;const p=a.map((v,j)=>v+(b[j]-v)*k);beam(g,p,[p[0],p[1]+1,p[2]],.027);}}
  function stairs(name,x,z,w,run,low,high,rot=0,yellow=false){
    const g=group(name,X(x),0,Z(z));g.rotation.y=rot;
    const steps=8;for(let i=0;i<steps;i++){
      const h=(high-low)*(i+1)/steps;
      box(g,w,h,run/steps,0,low+h/2,run/2-(i+.5)*run/steps,yellow?M.yellow:M.stone);
      box(g,w,.022,.055,0,low+h+.012,run/2-i*run/steps-.04,M.steel);
    }
    for(const xx of [-w/2+.16,0,w/2-.16])rail(g,[xx,low,run/2],[xx,high,-run/2]);
    // Local run points from road (+Z) up to landing (-Z).
    surfaces.push({x0:X(x)-w/2,x1:X(x)+w/2,z0:Z(z)-run/2,z1:Z(z)+run/2,stairs:true,x:X(x),z:Z(z),rot,w,run,low,high});
  }
  function ramp(name, x, z, w, run, low, high, rot=0, baseY) {
    const g = group(name, X(x), 0, Z(z));
    g.rotation.y = rot;
    const deck = new THREE.Mesh(
      slopeBlock(w, run, low, high, baseY ?? low - .13, baseY ?? high - .13),
      M.concrete,
    );
    deck.name = 'Superficie de la rampa';
    deck.receiveShadow = true;
    g.add(deck);
    for (const side of [-1, 1]) {
      const xEdge = side * w / 2;
      const wall = new THREE.Mesh(
        slopeBlock(.16, run, low + .69, high + .69, low - .05, high - .05),
        side < 0 ? M.blue : M.white,
      );
      wall.position.x = xEdge;
      wall.castShadow = wall.receiveShadow = true;
      g.add(wall);
      rail(g, [xEdge, low, run / 2], [xEdge, high, -run / 2]);
      wall.updateWorldMatrix(true, false);
      const bounds = new THREE.Box3().setFromObject(wall);
      collisions.push({x0: bounds.min.x, x1: bounds.max.x, z0: bounds.min.z, z1: bounds.max.z});
    }
    if (baseY === undefined) {
      for (let offset = .18; offset < run; offset += .18) {
        const height = low + (high - low) * offset / run;
        box(g, w, .012, .018, 0, height + .012, run / 2 - offset, M.stone);
      }
    }
    surfaces.push({ramp:true, x:X(x), z:Z(z), rot, w, run, low, high});
  }
  function tree(x,z,y=0,palm=false,flower=false,height=palm?6.3:4.1){
    x=X(x);z=Z(z);const g=group(palm?'Palmera de tronco blanqueado':'Árbol de tronco blanqueado',x,y,z);
    const h=height, scale=palm?h/6.3:1;
    beam(g,[0,0,0],[.13*scale,h,0],palm?.21*scale:.15,M.trunk);
    beam(g,[0,0,0],[.025*scale,1.1*scale,0],palm?.22*scale:.16,M.white);
    if(palm){for(let i=0;i<9;i++){let a=i*Math.PI*2/9;const leaf=new THREE.Mesh(leafGeo,M.leaf);leaf.scale.set(.46*scale,.18*scale,2.1*scale);leaf.position.set(Math.sin(a)*1.2*scale,h-.25*scale,Math.cos(a)*1.2*scale);leaf.rotation.set(-.25,a,0);g.add(leaf);}}
    else{for(let i=0;i<5;i++){let a=i*2.4;beam(g,[.06,2.1,0],[Math.cos(a),h-.5,Math.sin(a)],.055,M.trunk);const o=new THREE.Mesh(leafGeo,i%2?M.foliage:M.leaf);o.scale.set(1.45,.9,1.35);o.position.set(Math.cos(a)*.65,h-.2+(i%2)*.35,Math.sin(a)*.65);o.castShadow=true;g.add(o);if(flower){const flowers=new THREE.Mesh(leafGeo,mat('#bc684c'));flowers.scale.set(.9,.18,.7);flowers.position.copy(o.position).add(new THREE.Vector3(0,.8,0));g.add(flowers);}}}
    collisions.push({x0:x-.25,x1:x+.25,z0:z-.25,z1:z+.25});return g;
  }
  function planter(x,z,w,d,y=0,hedge=false){
    const xx=X(x),zz=Z(z),ww=X(w),dd=Z(d);const g=group('Jardinera elevada · piedra y césped');
    box(g,ww,.45,dd,xx,y-.22,zz,M.stone,true);surface('Césped',x,z,w-.16,d-.16,y+.02,'grass');
    if(hedge){for(let i=0;i<Math.ceil(w/.9);i++){
      const xx=X(x-w/2+(i+.5)*w/Math.ceil(w/.9));const bush=new THREE.Mesh(leafGeo,M.foliage);bush.scale.set(.75,.9,.72);bush.position.set(xx,y+.8,zz);g.add(bush);
      for(let j=0;j<3;j++){const fl=new THREE.Mesh(leafGeo,j%2?M.violet:M.lilac);fl.scale.set(.10,.08,.10);fl.position.set(xx+.35*Math.cos(i+j*2),y+1+j*.15,zz+.6);g.add(fl);}
    }}return g;
  }
  function agave(x,z,y=0){const g=group('Agave',X(x),y,Z(z));for(let i=0;i<9;i++){const a=i*2.4;const o=new THREE.Mesh(new THREE.ConeGeometry(.11,.85,4),M.leaf);o.position.set(Math.cos(a)*.22,.32,Math.sin(a)*.22);o.rotation.set(Math.cos(a)*.5,0,Math.sin(a)*.5);g.add(o);}}
  function bench(x,z,rot=0){const g=group('Banca de granito oscuro',X(x),0,Z(z));g.rotation.y=rot;box(g,3.3,.16,.72,0,.47,0,M.black,true);for(const xx of [-1.2,1.2])box(g,.24,.4,.62,xx,.2,0,M.stone);}
  function pole(x,z,double=false){const g=group(double?'Farola doble':'Poste rojo con luminaria',X(x),-1.15,Z(z));box(g,.30,.30,.30,0,.15,0,M.red);beam(g,[0,0,0],[0,6,0],.065,double?M.steel:M.red);for(const s of double?[-1,1]:[1]){beam(g,[0,5.5,0],[s*.95,6.2,0],.045);box(g,.43,.09,.22,s*1.0,6.2,0,M.white);}}
  function cone(x,z,y=-1.15){const g=group('Cono naranja',X(x),y,Z(z));box(g,.45,.045,.45,0,.025,0,M.orange);const o=new THREE.Mesh(new THREE.ConeGeometry(.19,.67,10),M.orange);o.position.y=.36;g.add(o);const r=new THREE.Mesh(new THREE.CylinderGeometry(.10,.13,.11,10),M.white);r.position.y=.40;g.add(r);}
  function fence(name,x,z,len,rot=0,gate=false){const g=group(name,X(x),0,Z(z));g.rotation.y=rot;for(let xx=-len/2;xx<=len/2;xx+=gate?.20:.35)box(g,.035,2.45,.035,xx,1.23,0,M.black);for(const yy of [.2,1.2,2.4])box(g,len,.055,.065,0,yy,0,M.black);for(const xx of [-len/2,len/2])box(g,.12,2.65,.12,xx,1.32,0,M.black);if(gate)rail(g,[-len/2,0,0],[len/2,0,0]);}
  function vehicle(x,z,color='#d9dfe0',rot=0,truck=false,van=false){
    const g=group(truck?'Camión de prácticas':van?'Furgón estacionado':'Auto estacionado',X(x),-1.15,Z(z));g.rotation.y=rot;const paint=mat(color,.4,.25);
    box(g,1.85,.57,truck?5.8:4.1,0,.68,0,paint,true);box(g,1.67,van?1.55:.82,truck?1.7:van?3.4:2.25,0,van?1.7:1.28,truck?1.85:-.1,paint);
    box(g,1.52,.52,.035,0,van?1.95:1.48,truck?2.72:van?1.72:1.04,M.glass);
    for(const s of [-1,1]){box(g,.03,.49,truck?1.38:1.9,s*.85,1.45,truck?1.85:-.1,M.glass);for(const zz of [-1.36,1.36]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.18,12),M.black);wheel.rotation.z=Math.PI/2;wheel.position.set(s*.91,.36,zz);g.add(wheel);}box(g,.39,.15,.04,s*.55,.75,truck?2.93:2.07,M.white);}
    if(truck){box(g,1.88,.16,4.0,0,1.02,-.9,M.stone);for(const zz of [-2.7,-.9,.8])box(g,1.85,.43,.07,0,1.3,zz,M.white);}
  }
  // Viales a una cota inferior; todas las plataformas junto al edificio llegan a Y=0.
  surface('Suelo general',4,0,144,112,-1.30);
  surface('Calle del inicio y retorno',0,27,91,9,-1.15);
  surface('Pasaje entre talleres y pirámide',1,-25.2,92,6,-1.15);
  surface('Estacionamiento del extremo 6',49,0,27,69,-1.15);
  const plazaRight=entrance ? entrance.westX/sx : -29;
  surface('Plaza de las zonas de seguridad 3 y 4',(plazaRight-49)/2,0,plazaRight+49,46,0);
  surface('Vereda frontal adoquinada',0,21,59,4,0,'brick');
  surface('Plataforma del extremo 6–7',32,0,10,41,0,'brick');
  surface('Vereda junto a talleres',0,-30.1,88,2.2,-.96);
  surface('Jardín exterior del tramo 7',24,34,21,7,-1.0,'grass');
  surface('Vereda exterior del tramo 7',27,29.2,24,2.6,-.96,'brick');
  // Bordillos y franjas amarillas de la calle.
  for(const z of [22.4,31.6])box(root,X(87),.18,.16,0,-1.08,Z(z),M.yellow);
  for(const z of [-28.2,-22.2])box(root,X(89),.16,.14,0,-1.08,Z(z),M.yellow);
  const entry=group('Acceso 2 · muro azul y escalinata');
  const stairsX = -34.4;
  box(entry, X(26), 1.25, .25, X(-13.5), -.57, Z(22.5), M.blue, true);
  stairs('Escalinata amarilla del inicio', stairsX, 24.8, X(5.8), Z(3.6), -1.15, 0, 0, true);
  for (let i = 0; i < 8; i++) {
    box(root, X(.45), .012, Z(4.8), X(stairsX + i * .75 - 2.625), -1.135, Z(29), M.white);
  }

  // Rampa por el lado de la calle. La cota de la malla coincide con el recorrido.
  const rampTopX = -29;
  const rampBottomX = -18.8;
  const rampZ = 24.35;
  ramp('Rampa junto al acceso 2', (rampTopX + rampBottomX) / 2, rampZ,
    Z(2.2), X(rampBottomX - rampTopX), -1.15, 0, Math.PI / 2, -1.27);
  surface('Descanso inferior de la rampa frontal', rampBottomX + .9, rampZ, 1.8, 2.2, -1.15);
  box(entry, X(2.3), 1.03, Z(3.25), X(rampTopX - 1.15), -.635, Z(23.825), M.concrete);
  surface('Descanso superior de la rampa frontal', rampTopX - 1.15, 23.825, 2.3, 3.25, 0, 'brick');
  box(entry, X(2.3), .69, .16, X(rampTopX - 1.15), .345, Z(25.45), M.blue, true);

  // Zonas circulares a la izquierda del boceto: NO son árboles ni estanques.
  for(const z of [8,-8]){
    const g=group('Zona de seguridad circular',X(-39),.022,Z(z));
    const disk=new THREE.Mesh(new THREE.CircleGeometry(4.3,64),mat('#83b3a2'));disk.rotation.x=-Math.PI/2;g.add(disk);
    const ring=new THREE.Mesh(new THREE.RingGeometry(4.25,4.36,64),M.yellow);ring.rotation.x=-Math.PI/2;ring.position.y=.005;g.add(ring);
    const label=board(g,'ZONA\nDE\nSEGURIDAD',5.9,3.5,0,.012,0,'#83b3a2');label.rotation.x=-Math.PI/2;
  }
  for(const z of [12,-13]){
    const g=planter(-30.1,z,3.4,5.8,0);agave(-30.5,z-1);agave(-29.4,z+1);tree(-30,z,0);bench(-32.9,z,Math.PI/2);
    board(g,'SENATI\nEscuela de Tecnologías\nde la Información',1.6,3.2,X(-28.25),2,Z(z),'#147faa',-Math.PI/2);
  }
  if(entrance){
    const {westX,recessStart,recessEnd,blueStart,doorX,doorZ,halfWidth}=entrance;
    const atriumStart=X(-31.8);
    const atriumDepth=doorX-atriumStart;
    surface('Atrio de concreto de la entrada', (atriumStart+doorX)/(2*sx),(recessStart+recessEnd)/(2*sz),
      atriumDepth/sx,(recessEnd-recessStart)/sz,0,'concrete');
    const tilesLength=X(3.6);
    surface('Losetas grises bajo el pórtico',(doorX-tilesLength/2)/sx,doorZ/sz,
      tilesLength/sx,(2*halfWidth+.36)/sz,0,'tile');

    const posters=group('Carteles de la entrada lateral');
    board(posters,'SENATI\nTECNOLOGÍAS\nDE LA INFORMACIÓN',1.24,2.40,westX-.025,1.48,recessStart-Z(1.0),'#137ab7',-Math.PI/2);
    board(posters,'SENATI\nPROGRAMAS MODULARES\nDE CAPACITACIÓN',1.15,2.36,westX+X(.90),1.48,recessStart+.024,'#20a0bd');

    const threshold=group('Borde amarillo y rejilla frente al acceso');
    box(threshold,.065,.016,Z(2.55),doorX-X(2.5),.016,doorZ,M.yellow);
    const grilleX=westX-X(1.6);
    box(threshold,.58,.018,2*halfWidth+.17,grilleX,.014,doorZ,M.stone);
    for(let stripe=0;stripe<9;stripe++)box(threshold,.021,.008,2*halfWidth+.11,grilleX-.25+stripe*.062,.026,doorZ,M.black);

    const plantX=(doorX-X(1.2))/sx;
    const plantZ=(blueStart+(recessEnd-blueStart)*.57)/sz;
    planter(plantX,plantZ,1.25,2.3);
    tree(plantX,plantZ,0,true,false,2.68);
    agave(plantX-.25,plantZ+.72);
    bench((westX-X(.95))/sx,(blueStart+(recessEnd-blueStart)*.66)/sz,Math.PI/2);
  }
  // Caseta técnica y cafetería observadas frente a la plaza.
  const cafe=group('Cafetería y caseta técnica',X(-52),0,Z(3));box(cafe,5,3.5,10,0,1.75,0,M.white,true);box(cafe,5.3,.24,10.4,0,3.6,0,M.blue);box(cafe,.04,2.2,5.8,2.51,1.6,0,M.glass);board(cafe,'SENATI · CAFETERÍA',7,1.05,2.55,3,0,'#174b96',Math.PI/2);
  const tech=group('Caseta con puertas grises y avisos',X(-28.7),0,Z(16.2));box(tech,4.3,2.8,3.1,0,1.4,0,M.white);box(tech,4.5,.16,3.3,0,2.9,0,M.white);for(const zz of [-.8,.8]){box(tech,.04,2.25,1.3,-2.17,1.16,zz,M.stone);board(tech,'⚠\nRIESGO ELÉCTRICO',.9,.55,-2.20,1.9,zz,'#9b7625',-Math.PI/2);}
  const container=group('Contenedor gris de apoyo',X(-49),0,Z(-15));box(container,5.5,2.8,2.7,0,1.4,0,M.stone,true);for(let x=-2.65;x<2.7;x+=.25)box(container,.035,2.7,.04,x,1.4,1.37,M.concrete);
  board(root,'SENATI\nESCUELA DE TECNOLOGÍAS\nDE LA INFORMACIÓN',5,5.7,X(-46),3.4,Z(-18.8),'#168cbd');
  stairs('Escalones hacia el pasaje de talleres',-39,-24,5.5,3.8,-1.15,0,Math.PI);
  fence('Reja junto a los contenedores',-47,-20.5,10);
  fence('Portón abierto de paso al taller',-42,-19.9,4,Math.PI/2,true);
  fence('Portón abierto de paso al taller',-36,-20,4,Math.PI/2,true);
  // Pabellón longitudinal: acristalamiento oscuro, cuatro portones enrollables azules.
  const workshop=group('Taller longitudinal de vidrio y portones azules',0,-1.15,Z(-37));
  box(workshop,X(83),.9,Z(11),0,.45,0,M.white,true);box(workshop,X(83),4.9,Z(10.5),0,3.35,0,M.glass);box(workshop,X(85),.45,Z(12),0,6.0,0,M.stone);
  for(let x=-40;x<=40;x+=4)box(workshop,.10,5.2,.13,X(x),3.1,Z(5.3),M.black);
  for(const x of [-31,-20,12,27]){
    box(workshop,6,4.7,.14,X(x),3.0,Z(5.35),M.blue);
    for(let y=.9;y<5.3;y+=.14)box(workshop,5.94,.019,.04,X(x),y,Z(5.44),M.black);
    board(workshop,'TALLER',2.6,.45,X(x),5.6,Z(5.45));
  }
  for(const x of [-37,-5,31]){vehicle(x,-26.2,'#e5e7df',Math.PI/2,true);cone(x-3,-23.4);cone(x+3,-23.4);}
  fence('Vallado móvil naranja',-40,-25,4,Math.PI/2);for(const x of [-41,-40,-39,-38])cone(x,-25);
  // Jardines que recorren ambos lados largos del edificio.
  planter(0,-20,53,3.5,0);
  planter(0,19,50,2.4,0,true);
  for(const x of [-22,-12,0,12,23]){tree(x,-20,0,x===-22||x===12,x===0);if(x!==0)tree(x,19,0,x===12);}
  for(const x of [-19,-9,1,11,21])agave(x,-20,0);
  const fire=group('Gabinete rojo e hidrante',X(17),-1.15,Z(-22.15));box(fire,.7,1.45,.28,0,1.0,0,M.red,true);board(fire,'EXTINTOR\nINCENDIOS',.52,.7,0,1.25,.15,'#a72d26');for(const xx of [-.26,.26])box(fire,.05,.35,.06,xx,.18,0,M.red);
  beam(root,[X(24),0,Z(-18.8)],[X(24),3,Z(-18.8)],.075,M.red);beam(root,[X(24),.4,Z(-18.8)],[X(25),.4,Z(-18.8)],.075,M.red);
  // Canaletas y tapas de registro a lo largo de los viales.
  for(const z of [-28.1,23]){box(root,X(82),.02,.2,0,-1.132,Z(z),M.black);for(let x=-40;x<=40;x+=1)box(root,.05,.025,.23,X(x),-1.12,Z(z),M.steel);}
  for(const x of [-25,-8,10,26,40])for(const z of [-25.3,26.4])box(root,.75,.012,.75,X(x),-1.132,Z(z),M.stone);
  // Estacionamiento del extremo 6 y cruces peatonales.
  for(let i=0;i<10;i++){const z=-27+i*5.8;box(root,7,.012,.08,X(49),-1.135,Z(z),M.white);vehicle(49,z+2.7,['#d9dfdf','#333b42','#9b9b91','#e8e9e0'][i%4],-Math.PI/2,false,i===4);}
  for(let i=0;i<7;i++)box(root,5,.012,.45,X(39),-1.13,Z(-17+i*.8),M.white);
  for(let i=0;i<12;i++){const stripe=box(root,4,.012,.08,X(38),-1.13,Z(3+i*1.2),M.yellow);stripe.rotation.y=-.6;}
  for(const z of [-8,10]){const g=group('Zona de seguridad del estacionamiento',X(42),-1.13,Z(z));const o=new THREE.Mesh(new THREE.CircleGeometry(3.3,48),mat('#83b3a2'));o.rotation.x=-Math.PI/2;g.add(o);const text=board(g,'ZONA DE\nSEGURIDAD',4.5,1.8,0,.01,0,'#83b3a2');text.rotation.x=-Math.PI/2;}
  // Accesos del extremo 6–7: escaleras y rampa de dos tramos con descanso conectado.
  stairs('Escalinata gris del extremo 6',33,-20,5.3,3.8,-1.15,0,Math.PI);
  stairs('Escalinata gris del extremo 7',33,20.5,5.3,3.8,-1.15,0);
  ramp('Rampa accesible · tramo inferior',38.5,8,2.3,13,-1.15,-.58,0);
  ramp('Rampa accesible · tramo superior',35.6,8,2.3,13,-.58,0,Math.PI);
  surface('Descanso de retorno de rampa',37.05,1.0,5.3,2,-.58,'brick');
  surface('Descanso superior junto al edificio',31.4,15.1,6.2,3.0,0,'brick');
  surface('Descanso inferior de rampa',38.5,16.0,3.0,3.0,-1.15,'brick');
  planter(30,-11,6,10,0);planter(30,8,6,7,0);tree(30,-11,0,true);tree(30,8,0,true);tree(30,-5,0,false,true);
  for(const z of [-7,1,12])bench(29,z,Math.PI/2);
  const monument=group('Monolito rojizo con pedestal azul',X(30),0,Z(-1));box(monument,.9,.45,.9,0,.22,0,M.blue,true);box(monument,.65,2.05,.65,0,1.47,0,mat('#bc7259'));for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.TorusGeometry(.17,.025,5,12),M.trunk);m.position.set(0,.82+i*.43,.333);monument.add(m);}
  // Tramo final: cubierta de sombra, mantenimiento de jardines y bolsas verdes del video.
  const shade=group('Toldo azul del jardín exterior',X(37),-1.15,Z(39));box(shade,15,.12,6,0,3,0,mat('#478e9f'));for(const xx of [-7,0,7])for(const zz of [-2.8,2.8]){beam(shade,[xx,0,zz],[xx,3,zz],.055,M.black);box(shade,.4,.25,.4,xx,.12,zz,M.yellow);}
  for(const x of [16,24,33])tree(x,34,-1,false);for(const x of [17,23,30])agave(x,34,-.95);
  const gardening=group('Mantenimiento de jardines · bolsas y carretilla');
  for(let i=0;i<13;i++){const bag=new THREE.Mesh(leafGeo,M.bag);bag.scale.set(.35+(i%3)*.05,.32,.30);bag.position.set(X(15+i*1.38),-.65,Z(32.4+(i%2)*2.7));gardening.add(bag);const tie=new THREE.Mesh(new THREE.ConeGeometry(.10,.15,5),M.bag);tie.position.copy(bag.position).add(new THREE.Vector3(0,.35,0));gardening.add(tie);}
  const cart=group('Carretilla de jardinería',X(17),-1.05,Z(29));box(cart,1.3,.15,.85,0,.35,0,M.trunk);for(const xx of [-.5,.5]){beam(cart,[xx,.1,0],[xx,1.0,-.7],.028,M.black);const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.08,10),M.black);wheel.rotation.z=Math.PI/2;wheel.position.set(xx,.16,.3);cart.add(wheel);}for(let i=0;i<3;i++)box(cart,.25,.4,.25,-.4+i*.38,.64,0,[M.red,M.yellow,M.green][i]);
  // Equipamiento menor en ambos frentes.
  for(const x of [-25,-7,15,31]){pole(x,23);pole(x,-22.2);}pole(42,-20,true);pole(-44,22,true);
  for(const z of [-14,12]){const g=group('Papelera exterior',X(-32),0,Z(z));box(g,.48,.82,.48,0,.41,0,M.black);}
  const sign=group('Señal de salida y punto de reunión',X(37),-1.15,Z(-25));beam(sign,[0,0,0],[0,3,0],.045);board(sign,'SALIDA →',1.8,.65,0,2.6,0,'#28734f');
  // Edificios colindantes vistos al fondo, sin añadir interiores ajenos al encargo.
  const neighbor=group('Pabellón colindante blanco y rojo',0,-1.15,Z(-53));box(neighbor,X(100),7,5,0,3.5,0,M.white);for(let i=0;i<24;i++)box(neighbor,3,1.1,.04,X(-46+i*4),2+(i%3)*1.6,2.53,i%3===0?M.red:M.stone);
  const south=group('Pabellón colindante del inicio',0,-1.15,Z(46));box(south,48,6,8,-6,3,0,M.white);for(let i=0;i<11;i++)box(south,2.8,1.4,.06,-27+i*4,4.2,-4.04,M.glass);

  const bounds={left:X(-56),right:X(65),back:Z(-44),front:Z(43)};
  const route=[{n:1,x:X(stairsX),z:Z(29),time:'00:00'},{n:2,x:X(stairsX),z:Z(21),time:'00:24'},{n:3,x:X(-39),z:Z(8),time:'00:51'},{n:4,x:X(-39),z:Z(-8),time:'01:12'},{n:5,x:X(0),z:Z(-25),time:'02:03'},{n:6,x:X(42),z:Z(-21),time:'03:18'},{n:7,x:X(33),z:Z(29),time:'04:54'}];
  function localAt(s,x,z){const dx=x-s.x,dz=z-s.z;return {x:Math.cos(s.rot)*dx-Math.sin(s.rot)*dz,z:Math.sin(s.rot)*dx+Math.cos(s.rot)*dz};}
  function heightAt(x,z){
    // Ramps/stairs have precedence over adjacent flat decks.
    for(const s of surfaces.filter(s=>s.ramp||s.stairs)){const p=localAt(s,x,z);if(Math.abs(p.x)<=s.w/2+.025&&Math.abs(p.z)<=s.run/2+.025)return s.low+(s.high-s.low)*clamp((s.run/2-p.z)/s.run,0,1);}
    let y=-1.15;for(const s of surfaces){if(s.ramp||s.stairs)continue;if(x>=s.x0&&x<=s.x1&&z>=s.z0&&z<=s.z1)y=Math.max(y,s.y);}return y;
  }
  function canWalk(from,to,radius=.18){
    const {x,z}=to;
    if(x<bounds.left+radius||x>bounds.right-radius||z<bounds.back+radius||z>bounds.front-radius)return false;
    if(collisions.some(b=>x>b.x0-radius&&x<b.x1+radius&&z>b.z0-radius&&z<b.z1+radius))return false;
    return Math.abs(heightAt(x,z)-heightAt(from.x,from.z))<=.30;
  }
  // Instancias para el mobiliario estático repetido: evita miles de draw calls.
  const batches=new Map();root.updateWorldMatrix(true,true);
  const inv=root.matrixWorld.clone().invert();
  root.traverse(o=>{
    if(!o.isMesh||!o.geometry.parameters||o.material.map||Array.isArray(o.material))return;
    const key=JSON.stringify(o.geometry.parameters)+'/'+o.geometry.type+'/'+o.material.uuid;
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
  });
  for(const meshes of batches.values()){
    if(meshes.length<3)continue;
    const first=meshes[0],batch=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
    batch.name='Mobiliario exterior repetido';batch.castShadow=meshes.some(o=>o.castShadow);batch.receiveShadow=true;
    meshes.forEach((o,i)=>{batch.setMatrixAt(i,inv.clone().multiply(o.matrixWorld));o.removeFromParent();});
    batch.instanceMatrix.needsUpdate=true;root.add(batch);
  }
  return {root,bounds,route,collisions,heightAt,canWalk,inventory};
}
