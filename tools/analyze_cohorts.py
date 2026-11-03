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

With --decompose, a second table per file asks *why* selection has the sign it does. Dead animals
(>= 20 foraging scans) are split by individual vigilance (none, <2.5%, >=2.5%) WITHIN bands of
foraging-scan count, so animals are compared at similar observed lifespans. Unstratified, this
comparison suffers immortal-time bias: an animal that lives longer gets more scans and so more
chances to log any vigilance, which makes a little vigilance look protective. Per cell: predation
hazard (predation deaths per 1000 sim-s lived; the benefit side) and mean lifetime offspring (net).
Still correlational: an animal's vigilance is partly its circumstances, not only its genes.
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
                        sd = st.pstdev(v); mv = st.mean(v); z = [(x - mv)/sd for x in v]; rw = [x/mw for x in w]
                        prods = [a*b for a, b in zip(z, rw)]; s = st.mean(prods)
                        se = st.stdev(prods)/math.sqrt(len(prods))
                        sel = f"{s:+.3f}"; ci = f"({s-1.96*se:+.3f} to {s+1.96*se:+.3f})"
                    mo = f"{mw:.2f}"
                print(f"{sp:9} {int(c*binw):5d}–{int((c+1)*binw):<6d} {len(D):7d}  {coh_v*100:8.2f}%  {sel:>7} {ci:<22} {mo:>6}")
        if '--decompose' in sys.argv:
            # Stratify by foraging scans (feed + vigilant), i.e. by observed lifespan. Without this,
            # long-lived animals have more chances to log a vigilant scan, so "any vigilance" looks
            # protective just because the animal lived (immortal-time bias).
            bands = [(20, 40), (40, 80), (80, 160), (160, 10**9)]
            print("species   scans    group (indiv. vigilance)     n   predated/1000s   lifetime offspring")
            for sp in species:
                acc = collections.defaultdict(lambda: [0, 0.0, 0, 0])
                for r in rows:
                    if r['species'] != sp or r['died'] == '': continue
                    n = int(r['scan_feed']) + int(r['scan_vigilant'])
                    if n < 20: continue
                    v = int(r['scan_vigilant'])/n
                    g = 'none (0%)' if v == 0 else 'low (<2.5%)' if v < 0.025 else 'high (>=2.5%)'
                    bi = next(i for i, (lo, hi) in enumerate(bands) if lo <= n < hi)
                    x = acc[(bi, g)]; x[0] += 1; x[1] += float(r['age']); x[2] += r['cause'] == 'predated'; x[3] += int(r['children'])
                for bi, (lo, hi) in enumerate(bands):
                    for g in ('none (0%)', 'low (<2.5%)', 'high (>=2.5%)'):
                        n, life, pred, kids = acc[(bi, g)]
                        if n < 30: continue
                        lab = f"{lo}-{hi}" if hi < 10**9 else f"{lo}+"
                        print(f"{sp:9} {lab:8} {g:24} {n:7d}   {pred/life*1000:12.2f}   {kids/n:14.2f}")

if __name__ == '__main__':
    main()
