# Vivarium loop log

## TL;DR (as of cycle 24, 2026-11-03 13:40 UTC)
**What Vivarium can now do** (all on branch `claude/sweet-planck-lhh90j`, nothing merged to main):
- **Evolution you can watch:** subspecies with Latin names, a family tree, a river barrier, sexual reproduction with an evolvable choosiness gene, trait costs, and a time-lapse coloured by subspecies.
- **Research instrument:** bit-identical seeded runs with a manifest, a life table CSV, a 1 Hz scan-sampled ethogram, an experiment runner (paired replicates → tidy CSVs), and stdlib analysis scripts. README section "Vivarium as a research instrument".
- **Studies run:** many-eyes (5 pilots, write-up in `docs/many-eyes-findings.md`: no evolved effect; definitions, controls and covariates each overturned the naive reading; likely a floor effect), reinforcement (null: hybrid penalty too weak vs the cost of choosiness), harpy decline (bottom-up cascade).
- **Teaching:** Field tab with focal sampling (κ, confusion, observer vs sampling error) and scan sampling (counting vs placement error). Guide in `docs/teaching-field-methods.md`.
- **Bugs caught by measurement along the way** (each logged in its cycle): leaky river, jaguar Allee extinction, lone-arrival Allee trap, seed non-determinism, death counter not reset, 1.033 s sampling drift, "chase" mislabel, vigilance-includes-walking, alarm echo chamber, hybrid penalty hitting all offspring, empty brain cards in Instinct.
- **Start here:** README → `docs/many-eyes-findings.md` → `docs/teaching-field-methods.md`. Screenshots in `docs/loop/`.
- Loop mechanics: the overnight in-session timer died with the container on 11-02; since then the loop re-arms with a server-side reminder.
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
### 2026-11-03 03:30 UTC — cycle 14: fixed vigilance + predator-removal control (many-eyes pilot 2)
- **Ethogram fix:** *vigilant* now means head up **and** below 25% of top speed (a scan, as field observers define it). Head up and moving is a new **travel** state, with a 9th scan column in the life table and a `travel` column in vigilance.csv. The analysis also prints the old head-up slope, so the effect of the fix is visible.
- **New experiment options** (`--set` / spec `set`): `predators:false` removes all predators (no founders, no immigrants), and `capScale` multiplies population caps. Both are recorded in the manifest.
- **Pilot 2** (`experiments/many-eyes-pilot2.json`: brains, trait costs, caps ×1.6, 4 paired replicates × 900 sim-s per condition, 8 runs, 9.8 min, 0 failures). Report: `experiments/out/many-eyes-pilot2/report.md`.
  | species | with predators: slope (95% CI) | **no predators**: slope (95% CI) | old head-up definition (pred / no pred) |
  |---|---|---|---|
  | agouti | −0.49 (−0.75 to −0.22) | **−0.78 (−1.03 to −0.53)** | −1.71 / −2.90 |
  | howler | −0.51 (−0.74 to −0.28) | **−0.84 (−0.93 to −0.76)** | −1.14 / −2.57 |
  | capybara | +0.42 (+0.28 to +0.56) | +0.52 (+0.29 to +0.75) | +4.09 / +4.48 |
  | tapir | −0.06 (−0.68 to +0.57) | −0.32 (−0.94 to +0.30) | +2.17 / +2.25 |
  (pp of vigilance per doubling of group size)
- **What it shows:**
  1. **The definition fix mattered most.** True scanning is only 1–8% of time; head-up *travel* is 4–27%. Under the old definition, capybara's "rising vigilance" (+4.1) was almost entirely walking; it's +0.4 now. Tapir's +2.2 was entirely walking (now ~0, CI spans 0).
  2. **The control falsifies the naive reading.** Agoutis and howlers show vigilance falling with group size *even with no predators at all*, and more steeply. So it isn't a many-eyes (anti-predator) effect; something else couples group size and head-up time. Leading suspect: frugivores clump at rich fruit patches, where they spend more time head-down feeding. That's a food confound, which field studies also have to control for.
  3. 15 minutes is short for evolution. Brains here are close to their hand-wired seed, so this mostly measures the seed's behaviour, not evolved vigilance.
- **Still open:** capybara sits at its raised cap (1200) in every run. Predators remain sparse in brains mode (harpies 0–3, jaguars 1–5).
- **Next steps for a real test:** (a) record local food at each scan and compare vigilance at equal food levels; (b) evolve first, then measure (e.g. 1 h runs, scoring only the last 15 min); (c) then predators vs no predators again. The many-eyes prediction only survives if, at equal food, the slope is negative with predators *and* flat without them.
### 2026-11-03 04:45 UTC — cycle 15: food covariate + evolve-then-measure (many-eyes pilot 3)
- Each scan now records the **food level** under the animal (4 levels) and `ethoFrom` delays population tallies so brains evolve first. vigilance.csv gained `food_bin`. `analyze_vigilance.py` was rewritten: raw slope, **food-adjusted slope** (fixed effects for food level, fitted within levels then pooled), and a confound check (share of scans on rich food at each group size).
- **The confound is real.** In a smoke test, lone agoutis stood on rich food 19% of the time against 66% in groups of 16+. In pilot 3 it's 6% → 28% for agoutis and 10% → 22% for howlers (with predators).
- **Pilot 3** (`experiments/many-eyes-pilot3.json`: brains, costs, caps ×1.6, 2400 sim-s per run with vigilance measured only over the last 900 s, predators vs none, 4 paired replicates; 8 runs, 32.5 min, 0 failures). Report: `experiments/out/many-eyes-pilot3/report.md`.
  | food-adjusted slope, pp per doubling (95% CI) | with predators | without predators |
  |---|---|---|
  | agouti | +0.02 (−0.15 to +0.19) | **−0.45 (−0.75 to −0.16)** |
  | howler | −0.79 (−2.88 to +1.31) | **−0.35 (−0.60 to −0.10)** |
  | capybara | +0.09 (+0.01 to +0.17) | +0.08 (−0.10 to +0.25) |
  | tapir | −0.29 (−0.90 to +0.32) | −0.26 (−0.85 to +0.33) |
- **Conclusion of the pilot series (cycles 13–15): Vivarium does not currently show an evolved many-eyes effect.** With predators, no species shows a reliable decline at equal food. Without predators, agoutis and howlers do, so whatever couples group size and head-up stillness isn't anti-predator. After 25 min of evolution, overall vigilance is low (1–6%). Predation is sparse in brains mode, and two of the four predator replicates saw howlers nearly wiped out (3 and 15 left), hence the wide interval.
- **Why, and the real lesson:** the many-eyes effect rests on **collective detection**: when one animal spots a predator and bolts, neighbours react, so each individual can afford to look up less in a bigger group. In Vivarium a herbivore reacts only to threats it senses itself; a neighbour's vigilance gives it nothing. Theory then predicts only a weak dilution effect, which matches what we see. In a sense the model behaved correctly: the effect isn't there because its cause isn't modelled. The experiment pipeline did its job by showing that, not by finding the expected pattern.
- **Next (cycle 16):** an **alarm contagion** toggle. A herbivore that sees a conspecific fleeing nearby perceives the threat in that direction, using the existing threat inputs so brain layouts and saved brains stay compatible. Then run the many-eyes test as a **2×2: predators × alarm**. The prediction is a negative food-adjusted slope only with predators *and* alarm on. That's a proper falsifiable design.
### 2026-11-03 06:00 UTC — cycle 16: alarm contagion + many-eyes pilot 4
- New **alarm contagion** toggle (`params.alarm`, `--set '{"alarm":true}'`, recorded in the manifest). A herbivore that sees a conspecific fleeing within 80 px perceives that neighbour's predator, even with its own head down. It feeds the existing threat inputs, so brain layouts and saved brains are unchanged. `Vivarium.alarmStats()` counts own vs alarm-only detections.
- **Bug caught by measurement:** the first version let second-hand fleers pass the alarm on, and pairs kept each other fleeing indefinitely (alarm-only detections ran **10×** own sightings). Now only first-hand detectors raise it, giving alarm ≈ own (1.23M vs 1.31M in a 300 s check).
- **Determinism held:** pilot 4's alarm-off runs reproduced pilot 3's predator runs exactly (same final counts in all 4 replicates), so adding the toggle changed nothing when it's off.
- **Pilot 4** (predators present; alarm off vs on; same seeds and setup as pilot 3, whose no-predator runs serve as the control; 8 runs, 31 min, 0 failures). Report: `experiments/out/many-eyes-pilot4/report.md`.
  | | alarm off | alarm on |
  |---|---|---|
  | food-adjusted slope, agouti | +0.02 (−0.15 to +0.19) | −0.09 (−0.51 to +0.34) |
  | food-adjusted slope, howler | −0.79 (−2.88 to +1.31) | −0.07 (−0.49 to +0.35) |
  | overall vigilance, agouti / howler | 1.4% / 1.7% | **0.8% / 0.9%** |
  | howler end count (4 reps) | 356, 3, 15, 208 | **561, 626, 650, 344** |
- **What it shows:**
  1. **No many-eyes slope even with collective detection.** All alarm-on slopes span 0, so vigilance doesn't fall *faster* in bigger groups.
  2. **Alarm roughly halves vigilance at every group size.** Social information substitutes for personal vigilance, which is the core idea behind many-eyes, but it shows up as a level shift, not a group-size gradient.
  3. **Alarm protects howlers:** 0 of 4 crashes vs 2 of 4 without it.
  - Likely reason there's no gradient: one neighbour within 80 px already gives the full alarm benefit, and that saturates at group size ~2. In real groups the benefit keeps growing because more watchers mean earlier detection; here a lone watcher's detection range doesn't add up across watchers. A graded version (detection probability rising with the number of vigilant neighbours) would test that. Also n = 4, so intervals are wide.
- **Where the many-eyes series stands (cycles 13–16):** the pipeline is done end to end (definitions → controls → covariates → mechanism), and each pilot changed the interpretation for a measured reason. That's a better story for a professor than a clean confirmation. The next useful deliverable is a write-up.
### 2026-11-03 06:40 UTC — cycle 17: many-eyes write-up
- **`docs/many-eyes-findings.md`**: question, methods, the four pilots as one table, a figure, interpretation, limitations, next steps, how to reproduce, references (Pulliam 1973; Elgar 1989). Written for a professor or reviewer; about 10 minutes to read.
- **Figure** `docs/figures/many-eyes.svg`: vigilance by group size for agoutis and howlers in three conditions (no predators; predators without alarm; predators with alarm), means ± 95% CI over 4 replicates. Generated from the committed CSVs by `tools/figure_many_eyes.py` (stdlib-only SVG, since matplotlib isn't installed). Checked by rendering it in headless Chromium; fixed a legend overlapping the axis label.
- Verification: every number in the doc was checked against the pilots' `report.md`/CSVs. Two corrections made while writing: harpy end counts are 4–16 (not 0–16), and 25 sim-min ≈ 60 agouti generations by the code's own estimate (I had first written 15–25).
### 2026-11-03 07:40 UTC — cycle 18: field-methods teaching mode (Krish: committed backlog item)
- New **Field** tab (`js/fieldstudy.js`): instantaneous focal sampling. Pick a species, sample count and interval; the map follows one focal; at each sample point the range pauses and asks *what is it doing right now?* (1 Feeding, 2 Vigilant, 3 Moving, 4 Fleeing, 0 Lost sight). Results: % agreement, **Cohen's κ** with Landis & Koch bands, a confusion table, and three budgets (your samples / truth at those instants / true continuous budget) that separate **observer error** from **sampling error**. CSV download. Guide: `docs/teaching-field-methods.md`.
- **Field mode in the sim** hides the giveaways (caption, sensor ring, threat line, and the Specimen tab that following normally opens) and draws a **posture cue** on the focal (head dot out = head up, tucked = head down) plus a dashed white "focal" ring.
- Issues found in testing and fixed:
  1. Following a focal switched to the Specimen tab, which shows the brain's intentions: a giveaway that also hid the Field panel.
  2. The focal was indistinguishable from neighbours in brains mode (every animal has a brain ring), so it got a distinct marker.
  3. Focals were often eaten or died of old age within a few samples (4–12), so the study now switches to a new focal and reports it (standard practice, flagged as survivor bias), and picks young adults.
- **Verified headless** with scripted observers on 40-sample howler studies: a perfect observer scores 100% / κ = 1.00 (3 focals used); a random observer scores 22.5% (chance 25%) / κ = 0.02 (5 focals). A close-up screenshot confirms the focal marker and that the posture cue matches the true state (head down, feeding). No page errors. Screenshots: `docs/loop/c18-field-prompt.png`, `docs/loop/c18-field-results.png`.
- Not checked: phone layout of the prompt overlay; 3D view (field mode is drawn on the Map only, and the posture cue doesn't exist in 3D); how a human actually does with the posture cue (Krish, try it).
### 2026-11-03 08:30 UTC — cycle 19: phone-width pass + an old display bug
- Checked everything added in this loop at **390 px** (iPhone-size, touch) in headless Chromium: Map with river, Genetics (family tree), Census (Data group), Field tab, time-lapse bar, and the field-study prompt. **No horizontal overflow on any of them** (scrollWidth = 390 on every view) and no page errors.
- Fixed for phones:
  1. **The field-study prompt covered the focal animal**: it was taller than the 390 px map and the question line was clipped. It's now a compact strip at the top of the map (one row of 5 short buttons, hints and key labels hidden) so the focal in the centre stays visible. Screenshot: `docs/loop/c19-phone-field-prompt.png`.
  2. **The time-lapse bar** wrapped awkwardly; the Time-lapse / Back to live button now takes its own row.
- **Old bug fixed** (open since cycle 3, from the September Arena commit): the empty "Evolved brains" cards showed in Instinct mode. The group *was* marked `hidden`, but `.group{display:flex}` beat the browser's `[hidden]` rule. Added `.group[hidden]{display:none}`. Verified: hidden in Instinct (display none) and shown in Brains (display flex). A scan of every `[hidden]` element finds none still displayed in either mode.
### 2026-11-03 10:05 UTC — cycle 20: graded collective detection (many-eyes pilot 5)
- New `params.alarmRate` (λ, per second): each fleeing first-hand detector within 80 px passes the alarm at rate λ, so k detectors warn at rate λk (Poisson arrival per step), with a 1.5 s hold once alarmed. λ = 0 keeps the old instant alarm, unchanged. `alarmStats().graded[k]` counts alarm onsets by number of detecting neighbours (smoke test: 7.8k with k = 1, spread over 2–9+).
- **Pilot 5** (`experiments/many-eyes-pilot5.json`: same seeds and setup as pilot 4, λ = 1 and λ = 4; 8 runs, 61 min, 0 failures; runs ran ~2× slower because alarm-protected prey stay numerous).
  | food-adjusted slope (95% CI) | graded λ = 1 | graded λ = 4 |
  |---|---|---|
  | agouti | +0.18 (−0.72 to +1.07) | −0.17 (−0.44 to +0.09) |
  | howler | −0.03 (−0.15 to +0.09) | +0.17 (−0.80 to +1.14) |
  | capybara | +0.11 (+0.02 to +0.19) | +0.06 (−0.05 to +0.17) |
  | tapir | −0.04 (−0.87 to +0.78) | −0.33 (−1.09 to +0.43) |
  Overall vigilance (agouti / howler): alarm off 1.64 / 1.95%, instant 0.91 / 1.05%, graded λ = 1 1.75 / 1.00%, graded λ = 4 1.37 / 1.47%. Howlers end at 120–999 (no crashes) vs 3–356 without alarm.
- **Result: no group-size gradient with graded alarm either.** That makes five pilots and four alarm variants, all null. The consistent feature is a **floor effect**: evolved vigilance is 1–2% of foraging time in every condition, leaving no room to decline. Head-down detection at 40%, plus alarm, makes scanning nearly worthless. `docs/many-eyes-findings.md` updated with pilot 5 and this interpretation; its next step is now "raise the price of not looking" (head-down detection 0.4 → 0.2).
- Methods note: the experiment's first wait timed out at 50 min. The runner kept going and finished; nothing was lost (the runner resumes anyway).
### 2026-11-03 11:20 UTC — cycle 21: reinforcement experiment (pilot)
- New `params.hybridPenalty` h: an offspring of parents from **different subspecies (clades)** fails with probability h (`mating.inviable`). A first version scaled the failure with trait distance; ordinary within-population mates are ~0.15 apart, so ~35% of *all* offspring failed. That's outbreeding depression, not a hybrid penalty, so it was replaced before any run counted.
- New `params.riverOffAt`: the river dries up at that sim-time (**secondary contact**). Experiments now also write `traits.csv` (trait and choosiness means over time), and `runs.csv` gains matings / hybrid matings / rejected / inviable. New `tools/analyze_choosiness.py`: the change in mean σ from contact to end, paired by seed (treatment − control).
- **Pilot** (`experiments/reinforcement-pilot.json`: instinct, trait costs, mating with the choosiness gene, river for 30 min then contact for 30 min, h = 0 vs 0.8, 4 paired seeds; 8 runs, 20.6 min, 0 failures). Report: `experiments/out/reinforcement-pilot/choosiness-report.md`.
  - **No reinforcement.** Paired Δσ (penalty − control) spans 0 for every species, with 2/4 seeds negative for most (agouti −0.026, −0.096 to +0.044; howler −0.010, −0.059 to +0.039). In both conditions herbivores become *less* picky after contact (agouti Δσ +0.09 / +0.07; capybara +0.06 / +0.06), as in cycle 8.
  - **Why (matches theory):** selection against hybrids is weak next to the cost of choosiness. Under the penalty, hybrid matings fall to **2–5%** of matings (vs 15–31% without), so an 80% failure rate costs only ~3% of offspring, while picky females turn down ~33% of mating attempts (13–17k rejections per ~44k matings). Reinforcement theory predicts it takes hold only when selection against hybrids is strong and choosiness is cheap (Servedio & Noor 2003), the opposite of this setup.
  - **Side finding:** the penalty cut hybrid matings ~5× with **no change in choosiness**. Removing hybrid offspring keeps lineages spatially sorted, so mixed-lineage encounters get rarer on their own: reproductive isolation through population structure rather than preference.
- Next test if this is pursued: make choosiness cheaper (rejection shouldn't forfeit the whole breeding attempt, e.g. let her try another candidate) and/or raise hybrid contact (longer contact phase, h = 1).
### 2026-11-03 12:05 UTC — cycle 22: why harpies decline under trait costs (cycle 9 open item)
- Reproduced (instinct, 2400 sim-s, seeds 1–2, life tables on): harpies end at **110 / 109 without costs vs 43 / 2 with costs**. Agoutis fall too: 367 / 415 vs 137 / 138.
- Diagnosis from the life tables (animals born after t = 300):
  | | no costs (s1 / s2) | costs (s1 / s2) |
  |---|---|---|
  | harpy deaths by starvation | 68% / 81% | 87% / 79% |
  | harpy kills per lifetime | 4.98 / 3.75 | 3.89 / 4.56 |
  | **harpy offspring per lifetime** | **0.98 / 0.97** | **0.94 / 0.95** |
  | agoutis born over the run | 20,330 / 19,092 | 13,954 / 13,328 |
  | agouti metab gene (late) | 0.91 / 0.87 | 1.09 / 1.18 |
  | harpy speed gene (late) | 1.26 / 1.23 | 1.12 / 1.14 |
- **Conclusion: a bottom-up cascade, not a bug.** Harpies are starvation-limited in every condition. Their hunting isn't worse under costs (kills per lifetime overlap), but their main prey's productivity drops ~30%: under costs agoutis evolve a higher, pricier metabolism. A specialist living near the edge then drops just below replacement (0.94–0.95 offspring per lifetime), and the population shrinks every generation. A ~4% shortfall in lifetime reproduction compounds into a collapse. Harpies also pay for speed (their speed gene falls from ~1.25 to ~1.13), with no measurable loss in kills.
- Implication for experiments: under trait costs, predator pressure is lower and less even. That's part of why vigilance stayed near its floor in the many-eyes pilots. If an experiment needs steady predation, raise the agouti cap (`capScale`) or harpy efficiency rather than switching costs off.
- No code change.
### 2026-11-03 12:55 UTC — cycle 23: scan sampling in the Field tab
- Field tab → **Method: Scan sample**. At each sample point the range pauses with a dashed circle (110 px) around a random adult of the species, with posture cues on every animal of that species inside. The student counts head-down vs head-up (Enter to move between boxes; Lost count to skip). Results: % exact, animals off per scan, a per-scan table, and the share feeding as *your counts / truth in your circles / truth whole population*, which splits **counting error** from **placement error**. Sim API: `Vivarium.fieldScan({x,y,r,sid})`, `Vivarium.scanTruth()`. Typing digits in the count boxes no longer triggers the focal-mode keys.
- **Verified headless** (brains, capybaras, 10 scans × 5 s): the perfect counter scored 100% exact, 0 off per scan, estimate = circle truth (90.3%); the ±1 counter scored 0% exact, 1.0 off per scan. An **independent recount** from the raw animal list matched `scanTruth()` on all 20 scans. Placement error shows immediately: circles 90.3% feeding vs whole population 86.4%. No page errors; field mode and the circle are cleared afterwards. Screenshot: `docs/loop/c23-scan-prompt.png`. `docs/teaching-field-methods.md` updated with the method and two discussion prompts.
- Seen in the screenshot: near a range edge the circle runs off the map, harmless because no animal can be outside the range.
### 2026-11-03 13:40 UTC — cycle 24: wrap-up
- **README**: new sections "Evolution you can watch", "Vivarium as a research instrument" (tools table, experiment switches, what it's been used for) and "Teaching field methods"; project layout lists the new files; roadmap ticks sexual reproduction + lineage trees and CSV export / reproducible runs. Every linked doc checked to exist.
- **Final regression** (400 sim-s, seed 77): with **every new switch on at once** (brains, river with timed secondary contact, mating with choosiness, trait costs, graded alarm, hybrid penalty, caps ×1.3), two runs with different UI randomness gave the identical fingerprint `f4f52675`, and the manifest correctly shows the river off after `riverOffAt`. Instinct (`3d5c2bd4`) and Mixed with a life table (`406ba365`) also ran clean. No page errors anywhere.
- TL;DR at the top rewritten as a summary of the whole loop.
- Next (if the loop continues): many-eyes pilot 6, "raise the price of not looking" (head-down detection 0.4 → 0.2), the recommended next step in the write-up.
### 2026-11-03 15:05 UTC — cycle 25: many-eyes pilot 6 ("raise the price of not looking")
- Head-down threat detection is now `params.headDownSense` (default 0.4, unchanged; recorded in the manifest). Pilot 6: 0.2, no alarm vs graded alarm λ = 1; same seeds and setup as pilots 4–5; 8 runs, 44.7 min, 0 failures. Report: `experiments/out/many-eyes-pilot6/report.md`.
- **The floor didn't lift.** Overall vigilance at 0.2 is 0.8–3.1% (agouti 1.69 / 0.84%, howler 1.99 / 3.05%, no alarm / graded), the same range as at 0.4 (0.9–3.2%). What changed is fleeing: agoutis flee 3.5–4.7% of the time vs 5.7–8.0% at 0.4. Animals just detect fewer predators; selection over ~60 agouti generations didn't buy more scanning.
- Food-adjusted slopes: all intervals span 0 except **agouti with graded alarm, −0.23 (−0.44 to −0.03), 4/4 replicates negative**, the first in six pilots. Not a finding yet: it's 1 of 8 tests here, and agoutis without predators showed a similar negative slope at 0.4 (pilot 3, −0.45). A no-predator control at 0.2 is needed.
- `docs/many-eyes-findings.md` updated: pilot 6 row; floor effect "isn't only about payoff"; next steps (no-predator control at 0.2; longer evolution or a network probe to see why vigilance won't evolve up).
### 2026-11-03 16:00 UTC — cycle 26: control for the pilot 6 agouti hint
- **No new pilot needed.** With no predators, `headDownSense` can't matter: it only scales threat detection, and there are no threats. So pilot 3's no-predator runs (same seeds 1000–1003, same setup) already are the control at 0.2. **Verified rather than assumed:** re-running pilot 3's no-predator replicate 0 with the current code and `headDownSense: 0.2` gave fingerprint `3abaea12`, identical to pilot 3's (also confirming that every change since cycle 15 leaves default runs unchanged).
- **Paired comparison by seed** (food-adjusted slope, pp per doubling):
  | | seed 1000 | 1001 | 1002 | 1003 | paired (pred + graded alarm) − (no predators) |
  |---|---|---|---|---|---|
  | agouti, predators + graded alarm (hd 0.2) | −0.07 | −0.30 | −0.36 | −0.20 | |
  | agouti, no predators | −0.29 | −0.58 | −0.65 | −0.30 | **+0.22 (+0.09 to +0.35), 0/4 < 0** |
  | howler, predators + graded alarm | −0.06 | +0.53 | +0.13 | +0.36 | |
  | howler, no predators | −0.21 | −0.33 | −0.30 | −0.58 | **+0.59 (+0.00 to +1.18), 0/4 < 0** |
- **Conclusion: pilot 6's agouti hint is not the many-eyes effect.** The decline with group size is there without predators, and adding predators plus alarm makes it *shallower* in every seed, the opposite of the prediction. Recorded in `docs/many-eyes-findings.md` (pilot 6 row, interpretation point 4, with a candidate mechanism: predators target dense groups, which would push vigilance *up* in groups).
