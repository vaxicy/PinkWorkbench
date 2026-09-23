const test = require('node:test');
const assert = require('node:assert/strict');
const outings = require('../pet-outings-core.js');
const now = 1800000000000;
const fresh = () => ({game:{energy:8},pet:{owned:[{id:1,name:'小咪'},{id:2,name:'小白'}]}});

test('all six scenes have the agreed time and reward',()=>{
  assert.deepEqual(outings.scenes.map(s=>[s.id,s.minutes,s.reward]),[
    ['garden',15,10],['cafe',30,18],['forest',60,30],['gym',60,30],['mall',120,50],['beach',180,70]
  ]);
});
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
  assert.equal(outings.claim(data,1,'stale-id',now+10800000).ok,false);
  assert.equal(outings.claim(data,1,trip.id,now+10800000).reward,70);
  const saved=JSON.parse(JSON.stringify(data));
  assert.equal(outings.claim(saved,1,trip.id,now+10800000).ok,false);
  assert.equal(saved.game.energy,78);
  assert.equal(outings.status(saved.pet.owned[0]),'home');
  assert.equal(outings.start(saved,2,'gym',now+10800001).ok,true);
});
test('early recall is free and a completed trip cannot be accidentally discarded',()=>{
  const data=fresh();let result=outings.start(data,1,'garden',now);
  assert.equal(outings.cancel(data,1,result.trip.id,now+1).ok,true);
  assert.equal(data.game.energy,8);
  result=outings.start(data,1,'garden',now);
  assert.equal(outings.cancel(data,1,result.trip.id,now+900000).reason,'finished');
  assert.equal(outings.status(data.pet.owned[0],now+900000),'ready');
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
  assert.equal(outings.progress(data.pet.owned[0],now+1800000),.5);
  assert.equal(outings.progress(data.pet.owned[0],now+999999999),1);
});
