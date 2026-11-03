"""Is vigilance evolving, and is it being selected? From a run's life.csv.

    python3 tools/analyze_cohorts.py runs/<run>/life.csv [more life.csv ...] [--bin 900] [--species agouti,howler]

For evolved-brain herbivores, grouped into birth cohorts of --bin sim-seconds:
  vigilance   = sum(scan_vigilant) / sum(scan_feed + scan_vigilant) over the cohort
                (scan-weighted, so long-lived animals count for more observation time)
  selection   = within the cohort, the standardized selection differential on individual
                vigilance: cov(relative fitness, z) where z = (vigilance - mean)/sd, and
                relative fitness = offspring / cohort mean offspring. Positive = more
                vigilant animals left more offspring (Lande & Arnold 1983 style; a
                univariate differential, so it includes indirect selection via correlated traits).
Animals with fewer than 20 foraging scans are left out of the individual-level numbers, and
only animals that have died are used (their offspring count is final).
Standard library only. Prints one table per file.
"""
import csv, sys, math, statistics as st, collections

def arg(k, d):
    return sys.argv[sys.argv.index(k)+1] if k in sys.argv else d

def main():
    files = [a for a in sys.argv[1:] if a.endswith('.csv')]
    binw = float(arg('--bin', 900)); species = arg('--species', 'agouti,howler,capybara,tapir').split(',')
    for f in files:
        rows = [r for r in csv.DictReader(open(f)) if r['lineage'] == 'brain' and r['species'] in species]
        print(f"\n== {f}  ({len(rows)} evolved-brain herbivores)")
        print("species   cohort (born)    n_dead  vigilance  sel. differential (95% CI)   mean offspring")
        for sp in species:
            by = collections.defaultdict(list)
            for r in rows:
                if r['species'] == sp: by[int(float(r['born']) // binw)].append(r)
            for c in sorted(by):
                R = by[c]
                feed = sum(int(r['scan_feed']) for r in R); vig = sum(int(r['scan_vigilant']) for r in R)
                coh_v = vig/(feed+vig) if feed+vig else float('nan')
                D = [r for r in R if r['died'] != '' and int(r['scan_feed']) + int(r['scan_vigilant']) >= 20]
                sel = ci = '—'; mo = '—'
                if len(D) >= 30:
                    v = [int(r['scan_vigilant'])/(int(r['scan_feed'])+int(r['scan_vigilant'])) for r in D]
                    w = [int(r['children']) for r in D]; mw = st.mean(w)
                    if mw > 0 and st.pstdev(v) > 0:
                        sd = st.pstdev(v); z = [(x - st.mean(v))/sd for x in v]; rw = [x/mw for x in w]
                        prods = [a*b for a, b in zip(z, rw)]; s = st.mean(prods)
                        se = st.stdev(prods)/math.sqrt(len(prods))
                        sel = f"{s:+.3f}"; ci = f"({s-1.96*se:+.3f} to {s+1.96*se:+.3f})"
                    mo = f"{mw:.2f}"
                print(f"{sp:9} {int(c*binw):5d}–{int((c+1)*binw):<6d} {len(D):7d}  {coh_v*100:8.2f}%  {sel:>7} {ci:<22} {mo:>6}")

if __name__ == '__main__':
    main()
