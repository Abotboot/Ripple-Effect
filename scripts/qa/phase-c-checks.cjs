/* eslint-disable @typescript-eslint/no-require-imports -- Local fixture/build verification. */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { ESLint } = require('eslint')
const root = path.resolve(__dirname,'../..')
const out = path.join(root,'docs/qa/phase-c/checks')
fs.mkdirSync(out,{recursive:true})
const baseline='e7269d80291e4fbb9588ed1a27eb2bea2ce04f1f'
const report={createdAt:new Date().toISOString(),baseline,node:process.version,checks:[]}
const save=()=>fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n')
const targets=[
  'src/lib/artwork-field.ts','src/lib/artwork-journey.ts',
  'src/components/atmosphere/artwork-field-canvas.tsx','src/components/atmosphere/cinematic-intro.tsx',
  'src/components/atmosphere/tank-hero.tsx','src/components/atmosphere/water-narrative.tsx',
  'src/components/sections/home-section.tsx','src/components/sections/particle-atlas.tsx',
  'src/app/motion-study/page.tsx','scripts/phase-c-artwork-assets.cjs',
  'scripts/qa/phase-c-browser.cjs','scripts/qa/phase-c-checks.cjs','scripts/qa/phase-c-deployed.cjs',
  'docs/qa/phase-c/renderer/check.cjs','docs/qa/phase-c/design/review-design.cjs',
]
const checks=[
  ['original-artwork-integrity',['--test','scripts/qa/phase-b-assets.mjs']],
  ['original-microscope-and-posters',['scripts/phase-c-artwork-assets.cjs','--check']],
  ['provenance',['scripts/qa/run-regression.cjs','provenance']],
  ['public-read-safety',['scripts/qa/run-regression.cjs','read-path']],
  ['data-regressions',['scripts/qa/run-regression.cjs','remaining']],
  ['typescript',['node_modules/typescript/bin/tsc','--noEmit']],
  ['scoped-lint',['node_modules/eslint/bin/eslint.js',...targets]],
  ['production-build',['node_modules/next/dist/bin/next','build']],
]
async function main(){
  for(const[name,args]of checks){
    console.log('RUN',name)
    const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:240000,maxBuffer:16*1024*1024,
      env:{...process.env,SEED_DEMO_DATA:'false',DATABASE_URL:'postgresql://qa:qa@127.0.0.1:1/ripple_qa?connect_timeout=1',DIRECT_URL:'postgresql://qa:qa@127.0.0.1:1/ripple_qa?connect_timeout=1'}})
    const text=`${result.stdout||''}${result.stderr||''}${result.error?.message||''}`.replaceAll(root,'<repo>').replaceAll(root.replaceAll('\\','/'),'<repo>')
    const log = text.replace(/[ \t]+$/gm,'').trimEnd()
    fs.writeFileSync(path.join(out,name+'.txt'),log ? log+'\n' : '')
    const passed=result.status===0&&!result.error
    report.checks.push({name,command:['node',...args],passed,exitCode:result.status});save()
    console.log(passed?'PASS':'FAIL',name)
    if(!passed){console.log(text.slice(-3000));process.exitCode=1}
  }
  const results=await new ESLint({cwd:root}).lintFiles(['.'])
  const normalize=s=>s.replace(/\r\n/g,'\n')
  const files=results.filter(r=>r.errorCount||r.warningCount).map(r=>{
    const file=path.relative(root,r.filePath).replaceAll('\\','/')
    const old=spawnSync('git',['show',`${baseline}:${file}`],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024})
    return{file,errors:r.errorCount,warnings:r.warningCount,unchanged:old.status===0&&normalize(old.stdout)===normalize(fs.readFileSync(r.filePath,'utf8'))}
  })
  report.fullLint={errors:results.reduce((n,r)=>n+r.errorCount,0),warnings:results.reduce((n,r)=>n+r.warningCount,0),allDiagnosticsInUnchangedFiles:files.every(f=>f.unchanged),files}
  fs.writeFileSync(path.join(out,'lint-baseline.json'),JSON.stringify(report.fullLint,null,2)+'\n')
  if(!report.fullLint.allDiagnosticsInUnchangedFiles)process.exitCode=1
  report.success=report.checks.every(c=>c.passed)&&report.fullLint.allDiagnosticsInUnchangedFiles
  report.completedAt=new Date().toISOString();save()
  console.log(JSON.stringify({success:report.success,fullLintErrors:report.fullLint.errors,fullLintWarnings:report.fullLint.warnings,allUnchanged:report.fullLint.allDiagnosticsInUnchangedFiles}))
}
main().catch(e=>{console.error(e);save();process.exitCode=1})
