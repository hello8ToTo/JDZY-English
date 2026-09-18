import * as T from './vendor/three.module.js';
import {createLampEffects} from './lamp-effects.js';
import {highlightRegions,clipRegionTriangle} from './part-regions.js';

// Split the existing car surface into learning regions; never illuminate a
// shared body material, which would accidentally highlight the entire car.
export function buildPartSurfaces(meshes, identify) {
 const regions=Array.from({length:12},()=>[]),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),center=new T.Vector3(),normal=new T.Vector3(),edge=new T.Vector3();
 for(const mesh of meshes){
  const position=mesh.geometry.attributes.position,index=mesh.geometry.index;
  const count=index?index.count:position.count;
  for(let i=0;i<count;i+=3){
   mesh.getVertexPosition(index?index.getX(i):i,a).applyMatrix4(mesh.matrixWorld);
   mesh.getVertexPosition(index?index.getX(i+1):i+1,b).applyMatrix4(mesh.matrixWorld);
   mesh.getVertexPosition(index?index.getX(i+2):i+2,c).applyMatrix4(mesh.matrixWorld);
   center.copy(a).add(b).add(c).multiplyScalar(1/3);
   normal.subVectors(b,a).cross(edge.subVectors(c,a)).normalize();
   const ids=highlightRegions({point:center,object:mesh},normal,identify);
   for(const id of ids){const vertices=clipRegionTriangle([a,b,c],id);for(const value of vertices)regions[id].push(value);}
  }
 }
 return regions.map(vertices=>new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3)));
}

export function createPartEffects(scene, meshes, identify, reducedMotion=false, preparedSurfaces=null) {
 const surfaces=preparedSurfaces||buildPartSurfaces(meshes,identify);
 const highlightMaterial=new T.MeshBasicMaterial({color:0xffb020,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 const lampEffects=createLampEffects(surfaces);
 const highlight=new T.Mesh(surfaces[0],highlightMaterial),lamp=lampEffects.group;
 highlight.visible=lamp.visible=false;highlight.renderOrder=10;lamp.renderOrder=11;scene.add(highlight,lamp);
 let selected=null,start=0;
 function clear(){selected=null;highlight.visible=lamp.visible=false;}
 function select(id){clear();selected=id;start=performance.now();highlight.geometry=surfaces[id];highlight.visible=true;lampEffects.select(id);update(start);}
 function update(time){if(selected===null)return;const pulse=reducedMotion?.42:.24+.30*(.5+.5*Math.sin((time-start)/1000*Math.PI*1.5));highlightMaterial.opacity=selected===2||selected===7?pulse*.25:pulse;}
 return {select,clear,update,surfaces};
}
