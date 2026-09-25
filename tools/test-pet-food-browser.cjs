const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),shots=path.join(root,'screenshots','food');fs.mkdirSync(shots,{recursive:true});
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':decodeURIComponent(new URL(req.url,'http://localhost').pathname)));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port+'/index.html#tree';
  await page.goto(url);await page.getByRole('button',{name:'🐾 我的宠物',exact:true}).click();
  const id=await page.evaluate(()=>state.pet.owned[0].id);
  async function reset(hunger=50,happiness=85,energy=30){
   await page.evaluate(({id,hunger,happiness,energy})=>{hideModal();const p=outingPet(id);delete p.outing;delete p.lastMeal;Object.assign(p,{hunger,happiness,lastPetTick:Date.now()});state.game.energy=energy;saveState();render();},{id,hunger,happiness,energy});
  }
  await reset();await page.getByRole('button',{name:'🍚 喂食 选一份好吃的',exact:true}).click();
  assert.equal(await page.locator('.food-card').count(),6);
  await page.locator('.food-card img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>i.decode()));});
  await page.locator('[data-food-id="meat"]').click();
  assert.match(await page.locator('#foodPreview').textContent(),/50 → 80/);
  assert.equal(await page.evaluate(()=>state.game.energy),30);
  await page.screenshot({path:path.join(shots,'01-food-menu-desktop.png'),animations:'disabled'});
  await page.evaluate(()=>Promise.all([submitPetFood(),submitPetFood()]));
  assert.deepEqual(await page.evaluate(id=>{const p=outingPet(id);return [state.game.energy,p.hunger,p.happiness];},id),[25,80,91]);
  await page.waitForSelector('.food-serving img');
  await page.locator('.food-serving img').evaluate(i=>i.decode());
  await page.evaluate(()=>document.getAnimations().forEach(a=>{a.pause();if(a.effect?.target?.classList.contains('food-serving')||a.effect?.target?.classList.contains('food-gains'))a.currentTime=1000;}));
  await page.screenshot({path:path.join(shots,'02-food-in-room.png')});
  await page.reload();assert.equal(await page.evaluate(()=>state.game.energy),25);
  await reset(100,100);await page.evaluate(id=>showPetFoodMenu(id),id);await page.locator('[data-food-id="bento"]').click();
  assert.equal(await page.locator('#foodSubmit').isDisabled(),true);assert.match(await page.locator('#foodPreview').textContent(),/已经吃饱/);
  await page.evaluate(()=>submitPetFood());assert.equal(await page.evaluate(()=>state.game.energy),30);
  await reset(100,85);await page.evaluate(id=>showPetFoodMenu(id),id);await page.locator('[data-food-id="pudding"]').click();
  assert.match(await page.locator('#foodPreview').textContent(),/实际 \+0/);assert.match(await page.locator('#foodPreview').textContent(),/实际 \+15/);
  await page.locator('#foodSubmit').click();await page.waitForFunction(()=>state.game.energy===23);assert.equal(await page.evaluate(()=>state.game.energy),23);
  await reset(50,50,2);await page.evaluate(id=>showPetFoodMenu(id),id);await page.locator('[data-food-id="kibble"]').click();
  assert.equal(await page.locator('#foodSubmit').textContent(),'还差 1 爱心');assert.equal(await page.locator('#foodSubmit').isDisabled(),true);
  await page.evaluate(()=>submitPetFood());assert.equal(await page.evaluate(()=>state.game.energy),2);
  // Two independent tabs can spend only the currently available balance.
  await reset(0,0,7);await page.evaluate(id=>{showPetFoodMenu(id);selectPetFood('cookies');},id);
  const second=await context.newPage();second.on('pageerror',e=>errors.push(e.message));await second.goto(url);
  await second.evaluate(id=>{showPetFoodMenu(id);selectPetFood('cookies');},id);
  await Promise.all([page.evaluate(()=>submitPetFood()),second.evaluate(()=>submitPetFood())]);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(STORAGE_KEY)).game.energy),3);await second.close();
  await reset();await page.evaluate(id=>{showPetFoodMenu(id);selectPetFood('rice');window.testSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('Test quota');};},id);
  await page.evaluate(()=>submitPetFood());assert.equal(await page.locator('#modalTitle').textContent(),'喂食没有保存成功');
  assert.deepEqual(await page.evaluate(id=>[state.game.energy,outingPet(id).hunger],id),[30,50]);
  await page.evaluate(()=>{Storage.prototype.setItem=window.testSet;hideModal();});
  await page.evaluate(id=>startPetOuting(id,'garden'),id);await page.evaluate(id=>feedPet(id),id);
  assert.equal(await page.locator('#modalOverlay.show .food-modal').count(),0);
  await reset(92,98);await page.setViewportSize({width:390,height:844});await page.evaluate(id=>showPetFoodMenu(id),id);
  await page.locator('[data-food-id="bento"]').click();
  assert.equal(await page.locator('.food-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
  await page.screenshot({path:path.join(shots,'03-food-menu-mobile.png'),animations:'disabled'});
  for(const width of [320,390]){await page.setViewportSize({width,height:740});assert.equal(await page.locator('#modalBody').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);const b=await page.locator('#foodSubmit').boundingBox();assert.ok(b.y+b.height<=740);}
  await page.evaluate(()=>toggleTheme());await page.screenshot({path:path.join(shots,'04-food-menu-dark.png'),animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: six loaded images, preview without charge, selected cost, duplicate submit, refresh, full states, capped benefits, insufficient hearts, two-tab balance, storage failure, away guard, mobile footer and dark mode.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
