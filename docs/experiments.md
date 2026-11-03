# Running experiments

1. Write a spec in `experiments/<name>.json`: duration, replicates, first seed, a `base` setup and a list of `conditions` (each overrides `base`). See `experiments/many-eyes-pilot.json` and the header of `tools/experiment.js` for every field. Parameter overrides go in `"set"`, e.g. `"set": {"mutationRate": 0.1, "hunt": {"lungeCost": 12}}`.
2. Run it: `node tools/experiment.js experiments/<name>.json --parallel 4`. Every condition uses the same seeds (paired replicates). An interrupted experiment resumes; finished runs are skipped.
3. Tidy outputs land in `experiments/out/<name>/`: `runs.csv`, `populations.csv`, `budgets.csv`, `vigilance.csv`, `spec.json` (spec + code version). Per-run detail (charts, map, manifest, ethogram, optional life table) goes in `runs/`, which is gitignored and regenerable from the seeds.
4. Analyse: `python3 tools/analyze_vigilance.py experiments/out/<name>` writes `report.md`. The replicate run is the unit of analysis, never the individual scan.

Reproducing any single run: `node tools/vivarium-run.js` with the seed and options in `runs.csv`/`spec.json` gives a bit-identical run (the fingerprint column matches).
