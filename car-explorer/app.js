import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/addons/controls/OrbitControls.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from './vendor/addons/loaders/DRACOLoader.js';
import {MeshoptDecoder} from './vendor/addons/libs/meshopt_decoder.module.js';
import {splitPronunciation,createPronunciation,setupFullscreen} from './experience.js';
import {nearbyCallout,leaderEndpoint} from './callout-layout.js';
import {viewDirections,partView} from './view-presets.js';
import {createPartEffects} from './part-effects.js';
import {wheelRegion,hoodRegion} from './part-regions.js';
import {loadHighlightSurfaces,projectedOutline} from './performance-cache.js';
const highlightReady=loadHighlightSurfaces();
let showroomVisible = true;
window.addEventListener('message', event => {
 if(event.source===window.parent && event.data?.type==='global-drive-showroom-visibility') {showroomVisible=event.data.visible===true;if(!showroomVisible){pronunciation.stop();void fullscreen.exit();}}
});
const $=s=>document.querySelector(s),stage=$('#stage');
const pronunciation=createPronunciation(window,message=>$('#speech-status').textContent=message);
const fullscreen=setupFullscreen(stage,$('#fullscreen'));
const parts=[
 ['保险杠','Bumper /ˈbʌmpər/',[-.095,.48,-1.56]],
 ['车牌','License Plate /ˈlaɪsns pleɪt/',[-.079,.40,-1.654]],
 ['前大灯','Headlight /ˈhedlaɪt/',[-.70,.81,-1.46]],
 ['轮胎','Tire /ˈtaɪər/',[-.79,.25,-1.125]],
 ['车轮','Wheel /wiːl/',[-.79,.25,-1.125]],
 ['车门把手','Door Handle /dɔːr ˈhændl/',[.689,.973,.279]],
 ['后备箱','Trunk /trʌŋk/',[-.095,.91,1.14]],
 ['尾大灯','Taillight /ˈteɪllaɪt/',[.52,.98,1.12]],
 ['车窗','Window /ˈwɪndoʊ/',[.65,1.30,-.13]],
 ['车顶','Roof /ruːf/',[-.095,1.58,.10]],
 ['挡风玻璃','Windshield /ˈwɪndʃiːld/',[-.095,1.28,-.81]],
 ['引擎盖','Hood /hʊd/',[-.095,.96,-1.30]]
].map((p,i)=>({id:i,name:p[0],english:p[1],...splitPronunciation(p[1]),point:new T.Vector3(...p[2])}));
let renderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch(e){$('#loading').innerHTML='<strong>当前浏览器无法显示三维模型</strong><span>请使用支持 WebGL 的浏览器重新打开。</span>';throw e}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;stage.prepend(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.01,100);scene.add(new T.HemisphereLight(0xffffff,0xaebbd0,1.65));const key=new T.DirectionalLight(0xffffff,2.15);key.position.set(-3,6,-4);scene.add(key);const fill=new T.DirectionalLight(0xffffff,.8);fill.position.set(4,3,2);scene.add(fill);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.target.set(-.095,.85,-.185);controls.minDistance=2.6;controls.maxDistance=10;controls.maxPolarAngle=Math.PI*.52;controls.enablePan=false;
const meshes=[],raycaster=new T.Raycaster(),open=new Map();let loaded=false,down=null,hoverPoint=null,modelBounds=null,partEffects=null;
function setView(view='front'){const mobile=stage.clientWidth<600,dist=mobile?9.1:5.9;const v=viewDirections[view]||viewDirections.front;const damping=controls.enableDamping;controls.enableDamping=false;controls.update();camera.position.copy(controls.target).add(new T.Vector3(...v).normalize().multiplyScalar(dist));controls.update();controls.enableDamping=damping;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));}
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.setViewOffset(w,h,0,h*.10,w,h);camera.updateProjectionMatrix();for(const c of open.values())clamp(c)}
new ResizeObserver(resize).observe(stage);resize();setView();
function clamp(c){c.x=Math.max(8,Math.min(c.x,stage.clientWidth-c.el.offsetWidth-8));c.y=Math.max(8,Math.min(c.y,stage.clientHeight-c.el.offsetHeight-8));c.el.style.left=c.x+'px';c.el.style.top=c.y+'px'}
function close(id){let c=open.get(id);if(!c)return;partEffects?.clear();pronunciation.stop();$('#speech-status').textContent='';c.el.remove();c.line.remove();c.dot.remove();open.delete(id);parts[id].button.classList.remove('active');parts[id].button.setAttribute('aria-pressed','false')}
function screenPosition(point){camera.updateMatrixWorld(true);const v=point.clone().project(camera);return{x:(v.x+1)*stage.clientWidth/2,y:(1-v.y)*stage.clientHeight/2}}
function modelScreenBounds(){
 if(!modelBounds)return null;
 return projectedOutline(camera,stage.clientWidth,stage.clientHeight);
}
function calloutPosition(el,screen,id){const bounds=modelScreenBounds();if(!bounds)return{x:12,y:12};return nearbyCallout(bounds,screen,{width:el.offsetWidth,height:el.offsetHeight},{width:stage.clientWidth,height:stage.clientHeight},id===7?'right':undefined);}
function select(id,focus=false,anchor=null){if(!loaded)return;if(open.has(id)){close(id);return}for(const previousId of [...open.keys()])close(previousId);const p=parts[id];if(focus)setView(partView(id,p.point));
 partEffects?.select(id);
 const el=document.createElement('article');el.className='callout';el.setAttribute('aria-label',p.name+' '+p.english);el.innerHTML=`<div class="callout-head"><strong>${p.name}</strong><button class="callout-close" aria-label="关闭${p.name}">×</button></div><div class="callout-body"><div class="callout-word">${p.word}</div><div class="callout-pronunciation"><span>${p.phonetic}</span><button type="button" class="pronounce-button" aria-label="播放 ${p.word} 发音" aria-pressed="false" title="播放英语发音"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4V4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg></button></div></div>`;$('#cards').append(el);
 el.querySelector('.pronounce-button').onclick=event=>{event.stopPropagation();pronunciation.play(p.word,event.currentTarget);};
 const ns='http://www.w3.org/2000/svg',line=document.createElementNS(ns,'polyline'),dot=document.createElementNS(ns,'path');line.setAttribute('fill','none');line.setAttribute('stroke','#3b83b7');line.setAttribute('stroke-width','1.5');dot.setAttribute('fill','#fff');dot.setAttribute('stroke','#2784c5');dot.setAttribute('stroke-width','1.5');$('#leaders').append(line,dot);
 const anchorPoint=anchor?.point?.clone()||p.point.clone(),screen=anchor?.screen||screenPosition(anchorPoint),position=calloutPosition(el,screen,id);let{x,y}=position;
 let c={el,line,dot,p,anchorPoint,x,y};open.set(id,c);clamp(c);p.button.classList.add('active');p.button.setAttribute('aria-pressed','true');el.querySelector('.callout-close').onclick=()=>close(id);
 const head=el.firstElementChild;let drag;head.onpointerdown=e=>{if(e.target.closest('button'))return;e.stopPropagation();head.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,cx:c.x,cy:c.y};el.style.zIndex=Date.now()%100000};head.onpointermove=e=>{if(!drag)return;c.x=drag.cx+e.clientX-drag.x;c.y=drag.cy+e.clientY-drag.y;clamp(c)};head.onpointerup=head.onpointercancel=()=>drag=null;
}
for(const p of parts){const b=document.createElement('button');b.innerHTML=`<span>${String(p.id+1).padStart(2,'0')}</span>${p.name}`;b.setAttribute('aria-pressed','false');b.onclick=()=>select(p.id,true);$('#parts').append(b);p.button=b;}
$('#reset').onclick=()=>{[...open.keys()].forEach(close);setView()};document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
function hit(e){const r=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);return raycaster.intersectObjects(meshes,false)[0]}
function identify(h){const q=h.point,n=h.object.name+' '+(h.object.parent?.name||''),materials=(Array.isArray(h.object.material)?h.object.material:[h.object.material]).map(m=>m?.name||'').join(' ');
 // Mirrors sit beside the windshield but are not part of its learning region.
 if(/后视镜|反光镜|mirror/i.test(n))return null;
 if(q.z<-.57&&q.z> -1.25&&q.y>1.03&&q.y<1.53&&Math.abs(q.x+.095)>.62)return null;
 if(n.includes('车牌'))return 1;
 if(n.includes('大车灯'))return 2;
 if(n.includes('后车灯'))return 7;
 if(n.includes('前挡风'))return Math.abs(q.x+.095)<=.62?10:null;
 if(n.includes('车窗'))return 8;
 const wheel=wheelRegion(q,h.object);if(wheel!==null)return wheel;
 if(q.z<-1.25&&q.y>.64&&q.y<.95&&Math.abs(q.x+.095)>.34)return 2;
 if(q.z>.98&&q.y>.83&&q.y<1.14&&Math.abs(q.x+.095)>.34)return 7;
 if(q.y>1.48&&q.z>-.62)return 9;
 if(q.z<-.57&&q.y>1.03&&q.y<1.53&&Math.abs(q.x+.095)<=.62)return 10;
 if(hoodRegion(q,h.object))return 11;
 if(q.z>1.01&&q.y>.68)return 6;
 if((q.z<-1.31||q.z>1.02)&&q.y<.68)return 0;
 if(q.z>-.69&&q.z<.43&&Math.abs(q.x+.095)>.52){if(q.y>1.07)return 8;if(q.y>.91&&q.y<1.11&&q.z>.10)return 5;}
 return null;}
function hitPart(e){const h=hit(e);if(!h)return null;const id=identify(h);return id===null?null:{hit:h,id}}
function updateCursor(){
 renderer.domElement.style.cursor=down?'grabbing':loaded?'grab':'default';
}
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'){hoverPoint={clientX:e.clientX,clientY:e.clientY};updateCursor();}});
renderer.domElement.addEventListener('pointerleave',()=>{hoverPoint=null;if(!down)renderer.domElement.style.cursor='default';});
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};updateCursor();});
renderer.domElement.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6){const result=hitPart(e);if(result){const r=renderer.domElement.getBoundingClientRect();select(result.id,false,{point:result.hit.point,screen:{x:e.clientX-r.left,y:e.clientY-r.top}});}}down=null;updateCursor();});
renderer.domElement.addEventListener('pointercancel',()=>{down=null;hoverPoint=null;updateCursor();});
controls.addEventListener('change',()=>{if(hoverPoint&&!down)updateCursor();});
function restoreFbxMaterial(material){
 const code=material.name.match(/-(\d{3})(?:\.\d+)?$/)?.[1];
 if('roughness' in material)material.roughness=.42;
 if('metalness' in material)material.metalness=.03;
 if(code==='019'){
  // Calibrated from the supplied reference render. This is the dominant
  // lavender body colour (#a47fbd); lighting supplies the original variations.
  material.color.set(0xa47eb8);
  material.emissive?.set(0xa47eb8);material.emissiveIntensity=.5;
  if('roughness' in material)material.roughness=.3;
 }
 if(code==='004'||code==='006'){
  material.transparent=true;material.opacity=code==='004'?.546:.68;material.depthWrite=false;material.side=T.DoubleSide;
 }
 if(code==='002'||code==='003'){
  material.emissive?.set(code==='002'?0xff0000:0xffffff);material.emissiveIntensity=code==='002'?.8:1.15;
 }
 material.needsUpdate=true;
}
const dracoLoader=new DRACOLoader();dracoLoader.setDecoderPath('./vendor/addons/libs/draco/');
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setDRACOLoader(dracoLoader);loader.load('./wulin.glb?v=20260924-v3',g=>{g.scene.scale.setScalar(1);scene.add(g.scene);g.scene.updateMatrixWorld(true);modelBounds=new T.Box3().setFromObject(g.scene);const restored=new Set();g.scene.traverse(o=>{if(!o.isMesh)return;meshes.push(o);for(const material of(Array.isArray(o.material)?o.material:[o.material]))if(material&&!restored.has(material)){restored.add(material);restoreFbxMaterial(material)}});loaded=true;$('#loading').remove();window.autoExplorer={parts,select,close,setView,open,scene,camera,renderer,meshes,modelBounds,modelScreenBounds};},undefined,e=>{$('#loading').innerHTML='<strong>模型加载失败</strong><span>请使用支持 WebGL 的浏览器刷新重试。</span>';console.error(e)});
const tmp=new T.Vector3();
highlightReady.then(surfaces=>{
 function initialize(){if(!loaded){setTimeout(initialize,50);return;}partEffects=createPartEffects(scene,meshes,identify,window.matchMedia('(prefers-reduced-motion: reduce)').matches,surfaces);const active=open.keys().next().value;if(active!==undefined)partEffects.select(active);}
 initialize();
}).catch(error=>console.error('预计算高亮加载失败',error));
function updatePartEffects(){partEffects?.update(performance.now());}
function tick(){requestAnimationFrame(tick);if(!showroomVisible)return;controls.update();updatePartEffects();renderer.render(scene,camera);if(!loaded)return;const w=stage.clientWidth,h=stage.clientHeight;for(const c of open.values()){tmp.copy(c.anchorPoint).project(camera);const x=(tmp.x+1)*w/2,y=(1-tmp.y)*h/2;{const end=leaderEndpoint({x,y},{x:c.x,y:c.y,width:c.el.offsetWidth});c.line.setAttribute('points',`${x},${y} ${end.x},${end.y}`);c.dot.setAttribute('d',`M ${x} ${y-6} l 6 6 -6 6 -6 -6 Z`);c.line.style.display=c.dot.style.display=tmp.z<1?'':'none';}}}tick();



