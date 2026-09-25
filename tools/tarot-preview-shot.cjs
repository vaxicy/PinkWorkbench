const {chromium}=require('playwright');
const path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..');
const file=process.argv[2]||'tools/tarot-preview-codegen.html';
const out=process.argv[3]||'screenshots/tarot/preview-codegen.png';
const scale=Number(process.argv[4]||1);
(async()=>{
  const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1500,height:1200},deviceScaleFactor:scale});
    const errs=[];page.on('pageerror',e=>errs.push(e.message));
    await page.goto('file:///'+path.join(root,file).replace(/\\/g,'/'));
    await page.waitForTimeout(1200);
    const outAbs=path.join(root,out);
    fs.mkdirSync(path.dirname(outAbs),{recursive:true});
    await page.screenshot({path:outAbs,fullPage:true});
    console.log('SHOT OK ->',out,errs.length?('pageerrors:'+errs.join('|')):'');
  } finally { await browser.close(); }
})();
