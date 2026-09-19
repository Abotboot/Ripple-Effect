/* eslint-disable @typescript-eslint/no-require-imports -- Installed-browser acceptance utility. */
'use strict'
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const sharp = require('sharp')
const base = process.env.QA_BASE_URL || 'http://localhost:3020'
const out = path.resolve('docs/qa/phase-c/browser')
const filter = process.env.QA_ONLY || ''
fs.mkdirSync(path.join(out, 'recordings'), { recursive: true })
const report = { createdAt: new Date().toISOString(), base, success: false, checks: [], recordings: [] }
const save = () => fs.writeFileSync(path.join(out, filter ? 'targeted-results.json' : 'results.json'), JSON.stringify(report, null, 2))
const digest = data => crypto.createHash('sha256').update(data).digest('hex')
const id = (p, name) => p.getByTestId(name)
const field = p => id(p, 'artwork-field')
const values = p => field(p).evaluate(c => ({ time: +c.dataset.fieldTime, draws: +c.dataset.draws, running: c.dataset.running, entrance: +c.dataset.entrance, category: c.dataset.category }))
const imageNames = ['particle-world-master', 'fibers-card', 'fragments-card', 'granules-card', 'sample-study-panel']
const snapshot = async (p, name) => p.screenshot({ path: path.join(out, `${name}.png`) })
async function ready(p, route = '/motion-study', expectField = true) {
  await p.goto(base + route, { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => document.querySelector('[data-testid="journey-watch"]')?.disabled === false)
  await p.evaluate(() => document.fonts.ready)
  if (expectField) await p.waitForFunction(() => document.querySelector('[data-testid="particle-stage"]')?.dataset.renderer === 'interactive-artwork')
}
async function watch(p) {
  await id(p, 'journey-watch').click()
  await p.waitForFunction(() => document.querySelector('video')?.currentTime > .2)
  return p.evaluate(() => {
    const box = e => { const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom} }
    const controls = [...document.querySelectorAll('.ripple-player-controls button')].map(e => { const r=box(e); return { ...r, hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)) } })
    return { video:box(document.querySelector('video')), canvas:box(document.querySelector('[data-testid="artwork-field"]')), controls, height:innerHeight }
  })
}
function aligned(g) {
  for(const key of ['x','y','width','height']) assert(Math.abs(g.video[key]-g.canvas[key])<1)
  assert(g.video.y >= -1)
  assert(g.controls.every(c=>c.hit && c.height>=44 && c.y>=0 && c.bottom<=g.height))
}
async function released(p) {
  await id(p, 'journey-watch').waitFor()
  assert.equal(await p.locator('video').count(),0)
  assert.equal(await p.locator('.ripple-editorial').evaluate(e=>e.inert),false)
}
async function stillHash(p) { return digest(Buffer.from(await field(p).evaluate(c=>c.toDataURL('image/png').split(',')[1]),'base64')) }
async function instrument(ctx) {
  await ctx.addInitScript(() => {
    window.__phaseC={events:[],boundary:null,videoEnd:null,canvas:null}
    document.addEventListener('ended',event=>{
      if(!(event.target instanceof HTMLVideoElement))return
      const v=event.target,c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight
      c.getContext('2d').drawImage(v,0,0)
      window.__phaseC.videoEnd=c.toDataURL('image/png').split(',')[1]
      window.__phaseC.events.push({type:'ended',trusted:event.isTrusted,time:v.currentTime,duration:v.duration,rate:v.playbackRate,wall:performance.now()})
    },true)
    for(const type of ['playing','seeking']) document.addEventListener(type,event=>{
      if(event.target instanceof HTMLVideoElement) window.__phaseC.events.push({type,time:event.target.currentTime,rate:event.target.playbackRate,wall:performance.now()})
    },true)
    new MutationObserver(()=>{
      const hero=document.querySelector('[data-testid="ripple-hero"]'),c=document.querySelector('[data-testid="artwork-field"]')
      if(hero?.dataset.state==='entering' && c && !window.__phaseC.boundary) {
        window.__phaseC.boundary={png:c.toDataURL('image/png').split(',')[1],entrance:Number(c.dataset.entrance),time:Number(c.dataset.fieldTime)}
        window.__phaseC.canvas=c
      }
    }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-state']})
  })
}
;(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true})
  report.browser=browser.version()
  async function run(name, options, verify) {
    if(filter && !name.includes(filter)) return
    const {width=1440,height=900,recording,home=false,setup,...contextOptions}=options
    const ctx=await browser.newContext({viewport:{width,height},hasTouch:width<500,serviceWorkers:'block',...contextOptions,...(recording?{recordVideo:{dir:path.join(out,'recordings'),size:{width,height}}}:{})})
    await instrument(ctx)
    const p=await ctx.newPage();p.setDefaultTimeout(18000)
    const errors=[],api=[],responses=[]
    const state={searchStatus:200, searches:[]}
    await ctx.route('**/api/**',async route=>{
      const req=route.request(),url=new URL(req.url());api.push({path:url.pathname,method:req.method()})
      const fixtures={'/api/stats':null,'/api/utilities/scores':{scores:[]},'/api/utilities/recent':{utilities:[]},'/api/activity':{items:[],counts:{samples:0,reports:0,chapters:0,donations:0}},'/api/readings/recent':{items:[]},'/api/auth/me':{user:null}}
      if(home && url.pathname==='/api/utilities' && req.method()==='GET') {
        state.searches.push(url.searchParams.get('q'))
        return route.fulfill({status:state.searchStatus,contentType:'application/json',body:JSON.stringify(state.searchStatus===200?[]:{error:'QA service unavailable'})})
      }
      const okay=home&&req.method()==='GET'&&Object.hasOwn(fixtures,url.pathname)
      return route.fulfill({status:okay?200:503,contentType:'application/json',body:JSON.stringify(okay?fixtures[url.pathname]:{error:'QA: backend disabled'})})
    })
    p.on('pageerror',e=>errors.push(e.message))
    p.on('response',r=>{if(/media%2Fripple|\/media\/ripple/.test(r.url()))responses.push({url:r.url(),status:r.status()})})
    try {
      if(setup)await setup(ctx,p)
      const detail=await verify(p,ctx,state,responses)
      assert.deepEqual(errors,[])
      if(!home)assert.deepEqual(api,[])
      else assert(api.every(r=>r.method==='GET'))
      report.checks.push({name,passed:true,viewport:{width,height},api,detail})
      console.log('PASS',name)
    } catch(e) {report.checks.push({name,passed:false,error:e.stack,errors,api});await snapshot(p,'failure-'+name).catch(()=>{});console.error('FAIL',name,e.message)}
    finally {
      const video=p.video();await ctx.close()
      if(video && recording){const dest=path.join(out,'recordings',recording+'.webm');await video.saveAs(dest);await video.delete();report.recordings.push({name,path:path.relative(out,dest),bytes:fs.statSync(dest).size,sha256:digest(fs.readFileSync(dest))})}
      save()
    }
  }
  try {
    for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844],[320,568]]) await run(`layout-${width}`,{width,height},async(p,_c,_s,responses)=>{
      await ready(p)
      assert.equal(await p.locator('video').count(),0)
      assert.equal(responses.filter(r=>r.url.includes('.mp4')).length,0,'No video request before Watch')
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
      await snapshot(p,`${width}-hero`)
      for(const name of imageNames.slice(1)){const i=p.locator(`img[src*="${name}"]`).first();assert.equal(await i.getAttribute('loading'),'lazy');await i.scrollIntoViewIfNeeded();await i.evaluate(e=>e.decode())}
      for(const name of imageNames)assert(responses.some(r=>r.url.includes(name)&&r.status===200),name)
      await p.locator('#particle-atlas').scrollIntoViewIfNeeded();await snapshot(p,`${width}-atlas`)
      await p.getByRole('tab',{name:'Fragments',exact:true}).click();await p.getByTestId('atlas-panel-fragments').waitFor()
      await p.getByRole('tab',{name:'Fragments',exact:true}).press('ArrowRight');assert.equal(await p.getByRole('tab',{name:'Granules',exact:true}).getAttribute('aria-selected'),'true')
      await p.locator('#sample-study').scrollIntoViewIfNeeded();await snapshot(p,`${width}-sample`)
      await p.locator('#study-search').fill('Austin')
      const geometry=await watch(p);aligned(geometry)
      await id(p,'journey-skip').click();await released(p)
      assert.equal(await p.locator('#study-search').inputValue(),'Austin')
      assert.equal(await p.locator('#study-search').evaluate(e=>e===document.activeElement),true)
      return {geometry,allFiveAssets:true,atlasKeyboard:true,noHarnessWatchScroll:true}
    })
    for(const [width,height,stem] of [[1440,900,'desktop'],[390,844,'mobile']])await run(`journey-${stem}`,{width,height,recording:`${stem}-live-journey`,isMobile:width<500},async p=>{
      await ready(p);aligned(await watch(p))
      await p.waitForFunction(()=>document.querySelector('video')?.currentTime>=1);await snapshot(p,`${stem}-microscope`)
      await p.waitForFunction(()=>document.querySelector('[data-testid="ripple-hero"]')?.dataset.state==='entering')
      await p.waitForFunction(()=>Number(document.querySelector('[data-testid="artwork-field"]')?.dataset.entrance)>.4);await snapshot(p,`${stem}-entering`)
      await p.waitForFunction(()=>document.querySelector('[data-testid="ripple-hero"]')?.dataset.state==='live')
      await released(p)
      const evidence=await p.evaluate(()=>({events:window.__phaseC.events,boundary:window.__phaseC.boundary,videoEnd:window.__phaseC.videoEnd,sameCanvas:window.__phaseC.canvas===document.querySelector('[data-testid="artwork-field"]')}))
      assert(evidence.sameCanvas)
      assert.equal(evidence.events.filter(e=>e.type==='ended').length,1)
      const end=evidence.events.find(e=>e.type==='ended');assert(end.trusted);assert.equal(end.duration,5);assert(evidence.events.every(e=>e.rate===1));assert(!evidence.events.some(e=>e.type==='seeking'))
      assert.equal(evidence.boundary.entrance,0)
      for(const [name,png]of[['boundary',evidence.boundary.png],['video-end',evidence.videoEnd]]){
        const bytes=Buffer.from(png,'base64'),raw=await sharp(bytes).removeAlpha().raw().toBuffer();assert(raw.every(channel=>channel===0),'Actual browser video boundary is optical black');fs.writeFileSync(path.join(out,`${stem}-${name}.png`),bytes)
      }
      delete evidence.boundary.png;delete evidence.videoEnd
      await field(p).scrollIntoViewIfNeeded();await snapshot(p,`${stem}-live`)
      const c=await field(p).boundingBox();if(width<500)await p.touchscreen.tap(c.x+c.width*.78,c.y+c.height*.58);else await p.mouse.move(c.x+c.width*.78,c.y+c.height*.58)
      await p.waitForTimeout(450)
      await id(p,'field-fragments').click();assert.equal(await id(p,'field-fragments').getAttribute('aria-pressed'),'true')
      await field(p).scrollIntoViewIfNeeded();await snapshot(p,`${stem}-fragments`)
      await id(p,'field-all').click()
      await p.locator('#study-search').fill('60614');await p.locator('#study-search').press('Enter');assert.match(await p.locator('#search').innerText(),/60614/)
      await p.locator('#particle-atlas').scrollIntoViewIfNeeded();await p.getByRole('tab',{name:'Granules',exact:true}).click();await snapshot(p,`${stem}-atlas-interaction`)
      await p.locator('a[href="#specimen-study"]').last().click()
      await p.getByRole('button',{name:'UV view',exact:true}).click()
      await p.getByRole('slider',{name:'Rotate specimen'}).fill('40')
      await p.locator('#sample-study').scrollIntoViewIfNeeded();await snapshot(p,`${stem}-sample-interaction`)
      return {evidence,nativeVideoEndAndFirstCanvasBlack:true,recording:'unedited; native rate1; no seeking; live artwork and category response'}
    })
    await run('field-lifecycle',{},async p=>{
      await ready(p);await field(p).scrollIntoViewIfNeeded();await p.waitForTimeout(300)
      const a=await values(p);await p.waitForTimeout(450);assert((await values(p)).draws>a.draws)
      await id(p,'field-pause').click();await field(p).scrollIntoViewIfNeeded();await p.waitForTimeout(150)
      const frozen=await values(p),before=await stillHash(p);await p.waitForTimeout(650);assert.deepEqual(await values(p),frozen);assert.equal(await stillHash(p),before)
      await id(p,'field-fibers').click();await field(p).scrollIntoViewIfNeeded();assert.notEqual(await stillHash(p),before);assert.equal((await values(p)).time,frozen.time)
      await id(p,'field-all').click();await id(p,'field-pause').click();await field(p).scrollIntoViewIfNeeded()
      const r=await field(p).boundingBox();await p.mouse.move(r.x+r.width*.8,r.y+r.height*.6);await p.waitForTimeout(180);await field(p).click({position:{x:r.width*.8,y:r.height*.6}})
      assert(+await field(p).getAttribute('data-impulses')>=1)
      await p.locator('#sample-study').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await p.waitForFunction(()=>document.querySelector('[data-testid="artwork-field"]').dataset.running==='false')
      const off=await values(p);await p.waitForTimeout(600);assert.deepEqual(await values(p),off)
      await field(p).scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('[data-testid="artwork-field"]').dataset.running==='true')
      return {manualPauseStopsDraws:true,filterWorksPaused:true,offscreenStopsDraws:true,tapImpulse:true}
    })
    await run('pause-skip-entry',{},async p=>{
      await ready(p);await p.locator('#study-search').fill('Texas');await watch(p)
      await id(p,'journey-pause').click();const t=await p.locator('video').evaluate(v=>v.currentTime);await p.waitForTimeout(700);assert(Math.abs(await p.locator('video').evaluate(v=>v.currentTime)-t)<.05)
      await id(p,'journey-pause').click();await p.waitForFunction(()=>document.querySelector('[data-testid="ripple-hero"]')?.dataset.state==='entering')
      await id(p,'journey-pause').click();const frozen=await values(p);await p.waitForTimeout(700);assert.deepEqual(await values(p),frozen)
      await p.keyboard.press('Escape');await released(p);assert.equal(await p.locator('#study-search').inputValue(),'Texas')
      return {videoPause:true,entryPause:true,escape:true,inputPreserved:true}
    })
    for(const mode of ['reduced','reduced-during-entry','blocked-storage','rejected-play','late-play','failed-video','failed-artwork','no-canvas'])await run(mode,{width:390,height:844,reducedMotion:mode==='reduced'?'reduce':'no-preference',setup:async(ctx)=>{
      if(mode==='blocked-storage')await ctx.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Blocked','SecurityError')}}))
      if(mode==='rejected-play')await ctx.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Blocked','NotAllowedError'))}})
      if(mode==='late-play')await ctx.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return new Promise((resolve,reject)=>setTimeout(()=>play.call(this).then(resolve,reject),700))}})
      if(mode==='failed-video')await ctx.route('**/live/*.mp4',r=>r.abort())
      if(mode==='failed-artwork')await ctx.route('**/live/microscope-terminal.webp',r=>r.abort())
      if(mode==='no-canvas')await ctx.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='2d'?null:get.call(this,type,...args)}})
    }},async(p,ctx)=>{
      await ready(p,'/motion-study',!['failed-artwork','no-canvas'].includes(mode))
      if(['failed-artwork','no-canvas'].includes(mode)) {await p.waitForFunction(()=>document.querySelector('[data-testid="journey-proof-status"]').textContent.includes('Motion unavailable'));await p.locator('#study-search').fill('Austin');return {fallback:'usable static artwork and HTML'}}
      if(mode==='reduced'){const a=await values(p);await p.waitForTimeout(500);assert.equal((await values(p)).draws,a.draws);await id(p,'journey-watch').click();assert.equal(await p.locator('video').count(),0);return {noVideo:true,noLoop:true}}
      await id(p,'journey-watch').click()
      if(mode==='late-play'){await id(p,'journey-skip').click();await p.waitForTimeout(1000)}
      else if(mode==='reduced-during-entry'){await p.waitForFunction(()=>document.querySelector('[data-testid="ripple-hero"]')?.dataset.state==='entering');await p.emulateMedia({reducedMotion:'reduce'})}
      else if(!['rejected-play','failed-video'].includes(mode)){await p.waitForFunction(()=>document.querySelector('video')?.currentTime>.2);await p.keyboard.press('Escape')}
      await released(p);await snapshot(p,mode)
      return {recovery:true}
    })
    for(const [width,height]of[[1440,900],[390,844]])await run(`home-search-${width}`,{width,height,home:true},async(p,_c,state)=>{
      await ready(p,'/');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
      await p.locator('#tank-search-input').fill('Austin');aligned(await watch(p));await id(p,'journey-skip').click();await released(p)
      state.searchStatus=500;await p.locator('#tank-search-input').press('Enter');await id(p,'water-search-error').waitFor();assert.match(await id(p,'water-search-error').innerText(),/service error/)
      await snapshot(p,`home-${width}-service-error`)
      state.searchStatus=200;await p.getByRole('button',{name:'Try again',exact:true}).click();await id(p,'water-search-empty').waitFor();assert.match(await id(p,'water-search-empty').innerText(),/not evidence/)
      assert.deepEqual(state.searches,['Austin','Austin']);await snapshot(p,`home-${width}-empty`)
      return {realForm:true,failedServiceNotWaterFinding:true,retry:true,noFabricatedData:true}
    })
  } finally {await browser.close();report.success=report.checks.length>0&&report.checks.every(c=>c.passed);report.completedAt=new Date().toISOString();save();if(!report.success)process.exitCode=1}
})().catch(e=>{console.error(e);save();process.exitCode=1})
