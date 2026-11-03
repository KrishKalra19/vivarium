"""Many-eyes analysis of an experiment's vigilance.csv.

    python3 tools/analyze_vigilance.py experiments/out/<name> [--min-scans 50]

Question: does the share of foraging time spent vigilant fall as group size rises?

Unit of analysis = the replicate run, not the individual scan. Scans inside one run are
not independent (the same animals, the same predators, the same moment), so pooling them
would give absurdly narrow intervals. For each run and species we fit one weighted
least-squares slope of vigilant share against log2(group size), weighting each group size
by its number of scans, using only group sizes with at least --min-scans scans. The slope
reads as "change in vigilance share per doubling of group size". Then, across replicates:
mean slope, 95% CI from the t distribution, and how many replicates slope the same way.

Standard library only. Writes report.md next to the CSVs and prints it.
"""
import csv, math, sys, os, collections

T975 = {1:12.706, 2:4.303, 3:3.182, 4:2.776, 5:2.571, 6:2.447, 7:2.365, 8:2.306, 9:2.262, 10:2.228,
        11:2.201, 12:2.179, 13:2.160, 14:2.145, 15:2.131, 16:2.120, 17:2.110, 18:2.101, 19:2.093, 20:2.086,
        25:2.060, 30:2.042, 40:2.021, 60:2.000, 120:1.980}

def tcrit(df):
    if df in T975: return T975[df]
    keys = sorted(T975)
    for k in keys:
        if k > df: return T975[k]
    return 1.96

def mean_ci(xs):
    n = len(xs)
    if n == 0: return None, None, None
    m = sum(xs)/n
    if n < 2: return m, None, None
    sd = math.sqrt(sum((x-m)**2 for x in xs)/(n-1))
    h = tcrit(n-1)*sd/math.sqrt(n)
    return m, m-h, m+h

def wls_slope(points):
    """points: [(x, y, w)] -> slope of y on x, weighted."""
    W = sum(w for _, _, w in points)
    if W <= 0 or len(points) < 3: return None
    mx = sum(x*w for x, _, w in points)/W
    my = sum(y*w for _, y, w in points)/W
    sxx = sum(w*(x-mx)**2 for x, _, w in points)
    if sxx == 0: return None
    return sum(w*(x-mx)*(y-my) for x, y, w in points)/sxx

BINS = [(1, 1), (2, 3), (4, 7), (8, 15), (16, 30)]

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    out = sys.argv[1]
    min_scans = int(sys.argv[sys.argv.index('--min-scans')+1]) if '--min-scans' in sys.argv else 50
    rows = list(csv.DictReader(open(os.path.join(out, 'vigilance.csv'))))
    data = collections.defaultdict(lambda: collections.defaultdict(dict))   # (cond, sp) -> rep -> g -> (feed, vig)
    for r in rows:
        t = int(r['travel']) if r.get('travel') not in (None, '') else 0
        data[(r['condition'], r['species'])][r['replicate']][int(r['group_size'])] = (int(r['feed']), int(r['vigilant']), t)

    lines = [f"# Many-eyes analysis: {os.path.basename(out.rstrip('/'))}", "",
             f"Vigilance = share of feed + vigilant scans spent vigilant (head up and nearly still; head-up travel and fleeing excluded). "
             f"Slope = change in that share per doubling of group size, fitted per replicate (weighted by scans, "
             f"group sizes with ≥{min_scans} scans), then averaged across replicates with a t-based 95% CI.", ""]
    lines += ["| condition | species | reps | slope per doubling (pp) | 95% CI | reps with negative slope | old head-up slope (pp) | "
              + " | ".join(f"g {a}–{b}" if a != b else f"g {a}" for a, b in BINS) + " |",
              "|---|---|---|---|---|---|---|" + "---|"*len(BINS)]
    for (cond, sp) in sorted(data):
        reps = data[(cond, sp)]
        slopes, old, bins = [], [], [[] for _ in BINS]
        for rep, by_g in reps.items():
            pts = [(math.log2(g), v/(f+v), f+v) for g, (f, v, t) in by_g.items() if f+v >= min_scans]
            s = wls_slope(pts)
            if s is not None: slopes.append(s*100)
            # the pre-cycle-14 definition: any head-up scan (vigilant + travel) out of all foraging scans
            pts = [(math.log2(g), (v+t)/(f+v+t), f+v+t) for g, (f, v, t) in by_g.items() if f+v+t >= min_scans]
            s = wls_slope(pts)
            if s is not None: old.append(s*100)
            for i, (a, b) in enumerate(BINS):
                f = sum(by_g.get(g, (0, 0, 0))[0] for g in range(a, b+1)); v = sum(by_g.get(g, (0, 0, 0))[1] for g in range(a, b+1))
                if f+v >= min_scans: bins[i].append(v/(f+v)*100)
        m, lo, hi = mean_ci(slopes)
        neg = sum(1 for s in slopes if s < 0)
        ci = f"{lo:+.2f} to {hi:+.2f}" if lo is not None else "—"
        om = mean_ci(old)[0]; ostr = f"{om:+.2f}" if om is not None else "—"
        cells = []
        for b in bins:
            bm, blo, bhi = mean_ci(b)
            cells.append("—" if bm is None else (f"{bm:.1f}%" + (f" ±{(bhi-bm):.1f}" if blo is not None else "")))
        lines.append(f"| {cond} | {sp} | {len(slopes)} | {m:+.2f} | {ci} | {neg}/{len(slopes)} | {ostr} | " + " | ".join(cells) + " |"
                     if m is not None else f"| {cond} | {sp} | 0 | — | — | — | — | " + " | ".join(cells) + " |")
    lines += ["", "Reading it: a CI entirely below 0 means vigilance reliably falls as groups grow (the many-eyes "
              "prediction); entirely above 0 means it rises; a CI spanning 0 means these replicates can't tell. "
              "Bins show mean vigilance ± CI half-width across replicates.", ""]
    report = "\n".join(lines)
    open(os.path.join(out, 'report.md'), 'w').write(report)
    print(report)

if __name__ == '__main__':
    main()
