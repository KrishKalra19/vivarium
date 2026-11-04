"""Giving-up density vs local predation risk within one world (Brown 1988, spatial version).

    python3 tools/analyze_risk_gud.py runs/<dir>/*/patches.json [--lineage brain] [--min 15]

Reads the patch log's risk bins (code v45+): at every voluntary quit, the number of predators within
200 px (0, 1, 2+). Per run and species: quit-GUD with no predator near, and with 1 or more near.
The difference (risky − safe) is paired within the run, then averaged across runs with a 95% t
interval. Brown's prediction: positive (foragers quit at higher food where predators are near).
Also (code v46+): perceived risk, i.e. whether the quitting animal itself sensed a threat in the 5 s
before quitting, paired the same way. Cells with fewer than --min quits in a bin are skipped. Standard library only.
"""
import json, sys, statistics as st

T = [12.71, 4.30, 3.18, 2.78, 2.57, 2.45, 2.36, 2.31, 2.26, 2.23]

def arg(k, d):
    return sys.argv[sys.argv.index(k)+1] if k in sys.argv else d

def main():
    files = [f for f in sys.argv[1:] if f.endswith('patches.json')]
    lin = arg('--lineage', 'brain'); nmin = int(arg('--min', 15))
    print(f"Quit-GUD by predators within 200 px at the moment of quitting ({lin} lineage; bins with >= {nmin} quits)\n")
    print(f"{'species':9} {'run':>4}  {'none: n, GUD':>16}  {'1+: n, GUD':>16}  {'risky - safe':>12}")
    for sp in ['agouti', 'howler', 'capybara', 'tapir']:
        diffs = []
        for i, f in enumerate(files):
            c = json.load(open(f))['by'].get(f'{sp}:{lin}')
            if not c or 'riskQ' not in c: continue
            q, g = c['riskQ'], c['riskGud']
            n0, n1 = q[0], q[1] + q[2]
            if n0 < nmin or n1 < nmin:
                print(f"{sp:9} {i:4d}  {n0:6d}, {'—':>7}  {n1:6d}, {'—':>7}  {'(too few)':>12}"); continue
            g0, g1 = g[0]/n0, (g[1] + g[2])/n1
            diffs.append(g1 - g0)
            print(f"{sp:9} {i:4d}  {n0:6d}, {g0:7.3f}  {n1:6d}, {g1:7.3f}  {g1-g0:+12.3f}")
        pd = []
        for f in files:
            c = json.load(open(f))['by'].get(f'{sp}:{lin}')
            if not c or 'percQ' not in c: continue
            q, g = c['percQ'], c['percGud']
            if q[0] >= nmin and q[1] >= nmin: pd.append(g[1]/q[1] - g[0]/q[0])
        if len(pd) >= 2:
            m = st.mean(pd); h = T[len(pd)-2]*st.stdev(pd)/len(pd)**0.5
            print(f"{sp:9} {'perc':>4}  paired sensed-a-threat-in-last-5-s - not {m:+.3f} (95% CI {m-h:+.3f} to {m+h:+.3f}), {sum(d > 0 for d in pd)}/{len(pd)} runs positive")
        if len(diffs) >= 2:
            m = st.mean(diffs); h = T[len(diffs)-2]*st.stdev(diffs)/len(diffs)**0.5
            print(f"{sp:9} {'mean':>4}  paired risky - safe {m:+.3f} (95% CI {m-h:+.3f} to {m+h:+.3f}), {sum(d > 0 for d in diffs)}/{len(diffs)} runs positive\n")
        elif diffs:
            print(f"{sp:9} {'mean':>4}  one run only: {diffs[0]:+.3f}\n")

if __name__ == '__main__':
    main()
