"""Case study helper: the same data, two definitions of "vigilance".

    python3 tools/case_vigilance_definitions.py [experiments/out/many-eyes-pilot2/vigilance.csv]

The scan counts carry three foraging states per group size: feed (head down), vigilant (head up
and still), travel (head up and walking). Definition A ("head up") = (vigilant + travel) / all;
definition B ("scanning") = vigilant / (feed + vigilant). For each species x condition: the share
by group-size bin (mean of replicate runs) and the change per doubling of group size (least-squares
slope of the share on log2 group size within each run, averaged over runs). Standard library only.
"""
import csv, sys, math, collections, statistics as st

BINS = [(1, 1), (2, 3), (4, 7), (8, 15), (16, 30)]

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else 'experiments/out/many-eyes-pilot2/vigilance.csv'
    data = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0, 0]))   # (cond, sp, rep) -> g -> [feed, vig, trav]
    for r in csv.DictReader(open(path)):
        c = data[(r['condition'], r['species'], r['replicate'])][int(r['group_size'])]
        c[0] += int(r['feed']); c[1] += int(r['vigilant']); c[2] += int(r['travel'])
    defs = {'A head up': lambda f, v, t: (v + t)/(f + v + t) if f + v + t else None,
            'B scanning': lambda f, v, t: v/(f + v) if f + v else None}
    keys = sorted({(k[0], k[1]) for k in data})
    print("Share of foraging time (%), mean of replicate runs, by group size; slope = pp per doubling of group size\n")
    print(f"{'species':9} {'condition':13} {'definition':11} " + ' '.join(f"{(str(a) if a == b else f'{a}-{b}'):>6}" for a, b in BINS) + "   slope")
    for cond, sp in sorted(keys, key=lambda k: (k[1], k[0])):
        reps = [v for k, v in data.items() if k[0] == cond and k[1] == sp]
        for name, fn in defs.items():
            cells = []
            for a, b in BINS:
                vals = []
                for rep in reps:
                    f = sum(rep[g][0] for g in range(a, b+1)); v = sum(rep[g][1] for g in range(a, b+1)); t = sum(rep[g][2] for g in range(a, b+1))
                    if f + v + t >= 50: vals.append(fn(f, v, t)*100)
                cells.append(f"{st.mean(vals):6.1f}" if vals else '     —')
            slopes = []
            for rep in reps:
                xs, ys, ws = [], [], []
                for g, (f, v, t) in rep.items():
                    y = fn(f, v, t)
                    if y is None or f + v + t < 50: continue
                    xs.append(math.log2(g)); ys.append(y*100); ws.append(f + v + t)
                if len(xs) >= 3:
                    W = sum(ws); mx = sum(w*x for w, x in zip(ws, xs))/W; my = sum(w*y for w, y in zip(ws, ys))/W
                    sxx = sum(w*(x-mx)**2 for w, x in zip(ws, xs))
                    if sxx > 0: slopes.append(sum(w*(x-mx)*(y-my) for w, x, y in zip(ws, xs, ys))/sxx)
            print(f"{sp:9} {cond:13} {name:11} " + ' '.join(cells) + f"   {st.mean(slopes):+.2f}" if slopes else '')

if __name__ == '__main__':
    main()
