# Do evolved foragers obey the marginal value theorem?

*Pilot, transplant, predation-risk, network probe and null-model tests, cycles 32–36 (Nov 2026). About 9 minutes to read.*

## Question

The **marginal value theorem** (Charnov 1976) says a forager should leave a food patch when its intake rate there drops to the average rate it can get across the whole habitat. The most-tested field prediction follows directly: in a **richer habitat**, the average rate is higher, so foragers should give up sooner and leave **more food behind**. Ecologists measure this as the **giving-up density** (GUD; Brown 1988), the food left in a patch when the forager quits.

Vivarium's herbivores have two lineages living side by side in "Mixed" worlds:
- **Evolved brains:** neural networks whose weights evolve.
- **Instinct:** a fixed rule: graze head-down whenever the food underfoot is above 0.15.

The Instinct rule has no notion of habitat quality, so it is a built-in control. The question: **do evolved brains' GUDs track habitat quality, the way MVT predicts, while Instinct's don't?**

## Methods

- **Runs.** Mixed mode (both lineages in one world), trait costs on, population caps ×1.6, **predators off**, so that feeding bouts end by choice rather than by fleeing. 30 sim-min, measured from 10 min onward (`ethoFrom` 600). Habitat quality was set by plant regrowth, `growth` 0.6 / 1.0 / 1.6. Seeds 1000 and 1001 (2 replicates per level).
- **Measurement** (`Vivarium.patchLog(true)`, `vivarium-run.js --patches 1`):
  - A **feeding bout** starts when a herbivore takes food and ends when it hasn't eaten for 2 s.
  - The **quit GUD** is the food left in the last cell it ate from: the active decision to stop.
  - The **move GUD** is the food left in a cell each time a feeding animal drifts on to the next one. It is largely passive, and serves as a contrast.
- **Analysis.** `tools/analyze_patches.py` reports the mean over replicates ± half-range.

## Results

Quit GUD (food left when a bout ends), mean of 2 seeds:

| species | brains, growth 0.6 / 1.0 / 1.6 | instinct, growth 0.6 / 1.0 / 1.6 |
|---|---|---|
| agouti | 0.127 / 0.159 / 0.208 | 0.102 / 0.105 / 0.106 |
| capybara | 0.246 / 0.285 / 0.366 | 0.152 / 0.152 / 0.156 |
| howler | 0.145 / 0.172 / 0.188 | 0.106 / 0.113 / 0.109 |
| tapir | — / 0.324 / 0.405 | too few bouts |

- **Brain GUDs rise with habitat quality in every species, in both seeds** (8 of 8 seed × species series rise monotonically; tapirs nearly died out at 0.6). From the poorest to the richest habitat, agouti GUD rises 64% and capybara 49%.
- **Instinct GUDs stay flat** (within ±0.01), as a fixed threshold should.
- That contrast also rules out a measurement artefact: both lineages share the same worlds, so if richer habitats inflated GUDs just because food regrows during the 2 s bout gap, Instinct would rise too.
- **Move GUDs rise for both lineages** (e.g. agouti instinct 0.24 → 0.32). That's what passive drift through a richer landscape gives. Only the active quit decision separates the lineages.
- Brains also quit at higher food than Instinct at every growth level: they leave patches that the rule would keep grazing.

Raw output: `experiments/out/mvt-pilot-c32/`, `mvt-transplant-c33/`, `mvt-risk-c34/`, `quit-probe-c35/`, `mvt-null-c36/` (`gud.txt`, plus each run's `patches.json` and manifest).

### Plasticity or evolution? A transplant test (cycle 33)
Cycle 32's populations evolved for 30 min at their own growth level, so the GUD differences could be either:
- the same kind of network reacting to a richer landscape (behavioural plasticity, the mechanism MVT describes), or
- networks that evolved differently in each habitat.

**Design:**
- Every world evolves at growth 1.0 for 30 min.
- At 30 min, three things happen at once: growth switches to 0.6, 1.0 or 1.6; the standing food is rescaled to that level's equilibrium (`params.foliageTo`); and **mutation stops**.
- GUDs are measured over the next 1–3 min, about one agouti generation, so selection has almost no time to act.

Seeds 1000 and 1001, via `--at`.

| brains, quit GUD at growth 0.6 / 1.0 / 1.6 | transplanted (all evolved at 1.0) | evolved in place (cycle 32) |
|---|---|---|
| agouti | 0.139 / 0.173 / 0.243 | 0.127 / 0.159 / 0.208 |
| capybara | 0.241 / 0.293 / 0.458 | 0.246 / 0.285 / 0.366 |
| howler | 0.136 / 0.167 / 0.202 | 0.145 / 0.172 / 0.188 |
| tapir | 0.242 / 0.416 / 0.500 | — / 0.324 / 0.405 |

**The response is plastic.** Animals that all evolved in the same habitat shift their GUDs within two minutes of the switch, in every seed × species series with enough bouts (7/7 rise monotonically). The shift is as large as the between-habitat differences in cycle 32, or larger. So cycle 32's pattern needs no evolutionary divergence: the evolved networks carry a general rule that makes them quit at higher food when the landscape is richer, which is what MVT predicts a well-designed forager should do. (The 0.6 landscape overshot to 0.31 mean foliage rather than 0.356, because grazing continued after the rescale; that strengthens the low-growth contrast slightly but doesn't change the order.)

*An earlier version with births switched off failed: lifespans are so short that every population emptied within ~2–3 min, before the window opened. That run is kept in `experiments/out/mvt-transplant-c33/births-off-failed/`.*

### Predation risk (cycle 34): no Brown effect
Brown (1988) predicts that foragers give up at **higher** food where predation risk is higher, because each extra minute in the patch carries a risk cost. Test: growth 1.0 with predators on (seeds 1000 / 1001), against cycle 32's predator-free growth-1.0 runs (same seeds and settings).

| brains | quit GUD, predators off | predators on | share of bouts ended voluntarily (on) |
|---|---|---|---|
| agouti | 0.159 | 0.141 (1 seed with ≥ 20 quits) | 4% |
| capybara | 0.285 | 0.275 | 3% |
| howler | 0.172 | 0.171 | 2% |
| tapir | 0.324 | 0.251 (1 seed) | 11% |

- **Quit GUDs don't rise under risk; if anything they fall.** This holds even though the landscape is a little *richer* with predators on (habitat intake: agouti 1.03 → 1.21), which by itself should push GUDs up.
- **Instinct is flat as expected:** 0.10–0.16 either way.
- **Why the absence fits:** the cycle 27 network probe showed these brains are *reactive*. They respond to a predator they can sense, but nothing in them represents background risk, so there's nothing that could raise a quitting threshold.
- **Measurement caution:** with predators on, only 2–11% of bouts end voluntarily; the rest end in flight. Voluntary quits are therefore a sample of moments when no predator was near, which biases this test against finding a risk effect. Field GUD trays have the same problem in reverse: they record food left but not why the forager left.

### What drives the quit decision? (cycles 35–36)
**Network probe** (`tools/probe-quit.js`, growth 0.6 / 1.0 / 1.6, seed 1000). For every evolved herbivore, its actual inputs were kept, threat removed, and "food here" swept from 0 to 1 to find its **grazing threshold**: the food underfoot at which it puts its head down. The sweep was repeated with "food pull" (the best food it can see nearby) at 0 / 0.5 / 1, and with energy at 0.3 / 0.6 / 0.9.
- Thresholds are low (medians 0.04–0.20) and barely move: ±0.04 with visible food (no consistent direction), ±0.02 with energy.
- They also sit below the measured GUDs.
- So the GUD response isn't a threshold that compares the patch with visible alternatives, or with hunger.

**Is it just landscape mechanics?** Animals graze while drifting, and a bout ends when they walk onto poor ground, so in a richer landscape the cell they last ate from may simply hold more food. *(The Instinct control can't rule this out: Instinct animals eat whenever any food is present, so their bouts end only on bare ground, a different measurement path.)*

**Null model** (cycle 36). Every animal runs the identical, never-evolved hand-wired seed brain (`mutationRate` 0 from the start; headless founders are exactly the seed brain), growth 0.6 vs 1.6, seeds 1000 / 1001:

| quit GUD, growth 0.6 → 1.6 | unevolved seed brains | evolved brains (cycle 32) |
|---|---|---|
| agouti | 0.105 → 0.099 (s1000), 0.108 → 0.329 (s1001) | 0.127 → 0.208 (both seeds rise) |
| capybara | 0.173 → 0.193 (s1001 falls) | 0.246 → 0.366 |
| howler | 0.107 → 0.112 | 0.145 → 0.188 |
| tapir | — → 0.227 | — → 0.405 |

- **There is a mechanical component, but it's small and inconsistent:** +0.005 for howlers, +0.02 for capybaras (one seed falls), and agoutis flat in one seed with an unexplained jump in the other.
- **The evolved response is several times larger and rises in every seed.** So evolution added something real on top of the mechanics.
- **No single input moves the threshold.** Visible food, energy, and density were all ruled out: a crowding sweep (`--vary crowd`, kin proximity + crowding 0 → 1, cycle 37) shifts evolved thresholds by ±0.03 in mixed directions.
- **The likely explanation is in the movement.** A bout ends when an animal *walks off* onto poorer ground, not when it lifts its head on good ground. So the evolved difference is probably in the movement policy while grazing (throttle and turning, which decide when and where an animal drifts on), not in the head-down decision these probes looked at. The quit-GUD measures where an animal was when it stopped eating; the "decision" may be a by-product of how it moves through the landscape.

## Interpretation

- **Evolved foragers' giving-up densities rise with habitat quality**, qualitatively as the marginal value theorem predicts (cycle 32, 8/8 series).
- **The response is plastic** (cycle 33): animals evolved in one habitat shift within minutes of a switch.
- **It is mostly evolved, not mechanical** (cycle 36): an unevolved, identical policy shows only a small, inconsistent rise.
- **But the mechanism isn't an MVT-style comparison.** The networks don't raise their grazing threshold with visible food, fullness or crowding (cycles 35, 37). The effect most likely sits in how they move while grazing.
- That distinction matters. MVT describes what an optimal forager does; it doesn't say how. Real animals also use rules of thumb (e.g. quit after a fixed time, or after a run of unsuccessful bites; Iwasa et al. 1981), and a density rule can produce MVT-like patterns without any estimate of the habitat average.
- **No Brown effect** (cycle 34): GUDs don't rise under predation risk, consistent with the brains' purely reactive treatment of threats (`docs/many-eyes-findings.md`, cycle 27 probe).

## Limitations

- **2 replicates per level**: a pilot. The direction is consistent (8/8), but the effect sizes need more seeds.
- **Qualitative only.** MVT makes a quantitative prediction (leave when marginal intake = long-run average intake), and this pilot doesn't test it. Doing so needs each bout's marginal intake rate at leaving, compared with the habitat average including travel.
- **The mechanism is unidentified.** Visible food, energy and crowding don't shift the head-down threshold (cycles 35, 37); the movement outputs haven't been probed.
- **The Instinct lineage isn't a like-for-like control** for quit-GUDs (its bouts end by a different route); the unevolved seed-brain null (cycle 36) is the better baseline.
- **Predators off.** With predators, bouts mostly end by fleeing (cycle 32 first look), so this is foraging in a predator-free world. GUDs under predation risk are their own classic topic (Brown 1988: GUDs rise with risk).
- The "patch" is a 20-px cell in a continuous landscape, not a discrete patch with travel between patches, so the travel-time prediction can't be tested yet.

## Next steps

0. **Probe the movement outputs:** for head-down animals, how throttle and turning respond to food underfoot vs visible food. Or log, per bout, the animal's speed in its last seconds, to see whether evolved brains drift on sooner in rich landscapes.

1. **More seeds** (6+) at the same three levels, to size the effect properly.
2. ~~Transplant test~~: done (cycle 33): plastic. Next: probe which inputs drive the quit decision.
3. ~~Predation risk~~: done (cycle 34): no Brown effect, consistent with reactive brains. A fairer test would record GUD for *every* bout end, fled or not, and compare spatially (risky vs safe areas).
4. **Quantitative MVT:** log the intake rate at leaving and compare it with the habitat's long-run average.

## Reproducing

```bash
node tools/vivarium-run.js --secs 1800 --seed 1000 --mode mixed --costs 1 --patches 1 \
  --set '{"capScale":1.6,"predators":false,"growth":1.6,"ethoFrom":600}' --out runs/mvt/g1.6-s1000
python3 tools/analyze_patches.py runs/mvt/*/patches.json
```

## References

- Brown, J. S. (1988). Patch use as an indicator of habitat preference, predation risk, and competition. *Behavioral Ecology and Sociobiology*, 22(1), 37–47.
- Iwasa, Y., Higashi, M., & Yamamura, N. (1981). Prey distribution as a factor determining the choice of optimal foraging strategy. *The American Naturalist*, 117(5), 710–723.
- Charnov, E. L. (1976). Optimal foraging, the marginal value theorem. *Theoretical Population Biology*, 9(2), 129–136.
