#!/usr/bin/env bash
set -euo pipefail
URL="${QA_URL:-http://localhost:3012}"
ab() { agent-browser --session "${QA_SESSION:-ripple-qa}" "$@"; }
ab open "$URL"
ab eval 'sessionStorage.setItem("ripple-entered", "1")'
ab reload
ab eval '(() => { const section = document.querySelector(".countermeasure-stage"); if (!section) throw Error("Stage 04 CTA missing"); const link = section.querySelector("a[href=\"#submit\"]"); if (!link || !link.textContent.trim()) throw Error("CTA must link to existing #submit route"); return "PASS: Stage 04 links to #submit"; })()'
ab wait '.countermeasure-action'
ab set viewport 375 700
ab eval '(() => { const stage = document.querySelector(".countermeasure-stage"); stage.scrollIntoView({behavior:"instant"}); const r = stage.getBoundingClientRect(); if (r.left < 0 || r.right > document.documentElement.clientWidth + 1) throw Error("CTA overflows mobile"); return "PASS: mobile CTA fits"; })()'
ab eval 'document.querySelector(".countermeasure-action").scrollIntoView({block:"center",behavior:"instant"})'
ab eval 'new Promise((resolve,reject) => { const start=Date.now(); let previous=null,stable=0; const check=()=>{const a=document.querySelector(".countermeasure-action"),r=a.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); stable=previous!==null && Math.abs(previous-r.y)<0.5 && (hit===a || a.contains(hit)) ? stable+1 : 0; previous=r.y; if(stable>=5)return resolve("PASS: CTA stable and unobstructed"); if(Date.now()-start>5000)return reject(Error("CTA never became clickable")); requestAnimationFrame(check);};check();})'
ab click '.countermeasure-action'
ab eval 'new Promise((resolve, reject) => { const start = Date.now(); const check = () => { if (location.hash === "#submit" && !document.querySelector(".countermeasure-stage") && document.querySelector("form")) return resolve("PASS: CTA navigates away from home to submit"); if (Date.now() - start > 5000) return reject(Error("Submit route did not render")); setTimeout(check, 120); }; check(); })'
