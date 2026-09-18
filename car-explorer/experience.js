export function splitPronunciation(text) {
 const match = text.match(/^(.*?)\s+(\/[^/]+\/)$/);
 return {word:match ? match[1] : text, phonetic:match ? match[2] : ''};
}

export function createPronunciation(win, notify) {
 let activeButton = null;
 const supported = !!(win.speechSynthesis && win.SpeechSynthesisUtterance);
 function stop() {
  if(activeButton){activeButton.setAttribute('aria-pressed','false');activeButton=null;}
  if(supported)win.speechSynthesis.cancel();
 }
 function play(word, button) {
  stop();
  if(!supported){notify('当前浏览器不支持语音播放，请使用 Edge 或 Chrome。');return;}
  notify('');
  const speech = new win.SpeechSynthesisUtterance(word);
  const voices = win.speechSynthesis.getVoices();
  speech.voice = voices.find(v=>v.lang==='en-US') || voices.find(v=>/^en[-_]/i.test(v.lang)) || null;
  speech.lang = speech.voice?.lang || 'en-US';speech.rate=.85;
  activeButton=button;button.setAttribute('aria-pressed','true');
  const finish=()=>{if(activeButton===button){button.setAttribute('aria-pressed','false');activeButton=null;}};
  speech.onend=finish;
  speech.onerror=event=>{finish();if(!['canceled','interrupted'].includes(event.error))notify('英语语音暂时不可用，请检查浏览器的英语语音设置。');};
  try{win.speechSynthesis.speak(speech);}catch{finish();notify('语音播放失败，请稍后重试。');}
 }
 return {play,stop,supported};
}

export function setupFullscreen(stage, button, win=window, doc=document) {
 let fallback=false;
 function update(){const active=fallback||doc.fullscreenElement===stage;button.setAttribute('aria-pressed',String(active));button.querySelector('span').textContent=active?'退出全屏':'全屏展示';}
 function setFallback(active){fallback=active;stage.classList.toggle('web-fullscreen',active);if(win.parent!==win)win.parent.postMessage({type:'global-drive-showroom-fullscreen',active},'*');update();}
 async function exit(){if(fallback)setFallback(false);if(doc.fullscreenElement===stage)await doc.exitFullscreen();update();}
 button.onclick=async()=>{
  if(fallback||doc.fullscreenElement===stage){await exit();return;}
  try{if(!stage.requestFullscreen)throw new Error('unsupported');await stage.requestFullscreen();update();}catch{setFallback(true);}
 };
 doc.addEventListener('fullscreenchange',update);
 win.addEventListener('keydown',event=>{if(event.key==='Escape'&&fallback)setFallback(false);});
 win.addEventListener('message',event=>{if(event.source===win.parent&&event.data?.type==='global-drive-showroom-exit-fullscreen')void exit();});
 update();return {exit};
}
