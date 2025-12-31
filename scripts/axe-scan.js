const fs = require('fs');
const puppeteer = require('puppeteer');
const axeSource = require('axe-core').source;

async function runScan(url, outFile) {
  const launchOpts = { args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-setuid-sandbox'], headless: 'new' };
  // Allow using system Chrome via CHROME_PATH env for environments where bundled Chromium cannot be launched
  const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  try {
    if (require('fs').existsSync(chromePath)) launchOpts.executablePath = chromePath;
  } catch (e) {}
  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  // inject axe
  await page.evaluate(axeSource);
  const results = await page.evaluate(async () => {
    // Build include/exclude node lists using querySelectorAll so axe.run receives DOM nodes
    const include = Array.from(document.querySelectorAll('body'));
    const exclude = Array.from(document.querySelectorAll('.demo-canvas[data-uses-token="canvas"]'));
    const options = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } };
    return await axe.run({ include, exclude }, options);
  });
  await browser.close();
  fs.mkdirSync(require('path').dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log('Wrote', outFile);
}

const target = process.argv[2];
const out = process.argv[3];
if (!target || !out) {
  console.error('Usage: node scripts/axe-scan.js <url> <out.json>');
  process.exit(2);
}

runScan(target, out).catch(e => { console.error(e); process.exit(1); });
