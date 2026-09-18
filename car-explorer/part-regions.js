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
 if(q.z>1.0&&q.y>.68&&q.y<1.51&&normal.z>.18)ids.push(6);
 const head=code==='003'&&q.z<-1.25&&q.y>.72&&q.y<.91;
 const tail=code==='002'&&q.z>.98&&q.y>.89&&q.y<1.07;
 if(head)ids.push(2);if(tail)ids.push(7);
 const wheel=wheelRegion(q,o);
 if(wheel!==null){ids.push(wheel);return ids;}
 if(hoodRegion(q,o)&&normal.y>.45){ids.push(11);return ids;}
 if(code==='006'&&!/灯/.test(name)&&Math.abs(normal.x)>.45&&q.y>1.06&&q.z>-.60&&q.z<.32){ids.push(8);return ids;}
 const id=identify(hit);
 // Never reuse broad click ranges for these precision highlight regions.
 if(id!==null&&![2,3,4,6,7,8,11].includes(id))ids.push(id);
 return [...new Set(ids)];
}

// Clip triangles at region boundaries instead of discarding whole triangles.
// This keeps the edges continuous even on the large merged body mesh.
export function clipRegionTriangle(vertices,id){
 const limits={11:[['y',.90,1.12],['z',-1.55,-.56]],8:[['y',1.066,1.53],['z',-.585,.292]],6:[['y',.68,1.51],['z',1.0,1.30]]}[id];
 let polygon=vertices;
 for(const [axis,min,max] of limits||[]){
  for(const [bound,direction] of [[min,1],[max,-1]]){
   const result=[];
   for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],insideA=(a[axis]-bound)*direction>=0,insideB=(b[axis]-bound)*direction>=0;
    if(insideA)result.push(a);
    if(insideA!==insideB){const t=(bound-a[axis])/(b[axis]-a[axis]);result.push(a.clone().lerp(b,t));}
   }
   polygon=result;
  }
 }
 const result=[];for(let i=1;i+1<polygon.length;i++)result.push(...polygon[0].toArray(),...polygon[i].toArray(),...polygon[i+1].toArray());
 return result;
}
