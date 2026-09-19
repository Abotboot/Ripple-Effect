# Mobile entry and hero blend — 2026-09-19

The mobile editorial overlay previously ended at its box edge. It now uses a separate gradient extending 110px below the copy, fading to transparent over the particle field.

Enter previously returned immediately for reduced motion; otherwise playback began in a deferred effect and any play rejection exited to the homepage. Enter now mounts the player synchronously and calls its play handle within the same click dispatch. Explicit playback is allowed with reduced motion, while initial entry and ambient motion still respect the preference. A `NotAllowedError` leaves a visible Play intro button and Skip on screen; its blocked state does not expire through the decode watchdog. Actual media failures still release the page. Cleanup, offscreen suspension and the terminal dissolve remain intact.

`scripts/qa/mobile-entry-regression.cjs` passed six cases across Chromium and WebKit at 414×896: normal, reduced motion and simulated gesture-policy rejection. It verifies that play is called during click dispatch, a blocked player survives longer than the 10-second decode timeout, a direct retry plays, and Skip restores search without inert locks. A separate normal-speed handoff suite covers desktop, 414px and 320px, replay and failure cleanup. APIs are stubbed unavailable; no database mutations are involved. This is browser-engine testing, not physical iPhone XR or Low Power Mode testing.

Evidence: workspace `outputs/mobile-entry-fix` and `outputs/mobile-fix-handoff`. Source policy reference: [WebKit video policies](https://webkit.org/blog/6784/new-video-policies-for-ios/).
