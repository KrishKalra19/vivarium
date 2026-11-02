# Vivarium loop log

## TL;DR
- Loop started 2026-11-02 (night). See `LOOP_PLAN.md` for the backlog.
- **Krish feedback** (write anything here or in chat; the next cycle reads it first):
  -

## Entries
### 2026-11-02 — setup
- Wrote the plan and log. Next: the headless harness (backlog 1).
### 2026-11-02 — cycle 1: headless harness
- Added `tools/vivarium-run.js`: seeded headless Chromium run that writes `runs/<name>/run.json`, `chart.png` and `map.png` and flags species stuck at zero. three.js is served from `runs/.cache` (fetched via npm on first use; the CDN is blocked in the cloud sandbox).
- Verified: a 200 sim-s instinct run (seed 1) took 19.7 s wall with no page errors and no species stuck at zero. Final counts: agouti 477, howler 483, capybara 750, tapir 190, ocelot 141, harpy 110, jaguar 40, anaconda 28.
- Next: clades and subspecies splits (backlog 2).
