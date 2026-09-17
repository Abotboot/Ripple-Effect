const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const url = process.env.QA_URL || 'http://localhost:3017/';
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    await page.addInitScript(()=>sessionStorage.setItem('ripple-entered','1'));
    await page.goto(url);
    const header = page.locator('header');
    // Chrome contract: deep obsidian bar, mono coordinates, cyan active state
    const bg = await header.evaluate(e=>getComputedStyle(e).backgroundColor);
    assert.match(bg,/rgba\(5, 8, 10/,`Header background must be tank obsidian, got ${bg}`);
    const brand = header.locator('.site-brand-word');
    assert.equal(await brand.count(),1,'Brand wordmark missing');
    assert.match(await brand.evaluate(e=>getComputedStyle(e).fontFamily),/Cormorant/i,'Brand must use editorial display face');
    const nav = header.locator('.site-nav-desktop button').first();
    assert.match(await nav.evaluate(e=>getComputedStyle(e).fontFamily),/mono/i,'Nav labels must be monospaced');
    await page.locator('.site-nav-desktop button', {hasText:'Home'}).click();
    await page.waitForTimeout(300);
    assert.match(await page.locator('.site-nav-desktop button', {hasText:'Home'}).evaluate(e=>getComputedStyle(e).color),/29, 242, 179/,'Active nav must be tank cyan');
    // Footer contract: same obsidian depth, mono small caps, cyan link hover
    const footer = page.locator('footer');
    const fbg = await footer.evaluate(e=>getComputedStyle(e).backgroundColor);
    assert.match(fbg,/rgba\(5, 8, 10/,`Footer background must be tank obsidian, got ${fbg}`);
    const h4font = await footer.locator('h4').first().evaluate(e=>getComputedStyle(e).fontFamily);
    assert.match(h4font,/mono/i,'Footer headings must be monospaced');
    console.log('PASS: header/footer adopt tank chrome tokens');
    await page.keyboard.press('Tab');
    await footer.locator('button').first().focus();
    const outline = await footer.locator('button').first().evaluate(e=>getComputedStyle(e).outlineStyle+' '+getComputedStyle(e).outlineWidth);
    assert.match(outline,/solid 2px/,'Footer focus outline visible');
    assert.equal(await page.locator('a button').count(),0,'No nested interactive GitHub control');
    console.log('PASS: keyboard focus and valid GitHub control');
    // Other sections still render with shared chrome
    await page.locator('.site-nav-desktop button', {hasText:'Submit'}).click();
    await page.waitForTimeout(400);
    assert.equal(new URL(page.url()).hash,'#submit');
    assert.equal(await page.locator('header').count(),1);
    assert.equal(await page.locator('footer').count(),1);
    console.log('PASS: navigation intact after reskin');
    // Mobile drawer still opens
    const m = await browser.newContext({viewport:{width:375,height:700}});
    const mp = await m.newPage();
    await mp.goto(url);
    await mp.getByRole('button', {name:'SKIP INTRO ↗',exact:true}).click();
    await mp.locator('dialog').waitFor({state:'detached'});
    await mp.locator('button[aria-label="Toggle menu"]').click();
    await mp.locator('#site-navigation-menu').waitFor();
    await mp.screenshot({path:'C:/Users/ayada/AppData/Local/Temp/reskin-chrome-mobile.png'});
    await mp.keyboard.press('Escape');
    assert.equal(await mp.locator('#site-navigation-menu').count(),0);
    assert.equal(await mp.locator('button[aria-label="Toggle menu"]').evaluate(e=>e===document.activeElement),true);
    await mp.locator('button[aria-label="Toggle menu"]').click();
    await mp.locator('#site-navigation-menu button', {hasText:'Microplastics'}).click();
    await mp.waitForTimeout(400);
    assert.equal(new URL(mp.url()).hash,'#microplastics');
    assert.equal(await mp.locator('#site-navigation-menu').count(),0,'Navigation closes menu');
    for (const width of [320,375,768]) {
      await mp.setViewportSize({width,height:700});
      assert.equal(await mp.locator('footer').evaluate(s=>[...s.querySelectorAll('a,button,h4,p')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=document.documentElement.clientWidth+1})),true,`Footer fits ${width}px`);
    }
    await m.close();
    console.log('PASS: mobile drawer intact');
    await page.screenshot({path:'C:/Users/ayada/AppData/Local/Temp/reskin-chrome-desktop.png'});
    await footer.screenshot({path:'C:/Users/ayada/AppData/Local/Temp/reskin-footer-desktop.png'});
    await page.locator('header button[aria-label="Switch to light mode"]').click();
    assert.match(await header.evaluate(e=>getComputedStyle(e).backgroundColor),/rgba\(5, 8, 10/);
    assert.match(await footer.evaluate(e=>getComputedStyle(e).color),/220, 235, 229/);
    console.log('PASS: chrome remains legible in light theme');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
