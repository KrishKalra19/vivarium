# Vivarium loop log

## TL;DR
- Loop started 2026-11-02 (night). See `LOOP_PLAN.md` for the backlog.
- **The overnight timer never fired:** the cloud container went idle and the in-session wakeup died with it. Since 11-02 afternoon the loop re-arms with a server-side reminder instead.
- Done: harness (1), subspecies/clades (2), family tree (3), river barrier (4), time-lapse (5), sexual reproduction (6). The core backlog is done; next come stretch items and polish (see the cycle 6 entry).
- Screenshots to look at: `docs/loop/`
- **Krish feedback** (write anything here or in chat; the next cycle reads it first):
  - 11-02: subspecies pace: no opinion, so keep the current settings.
  - 11-02: **fake-Latin names** for subspecies (replacing "Swift Giant Agouti").
  - 11-02: do the choosiness gene, then **move past features toward data collection, so Vivarium is usable in a real ethology context**, not just as a fun project. See Phase 2 in LOOP_PLAN.md.
  - 11-02: **lean research** (build toward the many-eyes experiment), but keep teaching (field-methods mode) on the backlog and actually get to it.

## Entries
### 2026-11-02 — setup
- Wrote the plan and log. Next: the headless harness (backlog 1).
### 2026-11-02 — cycle 1: headless harness
- Added `tools/vivarium-run.js`: seeded headless Chromium run that writes `runs/<name>/run.json`, `chart.png` and `map.png` and flags species stuck at zero. three.js is served from `runs/.cache` (fetched via npm on first use; the CDN is blocked in the cloud sandbox).
- Verified: a 200 sim-s instinct run (seed 1) took 19.7 s wall with no page errors and no species stuck at zero. Final counts: agouti 477, howler 483, capybara 750, tapir 190, ocelot 141, harpy 110, jaguar 40, anaconda 28.
- Next: clades and subspecies splits (backlog 2).
### 2026-11-02 15:40 UTC — cycle 2: subspecies (clades)
- New `js/clades.js`. Every genome carries a clade id that its offspring inherit. Once a group of 20+ animals (at least 20% of its clade) drifts 0.22 (band-normalised) from the clade's founding type AND sits 0.15 from the rest of its clade, it becomes a named subspecies, e.g. "Swift Giant Agouti" or "Keen-eyed Ocelot", with II/III for repeats. Splits appear in the Field Log. Max 5 living subspecies per species. Exposed as `Vivarium.clades()`.
- Tuning: the first thresholds (0.16, no gap rule) gave 152 splits in 25 min of pure drift noise. The strict ones (0.28/0.2) gave 1, after which the Swift Agouti swept the whole species. Settled on 0.22/0.15/120 s.
- Verified with `tools/vivarium-run.js` at 1500 sim-s in instinct mode: seed 1 gave 13 subspecies (13 alive), seed 2 gave 15 (14 alive), with no page errors and no species stuck at zero. Most splits are agouti/howler/capybara (fast breeders); tapir and anaconda rarely split.
- Not yet checked: brains/mixed modes (clades should be independent of brain lineage, but this hasn't been run); in-browser look (it only shows up in the Field Log so far).
- Design note: with one open habitat, splits mostly happen along speed and mass. Real isolation needs backlog 4 (barriers).
### 2026-11-02 17:20 UTC — cycle 3: family tree
- New **Family tree** card in the Genetics tab, for the species picked under Trait drift. Time runs left to right with one lane per subspecies, line width follows population, dashed drops mark each split, and extinct lineages are greyed with †/✕. The caption counts living lineages and subspecies. Drawing lives in `Clades.drawTree` (`js/clades.js`).
- Clade history now covers the whole run at falling resolution (it halves past 600 samples) instead of only the last 10 minutes.
- Verified: headless Chromium, seed 1, 1500 sim-s, screenshots of agouti/howler/capybara with no page errors. Agouti shows the original line dying out after Swift Agouti took over, then Swift Agouti branching into Frugal / Dim-eyed / Giant forms. Screenshots: `docs/loop/c3-tree-agouti.png`, `docs/loop/c3-tree-howler.png`.
- Noticed (not mine, not fixed): the "Evolved brains" cards show (empty) in the Genetics tab even in Instinct mode in the headless run. Might be a headless quirk; worth a look in a real browser.
- Not yet checked: phone-width layout of the tree, and how the tree looks after hours of running (many extinct lanes; may need a "hide extinct" toggle).
### 2026-11-02 18:40 UTC — cycle 4: river barrier
- New **River barrier** toggle in Controls → Interventions, also `Vivarium.river(true)`. A meandering river splits the range north–south and the channel grows no plants. Agoutis, howlers and ocelots can't cross except at rare fords (0.002 per second of pushing at the bank). Capybara, tapir, jaguar and anaconda swim it, and harpies fly over. Offspring are born on their parent's bank. Painted in both Map and 3D (3D not visually checked). Off by default, so existing behaviour is unchanged.
- Bug caught by measurement: the first version rolled the ford chance every physics substep (30/s), so blocked animals crossed within seconds and subspecies sat evenly on both banks. It's now a per-second rate.
- Verified on 3 seeds, 1500 sim-s each, no page errors, no species stuck. The metric is "bank purity": the share of each subspecies' animals on its majority bank, for subspecies of 10+ animals.
  | | river-blocked species | swimmers/fliers |
  |---|---|---|
  | no river (2 seeds) | 55–62% | 56–62% |
  | river (3 seeds) | 68–93% | 57–60% |
  So agouti and howler lineages now split by bank (e.g. "Swift Giant Howler Monkey": 293 east / 1 west; "Swift Agouti IV": 115 east / 0 west). Screenshot: `docs/loop/c4-river-map.png`.
- Open question: **ocelots don't respond** (~58% purity even with the river) although they're blocked. My guess is that their small, crash-prone population gets reset by immigrants dropped on both banks. Not investigated.
- Harness caveat: runs with the same seed aren't bit-identical (the page's own frame loop draws random numbers at timing-dependent moments), and the no-river subspecies count ranged 6–23 between seeds. Compare across several seeds, never one.
### 2026-11-02 19:30 UTC — cycle 5: time-lapse replay
- New **Time-lapse** button under the map. It pauses the sim and replays the whole run: play/pause, a scrubber, and a **Species / Subspecies** colour toggle with a species picker. In Subspecies mode the picked species' subspecies get distinct colours and everyone else is greyed out, so you can watch, e.g., howlers split into a west-bank and an east-bank colour. The Family tree draws a cursor at the replay time. "Back to live" resumes. Vegetation, the river and fire scars are recorded too.
- Recording (`js/timelapse.js`): every 5 sim-s, 4 × int16 per animal plus 1 byte per plant cell. At 400 frames it drops every other frame and doubles the interval, so it always covers the whole run (≈10 MB worst case). API: `Vivarium.replay(i, 'subspecies', sid)`, `Vivarium.replay(false)`, `Vivarium.timelapse`.
- Verified headless (river on, seed 1, 1500 sim-s, no page errors): 291 frames covering 0–1498 s. Frame contents check: 325 howlers stored vs 326 alive (the one missing was born after the frame). Screenshot early vs end: `docs/loop/c5-timelapse-howler.png`.
- Fixes found while checking: subspecies dots were sub-pixel at full-map zoom (they now have a minimum on-screen size), and a palette orange matched the agouti's own colour, so every agouti looked the same (palette changed; the new palette isn't re-screenshotted).
- Not yet checked: phone-width layout of the bar, touch scrubbing, memory on very long runs (a cap is in place but untested past 25 min), and replay while in 3D (it switches you to Map).
### 2026-11-02 20:15 UTC — cycle 6: sexual reproduction
- New **Sexual reproduction** toggle in Controls → Selection pressure, also `Vivarium.sexual(true)`. A breeder needs an adult of its own species and lineage within its species' mate radius, and not across the river for river-blocked species. It prefers genetically similar partners: candidates are weighted by exp(−(d/0.3)²) and one is drawn by weight. Each trait comes from a random parent, and brains cross over one whole hidden neuron at a time. The subspecies label passes down the mother's side; a mating between different subspecies counts as a hybrid. Stats: `Vivarium.mating()`. Off by default.
- **Bug caught by measurement:** with a fixed 160 px mate search, jaguars (16 on the map, ~490 px apart) died of old age without breeding, in every seed (end counts: jaguar 2–4, ocelot 4–7). The mate radius now scales with each species' starting density so that ~3 adults are in range (agouti ~110 px, jaguar ~480 px). After the fix, jaguars end at 37–42, the same as asexual runs.
- Verified: 3 seeds with river + mating at 1500 sim-s, plus a 600 s Mixed (brains) run that exercises brain crossover. No page errors and no species stuck at zero. ~21k matings per run; 4–8% are between different subspecies.
- **Finding: mating slows speciation in a 25-minute run.**
  | river on | subspecies founded | bank purity (blocked species) |
  |---|---|---|
  | asexual (cycle 4) | 14–21 | 68–93% |
  | sexual | 9 (all 3 seeds) | 60–71% |
  Interbreeding keeps each population cohesive, so a sub-group rarely gets 0.22 away from the rest. This is plausibly real biology (gene flow opposes divergence), but it may just need longer runs. **Untested: a 2-hour sexual + river run**, which is the next thing to measure.
- Pre-existing, not caused by this change: Mixed mode with or without mating ends at 600 s with very few harpies (3–8) and jaguars (3–4).

## Ideas for the next cycles (stretch, no order yet; Krish, pick any)
- Long-run test: 2 hours of sexual + river. Does speciation catch up? Also tests time-lapse memory.
- Reproductive isolation as its own evolving trait (a "choosiness" gene), so sympatric speciation becomes possible.
- "Hide extinct" toggle and phone layout for the family tree / time-lapse bar.
- Share a run: export the time-lapse + tree as a file, or a GIF of the replay.
- Biome switcher (savanna) from the original roadmap.
