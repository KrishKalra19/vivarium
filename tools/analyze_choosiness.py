"""Reinforcement analysis of an experiment's traits.csv (+ runs.csv).

    python3 tools/analyze_choosiness.py experiments/out/<name> [--from 1800] [--control no-penalty]

Question: with a hybrid penalty, does choosiness evolve to be pickier after secondary
contact than without one? Choosiness is the mate-preference tolerance sigma (lower = pickier).

Per replicate and species: change in mean sigma from --from (the moment of contact) to the
end of the run. Conditions share seeds, so the comparison is paired: for each seed,
treatment change minus control change, then mean and 95% t interval across seeds. A
negative paired difference means the penalty made animals pickier (reinforcement).
Also reports matings, hybrid matings and inviable offspring from runs.csv.
Standard library only. Writes choosiness-report.md and prints it.
"""
import csv, os, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from analyze_vigilance import mean_ci

def arg(k, d):
    return sys.argv[sys.argv.index(k)+1] if k in sys.argv else d

def main():
    out = sys.argv[1]
    t_from = float(arg('--from', 1800)); control = arg('--control', None)
    series = collections.defaultdict(list)   # (cond, rep, sp) -> [(t, choosy)]
    for r in csv.DictReader(open(os.path.join(out, 'traits.csv'))):
        if r['choosy'] == '': continue
        series[(r['condition'], r['replicate'], r['species'])].append((float(r['t']), float(r['choosy'])))
    conds = sorted({k[0] for k in series}); species = sorted({k[2] for k in series})
    control = control or conds[0]
    change = {}   # (cond, rep, sp) -> (start, end, delta)
    for k, pts in series.items():
        pts.sort()
        start = min(pts, key=lambda p: abs(p[0]-t_from))[1]; end = pts[-1][1]
        change[k] = (start, end, end - start)
    lines = [f"# Reinforcement analysis: {os.path.basename(out.rstrip('/'))}", "",
             f"Choosiness σ (mate-preference tolerance; **lower = pickier**). Change measured from t = {t_from:g} (secondary contact) to the end. "
             f"Paired difference = treatment change − control ({control}) change for the same seed; negative = the treatment made animals pickier.", "",
             "| species | " + " | ".join(f"Δσ {c} (mean, 95% CI)" for c in conds) + " | " + " | ".join(f"paired diff {c} − {control}" for c in conds if c != control) + " |",
             "|---|" + "---|"*(len(conds) + len(conds) - 1)]
    for sp in species:
        cells = []
        for c in conds:
            ds = [v[2] for k, v in change.items() if k[0] == c and k[2] == sp]
            m, lo, hi = mean_ci(ds)
            cells.append("—" if m is None else f"{m:+.3f} ({lo:+.3f} to {hi:+.3f})" if lo is not None else f"{m:+.3f}")
        for c in conds:
            if c == control: continue
            diffs = []
            for (cc, rep, s2), v in change.items():
                if cc == c and s2 == sp and (control, rep, sp) in change: diffs.append(v[2] - change[(control, rep, sp)][2])
            m, lo, hi = mean_ci(diffs)
            neg = sum(1 for d in diffs if d < 0)
            cells.append("—" if m is None else (f"{m:+.3f} ({lo:+.3f} to {hi:+.3f}), {neg}/{len(diffs)} < 0" if lo is not None else f"{m:+.3f}"))
        lines.append(f"| {sp} | " + " | ".join(cells) + " |")
    runs = list(csv.DictReader(open(os.path.join(out, 'runs.csv'))))
    if runs and 'matings' in runs[0]:
        lines += ["", "| condition | replicate | matings | hybrid matings | hybrid share | rejected | inviable offspring | subspecies |", "|---|---|---|---|---|---|---|---|"]
        for r in runs:
            m = int(r['matings'] or 0); h = int(r['hybrid_matings'] or 0)
            lines.append(f"| {r['condition']} | {r['replicate']} | {m} | {h} | {h/m*100 if m else 0:.1f}% | {r['rejected']} | {r['inviable']} | {r['subspecies']} |")
    lines += ["", "Reading it: reinforcement predicts a negative paired difference (penalty → pickier) with an interval below 0. "
              "If hybrids are rare, the penalty has little to act on; check the hybrid share before reading the Δσ columns.", ""]
    report = "\n".join(lines)
    open(os.path.join(out, 'choosiness-report.md'), 'w').write(report)
    print(report)

if __name__ == '__main__':
    main()
