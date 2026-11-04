# Do evolved foragers obey the marginal value theorem?

*Pilot, cycle 32 (Nov 2026). About 5 minutes to read.*

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

Raw output: `experiments/out/mvt-pilot-c32/` (`gud.txt`, plus each run's `patches.json` and manifest).

## Interpretation

Evolved foragers behave qualitatively as the marginal value theorem predicts, and the fixed-rule lineage behaves as a rule of thumb that ignores habitat quality should. This is the first positive, controlled result from Vivarium's research line, and it is a classic field test (GUDs across habitats) run on agents nobody told about the theorem.

## Limitations

- **2 replicates per level**: a pilot. The direction is consistent (8/8), but the effect sizes need more seeds.
- **Qualitative only.** MVT makes a quantitative prediction (leave when marginal intake = long-run average intake), and this pilot doesn't test it. Doing so needs each bout's marginal intake rate at leaving, compared with the habitat average including travel.
- **Plastic or evolved?** 30 min of evolution under each growth level: the rise could be the same networks reacting to richer surroundings (plasticity, which is what MVT is about), or networks evolving differently in each habitat. A transplant test can separate these: evolve at one growth level, then switch it.
- **Predators off.** With predators, bouts mostly end by fleeing (cycle 32 first look), so this is foraging in a predator-free world. GUDs under predation risk are their own classic topic (Brown 1988: GUDs rise with risk).
- The "patch" is a 20-px cell in a continuous landscape, not a discrete patch with travel between patches, so the travel-time prediction can't be tested yet.

## Next steps

1. **More seeds** (6+) at the same three levels, to size the effect properly.
2. **Transplant test:** evolve at growth 1.0, then switch to 0.6 or 1.6 and measure GUDs in the first minutes. If they shift immediately, the response is behavioural plasticity, the MVT mechanism.
3. **Predation risk:** GUD with predators on vs off, using only bouts that end by choice. Brown's prediction: higher GUDs where risk is higher.
4. **Quantitative MVT:** log the intake rate at leaving and compare it with the habitat's long-run average.

## Reproducing

```bash
node tools/vivarium-run.js --secs 1800 --seed 1000 --mode mixed --costs 1 --patches 1 \
  --set '{"capScale":1.6,"predators":false,"growth":1.6,"ethoFrom":600}' --out runs/mvt/g1.6-s1000
python3 tools/analyze_patches.py runs/mvt/*/patches.json
```

## References

- Brown, J. S. (1988). Patch use as an indicator of habitat preference, predation risk, and competition. *Behavioral Ecology and Sociobiology*, 22(1), 37–47.
- Charnov, E. L. (1976). Optimal foraging, the marginal value theorem. *Theoretical Population Biology*, 9(2), 129–136.
