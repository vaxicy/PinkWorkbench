let foodMenuSession=null;
let foodSaving=false;
function showPetFoodMenu(id){
  if(outingAway(id))return;
  const p=outingPet(id);if(!p)return;
  foodMenuSession={petId:id,foodId:null,requestId:globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random()};
  showModal({title:'🍚 给'+p.name+'选一份好吃的',noCancel:true,hideOk:true,closeButton:true,modalClass:'food-modal',
    body:`<div class="food-summary" id="foodSummary"></div><div class="food-grid">${PetFood.foods.map(f=>`<button type="button" class="food-card" data-food-id="${f.id}" aria-pressed="false" onclick="selectPetFood('${f.id}')"><img src="${f.image}" alt="${f.name}" /><small>${f.tag}</small><b>${f.name}</b><span class="food-effects">饱腹 +${f.hunger} · 心情 +${f.happiness}</span><span class="food-price">❤️ ${f.price}</span><span class="food-shortfall"></span></button>`).join('')}</div>`,
    render:(_body,extra)=>{extra.innerHTML='<div class="food-footer"><div class="food-preview" id="foodPreview" aria-live="polite"></div><button class="outing-button primary food-submit" id="foodSubmit" onclick="submitPetFood()" disabled>先选一份食物</button></div>';}
  });
  updatePetFoodMenu();
}
function selectPetFood(id){
  if(!foodMenuSession||foodSaving||!PetFood.food(id))return;
  foodMenuSession.foodId=id;updatePetFoodMenu();
}
function updatePetFoodMenu(){
  if(!foodMenuSession||!document.querySelector('#modalOverlay.show .food-modal'))return;
  const p=outingPet(foodMenuSession.petId);
  if(!p){hideModal();return;}
  const f=PetFood.food(foodMenuSession.foodId),v=PetFood.preview(p,f),energy=Number(state.game.energy)||0,away=outingAway(p.id);
  document.getElementById('foodSummary').innerHTML=`<span>❤️ 可用 ${energy} 爱心</span><span>🍚 饱腹 ${v.hunger}/100</span><span>💗 心情 ${v.happiness}/100</span>`;
  document.querySelectorAll('.food-card').forEach(el=>{
    const item=PetFood.food(el.dataset.foodId);el.setAttribute('aria-pressed',String(item.id===f?.id));
    el.disabled=foodSaving;
    el.querySelector('.food-shortfall').textContent=energy<item.price?'还差 '+(item.price-energy)+' 爱心':' '; 
  });
  const preview=document.getElementById('foodPreview'),button=document.getElementById('foodSubmit');
  if(away)preview.textContent='宠物出门啦，等它回家再一起吃饭吧。';
  else if(v.full)preview.textContent='已经吃饱，也很开心啦。等消耗一些体力再来吃吧！';
  else if(!f)preview.textContent='点选食物，查看实际恢复量；确认喂食后才扣爱心。';
  else preview.innerHTML=`<b>${f.name}</b><br><span>饱腹 ${v.hunger} → ${v.nextHunger}（实际 +${v.hungerGain}）</span><span>心情 ${v.happiness} → ${v.nextHappiness}（实际 +${v.happinessGain}）</span>`;
  button.disabled=foodSaving||away||v.full||!f||energy<f.price;
  button.textContent=foodSaving?'正在喂食…':away?'等宠物回家':v.full?'已经吃饱，也很开心啦':!f?'先选一份食物':energy<f.price?'还差 '+(f.price-energy)+' 爱心':'喂给'+p.name+' · 消耗 '+f.price+' 爱心';
}
async function submitPetFood(){
  if(foodSaving||!foodMenuSession||!PetFood.food(foodMenuSession.foodId))return;
  const session={...foodMenuSession};foodSaving=true;updatePetFoodMenu();
  try{
    const commit=()=>{
      const raw=localStorage.getItem(STORAGE_KEY);
      const next=raw?ensureState(JSON.parse(raw)):JSON.parse(JSON.stringify(state));
      const result=PetFood.feed(next,session.petId,session.foodId,session.requestId);
      if(result.ok)localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
      state=next;return result;
    };
    // Use the same lock as outing rewards so both changes see the latest balance.
    const result=navigator.locks?.request?await navigator.locks.request('pink-workbench-outing',commit):commit();
    if(result.ok){
      foodMenuSession=null;hideModal();render();animatePetMeal(session.petId,PetFood.food(session.foodId),result);
    }else if(result.reason==='duplicate'){foodMenuSession=null;hideModal();render();}
    else updatePetFoodMenu();
  }catch(error){
    console.error('Food save failed',error);
    showModal({title:'喂食没有保存成功',body:'没有扣除爱心，也没有改变宠物状态。请检查浏览器存储空间后再试。',noCancel:true});
  }finally{foodSaving=false;updatePetFoodMenu();}
}
function animatePetMeal(id,f,result){
  const room=getPetRoom(id);if(!room||outingAway(id))return;
  clearTimeout(window._petIdleTimer);
  room.classList.add('is-feeding');
  const serving=div('food-serving');serving.innerHTML=`<img src="${f.image}" alt="${f.name}" />`;
  const gains=div('food-gains');gains.textContent=`饱腹 +${result.hungerGain} · 心情 +${result.happinessGain}`;
  room.append(serving,gains);
  playPetSpriteAction(id,'feed','is-feed');
  scenePetSay(room,f.say).done(f.say);
  setTimeout(()=>{serving.remove();gains.remove();room.classList.remove('is-feeding');schedulePetIdle(id);},3300);
}
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY)updatePetFoodMenu();});
