# Running experiments

1. Write a spec in `experiments/<name>.json`: duration, replicates, first seed, a `base` setup and a list of `conditions` (each overrides `base`). See `experiments/many-eyes-pilot.json` and the header of `tools/experiment.js` for every field. Parameter overrides go in `"set"`, e.g. `"set": {"mutationRate": 0.1, "hunt": {"lungeCost": 12}}`.
2. Run it: `node tools/experiment.js experiments/<name>.json --parallel 4`. Every condition uses the same seeds (paired replicates). An interrupted experiment resumes; finished runs are skipped.
3. Tidy outputs land in `experiments/out/<name>/`: `runs.csv`, `populations.csv`, `budgets.csv`, `vigilance.csv`, `spec.json` (spec + code version). Per-run detail (charts, map, manifest, ethogram, optional life table) goes in `runs/`, which is gitignored and regenerable from the seeds.
4. Analyse: `python3 tools/analyze_vigilance.py experiments/out/<name>` writes `report.md`. The replicate run is the unit of analysis, never the individual scan.

Reproducing any single run: `node tools/vivarium-run.js` with the seed and options in `runs.csv`/`spec.json` gives a bit-identical run (the fingerprint column matches).

## Single runs and custom designs

`tools/vivarium-run.js` runs one world headless. The options used in the research so far:

| option | what it does |
|---|---|
| `--seed N --secs S --mode instinct\|mixed\|brains` | the world, its length, and which lineages run |
| `--costs 1` | trait costs (speed, senses, thrift and size each carry a price) |
| `--lifetable 1` | `life.csv`: one row per animal (see `docs/life-table.md`), including food-conditioned scan counts |
| `--patches 1` | `patches.json`: feeding bouts and giving-up densities, how bouts ended (fled, quit on food, walked off), speed at quitting, habitat intake rate. Counted from `params.ethoFrom` |
| `--set '{...}'` | any `Vivarium.params` value at the start, e.g. `{"capScale":1.6,"predators":false,"growth":1.6,"ethoFrom":600}` |
| `--at '{"1800":{...}}'` | change params mid-run, applied when the clock reaches each time (use multiples of `--every`). Used for transplant designs, e.g. `{"1800":{"growth":0.6,"foliageTo":0.356,"mutationRate":0}}` |

Experiment switches added for the research (all off by default; default runs stay bit-identical, with fingerprint `7ab26d53` for seed 1000, 600 s, brains, costs, caps ×1.6, `headDownSense` 0):
- `headDownSense`: how well a grazing animal still detects threats (default 0.4);
- `scanIntake`: share of intake kept while scanning (scan while chewing, default 0);
- `births`: false stops births and immigration;
- `foliageTo`: a one-off rescale of the food landscape to a target mean;
- `foodSense`: food-sight range multiplier (default 1);
- `pullClamp`: hides visible-food quality from the networks (default −1 = off);
- also `alarm`, `alarmRate`, `hybridPenalty`, `riverOffAt`, `mutationRate`, `growth`, `capScale`, `predators`.

Analyses that go with them:
- `tools/analyze_cohorts.py life.csv [--food] [--decompose]`: vigilance by birth cohort, selection differentials, and a lifespan-stratified cost/benefit table (avoids immortal-time bias).
- `tools/analyze_patches.py runs/*/patches.json [--key growth]`: GUDs by condition.
- `tools/analyze_mvt_replication.py`: paired-by-seed rich − poor differences with 95% intervals.
- `tools/probe-brains.js`, `tools/probe-quit.js`: edit one network input at a time and read the decision.

**Container restarts.** Long runs are best launched with `setsid nohup` from a small launch script that skips runs whose log already ends in `EXIT` (see `runs/c44/launch.sh` in the loop log), so a restart only costs the runs in flight.
