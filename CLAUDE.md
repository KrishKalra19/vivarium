# Vivarium: notes for Claude sessions

## Working with Krish
- **Send files in the chat.** When you create or meaningfully update a file Krish would want to read (Markdown docs, plans, write-ups, figures, screenshots), send it to him in the chat (e.g. with the send-file tool) so he can open it directly, instead of only naming the path.
- Lean research, but keep teaching moving too (see `LOOP_PLAN.md`, Phase 5).

## Conventions
- Work on the session's feature branch; never merge to `main` or GitHub Pages without asking.
- New simulation features are toggleable and **off by default**. Default runs must stay bit-identical: after any change to `js/vivarium.js`, run
  `node tools/vivarium-run.js --secs 600 --seed 1000 --mode brains --costs 1 --set '{"capScale":1.6,"headDownSense":0}' --out runs/reg`
  and check the fingerprint is `7ab26d53`.
- Don't break the Arena.
- Headless runs need three.js from `runs/.cache/three.min.js` (fetch with `npm pack three@0.128.0` if the CDN is blocked).
- Cloud containers restart: launch long runs with `setsid nohup` from a script that skips finished runs (pattern in `docs/experiments.md`).
- `LOOP_LOG.md` is the running log (TL;DR at the top, one entry per cycle); `LOOP_PLAN.md` is the plan. Research write-ups are in `docs/`.
