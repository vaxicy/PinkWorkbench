const {test}=require('node:test');
const assert=require('node:assert/strict');
const food=require('../pet-food-core.js');
const fresh=()=>({game:{energy:30},pet:{owned:[{id:1,hunger:50,happiness:85,level:2,exp:10,favor:5}]}});
test('six foods have agreed prices and effects',()=>assert.deepEqual(food.foods.map(f=>[f.price,f.hunger,f.happiness]),[[3,20,3],[5,30,6],[5,35,3],[4,10,15],[7,15,25],[12,60,20]]));
test('preview caps both stats and never mutates state',()=>{
 const data=fresh(),before=JSON.stringify(data),v=food.preview(data.pet.owned[0],food.food('bento'));
 assert.deepEqual([v.hungerGain,v.happinessGain,v.nextHunger,v.nextHappiness],[50,15,100,100]);assert.equal(JSON.stringify(data),before);
});
test('feed charges selected price and updates only intended stats',()=>{
 const data=fresh(),r=food.feed(data,1,'meat','one',1000),p=data.pet.owned[0];
 assert.equal(r.ok,true);assert.deepEqual([data.game.energy,p.hunger,p.happiness],[25,80,91]);
 assert.deepEqual([p.level,p.exp,p.favor],[2,10,5]);
 assert.equal(food.feed(data,1,'meat','one',1001).reason,'duplicate');assert.equal(data.game.energy,25);
});
test('full stats block all purchases without charging',()=>{
 const data=fresh();Object.assign(data.pet.owned[0],{hunger:100,happiness:100});
 assert.equal(food.feed(data,1,'kibble','full').reason,'full');assert.equal(data.game.energy,30);
});
test('full hunger still allows mood food; recoverable gains are exact',()=>{
 const data=fresh();data.pet.owned[0].hunger=100;
 const r=food.feed(data,1,'pudding','mood');assert.equal(r.hungerGain,0);assert.equal(r.happinessGain,15);assert.equal(data.game.energy,23);
});
test('insufficient hearts, unknown foods, and away pets cannot be fed',()=>{
 const data=fresh();data.game.energy=2;
 assert.equal(food.feed(data,1,'rice','a').reason,'funds');
 assert.equal(food.feed(data,1,'unknown','b').reason,'missing');
 data.pet.owned[0].outing={endsAt:2000};data.game.energy=30;
 assert.equal(food.feed(data,1,'kibble','c',1000).reason,'away');assert.equal(data.game.energy,30);
 assert.equal(food.feed(data,1,'kibble','d',2000).ok,true);
});
test('two sequential purchases cannot overspend remaining balance',()=>{
 const data=fresh();data.game.energy=7;
 assert.equal(food.feed(data,1,'cookies','a').ok,true);assert.equal(food.feed(data,1,'cookies','b').reason,'funds');assert.equal(data.game.energy,3);
});
