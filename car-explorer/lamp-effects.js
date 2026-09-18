import * as T from './vendor/three.module.js';

function glowTexture(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const radius=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;
  data[i+3]=Math.round(255*Math.pow(Math.max(0,1-radius),2.3));
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.needsUpdate=true;return texture;
}

export function createLampEffects(surfaces){
 const group=new T.Group(),texture=glowTexture();
 const surfaceMaterial=new T.MeshBasicMaterial({color:0xcceeff,transparent:true,opacity:.25,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
 const surface=new T.Mesh(surfaces[2],surfaceMaterial);surface.renderOrder=11;group.add(surface);
 const front=new T.Group(),rear=new T.Group();group.add(front,rear);
 function glow(parent,position,color,scale){
  const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,color,transparent:true,opacity:.8,depthWrite:false}));
  sprite.position.set(...position);sprite.scale.set(scale,scale*.65,1);sprite.renderOrder=12;parent.add(sprite);
 }
 for(const x of [-.70,.51]){
  glow(front,[x,.81,-1.49],0xc8eeff,.48);
  const length=2.7;
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{beamColor:{value:new T.Color(0xb5dfff)}},vertexShader:'varying vec2 vUv; varying vec3 vNormal; varying vec3 vView; void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.0);vView=normalize(-p.xyz);vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform vec3 beamColor; varying vec2 vUv; varying vec3 vNormal; varying vec3 vView; void main(){float distanceFade=pow(vUv.y,1.6);float softEdge=pow(abs(dot(normalize(vNormal),normalize(vView))),.65);gl_FragColor=vec4(beamColor,.22*distanceFade*softEdge);}' });
  const beam=new T.Mesh(new T.CylinderGeometry(.055,.40,length,48,8,true),material);
  beam.rotation.x=Math.PI/2;beam.position.set(x,.80,-1.49-length/2);beam.renderOrder=9;front.add(beam);
 }
 for(const x of [-.71,.52]){
  glow(rear,[x,.98,1.17],0xff2525,.65);
  glow(rear,[x,.98,1.18],0xffa080,.22);
 }
 function select(id){surface.geometry=surfaces[id];surfaceMaterial.color.set(id===2?0xd8f4ff:0xff3420);surfaceMaterial.opacity=id===2?.25:.32;front.visible=id===2;rear.visible=id===7;group.visible=id===2||id===7;}
 group.visible=false;
 return {group,select};
}
