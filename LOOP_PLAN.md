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

## Phase 2: Vivarium as an ethology instrument (from Krish, 11-02)
Goal: runs you can cite. Every number should be reproducible, exportable and analysable outside the browser.
Honest framing: the parameters are hand-tuned rather than fitted to field data, so this is a **teaching lab and hypothesis testbed** (agent-based modelling), not a replacement for field data. Results are framed as "does selection on these rules reproduce known patterns?"

Order (Krish 11-02: research first, then teaching):
1. **Choosiness gene + fake-Latin names** (Krish asked). Mate pickiness evolves per animal, so sympatric speciation becomes possible. Names look like *Dasyprocta velox minor*.
1b. **Real trait trade-offs**: mass and speed hit their caps by ~1 h in long runs (cycle 7), so give them costs before claiming anything about trait evolution.
2. **Reproducibility**: a run means seed + config and produces bit-identical results (today they aren't, because the page's frame loop draws randoms). Store a run manifest (seed, params, toggles, code version) with every export.
3. **Life-history table export (CSV)**: one row per individual: id, mother, father, species, clade, birth/death time, cause, traits, offspring, kills, lifetime time budget. That's the base table for everything else.
4. **Ethogram + time budgets**: log each animal's behavioural state (forage, vigilant, flee, hunt, rest, mate) so the export gives classic activity budgets per species, sex or clade.
5. **Experiment runner**: `tools/experiment.js` takes a JSON spec (conditions × replicates × duration), runs them headless and writes tidy CSV, plus a small Python/R analysis notebook with CIs.
5b. **Fix vigilance before the experiment** (cycle 13 pilot): vigilant = head-up and nearly stationary; head-up and moving = travel. Add a predator-removal control and keep herbivores off their population caps.
5c. **Food covariate + evolve-then-measure** (cycle 14: the slope persists without predators, so it's confounded): record local food per scan, analyse at equal food, measure after ~1 h of evolution.
5d. **Alarm contagion** (cycle 15: collective detection is missing from the model, so many-eyes can't evolve): toggle a fleeing neighbour → perceived threat, then a 2×2 test (predators × alarm).
6. **First real experiment: the many-eyes effect.** Does individual vigilance fall as group size rises in *evolved* brains (no rule tells them to)? It's a classic, well-documented prediction (Pulliam 1973; Elgar 1989 review). Then: the marginal value theorem (patch leaving times), the selfish herd, and the predator confusion effect.
6b. **Reinforcement experiment**: add a toggleable hybrid fitness penalty and test whether choosiness then evolves to be pickier (cycle 8 showed it evolves away when hybrids pay nothing).
6c. **Write-up** (next): `docs/many-eyes-findings.md`, the whole pilot series as a short methods + results note a professor can read in 10 minutes.
7. **(Done in cycle 18)** Field-methods mode for teaching: focal-animal and scan sampling on virtual animals, so students can compare their sampled estimates with the ground truth.

## Phase 3 candidates (after cycle 19; default order unless Krish picks)
1. **Graded collective detection**: alarm reach/probability grows with the number of vigilant neighbours; re-run the many-eyes test (pilot 4 found alarm saturates at one neighbour).
2. Reinforcement experiment (hybrid penalty → does choosiness evolve up?), plan item 6b.
3. Harpy decline under trait costs (cycle 9 open item).
4. Scan-sampling mode for the Field tab (count head-down vs head-up animals in a circle), the second classic field method.

## Phase 4 (after cycle 24)
1. Many-eyes pilot 6: make `HEAD_DOWN_SENSE` a param, then compare 0.4 vs 0.2 with graded alarm; does baseline vigilance rise off the floor and a gradient appear?
2. ~~Many-eyes pilot 7~~: done analytically in cycle 26 (pilot 3 is the control, verified bit-identical). Not many-eyes.
3. ~~Network probe~~: done in cycle 27 (reactive, not proactive).
4. ~~Pilot 7 blind feeding~~: done in cycle 28, floor holds.
5. ~~Evolvability~~: done in cycle 29. Vigilance evolves *down*; scanning protects but costs more intake than it saves.
6. ~~Scan while chewing~~ (cycle 30): vigilance still fell, but per-animal vigilance turned out food-confounded.
7. **Food-conditioned selection** (cycle 31): re-measure cohort trend + selection on vigilance only where there's food.
   Old item 6 text: toggleable `params.scanIntake` (share of grazing intake kept while head-up and still; default 0). Pilot 8: blind feeding at 0 vs 0.5; does vigilance evolve up? If so, many-eyes test on top.
