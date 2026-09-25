/* Shared outing rules. No timers or browser storage: time is always derived from endsAt. */
(function(root){
  'use strict';
  const fixed = {garden:[15,10],cafe:[30,18],bookstore:[60,30],gym:[90,40],mall:[120,50],forest:[180,70],aquarium:[240,90],beach:[300,110],amusement:[360,130],hotspring:[480,170],camp:[600,210],snow:[720,250]};
  const legacy = {garden:[15,10],cafe:[30,18],forest:[60,30],gym:[60,30],mall:[120,50],beach:[180,70]};
  const scenes = [
    {id:'garden',name:'花语花园',icon:'🌷',minutes:15,reward:10,tag:'轻松散步',description:'晒晒太阳，追着蝴蝶走一小段路。',steps:['沿着花间小径慢慢散步','追着蝴蝶，发现了一朵小雏菊','带着一身花香准备回家'],stories:['追着蝴蝶绕过花坛，又在长椅旁晒了一个舒服的太阳。','发现一朵心形花瓣，把这个小秘密留给了你。']},
    {id:'cafe',name:'街角咖啡馆',icon:'☕',minutes:30,reward:18,tag:'悠闲午后',description:'坐在窗边，等一份甜甜的小点心。',steps:['找到了一个靠窗的好位置','正趴在窗边等它的小蛋糕','向店员挥挥爪子，准备回家'],stories:['在窗边看云朵发呆，连小蛋糕上的奶油都舍不得吃完。','听完店里的轻音乐，决定把今天的好心情带回家。']},
    {id:'forest',name:'松果森林',icon:'🌲',minutes:60,reward:30,tag:'林间探险',description:'穿过树影，寻找藏在草丛里的松果。',steps:['沿着小路走进了森林','在树下发现了一颗圆圆的松果','听着溪水声，沿原路往回走'],stories:['跟着溪流找到一片蘑菇地，还在树荫下打了个小盹。','认真数了数路边的松果，数到一半被落叶吸引走了。']},
    {id:'gym',name:'活力健身房',icon:'💪',minutes:60,reward:30,tag:'元气运动',description:'伸伸懒腰，今天也要动一动小爪子。',steps:['在运动垫上做了一套伸展运动','正在跑步机上努力迈着小短腿','擦擦汗，带着满满元气回家'],stories:['举起迷你哑铃练了好一会儿，最后用一个大大的懒腰收尾。','认真完成跑步和拉伸，觉得自己又变厉害了一点点。']},
    {id:'mall',name:'缤纷商场',icon:'🛍️',minutes:120,reward:50,tag:'橱窗漫游',description:'逛逛漂亮橱窗，发现生活里的小惊喜。',steps:['被街角漂亮的橱窗吸引住了','正在镜子前认真试戴小帽子','心满意足地结束逛街，准备回家'],stories:['试戴了三顶小帽子，最后发现还是自己的装扮最好看。','把每一家橱窗都看了一遍，回家有好多新鲜事想告诉你。']},
    {id:'beach',name:'贝壳海湾',icon:'🌊',minutes:180,reward:70,tag:'海风假期',description:'听海浪、堆沙堡，享受一场慢悠悠的旅行。',steps:['踩着软软的沙子来到海边','正专心堆一座小小的沙堡','和海浪道别，抖抖爪子上的细沙'],stories:['堆了一座歪歪的小沙堡，还给它留了一扇面朝大海的窗。','听着海浪睡了个好觉，梦里也有你陪着一起捡贝壳。']}
    ,{id:'bookstore',name:'午后书店',icon:'📚',tag:'静静阅读',description:'翻一本绘本，在阅读软垫上打个小盹。',steps:['找到了窗边的阅读软垫','正认真翻一本彩色绘本','把书放回原处，准备回家'],stories:['看了一本关于旅行的绘本，梦里又去了一趟远方。','在书架间发现一本小故事，想回家慢慢讲给你听。']}
    ,{id:'amusement',name:'糖果游乐园',icon:'🎡',tag:'快乐巡游',description:'坐旋转木马，追随气球和花车的色彩。',steps:['沿着彩色小路走进游乐园','正看着旋转木马开心地摇尾巴','和摩天轮道别，带着快乐回家'],stories:['看过花车又坐了木马，把最开心的一刻留在了心里。','数了好多彩色气球，觉得今天像一颗甜甜的糖果。']}
    ,{id:'camp',name:'星光营地',icon:'⛺',tag:'星空野餐',description:'钻进小帐篷，等一场满天星光。',steps:['在灯串下铺好了野餐垫','正望着夜空认真数星星','收好小帐篷，把星光带回家'],stories:['找到一颗特别亮的星星，悄悄对它许了一个愿望。','在暖暖的灯串下睡了个好觉，梦里都是闪亮的小星星。']}
    ,{id:'hotspring',name:'樱花温泉',icon:'🌸',tag:'温暖休憩',description:'看花瓣落在水面，享受暖暖的休息时光。',steps:['沿着石板路来到樱花树下','在温泉边暖暖地泡着小爪子','擦干爪子，舒舒服服地回家'],stories:['看花瓣在水面打转，舒服得差一点就睡着了。','休息过后伸了个大懒腰，觉得小爪子都轻快了。']}
    ,{id:'aquarium',name:'蓝鲸水族馆',icon:'🐠',tag:'海底漫游',description:'穿过蓝色隧道，看水母轻轻漂浮。',steps:['好奇地走进了海底隧道','正隔着玻璃和小鱼打招呼','看完水母，沿着蓝色走廊回家'],stories:['跟着一群小鱼走了好远，还看到了像小伞一样的水母。','在蓝色隧道里抬头看了很久，仿佛做了一场海底的梦。']}
    ,{id:'snow',name:'暖灯雪村',icon:'❄️',tag:'雪地假期',description:'踩一串小脚印，堆一个圆滚滚的雪人。',steps:['在软软的雪地上留下小脚印','正在给小雪人围上围巾','望着暖黄的窗灯，踏上回家的路'],stories:['堆了一个圆滚滚的雪人，还给它取了一个可爱的名字。','在雪地踩出一串小脚印，回头看时像一条小花边。']}
  ].map(s=>Object.freeze({...s,minutes:fixed[s.id][0],reward:fixed[s.id][1],category:({cafe:'city',gym:'city',mall:'city',bookstore:'city',aquarium:'city',garden:'nature',forest:'nature',camp:'nature'})[s.id]||'holiday',image:'./generated-images/outing-'+s.id+'-v2.webp',thumbnail:'./generated-images/outing-'+s.id+'-thumb-v2.webp'})).sort((a,b)=>a.minutes-b.minutes);
  const scene = id => scenes.find(s=>s.id===id);
  const validHours=h=>Number.isInteger(h)&&h>=3&&h<=12;
  const rewardForHours=h=>validHours(h)?70+(h-3)*20:0;
  function trip(p){
    const t=p?.outing,s=scene(t?.sceneId);
    if(!s||typeof t.id!=='string'||!Number.isFinite(t.startedAt)||!Number.isFinite(t.endsAt))return null;
    if(t.version===3)return t.minutes===s.minutes&&t.reward===s.reward&&t.endsAt===t.startedAt+t.minutes*60000?t:null;
    if(t.version===2)return validHours(t.hours)&&t.reward===rewardForHours(t.hours)&&t.endsAt===t.startedAt+t.hours*3600000?t:null;
    // Original six scene durations/rewards are intentionally retained for pre-v107 saves.
    return t.version==null&&legacy[s.id]&&t.endsAt===t.startedAt+legacy[s.id][0]*60000?t:null;
  }
  function terms(p){const t=trip(p);if(!t)return null;const s=scene(t.sceneId);return {minutes:(t.endsAt-t.startedAt)/60000,reward:t.version>=2?t.reward:legacy[s.id][1]};}
  function status(p,now=Date.now()){
    const t=trip(p);
    return !t?'home':now<t.endsAt?'away':'ready';
  }
  function pending(data){return (data.pet?.owned||[]).find(p=>trip(p));}
  function start(data,petId,sceneId,now=Date.now(),random=Math.random()){
    const p=data.pet?.owned?.find(p=>p.id===petId),s=scene(sceneId);
    if(!p||!s)return {ok:false,reason:'missing'};
    if(pending(data))return {ok:false,reason:'pending'};
    p.outing={version:3,minutes:s.minutes,reward:s.reward,id:petId+'-'+now+'-'+random.toString(36).slice(2),sceneId,startedAt:now,endsAt:now+s.minutes*60000,storyIndex:Math.min(s.stories.length-1,Math.max(0,Math.floor(random*s.stories.length)))};
    return {ok:true,trip:p.outing};
  }
  function claim(data,petId,tripId,now=Date.now()){
    const p=data.pet?.owned?.find(p=>p.id===petId),t=trip(p);
    if(!t||t.id!==tripId||status(p,now)!=='ready')return {ok:false,reason:'not-ready'};
    const reward=terms(p).reward;
    if(!data.game)data.game={energy:0};
    data.game.energy=(Number(data.game.energy)||0)+reward;
    p.lastOuting={...t,claimedAt:now,reward};
    delete p.outing;
    return {ok:true,reward};
  }
  function cancel(data,petId,tripId,now=Date.now()){
    const p=data.pet?.owned?.find(p=>p.id===petId),t=trip(p);
    if(!t||t.id!==tripId)return {ok:false,reason:'missing'};
    // Crossing the finish time while the confirmation is open must never discard a reward.
    if(status(p,now)==='ready')return {ok:false,reason:'finished'};
    delete p.outing;
    return {ok:true};
  }
  function progress(p,now=Date.now()){
    const t=trip(p);
    return t?Math.max(0,Math.min(1,(now-t.startedAt)/(t.endsAt-t.startedAt))):0;
  }
  function remaining(p,now=Date.now()){
    const t=trip(p);let seconds=t?Math.max(0,Math.ceil((t.endsAt-now)/1000)):0;
    const hours=Math.floor(seconds/3600);seconds%=3600;
    return (hours?String(hours).padStart(2,'0')+':':'')+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  }
  const api={scenes,scene,trip,terms,validHours,rewardForHours,status,pending,start,claim,cancel,progress,remaining};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PetOutings=api;
})(globalThis);
