# Connect input and mobile rendering fixes

The message composer and modal forms share these changes:

- Persistent form labels, 16 px input text, explicit line boxes that accommodate system font scaling, and clear focus borders. Native Android's implicit underline is removed.
- The multiline composer grows from 52 to 132 px and then scrolls internally. Its input node stays mounted as text and formatting controls change. The editor remains usable during sends; late success/failure cannot clear a newer draft. A synchronous send lock rejects rapid duplicate taps.
- Phone formatting controls are tucked behind a 44 px action. Keyboard-sensitive form dialogs have their own keyboard-avoiding container. Mobile web follows the visual viewport when a soft keyboard changes the visible area; viewport updates are coalesced with requestAnimationFrame and preserve pinch zoom.
- Message-row hover state is local. Rows, message bodies, and avatars are memoized; selection updates use a ref. Bounded list batches leave room for input processing, and lists retain taps when the keyboard is open. Mobile message actions use a single menu instead of overlaying three controls on the text.

Regression checks cover input geometry and labels, multiline content, larger system text, selection/focus, send/retry retention, rapid taps, keyboard viewport cleanup, and all-role access. A synthetic 120-message history verifies that 30 caret movements cause zero workspace commits, 30 text changes re-render zero existing message rows, and hover updates only its row.

These are render-work and behavior checks, not a device FPS measurement. Local browser use was disabled in Work settings during this fix, so browser traces, refreshed screenshots, and physical-device 60 Hz/keyboard verification were not collected. The code targets iOS, Android, and mobile web; native installations require their normal app rebuild/update to receive the source changes.
