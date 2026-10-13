(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEY = 'huanhuan-public-demo-v1';
  const base = {version:6, reminder:'给自己一分钟，再决定吃不吃。', stamped:false, entries:[], rewards:0};
  let state = {...base, entries:[]};
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved?.version === 6 && Array.isArray(saved.entries)) state = {...base,...saved}; } catch (_) {}
  let mood='craving', selectedFood='奶茶', foodClass='tea', photoURL=null, session=null, mode='throw', hitCount=0, busy=false;
  let month=8, year=2026, calendarView='month', selectedDay=26, timerIds=[], toastTimer;
  const overlay = $('#flow-overlay');
  const collectionOverlay = $('#collection-overlay');
  const save = () => { try { localStorage.setItem(KEY,JSON.stringify(state)); } catch (_) {} };
  const later = (fn, time) => { const id=setTimeout(fn,time); timerIds.push(id); return id; };
  const clearTimers = () => { timerIds.forEach(clearTimeout); timerIds=[]; };
  const sticker = (name, cls='') => `<span class="sticker ${name} ${cls}" aria-hidden="true"></span>`;
  function toast(message) { clearTimeout(toastTimer); $('#toast').textContent=message; $('#toast').classList.add('visible'); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2800); }
  const icons = {
    home:'<path d="M5 8h14v12H5Z M5 8l3-4h8l3 4M9 12v4m6-4v4"/>',
    calendar:'<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-11 5h2m3 0h2"/>',
    collection:'<rect x="4" y="7" width="16" height="14" rx="3"/><path d="M7 7V3h10v4m-9 6h8"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    up:'<path d="M6 18 18 6M6 6h12v12"/>',
    check:'<path d="m5 12 4 4 10-10"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    back:'<path d="m15 5-7 7 7 7"/>'
  };
  const icon=name=>`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.arrow}</svg>`;
  const navLabels = {home:'缓一缓',calendar:'日历',collection:'收藏'};
  $$('.bottom-nav').forEach(nav => {
    nav.innerHTML=Object.keys(navLabels).map(key=>`<button data-nav="${key}" class="${nav.dataset.current===key?'active':''}" ${nav.dataset.current===key?'aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${icons[key]}</svg>${navLabels[key]}</button>`).join('');
    $$('[data-nav]',nav).forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.nav)));
  });
  function navigate(target) {
    $$('.phone').forEach(el=>el.classList.toggle('active-mobile',el.id===`phone-${target}`));
    const phone=$(`#phone-${target}`);
    if (matchMedia('(max-width:760px)').matches) phone.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
    else { phone.animate([{boxShadow:'0 0 0 2px #d1a894'},{boxShadow:'0 0 0 1px #dfded5'}],{duration:800}); }
  }
  function setMood(value) {
    mood=value;
    $$('.mood').forEach(button=>{const on=button.dataset.mood===value;button.classList.toggle('selected',on);button.setAttribute('aria-pressed',on);});
    $('#start').innerHTML=`<span>${value==='hungry'?'去吃点东西':value==='emotion'?'陪我一会儿':'缓一缓'}</span>${icon('arrow')}`;
  }
  $$('.mood').forEach(button=>button.addEventListener('click',()=>setMood(button.dataset.mood)));
  function overlayHeader(title, back='home') { return `<div class="overlay-head"><button class="back-button" data-back="${back}" aria-label="返回">${icon('back')}</button><span>${title}</span><button class="close-button" data-close aria-label="关闭">${icon('close')}</button></div>`; }
  function showFlow(html) {
    clearTimers(); busy=false; overlay.hidden=false; overlay.innerHTML=html; overlay.scrollTop=0;
    $('[data-close]',overlay)?.addEventListener('click',closeFlow);
    $('[data-back]',overlay)?.addEventListener('click',()=>{const back=$('[data-back]',overlay).dataset.back;if(back==='pick')showPick();else if(back==='emotion')showEmotion();else closeFlow();});
  }
  function closeFlow() { clearTimers(); overlay.hidden=true; overlay.innerHTML=''; busy=false; }
  function startSession(skip=false) {
    session={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),rewarded:false,mood:skip?'unknown':mood,reason:'',method:'throw'};
    selectedFood='想吃的念头';foodClass='pause';if(photoURL){URL.revokeObjectURL(photoURL);photoURL=null;}
    if (!skip && mood==='hungry') showHungry(); else if (!skip && mood==='emotion') showEmotion(); else showPick();
  }
  $('#start').addEventListener('click',()=>startSession());
  $('#skip-state').addEventListener('click',()=>startSession(true));
  $('#pick-food').addEventListener('click',()=>startSession(true));
  let storing=false;
  function storeQuick(button){
    if(storing)return;storing=true;
    button.classList.add('storing');$('.pocket-scene').classList.add('is-storing');
    const selected=button.dataset.quick;
    setTimeout(()=>{
      button.classList.remove('storing');$('.pocket-scene').classList.remove('is-storing');storing=false;
      startSession(true);foodClass=selected;selectedFood={tea:'奶茶',croissant:'牛角面包'}[selected];session.method='throw';showResult();
    },matchMedia('(prefers-reduced-motion:reduce)').matches?40:570);
  }
  $$('[data-quick]').forEach(button=>{
    let origin=null,moved=false;
    button.addEventListener('pointerdown',e=>{if(storing)return;origin={x:e.clientX,y:e.clientY};moved=false;button.setPointerCapture(e.pointerId);});
    button.addEventListener('pointermove',e=>{if(!origin||storing)return;const dx=e.clientX-origin.x,dy=e.clientY-origin.y;if(Math.hypot(dx,dy)>8)moved=true;button.style.translate=`${Math.max(-38,Math.min(38,dx))}px ${Math.max(-20,Math.min(70,dy))}px`;});
    button.addEventListener('pointerup',e=>{if(!origin)return;const dy=e.clientY-origin.y;origin=null;button.style.translate='';if(!moved||dy>28)storeQuick(button);});
    button.addEventListener('pointercancel',()=>{origin=null;button.style.translate='';});
    button.addEventListener('click',e=>{if(e.detail===0)storeQuick(button);});
  });
  function showHungry() {
    showFlow(overlayHeader('听听身体的声音')+`<h2 class="flow-title">饿了，就吃饭。</h2><p class="flow-subtitle">不用硬忍，先照顾饥饿感。</p><div class="meal-card">${sticker('meal')}<div><b>到饭点，吃正餐</b><p>选喜欢、适合自己的食物。</p></div></div><div class="meal-card">${sticker('strawberry')}<div><b>还没到饭点，可以加餐</b><p>看看手边有什么。</p></div></div><button class="primary" id="meal-done">去吃点东西</button><button class="secondary" id="change-mood">重新选状态</button>`);
    $('#meal-done').addEventListener('click',()=>{closeFlow();toast('去好好吃饭吧，缓缓在这里。');});
    $('#change-mood').addEventListener('click',closeFlow);
  }
  function showEmotion() {
    showFlow(overlayHeader('心情')+`<h2 class="flow-title">怎么了？</h2><div style="text-align:center;margin:12px 0">${sticker('pause','result-sticker')}</div><div class="mood-reasons" role="group" aria-label="当前心情"><button class="on" aria-pressed="true">压力有点大</button><button aria-pressed="false">有点无聊</button><button aria-pressed="false">累了</button><button aria-pressed="false">说不清</button></div><button class="primary" id="try-breathe">跟着呼吸</button><button class="secondary" id="try-play">玩一下贴纸</button>`);
    session.reason=session.reason||'压力有点大';
    $$('.mood-reasons button').forEach(button=>button.addEventListener('click',()=>{session.reason=button.textContent;$$('.mood-reasons button').forEach(b=>{b.classList.toggle('on',b===button);b.setAttribute('aria-pressed',b===button);});}));
    $('#try-breathe').addEventListener('click',showBreathe);$('#try-play').addEventListener('click',showPick);
  }
  function showPick() {
    showFlow(overlayHeader('缓一缓')+`<h2 class="flow-title">想吃什么？</h2><div class="food-grid">${[['奶茶','tea'],['薯片','chips'],['蛋糕','cake'],['薯条','fries'],['巧克力','chocolate'],['冰淇淋','icecream']].map(([food,art])=>`<button class="food-option ${selectedFood===food?'chosen':''}" data-food="${food}" data-sticker="${art}" aria-pressed="${selectedFood===food}">${sticker(art)}${food}</button>`).join('')}</div><div class="optional-input"><input id="custom-food" class="text-input" aria-label="其他想吃的食物" maxlength="24" placeholder="其他食物…"><button id="upload-photo" class="photo-button" aria-label="上传食物照片">▧</button><input id="food-photo" type="file" accept="image/*" hidden></div><div id="upload-preview"></div><p class="food-note">${esc(state.reminder)}</p><button class="primary" id="begin-play">开始 ${icon('arrow')}</button><button class="skip" id="no-food">跳过选择</button>`);
    $$('.food-option',overlay).forEach(button=>button.addEventListener('click',()=>{
      selectedFood=button.dataset.food;foodClass=button.dataset.sticker;
      if(photoURL){URL.revokeObjectURL(photoURL);photoURL=null;$('#upload-preview').innerHTML='';}
      $('#custom-food').value='';$$('.food-option',overlay).forEach(b=>{b.classList.toggle('chosen',b===button);b.setAttribute('aria-pressed',b===button);});
    }));
    $('#upload-photo').addEventListener('click',()=>$('#food-photo').click());
    $('#food-photo').addEventListener('change',event=>{
      const file=event.target.files[0];if(!file)return;
      if(!file.type.startsWith('image/')||file.size>10*1024*1024){toast('请选择 10 MB 以内的图片');return;}
      if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(file);selectedFood='想吃的东西';
      $('#upload-preview').innerHTML=`<img class="photo-preview" src="${photoURL}" alt="刚上传的食物照片">`;
      $$('.food-option',overlay).forEach(b=>{b.classList.remove('chosen');b.setAttribute('aria-pressed','false');});
    });
    $('#begin-play').addEventListener('click',()=>{const custom=$('#custom-food').value.trim();if(custom){selectedFood=custom;if(!photoURL)foodClass='pause';}showPlay();});
    $('#no-food').addEventListener('click',()=>{selectedFood='想吃的念头';foodClass='pause';if(photoURL){URL.revokeObjectURL(photoURL);photoURL=null;}showPlay();});
  }
  function showPlay() {
    hitCount=0;busy=false;
    showFlow(overlayHeader('互动','pick')+`<h2 class="flow-title">${mode==='throw'?'收起来。':'砸一下。'}</h2><div class="mode-switch" aria-label="互动方式"><button data-mode="throw" class="${mode==='throw'?'on':''}" aria-pressed="${mode==='throw'}">收进袋子</button><button data-mode="smash" class="${mode==='smash'?'on':''}" aria-pressed="${mode==='smash'}">咔嚓砸碎</button></div><div class="play-area" id="play-area"><span class="play-caption">${esc(selectedFood)}</span><button class="play-food" id="play-food" aria-label="${mode==='throw'?'把贴纸放进暂存袋':'点击砸碎贴纸'}">${photoURL?`<img src="${photoURL}" alt="上传的食物">`:sticker(foodClass)}</button><div class="paper-box">${mode==='throw'?'念 头 暂 存 袋':'小 小 碎 纸 盒'}</div></div><p class="play-tap-label" id="play-hint">${mode==='throw'?'往下拖，或点一下':'点一下贴纸，咔嚓一下 · 0 / 3'}</p><button class="primary" id="play-action">${mode==='throw'?'放进暂存袋 ↘':'砸一下 · 还剩 3 下'}</button><button class="secondary" id="other-way">换成呼吸</button>`);
    $$('[data-mode]',overlay).forEach(b=>b.addEventListener('click',()=>{if(busy)return;mode=b.dataset.mode;showPlay();}));
    $('#other-way').addEventListener('click',showBreathe);$('#play-action').addEventListener('click',playAction);
    const item=$('#play-food');let start=null,moved=false;
    item.addEventListener('pointerdown',event=>{if(busy)return;start={x:event.clientX,y:event.clientY};moved=false;item.setPointerCapture(event.pointerId);});
    item.addEventListener('pointermove',event=>{if(!start||mode!=='throw'||busy)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.hypot(dx,dy)>8)moved=true;item.style.transform=`translate(${Math.max(-70,Math.min(70,dx))}px,${Math.max(-25,Math.min(110,dy))}px) rotate(${dx/7}deg)`;});
    item.addEventListener('pointerup',event=>{if(!start||busy)return;const distance=event.clientY-start.y;const didMove=moved;start=null;item.style.transform='';if(mode==='throw'&&didMove&&distance>45)playAction();else if(!didMove)playAction();});
    item.addEventListener('pointercancel',()=>{start=null;item.style.transform='';});
    item.addEventListener('click',event=>{if(event.detail===0)playAction();});
  }
  function confetti() {
    const area=$('#play-area');if(!area)return;
    for(let i=0;i<18;i++){const part=document.createElement('i');part.className='confetti';part.style.cssText=`--c:${['#d8b7aa','#d9c483','#c4d2b1','#a8c7d1'][i%4]};--dx:${Math.cos(i*1.6)*100}px;--dy:${Math.sin(i*1.6)*65+75}px;--dr:${i*71}deg`;area.appendChild(part);}
  }
  function playAction() {
    if(busy||!$('#play-food'))return;
    const item=$('#play-food');session.method=mode;
    if(mode==='throw'){
      busy=true;item.classList.add('thrown');$('#play-action').disabled=true;$('#play-action').textContent='好，先放在这里。';later(()=>showResult(),760);
    }else{
      hitCount++;item.classList.remove('hit');void item.offsetWidth;item.classList.add('hit');$('#play-hint').textContent=`咔嚓一下 · ${hitCount} / 3`;
      if(hitCount>=3){busy=true;item.classList.add('smashed');confetti();$('#play-action').disabled=true;$('#play-action').textContent='砰！让念头松动一下。';later(()=>showResult(),700);}
      else $('#play-action').textContent=`再砸一下 · 还剩 ${3-hitCount} 下`;
    }
  }
  function showBreathe() {
    session.method='breath';
    showFlow(overlayHeader('呼吸','pick')+`<h2 class="flow-title">慢慢呼一口气。</h2><div class="breath-circle" id="breath-circle">${sticker('pause')}</div><div class="breath-text" id="breath-text" aria-live="polite">准备好了，慢慢吸气</div><p class="breath-count" id="breath-count">第 1 轮 / 共 2 轮</p><button class="secondary" id="end-breath">好了，继续</button>`);
    $('#end-breath').addEventListener('click',showResult);
    const phase=(n)=>{const circle=$('#breath-circle');if(!circle)return;const inhale=n%2===0;circle.classList.toggle('inhale',inhale);$('#breath-text').textContent=inhale?'慢慢吸气…':'轻轻呼气…';$('#breath-count').textContent=`第 ${Math.floor(n/2)+1} 轮 / 共 2 轮`;if(n<3)later(()=>phase(n+1),inhale?4000:6000);else later(showResult,6000);};
    later(()=>phase(0),100);
  }
  const rewardSequence=[['chips','薯片时刻贴纸'],['cake','蛋糕时刻贴纸'],['check','坚持小印记'],['medal','认真小勋章']];
  function rewardSession() {
    if(session && !session.rewarded){
      const reward=rewardSequence[Math.min(state.rewards,3)];
      session.rewarded=true;session.rewardSticker=reward[0];session.rewardName=state.rewards<4?reward[1]:'小暂停纪念章';
      if(state.rewards>=4)session.rewardSticker='check';
      state.rewards+=1;save();renderSummary();
    }
  }
  function showResult() {
    rewardSession();
    const title=session.method==='smash'?'砰！碎掉啦。':session.method==='breath'?'缓过来一点了吗？':'收好啦。';
    showFlow(overlayHeader('完成')+`<div class="result-wrap">${sticker(session.rewardSticker||'check','result-sticker')}<h2>${title}</h2><span class="reward-badge">新贴纸 +1</span><div class="outcome-buttons"><button class="primary" data-outcome="not-eaten">暂时不吃了</button><button class="secondary" data-outcome="eaten">吃了，也记下</button><button class="skip" data-outcome="later">还没决定</button></div></div>`);
    $$('[data-outcome]',overlay).forEach(b=>b.addEventListener('click',()=>recordOutcome(b.dataset.outcome)));
  }
  function recordOutcome(outcome) {
    if(!session||state.entries.some(entry=>entry.id===session.id))return;
    state.entries.push({id:session.id,outcome,food:selectedFood,sticker:photoURL?'pause':foodClass,method:session.method,mood:session.mood,reason:session.reason,date:'2026-10-08',time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})});
    save();closeFlow();session=null;month=9;year=2026;selectedDay=8;renderSummary();renderCalendar();navigate('calendar');
    toast(outcome==='not-eaten'?'这一次已经记下，克制记录 +1':outcome==='eaten'?'记录好了。吃了，也可以继续照顾自己。':'先替你记着，不用着急给答案。');
  }
  function renderSummary() {
    $('#days-count').textContent=String(22+(state.stamped?1:0)).padStart(2,'0');
    $('#restraint-count').textContent=String(34+state.entries.filter(e=>e.outcome==='not-eaten').length).padStart(2,'0');
    $('#collection-count').textContent=12+Math.min(4,state.rewards);
    $('[data-pack-count=cravings]').textContent=`${6+Math.min(2,state.rewards)} / 8`;
    $('[data-pack-count=care]').textContent=`${6+Math.max(0,Math.min(2,state.rewards-2))} / 8`;


    renderMemoryCard();




  }
  const octoberStickers={1:'meal',2:'tea',3:'headphones',5:'chips',6:'water',7:'check'};
  const septemberStickers={2:'tea',4:'croissant',5:'water',7:'headphones',8:'cake',10:'chips',12:'meal',14:'strawberry',16:'book',18:'donut',20:'chocolate',22:'water',24:'icecream',26:'fries',28:'pause',30:'check'};
  const sampleStories={tea:'那杯奶茶，先留在这里。给自己一点决定的时间。',croissant:'路过面包店的香气，记下了。',water:'起身接一杯水，缓一缓。',headphones:'戴上耳机，给自己一首歌的时间。',cake:'想吃甜食的下午，先停下来看看心情。',chips:'记录下馋薯片的那一刻。',meal:'认真坐下来吃了一顿饭。',strawberry:'一份喜欢的加餐，好好照顾自己。',book:'翻了几页书，心情慢慢松下来。',donut:'粉色甜甜圈，变成今天的小贴纸。',chocolate:'先放一放，再决定这一口甜。',icecream:'记住了这个想吃冰淇淋的瞬间。',fries:'薯条的念头，今天收在这里。',pause:'不是每次都要很用力，暂停一下也很好。',check:'给今天的健康饮食，盖一枚章。'};
  const samples=()=>year===2026?(month===8?septemberStickers:month===9?octoberStickers:{}):{};
  function renderCalendar() {
    $('#month-title').innerHTML=`${month+1}月 <small>${year}</small>`;
    const days=new Date(year,month+1,0).getDate(),start=(new Date(year,month,1).getDay()+6)%7;
    const october=year===2026&&month===9, sampleStickers=samples();let cells=[];
    for(let i=0;i<start;i++)cells.push('<span></span>');
    for(let d=1;d<=days;d++){
      const sample=Object.prototype.hasOwnProperty.call(sampleStickers,d);const isToday=october&&d===8;const marked=sample||(isToday&&state.stamped);const recorded=isToday&&state.entries.length>0;const dailyArt=recorded?state.entries[state.entries.length-1].sticker:sampleStickers[d]||'check';const past=new Date(year,month,d)<=new Date(2026,9,8);
      cells.push(`<button class="cal-day ${marked?'marked':''} ${selectedDay===d?'selected':''} ${past?'':'future'}" data-day="${d}" aria-label="${month+1}月${d}日${marked?'，已盖章':''}${isToday?'，今天':''}" aria-pressed="${selectedDay===d}"><span class="number">${d}</span>${(marked||recorded)?sticker(dailyArt,'day-sticker')+(marked?'<span class="day-seal"></span>':''):(isToday?'<span class="today-dot"></span>':'')}</button>`);
    }
    while(cells.length%7)cells.push('<span></span>');
    if(calendarView==='week'){const row=Math.floor((start+selectedDay-1)/7);cells=cells.slice(row*7,row*7+7);}
    $('#calendar-grid').innerHTML=cells.join('');
    $$('[data-day]').forEach(button=>button.addEventListener('click',()=>{selectedDay=Number(button.dataset.day);renderCalendar();}));
    renderDayDetail();
  }
  const outcomeLabel={'not-eaten':'暂时不吃了','eaten':'吃了，也认真记下','later':'先留一点决定的时间'};
  const moodLabel={hungry:'饿了',craving:'嘴馋了',emotion:'心情不好',unknown:'直接开始'};
  const methodLabel={throw:'收进暂存袋',smash:'咔嚓砸碎',breath:'跟着节奏呼吸'};
  function latestMemory(){
    return state.entries.length?state.entries[state.entries.length-1]:{example:true,food:'薯条',sticker:'fries',mood:'emotion',reason:'有点无聊',method:'throw',outcome:'later',date:'2026-09-26',time:'17:20'};
  }
  function renderMemoryCard(){
    const e=latestMemory();$('#memory-date').textContent=e.example?'09.26':'10.08';
    $('.memory-photo').className=`sticker ${e.sticker} memory-photo`;
    $('#memory-food').textContent=['想吃的念头','想吃的东西'].includes(e.food)?'一次小暂停':e.food;
  }
  function showMemory(e=latestMemory()){
    showCollection(overlayHeader('这一刻，有被记住')+`<h2 class="flow-title">${['想吃的念头','想吃的东西'].includes(e.food)?'想吃东西的':`想吃${esc(e.food)}的`}<br>那个瞬间。</h2><p class="flow-subtitle">${e.example?'这是一条示例回执。完成自己的小暂停后，<br>这里会换成你的真实记录。':'这是你刚刚为自己留出的一点时间。'}</p><div class="record-detail-card"><div class="record-detail-top">${sticker(e.sticker)}<div><h3>${esc(e.food)}</h3><p class="flow-subtitle">${e.example?'9 月 26 日':'10 月 8 日'} · ${esc(e.time)}</p></div></div><dl><div><dt>当时的状态</dt><dd>${esc(e.reason||moodLabel[e.mood])}</dd></div><div><dt>做了什么</dt><dd>${methodLabel[e.method]}</dd></div><div><dt>最后的决定</dt><dd>${outcomeLabel[e.outcome]}</dd></div></dl></div><button class="primary" id="memory-back">收好 ${icon('check')}</button>`);
    $('#memory-back').addEventListener('click',()=>collectionOverlay.hidden=true);
  }
  $('#open-latest').addEventListener('click',()=>showMemory());
  function renderDayDetail(){
    const isToday=year===2026&&month===9&&selectedDay===8, art=samples()[selectedDay], sample=Boolean(art), latest=state.entries[state.entries.length-1];
    const header=`<summary><b>${month+1}月${selectedDay}日${isToday?' · 今天':''}</b><span>记录 ${icon('arrow')}</span></summary>`;
    let content='';
    if(isToday&&latest)content=`<div class="day-story">${sticker(latest.sticker)}<div><b>${esc(latest.food)} · ${outcomeLabel[latest.outcome]}</b><small>${esc(latest.time)} · ${esc(latest.reason||moodLabel[latest.mood])}<br>${methodLabel[latest.method]}</small></div></div>`;
    else if(sample)content=`<div class="day-story">${sticker(art)}<div><b>${selectedDay===26&&month===8?'下班前，想吃薯条的那一刻':sampleStories[art]}</b><small>${selectedDay===26&&month===8?'17:20 · 有点无聊 · 收进暂存袋':'给自己留下一点小小的积累'}</small></div></div>`;
    else content=`<p>${isToday?'今天有按自己的计划好好吃饭吗？':'这一天还没有记录。'}</p>`;
    $('#day-detail').innerHTML='<details class="day-expand">'+header+content+'</details>'+(isToday?`<button class="stamp-button ${state.stamped?'done':''}" id="stamp-day" ${state.stamped?'disabled':''}>${icon('check')}${state.stamped?'健康饮食 · 已盖章':'健康饮食，盖个章'}</button>`:`<button class="stamp-button" id="back-today">回到今天 ${icon('arrow')}</button>`);
    $('#back-today')?.addEventListener('click',()=>{year=2026;month=9;selectedDay=8;renderCalendar();});
    $('#stamp-day')?.addEventListener('click',()=>{if(state.stamped)return;state.stamped=true;save();renderSummary();renderCalendar();toast('啪嗒！今天的健康饮食章已收好。');});
  }
  $('#prev-month').addEventListener('click',()=>{month--;if(month<0){month=11;year--;}selectedDay=1;renderCalendar();});
  $('#next-month').addEventListener('click',()=>{month++;if(month>11){month=0;year++;}selectedDay=1;renderCalendar();});
  $$('[data-calendar]').forEach(b=>b.addEventListener('click',()=>{calendarView=b.dataset.calendar;$$('[data-calendar]').forEach(el=>{el.classList.toggle('on',el===b);el.setAttribute('aria-pressed',el===b);});renderCalendar();}));
  function showCollection(html) { $('#more-menu').open=false; collectionOverlay.innerHTML=html;collectionOverlay.hidden=false;collectionOverlay.scrollTop=0;$$('[data-close],[data-back]',collectionOverlay).forEach(b=>b.addEventListener('click',()=>{collectionOverlay.hidden=true;})); }
  function editReminder(location='home') {
    const html=overlayHeader('我的提醒')+`<h2 class="flow-title">写给自己</h2><p class="flow-subtitle">下次嘴馋时，再看看这句话。</p><div style="text-align:right;height:106px">${sticker('book','result-sticker')}</div><label for="reminder-text" style="font-size:11px;color:#8e8269">我的小纸条</label><textarea id="reminder-text" class="reminder-area" maxlength="80">${esc(state.reminder)}</textarea><div class="field-caption"><span>留一点鼓励给自己</span><span id="char-count">${state.reminder.length} / 80</span></div><button class="primary" id="save-reminder">保存</button>`;
    if(location==='home')showFlow(html);else showCollection(html);
    $('#reminder-text').addEventListener('input',e=>{$('#char-count').textContent=`${e.target.value.length} / 80`;});
    $('#save-reminder').addEventListener('click',()=>{const value=$('#reminder-text').value.trim();if(!value){toast('先写一句想对自己说的话吧');return;}state.reminder=value;save();renderSummary();if(location==='home')closeFlow();else collectionOverlay.hidden=true;toast('小纸条收好了。');});
  }
$('#edit-reminder').addEventListener('click',()=>editReminder('collection'));
  const packItems={
    cravings:{name:'馋过的那些',note:'奶茶、薯片、甜甜圈。把想吃的瞬间变成小小收藏。',items:[['tea','那杯奶茶'],['croissant','面包的香气'],['donut','粉色甜甜圈'],['fries','薯条时刻'],['chocolate','一小块甜'],['icecream','冰淇淋时间'],['chips','薯片念头'],['cake','一口蛋糕']]},
    care:{name:'给心情放个假',note:'一杯水、一首歌、几页书。收好这些照顾自己的瞬间。',items:[['water','接一杯水'],['headphones','听一首歌'],['book','翻几页书'],['meal','认真吃饭'],['strawberry','新鲜日常'],['pause','留一分钟'],['check','坚持小印记'],['medal','认真小勋章']]}
  };
  const itemUnlocked=(packIndex,i)=>i<6||state.rewards>(packIndex*2+i-6);
  const packKeys=Object.keys(packItems);

  $$('[data-pack]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.pack, pack=packItems[key], packIndex=packKeys.indexOf(key);
    showCollection(overlayHeader(pack.name)+`<h2 class="flow-title">我的贴纸</h2><div class="pack-sheet">${pack.items.map((it,i)=>{const unlocked=itemUnlocked(packIndex,i);return `<div class="pack-item ${unlocked?'':'locked'}">${sticker(it[0])}<span>${it[1]}</span><span class="pack-label">${unlocked?'已收好':'待解锁'}</span></div>`;}).join('')}</div><p class="flow-subtitle">完成互动，解锁新贴纸。</p><button class="primary" id="pack-back">收好</button>`);
    $('#pack-back').addEventListener('click',()=>collectionOverlay.hidden=true);
  }));
  $('#open-ball').addEventListener('click',()=>{
    const items=packKeys.flatMap((key,p)=>packItems[key].items.filter((_,i)=>itemUnlocked(p,i)));
    showCollection(overlayHeader('摇摇我的小收藏')+`<h2 class="flow-title">我的贴纸球</h2><div class="glass-ball" id="glass-ball">${items.map((it,i)=>`<span class="sticker ${it[0]}" style="--x:${25+(i%4)*50}px;--y:${16+Math.floor(i/4)*48}px;--r:${(i%3-1)*18}deg" aria-hidden="true"></span>`).join('')}</div><button class="primary" id="shake-ball">摇一摇</button><p class="flow-subtitle" style="text-align:center">${12+Math.min(4,state.rewards)} 枚贴纸</p>`);
    let ballTimer;$('#shake-ball').addEventListener('click',()=>{const ball=$('#glass-ball');clearTimeout(ballTimer);ball.classList.add('shaking');ballTimer=setTimeout(()=>ball.classList.remove('shaking'),650);});
  });

  $('#open-history').addEventListener('click',()=>{
    const rows=state.entries.length?state.entries.slice(-5).reverse().map(e=>`<div class="history-row">${sticker(e.sticker)}<div>${esc(e.food)} · ${e.outcome==='not-eaten'?'暂时不吃了':e.outcome==='eaten'?'吃了，也记录':'待会儿再决定'}<small>今天 ${esc(e.time)} · ${methodLabel[e.method]}</small></div>`).join(''):`<div class="history-row">${sticker('medal')}<div>10月7日 · 认真照顾自己<small>已收好一枚健康饮食章</small></div><div class="history-row">${sticker('pause')}<div>10月6日 · 给自己留了个暂停<small>接一杯水，让自己歇一会儿</small></div>`;
    showCollection(overlayHeader('记录')+`<h2 class="flow-title">最近记录</h2>${rows}`);
  });
  $('#reset-demo').addEventListener('click',()=>{state={...base,entries:[]};save();closeFlow();collectionOverlay.hidden=true;month=8;year=2026;selectedDay=26;calendarView='month';mode='throw';session=null;if(photoURL){URL.revokeObjectURL(photoURL);photoURL=null;}$$('[data-calendar]').forEach(b=>{const on=b.dataset.calendar==='month';b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});setMood('craving');renderSummary();renderCalendar();navigate('home');toast('已恢复初始示例，可以重新体验。');});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeFlow();collectionOverlay.hidden=true;}});
  renderSummary();renderCalendar();
})();
