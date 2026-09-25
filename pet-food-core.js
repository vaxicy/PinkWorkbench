(function(root){
  'use strict';
  const foods=[
    {id:'kibble',name:'日常粮碗',price:3,hunger:20,happiness:3,tag:'日常主食',say:'咔嚓咔嚓，今天也有好好吃饭！'},
    {id:'meat',name:'香香肉粒',price:5,hunger:30,happiness:6,tag:'香香主食',say:'这份肉粒好香呀！'},
    {id:'rice',name:'蔬菜饭团',price:5,hunger:35,happiness:3,tag:'饱腹主食',say:'圆滚滚的饭团，吃完肚子暖暖的。'},
    {id:'cookies',name:'爪印饼干',price:4,hunger:10,happiness:15,tag:'心情零食',say:'饼干上也有小爪印，和我的一样！'},
    {id:'pudding',name:'宠物布丁',price:7,hunger:15,happiness:25,tag:'开心甜点',say:'软乎乎的布丁，把心情也变甜啦！'},
    {id:'bento',name:'豪华便当',price:12,hunger:60,happiness:20,tag:'丰盛套餐',say:'哇，这么丰盛！每一口都是你的心意。'}
  ].map(f=>Object.freeze({...f,image:'./generated-images/food-'+f.id+'-v1.png'}));
  const food=id=>foods.find(f=>f.id===id);
  const stat=n=>Math.max(0,Math.min(100,Math.round(Number.isFinite(n)?n:80)));
  function preview(p,f){
    const hunger=stat(p?.hunger),happiness=stat(p?.happiness);
    const nextHunger=Math.min(100,hunger+(f?.hunger||0)),nextHappiness=Math.min(100,happiness+(f?.happiness||0));
    return {hunger,happiness,nextHunger,nextHappiness,hungerGain:nextHunger-hunger,happinessGain:nextHappiness-happiness,full:hunger===100&&happiness===100};
  }
  function feed(data,petId,foodId,requestId,now=Date.now()){
    const p=data.pet?.owned?.find(p=>p.id===petId),f=food(foodId);
    if(!p||!f||typeof requestId!=='string'||!requestId)return {ok:false,reason:'missing'};
    if(p.lastMeal?.requestId===requestId)return {ok:false,reason:'duplicate'};
    if(p.outing&&Number.isFinite(p.outing.endsAt)&&p.outing.endsAt>now)return {ok:false,reason:'away'};
    const result=preview(p,f),energy=Number(data.game?.energy)||0;
    if(result.full)return {ok:false,reason:'full'};
    if(energy<f.price)return {ok:false,reason:'funds',shortfall:f.price-energy};
    data.game.energy=energy-f.price;
    p.hunger=result.nextHunger;p.happiness=result.nextHappiness;p.lastPetTick=now;
    p.lastMeal={requestId,foodId,at:now};
    return {ok:true,...result,price:f.price,foodId};
  }
  const api={foods,food,stat,preview,feed};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PetFood=api;
})(globalThis);
