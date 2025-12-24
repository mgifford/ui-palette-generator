const puppeteer = require('puppeteer');
(async ()=>{
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.goto('http://localhost:8001/', {waitUntil: 'networkidle2'});
  await page.waitForSelector('#seedPicker');
  // set seed and trigger input
  await page.evaluate(()=>{
    const p = document.getElementById('seedPicker');
    if(p){ p.value = '#ff6600'; p.dispatchEvent(new Event('input',{bubbles:true})); }
  });
  await new Promise(r=>setTimeout(r,250));
  const el = await page.$('#previewCard');
  if(el){
    const path = require('path'); const fs = require('fs');
    const outDir = path.join(process.cwd(), 'docs');
    if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive:true});
    const outPath = path.join(outDir, 'preview-screenshot.png');
    await el.screenshot({path: outPath});
    console.log('saved:', outPath);
  } else {
    const path = require('path'); const fs = require('fs');
    const outDir = path.join(process.cwd(), 'docs');
    if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive:true});
    const outPath = path.join(outDir, 'preview-full.png');
    await page.screenshot({path: outPath, fullPage: true});
    console.log('saved full page:', outPath);
  }
  await browser.close();
})();