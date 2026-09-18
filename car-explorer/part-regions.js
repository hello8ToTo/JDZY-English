const materialCode=object=>(Array.isArray(object.material)?object.material[0]:object.material)?.name.match(/-(\d{3})(?:\.\d+)?$/)?.[1];
export function wheelRegion(point,object){
 const code=materialCode(object);
 if(!['013','015','017'].includes(code))return null;
 if(Math.abs(point.x+.095)<.50)return null;
 const distance=Math.min(Math.hypot(point.y-.25,point.z+1.125),Math.hypot(point.y-.25,point.z-.86));
 if(distance>.26)return null;
 return code==='013'?3:distance<=.18?4:null;
}
export function hoodRegion(point,object){return materialCode(object)==='019'&&point.z<-.56&&point.z> -1.55&&point.y>.90&&point.y<1.12;}

// Highlight is deliberately independent from click classification: the tailgate
// includes its rear glass and lamps, while clicks on lamps still select lamps.
export function highlightRegions(hit,normal,identify){
 const q=hit.point,o=hit.object,code=materialCode(o),name=o.name+' '+(o.parent?.name||'');
 if(/后视镜|反光镜|mirror/i.test(name))return [];
 const ids=[];
 // The roof crown is higher than its rim: no upper height clipping, which
 // otherwise punches a white hole through the center of the roof panel.
 if(!/天线|antenna/i.test(name)&&q.y>1.47&&q.z>-.67&&normal.y>.35)ids.push(9);
 // Broad candidates, then exact plane clipping below. A normal threshold at
 // the curved tailgate corner creates a staircase of retained triangles.
 if(q.z>.90&&q.y>.58&&q.y<1.60&&normal.z>0)ids.push(6);
 const head=code==='003'&&q.z<-1.25&&q.y>.72&&q.y<.91;
 const tail=code==='002'&&q.z>.98&&q.y>.89&&q.y<1.07;
 if(head)ids.push(2);if(tail)ids.push(7);
 const wheel=wheelRegion(q,o);
 if(wheel!==null){ids.push(wheel);return ids;}
 if(hoodRegion(q,o)&&normal.y>.45){ids.push(11);return ids;}
 if(code==='006'&&!/灯/.test(name)&&Math.abs(normal.x)>.45&&q.y>1.06&&q.z>-.60&&q.z<.32){ids.push(8);return ids;}
 const id=identify(hit);
 // Never reuse broad click ranges for these precision highlight regions.
 if(id!==null&&![2,3,4,6,7,8,9,11].includes(id))ids.push(id);
 return [...new Set(ids)];
}

// Clip triangles at region boundaries instead of discarding whole triangles.
// This keeps the edges continuous even on the large merged body mesh.
export function clipRegionTriangle(vertices,id){
 const limits={11:[['y',.90,1.12],['z',-1.55,-.56]],8:[['y',1.066,1.53],['z',-.585,.292]],6:[['y',.68,1.51],['z',1.0,1.30]],9:[['y',1.47,2],['z',-.67,1.13]],10:[['x',-.715,.525],['y',.986,1.501]],2:[['y',.72,.91]],7:[['y',.89,1.07]]}[id];
 let polygon=vertices;
 function cut(distance){const result=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],da=distance(a),db=distance(b);if(da>=0)result.push(a);if((da>=0)!==(db>=0))result.push(a.clone().lerp(b,da/(da-db)));}polygon=result;}
 for(const [axis,min,max] of limits||[]){
  for(const [bound,direction] of [[min,1],[max,-1]]){
   cut(p=>(p[axis]-bound)*direction);
  }
 }
 if(id===6){
  // Tailgate seam: narrower at the rear glass, wider toward its lower panel.
  cut(p=>.68-.075*(p.y-.68)-(p.x+.095));
  cut(p=>.68-.075*(p.y-.68)+(p.x+.095));
  // Keep the highlight on the rear skin, not the adjoining side panel.
  cut(p=>p.z-(1.12-.15*(p.y-.68)));
 }
 if(id===4){
  const centerZ=vertices.reduce((n,p)=>n+p.z,0)/3<0?-1.125:.86;
  for(let i=0;i<64;i++){const angle=i*Math.PI*2/64,ny=Math.cos(angle),nz=Math.sin(angle);cut(p=>.18-ny*(p.y-.25)-nz*(p.z-centerZ));}
 }
 const result=[];for(let i=1;i+1<polygon.length;i++)result.push(...polygon[0].toArray(),...polygon[i].toArray(),...polygon[i+1].toArray());
 return result;
}
