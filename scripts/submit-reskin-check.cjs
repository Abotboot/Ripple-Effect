const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    let posts=0;
    page.on('request',r=>{if(r.method()==='POST')posts++});
    await page.goto((process.env.QA_URL || 'http://localhost:3018/')+'#submit');
    await page.getByRole('heading',{name:'Submit a reading',exact:true}).waitFor();
    const root=page.locator('.reading-workbench');
    assert.equal(await root.count(),1,'Tank reading workbench missing');
    assert.match(await root.locator('h1').evaluate(e=>getComputedStyle(e).fontFamily),/Cormorant/i);
    assert.equal(await root.locator('form').count(),1);
    for(const id of ['rcontam','rutil','rlevel','runit','rtreat','rloc','rdate','rname','remail','rnotes']) {
      assert.equal(await root.locator('#'+id).count(),1,`Field ${id} retained`);
    }
    assert.equal(await root.locator('form').evaluate(e=>e.checkValidity()),false,'Empty form remains invalid');
    await page.keyboard.press('Tab');
    await page.locator('#rname').focus();
    assert.equal(await page.locator('#rname').evaluate(e=>e===document.activeElement),true);
    await page.locator('#rname').fill('QA local only');
    assert.equal(await page.locator('#rname').inputValue(),'QA local only');
    await page.locator('#rtreat').click();
    await page.getByRole('option',{name:'Untreated (source)',exact:true}).click();
    assert.match(await page.locator('#rtreat').innerText(),/Untreated/);
    await page.screenshot({path:'C:/Users/ayada/AppData/Local/Temp/reading-desktop.png'});
    for(const width of [320,375,768]) {
      await page.setViewportSize({width,height:800});
      assert.equal(await root.evaluate(s=>[...s.querySelectorAll('input,textarea,button,h1')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=document.documentElement.clientWidth+1})),true,`Content fits ${width}px`);
    }
    await page.setViewportSize({width:375,height:800});
    await root.locator('form').scrollIntoViewIfNeeded();
    await page.screenshot({path:'C:/Users/ayada/AppData/Local/Temp/reading-mobile.png'});
    await page.locator('header button[aria-label="Switch to light mode"]').click();
    assert.equal(await root.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(5, 8, 10)');
    assert.equal(await page.locator('#rname').evaluate(e=>getComputedStyle(e).color),'rgb(220, 235, 229)');
    assert.equal(posts,0,'No submission should be sent');
    console.log('PASS: editorial workbench, 10 fields, validation, keyboard input, select, mobile bounds, light-theme contrast; zero POST requests');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
