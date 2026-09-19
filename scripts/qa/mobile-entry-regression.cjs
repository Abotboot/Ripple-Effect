/* eslint-disable @typescript-eslint/no-require-imports -- Local browser regression. */
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const { loadPlaywright } = require('../../docs/qa/phase-b/source-recovery/offline-tools.cjs')
const output = path.resolve(process.env.QA_OUTPUT || 'docs/qa/mobile-entry')
fs.mkdirSync(output, {recursive:true})
const report = {checks:[],passed:false}
;(async()=>{
 for(const engine of ['chromium','webkit']) {
  const browser = await loadPlaywright()[engine].launch({headless:true,...(engine==='chromium'?{channel:'chrome'}:{})})
  try {
   for(const scenario of ['normal','reduced','blocked']) {
    const context = await browser.newContext({viewport:{width:414,height:896},hasTouch:true,isMobile:true,reducedMotion:scenario==='reduced'?'reduce':'no-preference'})
    await context.route('**/api/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}))
    await context.addInitScript(scenario=>{
     window.__playCalls=[]
     let clickEvent, rejected=false
     document.addEventListener('click',event=>{clickEvent=event},true)
     const play=HTMLMediaElement.prototype.play
     HTMLMediaElement.prototype.play=function(){
      const inClick=Boolean(clickEvent?.eventPhase)
      window.__playCalls.push({directClick:inClick})
      if(!inClick || (scenario==='blocked'&&!rejected)) {
       rejected=true
       return Promise.reject(new DOMException('Gesture required','NotAllowedError'))
      }
      return play.call(this)
     }
    },scenario)
    const page = await context.newPage()
    await page.goto(process.env.QA_BASE_URL||'http://localhost:3020')
    if(scenario==='reduced') {
     await page.getByTestId('journey-watch').click()
    }
    await page.getByTestId('journey-enter').click()
    assert.equal((await page.evaluate(()=>window.__playCalls))[0].directClick,true,'Start must execute inside the Enter click, not a deferred effect')
    if(scenario==='blocked') {
     await page.getByTestId('journey-play-retry').waitFor()
     await page.waitForTimeout(10500)
     assert.equal(await page.getByTestId('ripple-hero').getAttribute('data-state'),'video','Blocked playback must not silently bypass or expire')
     await page.getByTestId('journey-play-retry').click()
    }
    await page.waitForFunction(()=>document.querySelector('[data-testid="journey-video"]')?.currentTime>.1)
    await page.getByRole('button',{name:'Skip intro',exact:true}).click()
    await page.locator('.tank-search input').fill('Chicago')
    assert.equal(await page.evaluate(()=>document.querySelectorAll('[inert]').length),0)
    const blend=await page.locator('.ripple-editorial').evaluate(node=>({background:getComputedStyle(node).backgroundImage,fade:getComputedStyle(node,'::before').backgroundImage,bottom:getComputedStyle(node,'::before').bottom}))
    assert.equal(blend.background,'none')
    assert(blend.fade.includes('gradient')&&parseFloat(blend.bottom)<0)
    await page.screenshot({path:path.join(output,`${engine}-${scenario}.png`)})
    await context.close()
    report.checks.push({engine,scenario,passed:true})
   }
  } finally {await browser.close()}
 }
 report.passed=true
})().catch(error=>{report.error=error.stack;process.exitCode=1}).finally(()=>{fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))})
