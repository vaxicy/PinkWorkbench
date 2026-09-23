/* Run with Playwright available on NODE_PATH. Uses an isolated browser profile and local HTTP server. */
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const shots=path.join(root,'screenshots','outings');
fs.mkdirSync(shots,{recursive:true});
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'})[path.extname(file)]||'application/octet-stream');
    res.end(data);
  });
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/index.html#tree';
  const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:960}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const broken=[];page.on('response',res=>{if(res.status()>=400&&res.url().includes('outing'))broken.push(res.url());});
  try{
    await page.goto(url);
    await page.getByRole('button',{name:'🐾 我的宠物',exact:true}).click();
    await page.getByRole('button',{name:'出去玩',exact:true}).click();
    assert.equal(await page.locator('.outing-destination').count(),6);
    await page.locator('.outing-destination img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>i.decode()));});
    await page.screenshot({animations:'disabled',path:path.join(shots,'01-destinations-desktop.png')});
    await page.locator('.outing-destination').filter({hasText:'街角咖啡馆'}).click();
    await page.getByRole('button',{name:'出发 · 预计 30 分钟',exact:true}).click();
    await page.waitForSelector('.pet-room.is-away');
    assert.equal(await page.locator('.pet-room .pet-sprite').count(),0);
    assert.equal(await page.locator('.pet-actions').count(),0);
    assert.equal(await page.locator('.scene-chat-bar').count(),0);
    const petId=await page.evaluate(()=>state.pet.owned[0].id);
    const balance=await page.evaluate(()=>state.game.energy);
    // Direct interaction calls must also be blocked, not just hidden in the UI.
    const petBefore=await page.evaluate(id=>JSON.stringify(outingPet(id)),petId);
    await page.evaluate(id=>{feedPet(id);petPet(id);playPet(id);tapPetRoom(id);},petId);
    assert.equal(await page.evaluate(id=>JSON.stringify(outingPet(id)),petId),petBefore);
    await page.screenshot({animations:'disabled',path:path.join(shots,'02-empty-room-desktop.png')});
    const beforeReload=await page.locator('[data-outing-time]').textContent();
    await page.reload();await page.waitForSelector('.pet-room.is-away');
    assert.ok(await page.locator('[data-outing-time]').textContent());
    assert.equal(await page.evaluate(()=>state.game.energy),balance);
    await page.getByRole('button',{name:'去看看',exact:true}).click();
    await page.locator('.outing-scene-pet').evaluate(i=>i.decode());
    await page.screenshot({animations:'disabled',path:path.join(shots,'03-cafe-visit-desktop.png')});
    // Advance only the isolated test save, keeping the configured duration intact.
    await page.evaluate(id=>{const t=outingPet(id).outing;const duration=t.endsAt-t.startedAt;t.endsAt=Date.now()+700;t.startedAt=t.endsAt-duration;saveState();},petId);
    await page.waitForSelector('[data-outing-detail][data-outing-status="ready"]');
    assert.equal(await page.locator('.pet-room .pet-sprite').count(),1);
    assert.equal(await page.evaluate(()=>state.game.energy),balance);
    await page.screenshot({animations:'disabled',path:path.join(shots,'04-return-reward-desktop.png')});
    const second=await context.newPage();second.on('pageerror',e=>errors.push(e.message));
    await second.goto(url);await second.waitForSelector('[data-outing-home][data-outing-status="ready"]');
    await second.evaluate(id=>showPetOuting(id),petId);
    await Promise.all([page.evaluate(id=>claimPetOuting(id),petId),second.evaluate(id=>claimPetOuting(id),petId)]);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(STORAGE_KEY)).game.energy),balance+18);
    await page.reload();assert.equal(await page.evaluate(()=>state.game.energy),balance+18);
    await second.close();
    // Recall confirmation cancellation and acceptance.
    await page.evaluate(id=>startPetOuting(id,'forest'),petId);
    await page.getByRole('button',{name:'提前回家',exact:true}).click();
    await page.getByRole('button',{name:'取消',exact:true}).click();
    assert.equal(await page.locator('.pet-room.is-away').count(),1);
    await page.getByRole('button',{name:'提前回家',exact:true}).click();
    await page.getByRole('button',{name:'确定',exact:true}).click();
    await page.waitForSelector('.outing-entry');
    assert.equal(await page.evaluate(()=>state.game.energy),balance+18);
    // Storage failure must not report success, start a trip, or credit a reward.
    await page.evaluate(()=>{window.testOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Test quota','QuotaExceededError');};});
    await page.evaluate(id=>startPetOuting(id,'garden'),petId);
    assert.equal(await page.locator('#modalTitle').textContent(),'这次没有保存成功');
    assert.equal(await page.evaluate(id=>PetOutings.status(outingPet(id)),petId),'home');
    await page.evaluate(()=>{Storage.prototype.setItem=window.testOriginalSet;hideModal();});
    // Mobile cards, detail, dressed pet, empty room, dark mode.
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'出去玩',exact:true}).click();
    await page.locator('.outing-destination img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>i.decode()));});
    await page.screenshot({animations:'disabled',path:path.join(shots,'05-destinations-mobile.png')});
    assert.equal(await page.locator('.outing-destinations').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});
      assert.equal(await page.locator('#modalBody').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
    }
    await page.locator('.outing-destination').last().scrollIntoViewIfNeeded();
    await page.locator('.outing-destination').last().click();
    await page.getByRole('button',{name:'出发 · 预计 3 小时',exact:true}).scrollIntoViewIfNeeded();
    assert.equal(await page.getByRole('button',{name:'出发 · 预计 3 小时',exact:true}).isVisible(),true);
    await page.evaluate(()=>hideModal());
    await page.evaluate(id=>{const p=outingPet(id);p.decor={head:'crown-gold',collar:'lace-pink',room:'rug-flower'};saveState();render();},petId);
    await page.evaluate(id=>startPetOuting(id,'gym'),petId);
    assert.equal(await page.locator('.pet-room .pet-decoration').count(),1);
    assert.equal(await page.locator('.pet-room .pet-sprite').count(),0);
    await page.screenshot({animations:'disabled',path:path.join(shots,'06-empty-room-mobile.png')});
    await page.evaluate(id=>showPetOuting(id),petId);
    assert.ok((await page.locator('.outing-scene-pet').getAttribute('src')).includes('crown-lace-pink'));
    await page.locator('.outing-scene-pet').evaluate(i=>i.decode());
    await page.screenshot({animations:'disabled',path:path.join(shots,'07-gym-mobile.png')});
    await page.evaluate(()=>toggleTheme());
    await page.screenshot({animations:'disabled',path:path.join(shots,'08-gym-mobile-dark.png')});
    assert.deepEqual(errors,[]);assert.deepEqual(broken,[]);
    console.log('PASS: 6 scene assets; desktop/mobile; empty room and guards; refresh; arrival; two-tab single claim; recall; failed storage; outfits; dark mode.');
    console.log('Screenshots: '+shots);
  }finally{await browser.close();server.close();}
})().catch(err=>{console.error(err);server.close();process.exitCode=1;});
