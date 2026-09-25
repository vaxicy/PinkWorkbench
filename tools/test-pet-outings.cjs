const test = require('node:test');
const assert = require('node:assert/strict');
const outings = require('../pet-outings-core.js');
const now = 1800000000000;
const fresh = () => ({game:{energy:8},pet:{owned:[{id:1,name:'小咪'},{id:2,name:'小白'}]}});

test('old saves without outing fields remain home',()=>{
  assert.equal(outings.status(fresh().pet.owned[0],now),'home');
  assert.equal(outings.pending(fresh()),undefined);
});
test('refresh and closed pages use timestamps, without awarding money before claim',()=>{
  const data=fresh();outings.start(data,1,'cafe',now,.2);
  const saved=JSON.parse(JSON.stringify(data)),pet=saved.pet.owned[0];
  assert.equal(outings.status(pet,now+1799999),'away');
  assert.equal(outings.remaining(pet,now+1799999),'00:01');
  assert.equal(outings.status(pet,now+1800000),'ready');
  assert.equal(outings.remaining(pet,now+99999999),'00:00');
  assert.equal(saved.game.energy,8);
});
test('one household trip, including rewards waiting to be collected',()=>{
  const data=fresh();outings.start(data,1,'garden',now);
  assert.equal(outings.start(data,2,'forest',now).reason,'pending');
  assert.equal(outings.start(data,1,'forest',now+900000).reason,'pending');
});
test('early and stale claims fail; successful reward persists exactly once',()=>{
  const data=fresh();const {trip}=outings.start(data,1,'beach',now);
  assert.equal(outings.claim(data,1,trip.id,now+100).ok,false);
  assert.equal(outings.claim(data,1,'stale-id',now+18000000).ok,false);
  assert.equal(outings.claim(data,1,trip.id,now+18000000).reward,110);
  const saved=JSON.parse(JSON.stringify(data));
  assert.equal(outings.claim(saved,1,trip.id,now+18000000).ok,false);
  assert.equal(saved.game.energy,118);
  assert.equal(outings.status(saved.pet.owned[0]),'home');
  assert.equal(outings.start(saved,2,'gym',now+10800001).ok,true);
});
test('early recall is free and a completed trip cannot be accidentally discarded',()=>{
  const data=fresh();let result=outings.start(data,1,'garden',now);
  assert.equal(outings.cancel(data,1,result.trip.id,now+1).ok,true);
  assert.equal(data.game.energy,8);
  result=outings.start(data,1,'garden',now);
  assert.equal(outings.cancel(data,1,result.trip.id,now+18000000).reason,'finished');
  assert.equal(outings.status(data.pet.owned[0],now+18000000),'ready');
});
test('unknown scenes and malformed timestamps do not create stuck or payable trips',()=>{
  const data=fresh();assert.equal(outings.start(data,1,'unknown',now).ok,false);
  const pet=data.pet.owned[0];
  pet.outing={id:'broken',sceneId:'forest',startedAt:now,endsAt:now+1};
  assert.equal(outings.status(pet,now+10000),'home');
  assert.equal(outings.claim(data,1,'broken',now+10000).ok,false);
});
test('clock moving backwards clamps progress, and elapsed progress never exceeds one',()=>{
  const data=fresh();outings.start(data,1,'forest',now);
  assert.equal(outings.progress(data.pet.owned[0],now-100),0);
  assert.equal(outings.progress(data.pet.owned[0],now+5400000),.5);
  assert.equal(outings.progress(data.pet.owned[0],now+999999999),1);
});

const expected=[['garden',15,10],['cafe',30,18],['bookstore',60,30],['gym',90,40],['mall',120,50],['forest',180,70],['aquarium',240,90],['beach',300,110],['amusement',360,130],['hotspring',480,170],['camp',600,210],['snow',720,250]];
test('all twelve fixed itineraries are ordered and pay exactly once after persistence',()=>{
 assert.deepEqual(outings.scenes.map(s=>[s.id,s.minutes,s.reward]),expected);
 for(const [id,minutes,reward] of expected){
  const data=fresh(),r=outings.start(data,1,id,now,.5),saved=JSON.parse(JSON.stringify(data));
  assert.equal(r.trip.endsAt-now,minutes*60000);
  assert.equal(outings.claim(saved,1,r.trip.id,r.trip.endsAt-1).ok,false);
  assert.equal(outings.claim(saved,1,r.trip.id,r.trip.endsAt).reward,reward);
  assert.equal(outings.claim(saved,1,r.trip.id,r.trip.endsAt).ok,false);
 }
});
test('original and v107 trips keep their exact terms',()=>{
 const old=[['garden',15,10],['cafe',30,18],['forest',60,30],['gym',60,30],['mall',120,50],['beach',180,70]];
 for(const [sceneId,minutes,reward] of old){
  const data=fresh(),p=data.pet.owned[0];p.outing={id:'old',sceneId,startedAt:now,endsAt:now+minutes*60000};
  assert.deepEqual(outings.terms(p),{minutes,reward});assert.equal(outings.claim(data,1,'old',p.outing.endsAt).reward,reward);
 }
 for(const scene of outings.scenes)for(let hours=3;hours<=12;hours++){
  const data=fresh(),p=data.pet.owned[0],reward=70+(hours-3)*20;
  p.outing={version:2,id:'v107',sceneId:scene.id,hours,reward,startedAt:now,endsAt:now+hours*3600000};
  assert.deepEqual(outings.terms(p),{minutes:hours*60,reward});assert.equal(outings.claim(data,1,'v107',p.outing.endsAt).reward,reward);
 }
});
test('corrupted fixed trip cannot pay',()=>{
 const data=fresh();outings.start(data,1,'camp',now);const p=data.pet.owned[0];p.outing.reward=999;
 assert.equal(outings.trip(p),null);assert.equal(outings.claim(data,1,p.outing.id,now+43200000).ok,false);
});
