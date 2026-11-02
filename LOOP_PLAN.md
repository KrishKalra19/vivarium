# Vivarium loop plan (2026-11-02 → 11-04)

Goal: turn the Vivarium into an **evolution story you can watch**: lineages that branch
into subspecies, a phylogeny tree, and a time-lapse replay of a run. Every cycle has to be
measured with a headless run, not just eyeballed.

## How a cycle works
1. Read `LOOP_LOG.md` (TL;DR + Krish feedback) and this plan. Feedback from Krish beats this plan.
2. Do ONE backlog item (or fix what the last cycle broke).
3. Verify with `node tools/vivarium-run.js` (headless Chromium, seeded): no crashes, no
   species stuck at zero, plus whatever the item claims. Take screenshots into `runs/` (gitignored, except the ones the log cites).
4. Add an entry to the log: what, how verified, numbers, what's unverified, any decisions made.
5. Commit and push to `claude/sweet-planck-lhh90j`.

## Decisions made without Krish (change any of them in the log's feedback section)
- Branch-only work. Nothing merges to `main`/GitHub Pages until Krish says so.
- Nothing breaks existing modes: Arena untouched; new Vivarium features add to it or are toggleable.
- Pace: about one cycle every 30–60 min, so the budget lasts until 11/5.

## Backlog (in order)
1. **Headless harness** `tools/vivarium-run.js`: seeded run, samples counts, trait means and deaths; writes JSON, a chart PNG and a map screenshot.
2. **Clades**: each animal carries a clade id. When a sub-population's trait genome drifts past a threshold from its clade founder, it splits into a new named subspecies (e.g. "Swift Agouti"). Log the splits.
3. **Phylogeny tree** in the Genetics tab: the clade tree over time, with branch width = population and extinct branches greyed out.
4. **Geography to drive splits**: a river/biome barrier (toggleable) so populations separate (allopatric speciation).
5. **Time-lapse replay**: record compact snapshots and scrub through a run with the tree in sync.
6. **Sexual reproduction** (toggleable): mate choice and recombination, so clades only stay apart when they stop interbreeding.
7. Stretch: CSV export, touch controls for the 3D view, a biome switcher.
8. After 1–6: see "Ideas for the next cycles" at the bottom of LOOP_LOG.md. Default order if Krish hasn't picked: long-run test → choosiness gene → tree/time-lapse polish → share/export.
