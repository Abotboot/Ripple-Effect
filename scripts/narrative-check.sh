#!/usr/bin/env bash
# Requires agent-browser session already attached to QA Chrome over CDP.
set -euo pipefail
SESSION="${QA_SESSION:-ripple-qa}"
URL="${QA_URL:-http://localhost:3012}"
ab() { agent-browser --session "$SESSION" "$@"; }
ab set viewport 1440 1000
ab open "$URL"
ab eval 'sessionStorage.removeItem("ripple-entered")'
ab reload
ab wait 'dialog[open]'
ab eval 'document.fonts.ready.then(() => true)'
ab click '.gate-enter'
ab wait 'h1:focus'
ab eval 'new Promise(resolve => setTimeout(resolve, 400))'
ab eval '(() => { const root = document.documentElement; if (root.scrollWidth > root.clientWidth + 1) throw new Error(`Overflow after entry: ${root.scrollWidth} > ${root.clientWidth}`); return "PASS: entry preserves page width"; })()'
ab eval 'window.scrollTo(0, document.querySelector(".pin-spacer").getBoundingClientRect().top + scrollY - 76 + 325)'
ab eval 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'
ab eval '(() => { const value = Number(document.querySelector(".particle-number span").textContent.replaceAll(",", "")); if (value < 110000 || value > 130000) throw new Error(`Midpoint count: ${value}`); if (getComputedStyle(document.querySelector(".particle-stage")).position !== "fixed") throw new Error("Stage not pinned"); return "PASS: pinned midpoint counter"; })()'
ab set viewport 375 700
ab eval 'new Promise(resolve => setTimeout(resolve, 400))'
ab eval '(() => { if (document.querySelector(".pin-spacer")) throw new Error("Mobile should not pin"); if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) throw new Error("Mobile overflow"); return "PASS: mobile native flow and width"; })()'
