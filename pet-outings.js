/* UI integration for the existing local-first workbench. */
function outingPet(id){return (state.pet.owned||[]).find(p=>p.id===id);}
function outingDuration(s){return s.minutes<60?s.minutes+' 分钟':s.minutes/60+' 小时';}
function outingAway(id){return PetOutings.status(outingPet(id))==='away';}
function outingStep(p){
  const t=PetOutings.trip(p),s=PetOutings.scene(t?.sceneId);
  return s?s.steps[Math.min(2,Math.floor(PetOutings.progress(p)*3))]:'';
}
function outingHomeHtml(p){
  const t=PetOutings.trip(p),s=PetOutings.scene(t?.sceneId),status=PetOutings.status(p);
  if(t){
    const ready=status==='ready',reward=PetOutings.terms(p).reward;
    return `<section class="outing-status" data-outing-home="${p.id}" data-outing-status="${status}">
      <div class="outing-status-copy"><b>${ready?'🎒 '+esc(p.name)+'回来啦！':s.icon+' '+esc(p.name)+'正在'+s.name}</b>
      <p>${ready?'带回了新鲜见闻，还有 '+reward+' 爱心等你领取。':`<span data-outing-step="${p.id}">${outingStep(p)}</span>`}</p>
      ${ready?'':`<p>距离回家 <time class="outing-time" data-outing-time="${p.id}">${PetOutings.remaining(p)}</time></p><progress class="outing-progress" data-outing-progress="${p.id}" max="1" value="${PetOutings.progress(p)}" aria-label="出游进度"></progress>`}</div>
      <div class="outing-status-actions"><button class="outing-button primary" onclick="showPetOuting(${p.id})">${ready?'打开出游收获':'去看看'}</button>${ready?'':`<button class="outing-button" onclick="recallPetOuting(${p.id})">提前回家</button>`}</div>
    </section>`;
  }
  const other=PetOutings.pending(state);
  return `<section class="outing-entry"><div><b>🧳 今天想去哪里？</b><p>${other?esc(other.name)+(PetOutings.status(other)==='away'?'正在出游，等它回来再一起计划吧。':'的出游收获还没领取。'):'花园散步、咖啡馆小憩，带着爱心回家。'}</p></div>
    <button class="outing-button primary" onclick="${other?`showPetOuting(${other.id})`:`showPetDestinations(${p.id})`}">${other?'查看行程':'出去玩'}</button></section>`;
}
function outingModal(title,body,footer=''){
  showModal({title,body,noCancel:true,hideOk:true,closeButton:true,modalClass:'outing-modal',render:(_body,extra)=>{extra.innerHTML=footer;}});
}
function outingImageHtml(s,thumbnail=false){
  const src=thumbnail?s.thumbnail:s.image;
  return `<div class="outing-image-wrap ${thumbnail?'thumb':'full'}"><img class="${thumbnail?'':'outing-scene-bg'}" src="${src}" data-image-src="${src}" alt="${s.name}的像素风景" decoding="async" onload="this.parentElement.classList.add('loaded');this.parentElement.classList.remove('failed')" onerror="this.parentElement.classList.add('failed');this.parentElement.classList.remove('loaded')" /><span class="outing-image-loading">${s.icon} 正在装好风景…</span><button class="outing-image-retry" type="button" onclick="event.stopPropagation();retryOutingImage(this)">图片未加载 · 点此重试</button></div>`;
}
function retryOutingImage(button){
  const wrap=button.parentElement,img=wrap.querySelector('img');
  wrap.classList.remove('failed','loaded');img.src=img.dataset.imageSrc+'?retry='+Date.now();
}
function outingSceneHtml(s,p){
  return `<div class="outing-scene">${outingImageHtml(s)}${p?`<img class="outing-scene-pet" src="./generated-images/${petOutfitSpriteAsset(p,'idle')}" alt="正在${s.name}的${esc(p.name)}" />`:''}<span class="outing-scene-label">${s.icon} ${s.tag}</span></div>`;
}
let outingCategory='all';
let outingSelection=null;
function showPetDestinations(id,category=outingCategory){
  if(!outingPet(id))return;
  const pending=PetOutings.pending(state);if(pending)return showPetOuting(pending.id);
  outingCategory=['all','city','nature','holiday'].includes(category)?category:'all';
  const scenes=PetOutings.scenes.filter(s=>outingCategory==='all'||s.category===outingCategory);
  outingModal('🧳 今天想去哪里？',`<div class="outing-catalog-header"><p class="outing-intro">12 个目的地 · 15 分钟～12 小时 · 按时长排列 · 免费出发</p><div class="outing-filters" aria-label="地点分类">${[['all','全部'],['city','城市'],['nature','自然'],['holiday','度假']].map(([key,label])=>`<button class="outing-button" aria-pressed="${outingCategory===key}" onclick="showPetDestinations(${id},'${key}')">${label}</button>`).join('')}<span>${scenes.length} 个地点 · 向下滑动探索</span></div></div>
    <div class="outing-destinations">${scenes.map(s=>`<article class="outing-destination" onclick="previewPetOuting(${id},'${s.id}')">${outingImageHtml(s,true)}<button class="outing-card-select" type="button"><span class="outing-card-copy"><b>${s.icon} ${s.name}</b><small>${s.description}</small><span class="outing-card-meta"><span>🕒 ${outingDuration(s)}</span><span>❤️ ${s.reward}</span></span><span class="outing-card-cta">去这里 →</span></span></button></article>`).join('')}</div>`);
  document.getElementById('modalBody').scrollTop=0;
}
function previewPetOuting(id,sceneId){
  const p=outingPet(id),s=PetOutings.scene(sceneId);if(!p||!s)return;
  const pending=PetOutings.pending(state);if(pending)return showPetOuting(pending.id);
  outingSelection={petId:id,sceneId};
  outingModal(s.icon+' '+s.name,`${outingSceneHtml(s)}<div class="outing-detail-copy"><h3>${s.tag}，就从这里开始</h3><p>${s.description}</p></div>
    <div class="outing-detail-meta"><span>🕒 固定时长 ${outingDuration(s)}</span><span>❤️ 完成可领 ${s.reward} 爱心</span></div>
    <p class="outing-intro">出发后${esc(p.name)}会暂时离开房间。关闭页面继续计时；提前回家不获得奖励。</p>`,
    `<div class="outing-departure-footer"><div class="outing-plan-summary" aria-live="polite"><b id="outingRewardPreview"></b><span id="outingArrivalPreview"></span></div><div class="outing-detail-actions"><button class="outing-button" onclick="showPetDestinations(${id})">← 换个地方</button><button id="outingDepart" class="outing-button primary" onclick="startPetOuting(${id},'${s.id}',this)"></button></div></div>`);
  updateOutingPlan();document.getElementById('modalBody').scrollTop=0;
}
function updateOutingPlan(){
  if(!outingSelection||!document.querySelector('#modalOverlay.show #outingDepart'))return;
  const s=PetOutings.scene(outingSelection.sceneId),now=new Date(),arrival=new Date(now.getTime()+s.minutes*60000);
  const day=arrival.toDateString()===now.toDateString()?'今天':'明天';
  document.getElementById('outingRewardPreview').textContent='❤️ 预计获得 '+s.reward+' 爱心';
  document.getElementById('outingArrivalPreview').textContent='预计'+day+' '+arrival.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})+' 回家';
  document.getElementById('outingDepart').textContent='出发 · '+outingDuration(s);
}

let outingWriting=false;
async function mutatePetOuting(change){
  if(outingWriting)return {ok:false,reason:'busy'};
  outingWriting=true;
  try{
    const commit=()=>{
      // Reload inside the cross-tab lock, then persist trip and balance in one write.
      const raw=localStorage.getItem(STORAGE_KEY);
      const next=raw?ensureState(JSON.parse(raw)):JSON.parse(JSON.stringify(state));
      const result=change(next);
      if(result.ok)localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
      state=next;
      return result;
    };
    return navigator.locks?.request?await navigator.locks.request('pink-workbench-outing',commit):commit();
  }catch(error){
    console.error('Outing save failed',error);
    showModal({title:'这次没有保存成功',body:'行程和爱心都没有变动。请检查浏览器存储空间后重试。',noCancel:true});
    return {ok:false,reason:'storage'};
  }finally{outingWriting=false;}
}
async function startPetOuting(id,sceneId,button){
  if(button)button.disabled=true;
  const result=await mutatePetOuting(data=>PetOutings.start(data,id,sceneId,Date.now(),Math.random()));
  if(result.ok){clearTimeout(window._petIdleTimer);hideModal();render();}
  else if(result.reason==='pending'){render();showPetOuting(PetOutings.pending(state).id);}
  if(button)button.disabled=false;
}
function showPetOuting(id){
  const p=outingPet(id),t=PetOutings.trip(p);if(!t)return;
  const s=PetOutings.scene(t.sceneId),ready=PetOutings.status(p)==='ready',terms=PetOutings.terms(p);
  const story=s.stories[t.storyIndex]||s.stories[0];
  outingModal(ready?'🎒 '+p.name+'的出游收获':s.icon+' '+p.name+'正在'+s.name,
    `<div data-outing-detail="${id}" data-outing-status="${ready?'ready':'away'}">${outingSceneHtml(s,ready?null:p)}
    ${ready?`<div class="outing-reward"><strong>❤️ +${terms.reward}</strong><p>${esc(p.name)}${story}</p><p>已回到房间 · ${s.name} · ${outingDuration(terms)}</p></div><div class="outing-detail-actions"><button class="outing-button primary" onclick="claimPetOuting(${id},this)">收下 ${terms.reward} 爱心</button></div>`:
    `<div class="outing-detail-copy"><h3 data-outing-step="${id}">${outingStep(p)}</h3><p>距离回家 <time class="outing-time" data-outing-time="${id}">${PetOutings.remaining(p)}</time></p><progress class="outing-progress" data-outing-progress="${id}" max="1" value="${PetOutings.progress(p)}" aria-label="出游进度"></progress><div class="outing-detail-meta"><span>❤️ 完成可领 ${terms.reward} 爱心</span><span>关掉页面也会继续</span></div></div><div class="outing-detail-actions"><button class="outing-button" onclick="recallPetOuting(${id})">提前回家</button><button class="outing-button primary" onclick="hideModal()">让它再玩一会儿</button></div>`}</div>`);
}
async function recallPetOuting(id){
  const p=outingPet(id),t=PetOutings.trip(p);if(!t)return;
  if(PetOutings.status(p)==='ready')return showPetOuting(id);
  const tripId=t.id;
  const yes=await showConfirm(`要让${esc(p.name)}提前回家吗？本次不会获得爱心奖励。`);
  if(!yes)return;
  const result=await mutatePetOuting(data=>PetOutings.cancel(data,id,tripId));
  if(result.ok){hideModal();render();}
  else if(result.reason==='finished'){render();showPetOuting(id);}
}
function flyOutingHearts(origin){
  if(!origin||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const target=document.getElementById('energyBadge')||document.querySelector('.nurture-resources .resource-pill');
  if(!target)return;
  const to=target.getBoundingClientRect();
  for(let i=0;i<6;i++){
    const heart=div('outing-flying-heart');heart.textContent='💖';
    heart.style.left=origin.x+'px';heart.style.top=origin.y+'px';heart.style.animationDelay=(i*60)+'ms';
    heart.style.setProperty('--fly-x',(to.left+to.width/2-origin.x)+'px');heart.style.setProperty('--fly-y',(to.top-origin.y)+'px');
    document.body.appendChild(heart);setTimeout(()=>heart.remove(),1500);
  }
}
async function claimPetOuting(id,button){
  const t=PetOutings.trip(outingPet(id));if(!t)return;
  const rect=button?.getBoundingClientRect(),origin=rect?{x:rect.left+rect.width/2,y:rect.top}:null;
  if(button)button.disabled=true;
  const result=await mutatePetOuting(data=>PetOutings.claim(data,id,t.id));
  if(result.ok){hideModal();render();showHeartToast(result.reward);flyOutingHearts(origin);}
  else if(result.reason!=='storage'&&result.reason!=='busy'){hideModal();render();}
  if(button)button.disabled=false;
}
function updatePetOutingClock(){
  if(document.hidden)return;
  updateOutingPlan();
  let refreshHome=false;
  document.querySelectorAll('[data-outing-home]').forEach(el=>{
    if(PetOutings.status(outingPet(Number(el.dataset.outingHome)))!==el.dataset.outingStatus)refreshHome=true;
  });
  if(refreshHome)render();
  const detail=document.querySelector('#modalOverlay.show [data-outing-detail]');
  if(detail){
    const id=Number(detail.dataset.outingDetail),p=outingPet(id);
    if(!PetOutings.trip(p))hideModal();
    else if(PetOutings.status(p)!==detail.dataset.outingStatus)showPetOuting(id);
  }
  document.querySelectorAll('[data-outing-time]').forEach(el=>{el.textContent=PetOutings.remaining(outingPet(Number(el.dataset.outingTime)));});
  document.querySelectorAll('[data-outing-step]').forEach(el=>{el.textContent=outingStep(outingPet(Number(el.dataset.outingStep)));});
  document.querySelectorAll('[data-outing-progress]').forEach(el=>{el.value=PetOutings.progress(outingPet(Number(el.dataset.outingProgress)));});
}
setInterval(updatePetOutingClock,1000);
document.addEventListener('visibilitychange',updatePetOutingClock);
window.addEventListener('pageshow',updatePetOutingClock);
window.addEventListener('storage',event=>{
  if(event.key!==STORAGE_KEY)return;
  state=loadState();
  render();
  updatePetOutingClock();
});
