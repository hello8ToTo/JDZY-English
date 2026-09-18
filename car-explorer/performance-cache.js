import * as T from './vendor/three.module.js';
import compressedHighlights from './highlights.bin.gz';
import outline from './outline.json';
export async function loadHighlightSurfaces(){
 const stream=new Blob([compressedHighlights]).stream().pipeThrough(new DecompressionStream('gzip'));
 const buffer=await new Response(stream).arrayBuffer(),header=new DataView(buffer);let offset=96;
 return Array.from({length:12},(_,i)=>{const count=header.getUint32(i*8,true),indexCount=header.getUint32(i*8+4,true),array=new Float32Array(count);for(let j=0;j<count;j++){array[j]=header.getInt16(offset,true)/10000;offset+=2;}const index=new Uint32Array(indexCount);let previous=0;for(let j=0;j<indexCount;j++){previous+=header.getInt32(offset,true);index[j]=previous;offset+=4;}return new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(array,3)).setIndex(new T.BufferAttribute(index,1));});
}
export function projectedOutline(camera,width,height){
 camera.updateMatrixWorld(true);const v=new T.Vector3();let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(let i=0;i<outline.length;i+=3){v.set(outline[i],outline[i+1],outline[i+2]).project(camera);if(v.z<-1||v.z>1)continue;const x=(v.x+1)*width/2,y=(1-v.y)*height/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 return Number.isFinite(left)?{left,right,top,bottom}:null;
}
