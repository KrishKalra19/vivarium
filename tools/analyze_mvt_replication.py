"""Paired-by-seed MVT test: rich minus poor habitat, per species, across seeds.

    python3 tools/analyze_mvt_replication.py <patches.json files ...> [--lo 0.6] [--hi 1.6] [--lineage brain] [--min 20]

Each run's growth and seed come from its manifest.json. For every seed that has both a --lo and a
--hi growth run, and per species, the paired difference (hi minus lo) in:
  quit GUD      food left where voluntary feeding bouts ended
  on food       share of those quits made while still standing on grazeable food (code v39+)
Then the mean difference, a 95% t interval across seeds, and how many seeds are positive.
MVT predicts both differences > 0: richer habitat, earlier departure, more food left.
Standard library only.
"""
import json, os, sys, collections, statistics as st

T = [12.71, 4.30, 3.18, 2.78, 2.57, 2.45, 2.36, 2.31, 2.26, 2.23, 2.20, 2.18, 2.16, 2.14, 2.13]

def arg(k, d):
    return sys.argv[sys.argv.index(k)+1] if k in sys.argv else d

def ci(xs):
    n = len(xs)
    if n < 2: return (st.mean(xs) if xs else None, None, None)
    m = st.mean(xs); se = st.stdev(xs)/n**0.5; t = T[n-2] if n-2 < len(T) else 2.0
    return m, m - t*se, m + t*se

def main():
    files = [f for f in sys.argv[1:] if f.endswith('patches.json')]
    lo, hi = float(arg('--lo', 0.6)), float(arg('--hi', 1.6)); lin = arg('--lineage', 'brain'); nmin = int(arg('--min', 20))
    runs = collections.defaultdict(dict)   # seed -> growth -> by
    for f in files:
        man = json.load(open(os.path.join(os.path.dirname(f), 'manifest.json')))
        runs[man['seed']][float(man['params']['growth'])] = json.load(open(f))['by']
    print(f"Paired by seed: growth {hi:g} minus {lo:g}, {lin} lineage, cells with >= {nmin} voluntary quits.\n")
    print(f"{'species':9} {'seeds':>5}  {'quit GUD lo → hi':>18}  {'Δ quit GUD (95% CI)':>28} {'+':>5}  {'Δ on-food share (95% CI)':>30} {'+':>5}")
    for sp in ['agouti', 'howler', 'capybara', 'tapir']:
        dg, df, glo, ghi = [], [], [], []
        for seed, g in sorted(runs.items()):
            if lo not in g or hi not in g: continue
            a, b = g[lo].get(f'{sp}:{lin}'), g[hi].get(f'{sp}:{lin}')
            if not a or not b or a['quit'] < nmin or b['quit'] < nmin: continue
            ga, gb = a['gud']/a['quit'], b['gud']/b['quit']
            glo.append(ga); ghi.append(gb); dg.append(gb - ga)
            if 'onFood' in a and 'onFood' in b: df.append(b['onFood']/b['quit'] - a['onFood']/a['quit'])
        if not dg:
            print(f"{sp:9} {0:5d}  (no seed with enough quits at both levels)"); continue
        m, l, h = ci(dg); mf, lf, hf = ci(df) if df else (None, None, None)
        fmt = lambda m, l, h, k=1: '—' if m is None else (f"{m*k:+.3f}" + (f" ({l*k:+.3f} to {h*k:+.3f})" if l is not None else ''))
        print(f"{sp:9} {len(dg):5d}  {st.mean(glo):.3f} → {st.mean(ghi):.3f}     {fmt(m, l, h):>28} {sum(x > 0 for x in dg):>2}/{len(dg):<2}  "
              f"{fmt(mf, lf, hf):>30} {(str(sum(x > 0 for x in df)) + '/' + str(len(df))) if df else '—':>5}")

if __name__ == '__main__':
    main()
