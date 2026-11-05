"""Many-eyes analysis of an experiment's vigilance.csv.

    python3 tools/analyze_vigilance.py experiments/out/<name> [--min-scans 50]

Question: does the share of foraging time spent vigilant fall as group size rises?

Vigilance = vigilant / (feed + vigilant): of the scans where an animal was either eating
head-down or standing head-up and still, the share head-up. Travel (head-up and moving)
and fleeing are excluded (cycle 14: counting travel made walking look like vigilance).

Unit of analysis = the replicate run, not the scan. Scans in one run share animals,
predators and moments, so pooling them would give far too narrow intervals. Per run and
species, one weighted least-squares slope of vigilance on log2(group size), weighted by
scans; it reads as "percentage points of vigilance per doubling of group size". Then
across replicates: mean, 95% t interval, and how many replicates point the same way.

Two slopes are reported:
  raw            all food levels pooled
  food-adjusted  fixed effects for the food level under the animal: the slope is fitted
                 within each food level and pooled (cycle 14: frugivores crowd at rich
                 patches, so group size and food go together). Needs food_bin data.
A confound check shows how food differs across group sizes: the share of scans on
rich food (level >= 2 of 0-3).

Standard library only. Writes report.md next to the CSVs and prints it.
"""
import csv, math, sys, os, collections

T975 = {1:12.706, 2:4.303, 3:3.182, 4:2.776, 5:2.571, 6:2.447, 7:2.365, 8:2.306, 9:2.262, 10:2.228,
        11:2.201, 12:2.179, 13:2.160, 14:2.145, 15:2.131, 16:2.120, 17:2.110, 18:2.101, 19:2.093, 20:2.086,
        25:2.060, 30:2.042, 40:2.021, 60:2.000, 120:1.980}

def tcrit(df):
    if df in T975: return T975[df]
    for k in sorted(T975):
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

def slope_fe(points):
    """points: [(stratum, x, y, w)] -> weighted slope of y on x within strata (fixed effects)."""
    by = collections.defaultdict(list)
    for s, x, y, w in points: by[s].append((x, y, w))
    num = den = 0.0; used = 0
    for pts in by.values():
        W = sum(w for _, _, w in pts)
        if W <= 0 or len(pts) < 2: continue
        mx = sum(x*w for x, _, w in pts)/W; my = sum(y*w for _, y, w in pts)/W
        num += sum(w*(x-mx)*(y-my) for x, y, w in pts); den += sum(w*(x-mx)**2 for x, _, w in pts)
        used += len(pts)
    return num/den if den > 0 and used >= 3 else None

BINS = [(1, 1), (2, 3), (4, 7), (8, 15), (16, 30)]

def fmt_ci(m, lo, hi):
    if m is None: return "—", "—"
    return f"{m:+.2f}", (f"{lo:+.2f} to {hi:+.2f}" if lo is not None else "—")

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    out = sys.argv[1]
    min_scans = int(sys.argv[sys.argv.index('--min-scans')+1]) if '--min-scans' in sys.argv else 50
    rows = list(csv.DictReader(open(os.path.join(out, 'vigilance.csv'))))
    # (cond, sp) -> rep -> (food_bin, g) -> [feed, vig, travel]
    data = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0, 0])))
    has_food = False
    for r in rows:
        fb = r.get('food_bin', 'all') or 'all'
        if fb != 'all': has_food = True
        c = data[(r['condition'], r['species'])][r['replicate']][(fb, int(r['group_size']))]
        c[0] += int(r['feed']); c[1] += int(r['vigilant']); c[2] += int(r['travel'] or 0)

    lines = [f"# Many-eyes analysis: {os.path.basename(out.rstrip('/'))}", "",
             "Vigilance = vigilant / (feed + vigilant), where vigilant = head up and nearly still. Slopes are "
             "percentage points of vigilance per doubling of group size, fitted per replicate (weighted by scans; "
             f"cells with ≥{min_scans} scans), then mean and 95% t interval across replicates.", ""]
    head = "| condition | species | reps | raw slope | raw 95% CI | food-adjusted slope | adjusted 95% CI | adjusted reps < 0 | " + \
           " | ".join(f"vig g{a}" + (f"–{b}" if b != a else "") for a, b in BINS) + " | " + \
           " | ".join(f"rich food g{a}" + (f"–{b}" if b != a else "") for a, b in BINS) + " |"
    lines += [head, "|" + "---|"*(8 + 2*len(BINS))]
    for (cond, sp) in sorted(data):
        reps = data[(cond, sp)]
        raw, adj, vb, fbins = [], [], [[] for _ in BINS], [[] for _ in BINS]
        for rep, cells in reps.items():
            pooled = collections.defaultdict(lambda: [0, 0])
            rich = collections.defaultdict(lambda: [0, 0])
            for (fb, g), (f, v, t) in cells.items():
                pooled[g][0] += f; pooled[g][1] += v
                if fb != 'all':
                    rich[g][1] += f+v+t
                    if int(fb) >= 2: rich[g][0] += f+v+t
            s = slope_fe([(0, math.log2(g), v/(f+v), f+v) for g, (f, v) in pooled.items() if f+v >= min_scans])
            if s is not None: raw.append(s*100)
            if has_food:
                s = slope_fe([(fb, math.log2(g), v/(f+v), f+v) for (fb, g), (f, v, t) in cells.items() if f+v >= min_scans])
                if s is not None: adj.append(s*100)
            for i, (a, b) in enumerate(BINS):
                f = sum(pooled[g][0] for g in range(a, b+1) if g in pooled); v = sum(pooled[g][1] for g in range(a, b+1) if g in pooled)
                if f+v >= min_scans: vb[i].append(v/(f+v)*100)
                rr = sum(rich[g][0] for g in range(a, b+1) if g in rich); rn = sum(rich[g][1] for g in range(a, b+1) if g in rich)
                if rn >= min_scans: fbins[i].append(rr/rn*100)
        rm, rci = fmt_ci(*mean_ci(raw)); am, aci = fmt_ci(*mean_ci(adj))
        neg = f"{sum(1 for x in adj if x < 0)}/{len(adj)}" if adj else "—"
        cells_v = [("—" if not b else f"{sum(b)/len(b):.1f}%") for b in vb]
        cells_f = [("—" if not b else f"{sum(b)/len(b):.0f}%") for b in fbins]
        lines.append(f"| {cond} | {sp} | {len(raw)} | {rm} | {rci} | {am} | {aci} | {neg} | " + " | ".join(cells_v) + " | " + " | ".join(cells_f) + " |")
    lines += ["", "Reading it: an interval entirely below 0 means vigilance reliably falls as groups grow. The many-eyes "
              "prediction needs the **food-adjusted** slope to be negative **with** predators and flat **without** them. "
              "'Rich food' columns are the share of scans on food level ≥2 at each group size; if they climb with group "
              "size, group size and food are confounded and the raw slope can't be trusted.", ""]
    report = "\n".join(lines)
    open(os.path.join(out, 'report.md'), 'w').write(report)
    print(report)

if __name__ == '__main__':
    main()
