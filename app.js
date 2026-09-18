const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const storeKey = 'global-drive-progress-v1';
const state = JSON.parse(localStorage.getItem(storeKey) || '{"records":[]}');
const save = () => localStorage.setItem(storeKey, JSON.stringify(state));

const pageTitles = { home: '课程驾驶舱', decoder: '需求解码器', talk: '交流互动台', delivery: '交付保障处', showroom: '车展区', progress: '我的学习档案' };
function switchView(view) {
  $$('.screen').forEach(screen => screen.classList.toggle('active', screen.id === view));
  $$('.nav-trigger').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  $('#top-title').textContent = pageTitles[view];
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (view === 'progress') renderProgress();
  const showroomFrame = $('#showroom-frame');
  if (view === 'showroom' && !showroomFrame.getAttribute('src')) {
    showroomFrame.addEventListener('load', () => {
      showroomFrame.contentWindow.postMessage({ type: 'global-drive-showroom-visibility', visible: $('#showroom').classList.contains('active') }, '*');
    });
    showroomFrame.src = showroomFrame.dataset.src;
  }
  if (showroomFrame.getAttribute('src')) {
    showroomFrame.contentWindow.postMessage({ type: 'global-drive-showroom-visibility', visible: view === 'showroom' }, '*');
  }
}
$$('.nav-trigger').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));

// 浏览器不允许原生全屏时，只将车展 iframe 扩展到网页视口。
let showroomOverflow = null;
window.addEventListener('message', event => {
  const frame = $('#showroom-frame');
  if (event.source !== frame.contentWindow || event.data?.type !== 'global-drive-showroom-fullscreen') return;
  const active = event.data.active === true && $('#showroom').classList.contains('active');
  frame.parentElement.classList.toggle('showroom-web-fullscreen', active);
  if (active && showroomOverflow === null) { showroomOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
  if (!active && showroomOverflow !== null) { document.body.style.overflow = showroomOverflow; showroomOverflow = null; }
});
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && showroomOverflow !== null) $('#showroom-frame').contentWindow.postMessage({type:'global-drive-showroom-exit-fullscreen'}, '*');
});

// 需求解码器：固定国家案例库 + 随机案例库
const makeCase = (id, country, flag, title, body, terms) => ({ id, country, flag, title, body, terms: terms.map(([key, text, type]) => ({ key, text, type })) });
const caseBank = {
  thailand: [
    makeCase('th-1', '泰国', '🇹🇭', '曼谷电商配送车队升级', 'Hello, I manage a last-mile delivery team in Bangkok. Our drivers usually travel {{mileage}} and we plan to replace {{quantity}}. During the rainy season, our vehicles work in {{weather}}. We need {{space}} for parcels, but we are still checking {{charging}}, {{budget}}, and {{delivery}}.', [['mileage','about 250 km a day','confirmed'],['quantity','two EVs before the Songkran promotion','confirmed'],['weather','hot weather and heavy rain','confirmed'],['space','a five-seat vehicle with parcel space','confirmed'],['charging','whether our depot supports overnight charging','ask'],['budget','the final budget and payment plan','ask'],['delivery','the exact delivery date','ask']]),
    makeCase('th-2', '泰国', '🇹🇭', '清迈山地度假区接驳车', 'Hello, I run a small eco-resort near Chiang Mai. We need {{route}} to carry guests between the airport and the resort. The road has {{terrain}}, and our guests value {{comfort}}. I have not decided {{quantity}}, {{charging}}, or {{budget}} yet.', [['route','a daily shuttle route of about 180 km','confirmed'],['terrain','some mountain roads and steep slopes','confirmed'],['comfort','quiet air-conditioning and comfortable seats','confirmed'],['quantity','how many vehicles we need in the first season','ask'],['charging','whether charging is available near the resort','ask'],['budget','the total operating cost','ask']]),
    makeCase('th-3', '泰国', '🇹🇭', '普吉海岛旅客接送服务', 'Good morning. I operate airport transfers in Phuket. We often carry {{passengers}} with luggage, and the vehicle runs {{schedule}}. Because tourists expect a smooth experience, {{comfort}} is important. I still need to confirm {{range}}, {{delivery}}, and {{warranty}}.', [['passengers','four passengers with medium-size luggage','confirmed'],['schedule','from early morning to late evening','confirmed'],['comfort','rear-seat comfort and luggage space','confirmed'],['range','the real driving range with air-conditioning on','ask'],['delivery','when the first vehicle can arrive','ask'],['warranty','whether the warranty covers passenger transport','ask']])
  ],
  indonesia: [
    makeCase('id-1', '印尼', '🇮🇩', '雅加达网约车高频通勤', 'Hi, I drive for a ride-hailing platform in Jakarta. I work {{frequency}} and usually stay {{area}}. Traffic is heavy, so I want {{reliability}}. I have not worked out {{mileage}}, {{charging}}, or {{budget}}.', [['frequency','six days a week','confirmed'],['area','inside the Jakarta metropolitan area','confirmed'],['reliability','a reliable EV for long working hours','confirmed'],['mileage','my exact daily driving distance','ask'],['charging','where I can charge near my apartment','ask'],['budget','whether instalment payment is available','ask']]),
    makeCase('id-2', '印尼', '🇮🇩', '泗水港区短驳物流运营', 'Hello, our company moves spare parts between Surabaya port and local warehouses. The vehicles make {{stops}} and sometimes carry {{load}}. We need a model that can handle {{weather}}. Please help us clarify {{quantity}}, {{charging}}, and {{delivery}}.', [['stops','many short stops during one shift','confirmed'],['load','small but frequent cargo loads','confirmed'],['weather','humid weather and sudden rain','confirmed'],['quantity','how many vans should be replaced first','ask'],['charging','whether fast charging is available near the warehouse','ask'],['delivery','the preferred delivery window','ask']]),
    makeCase('id-3', '印尼', '🇮🇩', '巴厘岛酒店机场接送', 'I am purchasing for a boutique hotel in Bali. We need an EV for {{service}} and it should present a {{image}}. Guests often arrive with {{luggage}}. I still need details about {{range}}, {{cost}}, and {{maintenance}}.', [['service','airport-to-hotel guest transfers','confirmed'],['image','quiet and modern brand image','confirmed'],['luggage','holiday luggage and sports equipment','confirmed'],['range','how far it can go with the air-conditioner running','ask'],['cost','the leasing or purchase cost','ask'],['maintenance','where local after-sales service is provided','ask']])
  ],
  vietnam: [
    makeCase('vn-1', '越南', '🇻🇳', '胡志明市餐饮即时配送', 'Hello, I manage a food-delivery team in Ho Chi Minh City. Our riders make {{orders}} and travel {{distance}} on busy streets. We are most concerned about {{efficiency}}. We still need to decide {{quantity}}, {{charging}}, and {{payment}}.', [['orders','many short food orders each day','confirmed'],['distance','around 150 to 180 km daily','confirmed'],['efficiency','fast charging and low running cost','confirmed'],['quantity','the first batch size','ask'],['charging','whether we can install chargers at our delivery hub','ask'],['payment','which payment plan is suitable','ask']]),
    makeCase('vn-2', '越南', '🇻🇳', '河内企业租赁车队换新', 'Good afternoon. Our Hanoi company provides vehicles for {{users}}. We want an EV fleet with {{requirement}} and stable {{service}}. The management team has not confirmed {{budget}}, {{delivery}}, or {{contract}}.', [['users','office staff and visiting clients','confirmed'],['requirement','a professional five-seat business appearance','confirmed'],['service','after-sales support in Hanoi','confirmed'],['budget','the yearly vehicle budget','ask'],['delivery','the date for fleet replacement','ask'],['contract','whether a corporate leasing plan is offered','ask']]),
    makeCase('vn-3', '越南', '🇻🇳', '岘港滨海度假区接驳', 'Hi, we are building a shuttle service for a beach resort in Da Nang. The shuttle route is {{route}} and passengers need {{comfort}} after outdoor activities. Salt air and heat are common, so {{durability}} matters. Please advise on {{charging}}, {{quantity}}, and {{warranty}}.', [['route','about 120 km between hotels and attractions','confirmed'],['comfort','strong cooling and easy entry','confirmed'],['durability','battery performance in hot coastal weather','confirmed'],['charging','the best charging solution for the resort','ask'],['quantity','how many shuttles are needed at peak season','ask'],['warranty','coverage for commercial resort use','ask']])
  ],
  malaysia: [
    makeCase('my-1', '马来西亚', '🇲🇾', '吉隆坡医疗耗材配送', 'Hello, I purchase vehicles for a medical-supply distributor in Kuala Lumpur. We deliver {{goods}} to clinics and hospitals, usually within {{area}}. We need {{reliability}} because timing is important. Please clarify {{range}}, {{charging}}, and {{cost}}.', [['goods','small medical supplies and documents','confirmed'],['area','the Kuala Lumpur and Selangor area','confirmed'],['reliability','a dependable vehicle for daily delivery','confirmed'],['range','the practical daily range','ask'],['charging','where drivers can charge during their shifts','ask'],['cost','the total cost of ownership','ask']]),
    makeCase('my-2', '马来西亚', '🇲🇾', '柔佛跨境商务通勤', 'Good morning. I need an EV for business trips from Johor Bahru to {{destination}}. I travel {{frequency}} and sometimes take {{passengers}}. I have not decided {{charging}}, {{budget}}, or {{delivery}}.', [['destination','meetings near the Singapore border','confirmed'],['frequency','two or three times every week','confirmed'],['passengers','one or two business colleagues','confirmed'],['charging','whether cross-border charging is convenient','ask'],['budget','the acceptable purchase budget','ask'],['delivery','when I need the vehicle','ask']]),
    makeCase('my-3', '马来西亚', '🇲🇾', '槟城科技园员工通勤车队', 'Hello, our Penang technology park plans to provide {{service}} for staff. The route is {{route}} and runs {{schedule}}. We need {{safety}} for shift workers. We are still discussing {{quantity}}, {{charging}}, and {{maintenance}}.', [['service','shared commuting vehicles','confirmed'],['route','a fixed 90 km round trip','confirmed'],['schedule','morning and late-night shifts','confirmed'],['safety','safe and reliable transport after dark','confirmed'],['quantity','the number of vehicles needed','ask'],['charging','charger installation at the technology park','ask'],['maintenance','local fleet maintenance support','ask']])
  ]
};
const countryMeta = { thailand: { label: '泰国', code: 'TH', flag: 'assets/flag-thailand.svg' }, indonesia: { label: '印度尼西亚', code: 'ID', flag: 'assets/flag-indonesia.svg' }, vietnam: { label: '越南', code: 'VN', flag: 'assets/flag-vietnam.svg' }, malaysia: { label: '马来西亚', code: 'MY', flag: 'assets/flag-malaysia.svg' } };
const allCases = Object.values(caseBank).flat();
let decoderMode = 'fixed', selectedCountry = 'thailand', caseIndex = 0, randomCase = null;
let decodeMarks = [], placements = new Map();
function currentCase() { return decoderMode === 'random' ? randomCase : caseBank[selectedCountry][caseIndex]; }
function renderLibraryCards() {
  const cards = $('#case-library-cards');
  const countries = Object.entries(countryMeta).map(([key, meta]) => `<article class="library-card active" data-open-country="${key}"><div class="country-code">${meta.code}<img class="country-flag" src="${meta.flag}" alt="${meta.label}国旗"></div><h4>${meta.label}</h4><button>查看案例 <span>→</span></button></article>`).join('');
  cards.innerHTML = countries + '<article class="library-card pending"><span class="country-flag">＋</span><span class="case-count">COMING SOON</span><h4>更多国家案例库</h4><p>更多东南亚及海外市场案例正在开发中。</p><span class="pending-note">敬请期待</span></article>';
  $$('[data-open-country]').forEach(card => card.addEventListener('click', () => { decoderMode = 'fixed'; selectedCountry = card.dataset.openCountry; caseIndex = 0; openWorkspace(); }));
}
function renderText(item) {
  const terms = Object.fromEntries(item.terms.map(term => [term.key, term]));
  return item.body.replace(/\{\{(\w+)\}\}/g, (_, key) => { const term = terms[key]; return `<mark draggable="true" data-key="${term.key}" data-type="${term.type}">${term.text}</mark>`; });
}
const followupStopWords = new Set('a an the and or of to for in on at with about your our their this that these those is are am be been being do does did can could would should may might will have has had need needs needed want wants wanted tell explain clarify more whether what when where which who how much many exact final still also please'.split(' '));
const commonMisspellings = { budjet: 'budget', buget: 'budget', warrenty: 'warranty', waranty: 'warranty', delievery: 'delivery', deliveryy: 'delivery', chargging: 'charging', charing: 'charging', quanity: 'quantity', quantiy: 'quantity', vehical: 'vehicle', vechicle: 'vehicle', milage: 'mileage', performence: 'performance', preformance: 'performance', comercial: 'commercial', adress: 'address', availablity: 'availability' };
function contentWords(text) { return (text.toLowerCase().match(/[a-z]+/g) || []).filter(word => word.length > 2 && !followupStopWords.has(word)); }
function suggestedQuestion(termText) {
  const text = termText.toLowerCase();
  if (text.includes('budget') || text.includes('payment')) return 'Could you tell me your budget range and preferred payment plan?';
  if (text.includes('deliver')) return 'When would you need the vehicles to be delivered?';
  if (text.includes('charg')) return 'Could you tell me whether your site supports overnight charging?';
  if (text.includes('warranty')) return 'Could you clarify what warranty coverage you need for commercial use?';
  if (text.includes('quantity') || text.includes('vehicle') || text.includes('evs')) return 'How many vehicles are you planning to purchase?';
  if (text.includes('mileage') || text.includes('distance') || text.includes('kilomet')) return 'Could you tell me your typical daily driving distance?';
  return `Could you tell me more about ${termText.replace(/^(the|whether|our|your)\s+/i, '')}?`;
}
function evaluateFollowup(item, answer) {
  const normalized = answer.trim().toLowerCase();
  const answerWords = new Set(contentWords(normalized));
  const askTerms = item.terms.filter(term => term.type === 'ask');
  let bestTerm = askTerms[0], bestHits = 0;
  askTerms.forEach(term => {
    const hits = contentWords(term.text).filter(word => answerWords.has(word)).length;
    if (hits > bestHits) { bestHits = hits; bestTerm = term; }
  });
  const words = normalized.match(/[a-z]+/g) || [];
  const polite = /\b(could|would|may|please)\b/.test(normalized);
  const questionForm = /^(could|would|can|may|what|when|where|which|who|how|do|does|did|is|are|have|has)\b/.test(normalized);
  const hasQuestionMark = answer.trim().endsWith('?');
  const spellingIssues = [...new Set(words.filter(word => commonMisspellings[word]))];
  let score = bestHits ? 47 + Math.min(18, (bestHits - 1) * 7) : 14;
  if (polite) score += 12;
  if (questionForm) score += 10;
  if (words.length >= 7) score += 8;
  if (hasQuestionMark) score += 5;
  score -= spellingIssues.length * 6;
  score = Math.max(0, Math.min(100, score));
  const advice = [];
  if (!bestHits) advice.push('内容：问题尚未对应本案例中的待确认事项，请围绕右侧某一条紫色信息追问。');
  else if (bestHits < 2) advice.push(`精准度：已接近“${bestTerm.text}”，可再补充时间、数量、条件或范围等限定信息。`);
  else advice.push(`精准度：问题与“${bestTerm.text}”匹配，追问方向清楚。`);
  if (!polite) advice.push('词组搭配：建议使用 “Could you tell me…” 或 “Could you clarify…” 使表达更礼貌自然。');
  else advice.push('词组搭配：礼貌追问句式使用恰当。');
  if (spellingIssues.length) advice.push(`拼写：请检查 ${spellingIssues.map(word => `${word} → ${commonMisspellings[word]}`).join('；')}。`);
  else advice.push('拼写：未发现常见关键词拼写问题。');
  if (!questionForm || !hasQuestionMark) advice.push('语法：请使用完整疑问句结构，并在句末添加问号。');
  else if (words.length < 7) advice.push('语法：句式基本正确，但信息较短，可补充对象或条件使问题更完整。');
  else advice.push('语法：疑问句结构完整，表达清楚。');
  return { score, bestTerm, advice, sample: suggestedQuestion(bestTerm.text) };
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}
function plainCaseText(item) {
  const terms = Object.fromEntries(item.terms.map(term => [term.key, term.text]));
  return item.body.replace(/\{\{(\w+)\}\}/g, (_, key) => terms[key] || '');
}
function renderAiLoading() {
  const panel = $('#ai-evaluation');
  panel.innerHTML = '<div class="ai-eval-head"><b>AI 正在评估…</b><span class="mono">XFYUN SPARK</span></div><p>正在核对需求分类，并分析追问的相关性、用词、拼写与语法。</p>';
  panel.classList.remove('hidden');
}
function renderAiEvaluation(classificationScore, classificationCorrect, classificationTotal, review, source = 'local-fallback') {
  const panel = $('#ai-evaluation');
  const sourceLabel = source === 'xfyun' ? '讯飞星火 · 实时评估' : '本地备用评估';
  panel.innerHTML = `<div class="ai-eval-head"><b>AI 智能评估</b><span class="mono">${sourceLabel}</span></div><div class="ai-scores"><div class="ai-score">需求分类准确度<strong>${classificationScore}分</strong><span>${classificationCorrect} / ${classificationTotal} 条正确</span></div><div class="ai-score">追问精准度<strong>${Math.round(Number(review.score) || 0)}分</strong><span>相关性与语言质量</span></div></div>${review.advice.map(item => `<p>• ${escapeHtml(item)}</p>`).join('')}<p class="sample-question"><b>优化示例：</b>${escapeHtml(review.sample)}</p>`;
  panel.classList.remove('hidden');
}
async function requestAiEvaluation(item, question) {
  const response = await fetch('https://global-drive-ai.49d5dpyf54.workers.dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caseId: item.id,
      country: item.country,
      title: item.title,
      caseText: plainCaseText(item),
      terms: item.terms,
      placements: Object.fromEntries(placements),
      question
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'AI 服务暂时不可用');
  return result;
}
function renderDecoder() {
  const item = currentCase();
  const meta = Object.values(countryMeta).find(country => country.label === item.country) || countryMeta[selectedCountry];
  placements = new Map();
  $('#case-country').innerHTML = `<span>CASE TEXT</span><img src="${meta.flag}" alt="${item.country}国旗"><strong>${item.country}</strong>`;
  $('#case-title').textContent = item.title;
  $('#case-order').textContent = decoderMode === 'fixed' ? `${caseIndex + 1} / 3` : '随机抽取案例';
  $('#case-text').innerHTML = renderText(item);
  $('#decode-count').textContent = `0 / ${item.terms.length}`;
  $('#decode-feedback').textContent = '请完成分类并填写追问后提交验证。';
  $('#decoder-question').value = '';
  $('#ai-evaluation').classList.add('hidden');
  $('#ai-evaluation').innerHTML = '';
  $('#confirmed').innerHTML = '<b>✓ 已确认信息</b><p>客户已明确表达的内容</p>';
  $('#ask').innerHTML = '<b>？待追问信息</b><p>仍需要进一步澄清的内容</p>';
  $('#random-note').textContent = decoderMode === 'random' ? `${item.flag} 本题随机抽取自${item.country}案例库` : '';
  $('#back-to-library').textContent = decoderMode === 'fixed' ? '← 返回国家案例库' : '← 返回训练方式';
  $('#previous-case').disabled = decoderMode === 'fixed' && caseIndex === 0;
  $('#next-case').textContent = decoderMode === 'random' ? '随机再抽一题 →' : '下一题 →';
  decodeMarks = $$('#decoder mark[draggable="true"]');
  bindDecoderDrag();
}
function updateDecodeCount() { $('#decode-count').textContent = `${placements.size} / ${decodeMarks.length}`; }
function addTag(mark, zone) {
  $$(`[data-tag-key="${mark.dataset.key}"]`).forEach(tag => tag.remove());
  placements.set(mark.dataset.key, zone); mark.classList.add('dragged');
  const tag = document.createElement('span'); tag.className = `tag ${zone === 'ask' ? 'ask' : ''}`; tag.dataset.tagKey = mark.dataset.key; tag.textContent = mark.textContent;
  $(`#${zone}`).appendChild(tag); updateDecodeCount();
}
function bindDecoderDrag() {
  decodeMarks.forEach(mark => mark.addEventListener('dragstart', event => event.dataTransfer.setData('text/plain', mark.dataset.key)));
  $$('#decoder .drop-zone').forEach(zone => {
    zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('hover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('hover'));
    zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('hover'); const key = event.dataTransfer.getData('text/plain'); const mark = decodeMarks.find(item => item.dataset.key === key); if (mark) addTag(mark, zone.dataset.zone); });
  });
}
function drawRandomCase() { randomCase = allCases[Math.floor(Math.random() * allCases.length)]; }
function openWorkspace() { $('#decoder-library-home').classList.add('hidden'); $('#fixed-case-library').classList.add('hidden'); $('#decoder-workspace').classList.remove('hidden'); $('#back-to-decoder-home').classList.add('hidden'); $('#back-to-library').classList.remove('hidden'); renderDecoder(); }
$('#open-fixed-cases').addEventListener('click', () => { $('#decoder-library-home').classList.add('hidden'); $('#fixed-case-library').classList.remove('hidden'); $('#decoder-intro').classList.add('hidden'); $('#back-to-decoder-home').classList.remove('hidden'); $('#back-to-library').classList.add('hidden'); renderLibraryCards(); });
$('#open-random').addEventListener('click', () => { decoderMode = 'random'; $('#decoder-intro').classList.remove('hidden'); drawRandomCase(); openWorkspace(); });
$('#back-to-decoder-home').addEventListener('click', () => { $('#fixed-case-library').classList.add('hidden'); $('#decoder-library-home').classList.remove('hidden'); $('#decoder-intro').classList.remove('hidden'); $('#back-to-decoder-home').classList.add('hidden'); });
$('#back-to-library').addEventListener('click', () => { $('#decoder-workspace').classList.add('hidden'); $('#back-to-library').classList.add('hidden'); if (decoderMode === 'fixed') { $('#fixed-case-library').classList.remove('hidden'); $('#decoder-intro').classList.add('hidden'); $('#back-to-decoder-home').classList.remove('hidden'); renderLibraryCards(); } else { $('#decoder-library-home').classList.remove('hidden'); $('#decoder-intro').classList.remove('hidden'); } });
$('#previous-case').addEventListener('click', () => { if (decoderMode === 'fixed' && caseIndex > 0) { caseIndex--; renderDecoder(); } });
$('#next-case').addEventListener('click', () => { if (decoderMode === 'random') { drawRandomCase(); } else { caseIndex = (caseIndex + 1) % caseBank[selectedCountry].length; } renderDecoder(); });
$('#decode-check').addEventListener('click', async () => {
  const item = currentCase();
  if (placements.size !== decodeMarks.length) { $('#decode-feedback').textContent = `还差 ${decodeMarks.length - placements.size} 条信息未分类。`; return; }
  const question = $('#decoder-question').value.trim();
  if (!question) { $('#decode-feedback').textContent = '请在“待追问信息”下方填写一条向客户提出的英语问题。'; $('#decoder-question').focus(); return; }
  let correct = 0;
  decodeMarks.forEach(mark => { const tag = $(`[data-tag-key="${mark.dataset.key}"]`); const ok = placements.get(mark.dataset.key) === mark.dataset.type; correct += Number(ok); tag.textContent = `${mark.textContent} ${ok ? '✓' : '×'}`; tag.style.background = ok ? '#d8f4ec' : '#ffe1e3'; tag.style.color = ok ? '#087c68' : '#bd3543'; });
  const classificationScore = Math.round(correct / decodeMarks.length * 100);
  const button = $('#decode-check');
  button.disabled = true;
  button.textContent = 'AI 评估中…';
  renderAiLoading();
  let review, source = 'xfyun';
  try {
    const result = await requestAiEvaluation(item, question);
    review = { score: result.questionScore, advice: result.advice, sample: result.sampleQuestion };
  } catch (error) {
    review = evaluateFollowup(item, question);
    review.advice.unshift(`实时 AI 暂未连接，已启用本地备用评估。${location.protocol === 'file:' ? '部署到 EdgeOne 并配置环境变量后即可使用讯飞星火。' : '请稍后重试。'}`);
    source = 'local-fallback';
  } finally {
    button.disabled = false;
    button.textContent = '提交答案并验证 →';
  }
  renderAiEvaluation(classificationScore, correct, decodeMarks.length, review, source);
  $('#decode-feedback').textContent = `评估完成：需求分类 ${classificationScore} 分，追问精准度 ${review.score} 分。`;
  state.records = state.records.filter(record => record.id !== `decoder-${item.id}`); state.records.push({ id: `decoder-${item.id}`, title: `需求解码器 · ${item.title}`, value: `需求分类 ${classificationScore} 分 · 追问 ${review.score} 分` }); save();
});
$('#decode-reset').addEventListener('click', () => renderDecoder());
$('#clear-all-records').addEventListener('click', () => { state.records = []; localStorage.removeItem(storeKey); renderProgress(); });
renderLibraryCards();

// 交流互动台：浏览器英文语音 + 追问模拟
const inquiryText = 'Hello, my name is Narin. I work as a ride hailing driver in Bangkok, and I drive passengers around the city almost every day. I need a reliable electric vehicle for daily use. I am especially concerned about the driving range and charging time. Could you tell me whether the car can meet my daily needs?';
let speaking = false;
$('#play-client').addEventListener('click', function () {
  if (!('speechSynthesis' in window)) return alert('当前浏览器不支持语音播放，请使用 Chrome 或 Edge。');
  if (speaking) { speechSynthesis.cancel(); speaking = false; this.textContent = '▶'; return; }
  const utterance = new SpeechSynthesisUtterance(inquiryText); const voice = speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith('en'));
  if (voice) utterance.voice = voice; utterance.lang = 'en-US'; utterance.rate = .84;
  utterance.onend = () => { speaking = false; this.textContent = '▶'; }; speechSynthesis.cancel(); speechSynthesis.speak(utterance); speaking = true; this.textContent = '❚❚';
});
$('#known-check').addEventListener('click', () => { const checked = $$('[data-known]:checked'); let correct = 0; checked.forEach(box => correct += Number(box.dataset.known === 'true')); const falseChecked = checked.length - correct; $('#known-feedback').textContent = `你勾选 ${checked.length} 项，其中 ${correct} 项与客户语音一致${falseChecked ? `；另有 ${falseChecked} 项需要回听核对。` : '。'}`; });
let selectedTopic = '';
const replies = { mileage: 'I usually drive around 180 to 220 kilometres a day. On weekends, it can be a little more.', quantity: 'For now, I plan to buy one vehicle first. If it works well, I may add another one later.', budget: 'My budget is around 900,000 Thai baht. I would also like to know whether installment payment is available.', charging: 'I live in an apartment, so I do not have a private charger. I mainly need to use public fast-charging stations.', delivery: 'I do not need the car immediately. Delivery sometime next month would be convenient for me.', priority: 'My top priority is driving range. I do not want to stop for charging too often during my working day.' };
$$('#follow-options button').forEach(button => button.addEventListener('click', () => { selectedTopic = button.dataset.topic; $$('#follow-options button').forEach(item => item.classList.remove('selected')); button.classList.add('selected'); $('#follow-question').focus(); $('#client-reply').classList.add('hidden'); }));
$('#ask-client').addEventListener('click', () => { const question = $('#follow-question').value.trim(); const reply = $('#client-reply'); if (!selectedTopic) { reply.textContent = '请先选择一个待追问方向。'; reply.classList.remove('hidden'); return; } if (question.length < 6) { reply.textContent = '请先输入一句完整的英语追问。'; reply.classList.remove('hidden'); return; } reply.textContent = `AI客户回复：${replies[selectedTopic]}`; reply.classList.remove('hidden'); state.records = state.records.filter(item => item.id !== 'talk'); state.records.push({ id: 'talk', title: '交流互动台 · AI客户追问', value: '已完成 1 次有效追问' }); save(); });

// 交付保障处：浏览器录音、回听、生成凭证
let recorder, chunks = [], audioUrl = '';
$('#record-button').addEventListener('click', async function () {
  if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
  try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); recorder = new MediaRecorder(stream); chunks = []; recorder.ondataavailable = event => chunks.push(event.data); recorder.onstop = () => { const blob = new Blob(chunks, { type: 'audio/webm' }); if (audioUrl) URL.revokeObjectURL(audioUrl); audioUrl = URL.createObjectURL(blob); $('#audio-preview').innerHTML = `<audio controls src="${audioUrl}"></audio>`; $('#record-title').textContent = '录音已完成，可回听或重录'; $('#record-description').textContent = '满意后请生成任务凭证。'; $('#record-orb').classList.remove('recording'); $('#record-button').textContent = '重新录制'; $('#submit-record').disabled = false; stream.getTracks().forEach(track => track.stop()); }; recorder.start(); $('#record-orb').classList.add('recording'); $('#record-title').textContent = '正在录音…'; $('#record-description').textContent = '再次点击“结束录音”完成本次录制。'; this.textContent = '结束录音'; } catch { $('#record-description').textContent = '无法使用麦克风。请在浏览器中允许麦克风权限后重试。'; }
});
$('#submit-record').addEventListener('click', () => { $('#receipt').classList.remove('hidden'); state.records = state.records.filter(item => item.id !== 'delivery'); state.records.push({ id: 'delivery', title: '交付保障处 · 客户确认语音', value: '已生成任务凭证' }); save(); });
function renderProgress() { const list = $('#progress-list'); list.innerHTML = state.records.length ? state.records.map(item => `<div class="record-item"><span>${item.title}</span><small>${item.value}</small></div>`).join('') : '<p class="feedback">尚无练习记录。完成任意模块任务后，记录会显示在这里。</p>'; }
$('#reset-progress').addEventListener('click', () => { state.records = []; save(); renderProgress(); });
renderProgress();
