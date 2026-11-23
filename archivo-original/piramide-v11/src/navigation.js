// Grid-based 2D navigation for the classroom evacuation simulator.
// The grid is intentionally conservative: people keep a safety radius from furniture.
class MinHeap {
  constructor(){ this.items=[]; }
  get size(){ return this.items.length; }
  push(node){
    const a=this.items; a.push(node); let i=a.length-1;
    while(i>0){const p=(i-1)>>1;if(a[p].f<=node.f)break;a[i]=a[p];i=p;}
    a[i]=node;
  }
  pop(){
    const a=this.items;if(!a.length)return null;
    const root=a[0],last=a.pop();
    if(a.length){let i=0;while(true){let l=i*2+1,r=l+1;if(l>=a.length)break;let c=r<a.length&&a[r].f<a[l].f?r:l;if(a[c].f>=last.f)break;a[i]=a[c];i=c;}a[i]=last;}
    return root;
  }
}

const sizeFor = (key) => {
  switch(key){
    case 'desk': return [1.58,.72,.07];
    case 'chair': return [.52,.52,.04];
    case 'plant': return [.62,.62,.06];
    case 'wall': return [2.5,.16,.08];
    case 'fire-extinguisher': return [.28,.28,.04];
    case 'fire-hazard': return [1.65,1.65,.18];
    case 'accident-hazard': return [1.75,1.55,.12];
    case 'electrical-hazard': return [1.35,1.35,.1];
        default: return null;
  }
};

function obstacleFromObject(o){
  const key=o.catalog_key||o.catalogKey||'';
  const size=sizeFor(key);
  if(!size)return null;
  const sx=Math.max(.1,Number(o.scale_x??o.scale?.x??1)||1);
  const sz=Math.max(.1,Number(o.scale_z??o.scale?.z??1)||1);
  return {
    key,
    x:Number(o.pos_x??o.position?.x)||0,
    z:Number(o.pos_z??o.position?.z)||0,
    angle:Number(o.rot_y??o.rotation?.y)||0,
    halfW:size[0]*sx/2,
    halfD:size[1]*sz/2,
    pad:size[2]
  };
}

export class NavigationGrid {
  constructor(width,depth,objects=[],options={}){
    this.width=width; this.depth=depth;
    this.cellSize=options.cellSize||.10;
    this.radius=options.radius||.31;
    this.minX=-width/2+.34; this.maxX=width/2-.34;
    this.minZ=-depth/2+.34; this.maxZ=depth/2-.34;
    this.cols=Math.max(2,Math.floor((this.maxX-this.minX)/this.cellSize)+1);
    this.rows=Math.max(2,Math.floor((this.maxZ-this.minZ)/this.cellSize)+1);
    this.blocked=new Uint8Array(this.cols*this.rows);
    this.chairMask=new Int16Array(this.cols*this.rows);
    this.chairs=[];
    this.obstacles=objects.map(obstacleFromObject).filter(Boolean);
    this.cellPoints=new Array(this.cols*this.rows);
    for(let z=0;z<this.rows;z++)for(let x=0;x<this.cols;x++){
      const wx=this.minX+x*this.cellSize,wz=this.minZ+z*this.cellSize;
      const index=this.index(x,z);
      this.cellPoints[index]={x:wx,z:wz};
      for(const o of this.obstacles){
        if(!this.insideObstacle(wx,wz,o,this.radius))continue;
        if(o.key==='chair'){
          let chairId=this.chairs.findIndex(c=>c.x===o.x&&c.z===o.z)+1;
          if(!chairId){this.chairs.push({x:o.x,z:o.z});chairId=this.chairs.length;}
          this.chairMask[index]=chairId;
        }else{this.blocked[index]=1;break;}
      }
    }
  }
  index(x,z){return z*this.cols+x;}
  coords(index){return {x:index%this.cols,z:Math.floor(index/this.cols)};}
  worldToCell(x,z){
    return {x:Math.round((x-this.minX)/this.cellSize),z:Math.round((z-this.minZ)/this.cellSize)};
  }
  insideBounds(x,z){return x>=0&&z>=0&&x<this.cols&&z<this.rows;}
  isCellFree(x,z,ignoreChairId=0){
    if(!this.insideBounds(x,z))return false;
    const index=this.index(x,z);
    return this.blocked[index]===0&&(this.chairMask[index]===0||this.chairMask[index]===ignoreChairId);
  }
  isWalkable(x,z,ignoreChairId=0){
    const c=this.worldToCell(x,z);
    return this.isCellFree(c.x,c.z,ignoreChairId);
  }
  chairForStart(point){
    let best=0,bestD=.55*.55;
    this.chairs.forEach((c,i)=>{const d=(point.x-c.x)**2+(point.z-c.z)**2;if(d<bestD){bestD=d;best=i+1;}});
    return best;
  }
  isInExitCorridor(x,z,exitInfo){
    if(!exitInfo)return false;
    const dx=x-exitInfo.center.x,dz=z-exitInfo.center.z;
    const along=dx*exitInfo.normal.x+dz*exitInfo.normal.z;
    const across=dx*exitInfo.tangent.x+dz*exitInfo.tangent.z;
    return along>=-.78&&along<=1.65&&Math.abs(across)<=(exitInfo.usableHalfWidth??.34);
  }
  canOccupy(x,z,exitInfo,ignoreChairId=0){
    return this.isWalkable(x,z,ignoreChairId)||this.isInExitCorridor(x,z,exitInfo);
  }
  // Lets a seated participant move from a slightly overlapping starting pose
  // to the nearest valid floor cell, but never move farther into an obstacle.
  canEscape(current,candidate,escapeTarget,exitInfo,ignoreChairId=0){
    if(this.canOccupy(current.x,current.z,exitInfo,ignoreChairId))return false;
    if(!this.canOccupy(candidate.x,candidate.z,exitInfo,ignoreChairId)){
      const before=Math.hypot(current.x-escapeTarget.x,current.z-escapeTarget.z);
      const after=Math.hypot(candidate.x-escapeTarget.x,candidate.z-escapeTarget.z);
      return after<before-.0005;
    }
    return true;
  }
  insideObstacle(x,z,o,radius){
    const dx=x-o.x,dz=z-o.z,c=Math.cos(o.angle),s=Math.sin(o.angle);
    const lx=dx*c-dz*s,lz=dx*s+dz*c;
    return Math.abs(lx)<=o.halfW+radius+o.pad&&Math.abs(lz)<=o.halfD+radius+o.pad;
  }
  nearestFree(point,maxRadius=1.5,ignoreChairId=0){
    const start=this.worldToCell(point.x,point.z);
    if(this.isCellFree(start.x,start.z,ignoreChairId))return this.index(start.x,start.z);
    const maxCells=Math.ceil(maxRadius/this.cellSize);
    for(let r=1;r<=maxCells;r++){
      let best=-1,bestDist=Infinity;
      for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;
        const x=start.x+dx,z=start.z+dz;if(!this.isCellFree(x,z,ignoreChairId))continue;
        const p=this.cellPoints[this.index(x,z)];
        const dist=(p.x-point.x)**2+(p.z-point.z)**2;
        if(dist<bestDist){bestDist=dist;best=this.index(x,z);}
      }
      if(best>=0)return best;
    }
    return -1;
  }
  heuristic(a,b){
    const A=this.coords(a),B=this.coords(b),dx=Math.abs(A.x-B.x),dz=Math.abs(A.z-B.z);
    return (Math.max(dx,dz)+(Math.SQRT2-1)*Math.min(dx,dz))*this.cellSize;
  }
  lineClear(a,b,ignoreChairId=0){
    const dx=b.x-a.x,dz=b.z-a.z;
    const distance=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(distance/(this.cellSize*.45)));
    for(let i=1;i<steps;i++){
      const t=i/steps;if(!this.isWalkable(a.x+dx*t,a.z+dz*t,ignoreChairId))return false;
    }
    return true;
  }
  simplify(points,ignoreChairId=0){
    if(points.length<=2)return points;
    const result=[points[0]];let anchor=0;
    while(anchor<points.length-1){
      let far=points.length-1;
      while(far>anchor+1&&!this.lineClear(points[anchor],points[far],ignoreChairId))far--;
      result.push(points[far]);anchor=far;
    }
    return result;
  }
  findPath(start,goal,options={}){
    const ignoreChairId=options.ignoreChairId??this.chairForStart(start);
    const startIndex=this.nearestFree(start,options.startSearch??1.5,ignoreChairId);
    const goalIndex=this.nearestFree(goal,options.goalSearch??1.2,ignoreChairId);
    if(startIndex<0||goalIndex<0)return [];
    if(startIndex===goalIndex)return [this.cellPoints[startIndex]];
    const total=this.cols*this.rows;
    const gScore=new Float64Array(total);gScore.fill(Infinity);gScore[startIndex]=0;
    const cameFrom=new Int32Array(total);cameFrom.fill(-1);
    const closed=new Uint8Array(total);
    const open=new MinHeap();open.push({index:startIndex,f:this.heuristic(startIndex,goalIndex)});
    const dirs=[[-1,0,1],[1,0,1],[0,-1,1],[0,1,1],[-1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[1,-1,Math.SQRT2],[1,1,Math.SQRT2]];
    let found=false,iterations=0,maxIterations=total*2;
    while(open.size&&iterations++<maxIterations){
      const current=open.pop().index;if(closed[current])continue;
      if(current===goalIndex){found=true;break;}closed[current]=1;
      const c=this.coords(current);
      for(const [dx,dz,cost] of dirs){
        const nx=c.x+dx,nz=c.z+dz;if(!this.isCellFree(nx,nz,ignoreChairId))continue;
        if(dx&&dz&&(!this.isCellFree(c.x+dx,c.z,ignoreChairId)||!this.isCellFree(c.x,c.z+dz,ignoreChairId)))continue;
        const ni=this.index(nx,nz);if(closed[ni])continue;
        const tentative=gScore[current]+cost*this.cellSize;
        if(tentative>=gScore[ni])continue;
        cameFrom[ni]=current;gScore[ni]=tentative;
        open.push({index:ni,f:tentative+this.heuristic(ni,goalIndex)});
      }
    }
    if(!found)return [];
    const indices=[];let cursor=goalIndex;
    while(cursor!==-1){indices.push(cursor);if(cursor===startIndex)break;cursor=cameFrom[cursor];}
    if(indices[indices.length-1]!==startIndex)return [];
    indices.reverse();
    const points=indices.map(i=>this.cellPoints[i]);
    return this.simplify(points,ignoreChairId);
  }
}

export function findExitInfo(objects,width,depth){
  const door=objects.find(o=>(o.catalog_key||o.catalogKey)==='door');
  const x=door ? Number(door.pos_x??door.position?.x??0) : width/2;
  const z=door ? Number(door.pos_z??door.position?.z??0) : 0;
  const sideX=Math.abs(Math.abs(x)-width/2);
  const sideZ=Math.abs(Math.abs(z)-depth/2);
  let normal,tangent,inside,outside;
  if(!door||sideX<=sideZ){
    const sign=x>=0?1:-1;normal={x:sign,z:0};tangent={x:0,z:1};
  }else{
    const sign=z>=0?1:-1;normal={x:0,z:sign};tangent={x:1,z:0};
  }
  const center={x:door?x:normal.x*width/2,z:door?z:normal.z*depth/2};
  // Match the clear opening in the editor's 1.48 m wall opening and 1.28 m leaf.
  const clearWidth=door?1.28:1.20;
  const agentRadius=.31;
  inside={x:center.x-normal.x*.48,z:center.z-normal.z*.48};
  outside={x:center.x+normal.x*1.35,z:center.z+normal.z*1.35};
  return {center,normal,tangent,inside,outside,clearWidth,usableHalfWidth:Math.max(.12,clearWidth/2-agentRadius)};
}
