# Vivarium loop log

## TL;DR
- Loop started 2026-11-02 (night). See `LOOP_PLAN.md` for the backlog.
- **The overnight timer never fired:** the cloud container went idle and the in-session wakeup died with it. Since 11-02 afternoon the loop re-arms with a server-side reminder instead.
- Done: harness (1), subspecies/clades (2), family tree (3), river barrier (4), time-lapse (5), sexual reproduction (6). Cycle 7: 2-hour long-run test plus a fix for recovery after a crash. Cycle 8: choosiness gene + Latin names. Cycle 9: trait costs. Cycle 10: bit-identical seeded runs. Cycle 11: life table CSV. Cycle 12: scan-sampled ethogram. Cycle 13: experiment runner + many-eyes pilot. **Next: fix the vigilance definition (stationary head-up only), then the real many-eyes experiment with controls.**
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
### 2026-11-02 21:30 UTC — cycle 7: 2-hour long-run test
Two 7200 sim-s runs, river on, seed 1, one with mating and one without (~18 min wall each). No page errors.
| 2 h, river on | subspecies (alive) | bank purity, blocked / free | splits per 30 min | end counts |
|---|---|---|---|---|
| asexual | 40 (19) | 68% / 57% | 13 / 17 / 4 / 6 | all 8 species healthy |
| sexual | 30 (14) | **82%** / 52% | 15 / 8 / 3 / 4 | **agouti 1, harpy 2, ocelot 3** |
- **Speciation does catch up with mating over the longer run, and it's cleaner.** Bank purity of blocked species ends at 82% with mating vs 68% without (at 25 min it was 60–71% vs 68–93%). Interbreeding within each bank keeps that bank's population cohesive, so subspecies line up with geography. One seed only, so treat this as a lead, not a result.
- In both runs splits slow after the first hour, because traits pin against their evolvable limits (see below).
- **Hybrid share climbed to 34% of matings** with mating on (4–8% at 25 min). As subspecies multiply, matings across them become common, so these subspecies aren't reproductively isolated. That's exactly what the choosiness gene (next) is for.
- **Bug: Allee trap after a crash.** Agouti numbers swing in both runs, but with mating on, a crash to zero at ~6,600 s became permanent: arrivals came one at a time, and a lone arrival can't find a mate. Harpies then starved. Fix: with mating on, arrivals come as a band of 4 (`Vivarium.params.arrivalGroup`). Crash test: kill every agouti at 300 s, then watch 600 s:
  | arrivals | seed 1 | seed 2 |
  |---|---|---|
  | 1 at a time | 147 after 600 s (slow) | stuck at 0–2 for 600 s |
  | band of 4 | 492 | 563 |
  New API: `Vivarium.cull(sid, frac)` for crash experiments.
- **Model limitation, important for Phase 2:** by about 1 h, agouti mean mass (1.65 of a 1.70 cap) and speed (1.47 of 1.50) are pinned at the edge of their bands in *both* runs. Selection is pushing into an artificial wall, so "bigger and faster" has no real cost beyond metabolic drain. Before any research claim about trait evolution, give these traits real trade-offs (e.g. speed raises drain; mass slows maturity). Added to Phase 2.
- Time-lapse memory over 2 h: 349 frames at 20 s spacing, 8.7 MB; total JS heap 25–28 MB. The cap works.
### 2026-11-02 22:20 UTC — cycle 8: choosiness gene + Latin names
- **Latin names** (Krish's call). Roots use the real binomials: *Dasyprocta punctata*, *Alouatta seniculus*, *Hydrochoerus hydrochaeris*, *Tapirus terrestris*, *Leopardus pardalis*, *Harpia harpyja*, *Panthera onca*, *Eunectes murinus*. Subspecies add Latin epithets for the drift direction, agreeing in gender with the genus: *velox*/*tardus*, *magnus*/*minor*, *oculatus*/*obscurus*, *parcus*/*vorax*. Examples: *D. punctata velox*, *A. seniculus velox magna*, *H. harpyja oculata*. The tree draws names in italics, and the Field Log gives both: "*D. punctata velox* (Swift Agouti) split from …". `Vivarium.clades()` now carries `common` as well.
- **Choosiness gene** (`genome.choosy`, 0.05–1.0, starts ~0.35, near the old fixed 0.3). It is her own tolerance σ in the mate-preference curve exp(−(d/σ)²): lower is pickier. It mutates and is inherited from a random parent. It is kept outside the trait vector, so it never drives subspecies splits by itself. **It has a cost:** after drawing a partner, she accepts with probability equal to that partner's preference weight, so a picky female often turns everyone down and loses that breeding attempt (`mating.rejected`).
- Verified: 3 seeds with mating + river and 1 asexual control, 1500 sim-s, no page errors, no species stuck at zero. ~26% of mating attempts end in rejection.
- **Result: choosiness evolves away.** Mean σ rose 0.35 → 0.38–0.48 in 11 of 12 species×seed combos (agouti, howler, capybara, jaguar), while the asexual control (where the gene does nothing) wandered both ways (e.g. howler 0.36 → 0.20). This is what theory predicts: hybrids here pay no fitness cost, so pickiness is pure cost, and there's nothing for reinforcement to work with. **The interesting follow-up:** add a hybrid fitness penalty (e.g. hybrids between clades far apart have lower fertility or survival) and test whether choosiness then evolves *down*. That's the classic reinforcement experiment (Dobzhansky), and a good Phase 2 study. Added to the plan.
- Not checked visually: the italic tree labels and the Field Log wording in a real browser.
### 2026-11-02 23:30 UTC — cycle 9: trait costs (Phase 2 step 1b)
- New **Trait costs** toggle (Controls → Selection pressure; `Vivarium.traitCosts(true)`; harness `--costs 1`). Every multiplier is exactly 1 for a baseline genome, so costs only bite as a trait drifts. Speed raises drain (0.5 + 0.5·speed², since locomotion power grows ~v²). Sense raises drain slightly (0.9 + 0.1·sense², for expensive neural tissue). A slow metabolism digests and powers muscle more slowly (intake × metab^0.6, speed × metab^0.3). Bigger bodies mature and re-breed later (× mass^0.25, allometric). Costs are fixed at birth. Off by default.
- Verified: 1-hour runs (3600 sim-s), 2 seeds per variant, no page errors.
  | 1 h | traits within 8% of a cap (of 32) | mean drift from species norm | agouti speed / metab |
  |---|---|---|---|
  | no costs | 2–3 | 0.19–0.20 | 1.47 / 0.76 (both pinned) |
  | costs v1 (intake × metab) | 2 | 0.15–0.18 | 1.42 / 1.31 (metab flipped to the *other* cap) |
  | **costs v2 (intake × metab^0.6), shipped** | **0** | 0.15–0.16 | 1.42 / 1.21 |
  With costs on, howler speed drops from 1.22–1.41 to 1.05–1.16, and the metabolism trait now settles mid-band instead of hugging an edge. Agouti stays fast (1.42) but now pays for it, which is plausible for the prey base under the heaviest predation.
- **Open item: harpies.** With costs v2 they end at 18 in both seeds, against 110 with no costs and 32–58 with v1. They're fast fliers preying on the fast agouti, so they likely pay the steepest speed bill. It needs a look before any experiment that leans on predator numbers. Ocelot and anaconda stay low in every variant (pre-existing).
- Decision made (log, don't re-ask): research experiments should run with **trait costs on**; the UI default stays off so the casual mode is unchanged.
### 2026-11-03 00:00 UTC — cycle 10: reproducibility (Phase 2 step 2)
- The simulation now draws from **its own seeded generator** (mulberry32) instead of `Math.random`, and brain mutation shares it via `Ludus.rand`. 41 call sites moved. Only UI-only code keeps `Math.random`: the 3D hills and trees, and the nature-cam director. That director was the old leak: it ran every frame and pulled from the shared stream at timing-dependent moments.
- New API: `Vivarium.reset(seed)` (no seed draws a fresh one), `Vivarium.seed()`, and `Vivarium.manifest()` (seed, world mode, toggles, params, hunt costs, code version). The Reset button draws a fresh seed. The harness now calls `reset(seed)`, saves `manifest` and a final-state `fingerprint` (FNV hash of every animal's id, position and energy) into run.json, and takes `--uiseed` to vary page-side randomness on purpose.
- **Verified: bit-identical.** Same `--seed 7` with three different UI seeds (11/22/33), in the hardest setup (Mixed brains + river + mating + trait costs, 600 sim-s), gave the same fingerprint `692adfc1` all three times. The same check in instinct mode gave `25aeacb1` twice. A different seed (8) gives a different run (`5567ed4c`). No page errors.
- Scope (important for anyone citing a run): reproducibility holds for **scripted fixed-step runs** (harness, and the experiment runner to come). An interactive browser session steps by real frame time and takes clicks at arbitrary moments, so a live session is *not* replayable from its seed. The manifest describes the setup, not the clicks.
- The cycle 1–9 tables were measured before this change. Their numbers still stand as measured, but they can't be regenerated exactly.
### 2026-11-03 00:45 UTC — cycle 11: life table export (Phase 2 step 3)
- **Life table**: one CSV row per animal with 30 columns (parents, origin, generation, lineage, clade at birth/death, born/died/age, cause, killer, bank at birth, final position, expressed traits and genes, choosiness, litters, children, kills, strikes). Column reference: `docs/life-table.md`.
- How to get it: Census tab → **Data** → "Record life table" (resets the range with a fresh seed so the founders are included), then "Download life table (CSV)", which also saves a manifest .json. Headless: `--lifetable 1` writes `life.csv` and `manifest.json`. API: `Vivarium.lifeTable(true)`, `Vivarium.lifeTableCSV()`.
- **Verified by integrity checks** (seed 3, 900 sim-s, river + mating + costs; 14,468 rows, 2.1 MB): uids unique; living rows = final census; every born animal's mother and father exist and share its species; the `children` column matches the pedigree for every row (0 mismatches); `kills` matches victims for every predator (0 mismatches); all 5,848 predation deaths have a killer; age = died − born to within 0.04 s.
- **Pre-existing bug found by those checks:** the death counter (`Vivarium.deaths()`) was never cleared on reset, so counts carried over from the previous world. That slightly inflated death counts in some earlier cycle numbers, by the handful of deaths before the harness paused the auto-started world. Fixed. Fingerprint unchanged (`6639f12b` before and after), which proves the fix doesn't touch the simulation and the run is still bit-identical.
### 2026-11-03 01:45 UTC — cycle 12: ethogram + time budgets (Phase 2 step 4)
- **Scan sampling at 1 Hz**, the standard field method: every sim-second each animal is scored in one of 8 states (feed, vigilant, forage, flee, chase, stalk, lurk, search), along with its group size (conspecifics within 60 px, itself included). Each animal's counts go into 10 new life-table columns. Per-species time budgets, plus a **vigilance-by-group-size table** for brain herbivores, come from `Vivarium.ethogram()` / `ethogram.json`. Definitions are in `docs/life-table.md`.
- **Two measurement problems caught and fixed:**
  1. *Predator "chase" was meaningless for brains.* The sim's own label means "locked on and moving", so brain predators scored chase 82–95% of the time. The ethogram now scores from motion: chase = ≥60% top speed **and** heading at the target. After the fix, brain predators show chase ~50%, stalk ~45–50%; instinct predators show search ~82%, chase 12–16%.
  2. *Samples weren't 1 Hz.* The sampler reset its accumulator to 0 instead of subtracting 1, so float drift made it fire every ~1.033 s (871 samples in 900 s). Fixed: 901 in 900 s, and every animal's scan count is within 1 of its age. This also shifts the timing of census, clade and time-lapse samples slightly, so fingerprints from cycles 10–11 won't match new runs (they're still deterministic, just different).
- Verified (seed 3; brains + costs 900 s, instinct 300 s; no page errors): per-species budget totals equal the life table's scan totals (2.0M and 0.57M scans), and every row's state counts sum to its scans.
- **Unplanned first look at many-eyes** (brains mode, one seed, preliminary). Share of foraging scans spent vigilant, by group size 1 / 2–3 / 4–7 / 8–15 / 16–30:
  - agouti 8% / 6% / 5% / 4% / 1%: falls, as the many-eyes effect predicts
  - howler 7% / 7% / 7% / 5% / 4%: falls
  - capybara 6% / 13% / 17% / 20% / 20%: **rises**
  - tapir 29% / 32% / 34% / 40%: **rises**
  Opposite patterns in small vs large herbivores. An obvious confound: groups may be bigger where predators are, or at fruit patches. That's exactly what the experiment runner plus replicates (next) has to sort out. Not a result yet.
### 2026-11-03 02:45 UTC — cycle 13: experiment runner + many-eyes pilot (Phase 2 step 5)
- **`tools/experiment.js`**: JSON spec (conditions × replicates × duration, paired seeds across conditions), runs in parallel (4 cores), resumes if interrupted, and writes tidy `runs.csv`, `populations.csv`, `budgets.csv`, `vigilance.csv` and `spec.json` (with code version). Harness gained `--set '{json}'` for parameter overrides. How-to: `docs/experiments.md`.
- **`tools/analyze_vigilance.py`** (stdlib only): one weighted slope of vigilance vs log₂(group size) per replicate, then mean ± t-based 95% CI across replicates. The replicate is the unit of analysis, not the scan. Writes `report.md`.
- **Pilot** (`experiments/many-eyes-pilot.json`: brains mode, trait costs on, 4 replicates × 900 sim-s, 4.5 min wall, 0 failures). Report: `experiments/out/many-eyes-pilot/report.md`.
  | species | slope per doubling of group size | 95% CI | replicates negative |
  |---|---|---|---|
  | agouti | −1.16 pp | −1.69 to −0.63 | 4/4 |
  | howler | −0.87 pp | −1.25 to −0.49 | 4/4 |
  | capybara | +3.43 pp | +2.98 to +3.88 | 0/4 |
  | tapir | +2.92 pp | +2.27 to +3.58 | 0/4 |
- **Reproducibility check:** replicate 0 re-run standalone with different UI randomness gave the same fingerprint (`970b0258`).
- **Why this is NOT a finding yet** (all three must be dealt with before the real experiment):
  1. *Measurement validity.* "Vigilant" currently means head-up, which includes walking to food. In a crowded, food-depleted herd, more walking scores as more vigilance. Field ethology defines vigilance as a *stationary* head-up scan. Fix the ethogram first: vigilant = head-up and nearly still; head-up and moving = "travel".
  2. *Crowding confound.* Capybara (750) and tapir (190) sit at their population caps in every replicate, so large groups there mean saturation and depleted food, not a chosen group size.
  3. *Weak, uneven predation.* In brains mode harpies end at 0–8 and jaguars at 2–4 (pre-existing), so the predation that should drive vigilance mostly comes from ocelots.
- Plan for the real experiment: fixed ethogram; a **predator-removal control condition** (vigilance shouldn't depend on group size without predators, so a slope that persists there is an artefact); 10+ replicates, ~1 h each; check the population caps.
