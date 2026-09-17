#!/usr/bin/env bash
# Requires QA Chrome attached via: agent-browser --session ripple-qa connect http://127.0.0.1:9223
set -euo pipefail
URL="${QA_URL:-http://localhost:3012}"
ab() { agent-browser --session "${QA_SESSION:-ripple-qa}" "$@"; }
ab open "$URL"
ab eval "(() => { if (location.origin !== new URL('$URL').origin) throw Error('Wrong QA origin'); return location.href; })()"
ab eval 'sessionStorage.setItem("ripple-entered", "1")'
ab reload
ab wait '.siphon-stage'
ab set media dark
ab set viewport 375 700
ab eval 'new Promise(r => setTimeout(r, 500))'
ab eval '(() => { const stops = [...document.querySelectorAll(".siphon-stop")]; if(stops.length !== 4) throw Error("Missing waypoints"); const last = stops[3].getBoundingClientRect(); if(last.left < 0 || last.right > document.documentElement.clientWidth + 1) throw Error("Mobile waypoints clipped"); if(last.top <= stops[0].getBoundingClientRect().bottom) throw Error("Mobile waypoints must stack"); return "PASS: all mobile waypoints accessible"; })()'
ab set viewport 1440 1000
ab eval 'new Promise(r => setTimeout(r, 500))'
ab eval '(() => { const s = document.querySelector(".siphon-stage"); if(!s.parentElement.classList.contains("pin-spacer")) throw Error("Desktop pin missing"); window.siphonStart = s.parentElement.getBoundingClientRect().top + scrollY - 76; window.scrollTo(0, window.siphonStart + 750); })()'
ab eval 'new Promise(r => setTimeout(r, 400))'
ab eval '(() => { const s = document.querySelector(".siphon-stage"), track = document.querySelector(".siphon-track"); if(getComputedStyle(s).position !== "fixed") throw Error("Not pinned at midpoint"); if(s.getBoundingClientRect().bottom > innerHeight + 1) throw Error("Pinned stage taller than viewport"); const x = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41; const distance = track.scrollWidth - track.parentElement.clientWidth; if(Math.abs(x + distance / 2) > 8) throw Error(`Midpoint drift: ${x}`); return "PASS: desktop pin fits, midpoint scrub"; })()'
ab eval 'scrollTo(0, window.siphonStart + 1500)'
ab eval 'new Promise(r => setTimeout(r, 400))'
ab eval '(() => { const last = document.querySelector(".siphon-stop:last-child").getBoundingClientRect(); if(last.right > document.documentElement.clientWidth + 1 || last.left < 0) throw Error("Last waypoint unreachable"); return "PASS: final waypoint visible"; })()'
ab set media dark reduced-motion
ab eval 'new Promise(r => setTimeout(r, 500))'
ab eval '(() => { const s = document.querySelector(".siphon-stage"), stops = [...s.querySelectorAll(".siphon-stop")]; if(s.parentElement.classList.contains("pin-spacer")) throw Error("Reduced motion pin remains"); if(stops[3].getBoundingClientRect().top <= stops[0].getBoundingClientRect().bottom) throw Error("Reduced motion clips waypoints"); if(!new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".siphon-track")).transform).isIdentity) throw Error("Transform not reverted"); const flows = stops.map(e => e.getBoundingClientRect()); if(flows.some(r => r.left < 0 || r.right > document.documentElement.clientWidth + 1)) throw Error("Reduced motion content outside viewport"); return "PASS: reduced motion readable, pin and transform cleaned up"; })()'
ab set media dark
ab set viewport 1440 800
ab eval 'new Promise(r => setTimeout(r, 500))'
ab eval '(() => { if(document.querySelector(".siphon-stage").parentElement.classList.contains("pin-spacer")) throw Error("Short viewport pinned"); if(document.querySelector(".siphon-stop:last-child").getBoundingClientRect().right > document.documentElement.clientWidth + 1) throw Error("Short viewport clipped"); return "PASS: short-screen fallback"; })()'
