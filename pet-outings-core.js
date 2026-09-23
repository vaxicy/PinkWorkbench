/* Shared outing rules. No timers or browser storage: time is always derived from endsAt. */
(function(root){
  'use strict';
  const scenes = [
    {id:'garden',name:'花语花园',icon:'🌷',minutes:15,reward:10,tag:'轻松散步',description:'晒晒太阳，追着蝴蝶走一小段路。',steps:['沿着花间小径慢慢散步','追着蝴蝶，发现了一朵小雏菊','带着一身花香准备回家'],stories:['追着蝴蝶绕过花坛，又在长椅旁晒了一个舒服的太阳。','发现一朵心形花瓣，把这个小秘密留给了你。']},
    {id:'cafe',name:'街角咖啡馆',icon:'☕',minutes:30,reward:18,tag:'悠闲午后',description:'坐在窗边，等一份甜甜的小点心。',steps:['找到了一个靠窗的好位置','正趴在窗边等它的小蛋糕','向店员挥挥爪子，准备回家'],stories:['在窗边看云朵发呆，连小蛋糕上的奶油都舍不得吃完。','听完店里的轻音乐，决定把今天的好心情带回家。']},
    {id:'forest',name:'松果森林',icon:'🌲',minutes:60,reward:30,tag:'林间探险',description:'穿过树影，寻找藏在草丛里的松果。',steps:['沿着小路走进了森林','在树下发现了一颗圆圆的松果','听着溪水声，沿原路往回走'],stories:['跟着溪流找到一片蘑菇地，还在树荫下打了个小盹。','认真数了数路边的松果，数到一半被落叶吸引走了。']},
    {id:'gym',name:'活力健身房',icon:'💪',minutes:60,reward:30,tag:'元气运动',description:'伸伸懒腰，今天也要动一动小爪子。',steps:['在运动垫上做了一套伸展运动','正在跑步机上努力迈着小短腿','擦擦汗，带着满满元气回家'],stories:['举起迷你哑铃练了好一会儿，最后用一个大大的懒腰收尾。','认真完成跑步和拉伸，觉得自己又变厉害了一点点。']},
    {id:'mall',name:'缤纷商场',icon:'🛍️',minutes:120,reward:50,tag:'橱窗漫游',description:'逛逛漂亮橱窗，发现生活里的小惊喜。',steps:['被街角漂亮的橱窗吸引住了','正在镜子前认真试戴小帽子','心满意足地结束逛街，准备回家'],stories:['试戴了三顶小帽子，最后发现还是自己的装扮最好看。','把每一家橱窗都看了一遍，回家有好多新鲜事想告诉你。']},
    {id:'beach',name:'贝壳海湾',icon:'🌊',minutes:180,reward:70,tag:'海风假期',description:'听海浪、堆沙堡，享受一场慢悠悠的旅行。',steps:['踩着软软的沙子来到海边','正专心堆一座小小的沙堡','和海浪道别，抖抖爪子上的细沙'],stories:['堆了一座歪歪的小沙堡，还给它留了一扇面朝大海的窗。','听着海浪睡了个好觉，梦里也有你陪着一起捡贝壳。']}
  ].map(s=>Object.freeze({...s,image:'./generated-images/outing-'+s.id+'-v1.png'}));
  const scene = id => scenes.find(s=>s.id===id);
  function trip(p){
    const t=p?.outing,s=scene(t?.sceneId);
    return s && typeof t.id==='string' && Number.isFinite(t.startedAt) && Number.isFinite(t.endsAt)
      && t.endsAt===t.startedAt+s.minutes*60000 ? t : null;
  }
  function status(p,now=Date.now()){
    const t=trip(p);
    return !t?'home':now<t.endsAt?'away':'ready';
  }
  function pending(data){return (data.pet?.owned||[]).find(p=>trip(p));}
  function start(data,petId,sceneId,now=Date.now(),random=Math.random()){
    const p=data.pet?.owned?.find(p=>p.id===petId),s=scene(sceneId);
    if(!p||!s)return {ok:false,reason:'missing'};
    if(pending(data))return {ok:false,reason:'pending'};
    p.outing={id:petId+'-'+now+'-'+random.toString(36).slice(2),sceneId,startedAt:now,endsAt:now+s.minutes*60000,storyIndex:Math.min(s.stories.length-1,Math.max(0,Math.floor(random*s.stories.length)))};
    return {ok:true,trip:p.outing};
  }
  function claim(data,petId,tripId,now=Date.now()){
    const p=data.pet?.owned?.find(p=>p.id===petId),t=trip(p);
    if(!t||t.id!==tripId||status(p,now)!=='ready')return {ok:false,reason:'not-ready'};
    const s=scene(t.sceneId);
    if(!data.game)data.game={energy:0};
    data.game.energy=(Number(data.game.energy)||0)+s.reward;
    p.lastOuting={...t,claimedAt:now,reward:s.reward};
    delete p.outing;
    return {ok:true,reward:s.reward};
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
  const api={scenes,scene,trip,status,pending,start,claim,cancel,progress,remaining};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PetOutings=api;
})(globalThis);
