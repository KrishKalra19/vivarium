"""Giving-up densities by condition, from runs made with `vivarium-run.js --patches 1`.

    python3 tools/analyze_patches.py runs/<dir>/*/patches.json [--key growth] [--min 30]

Each run's condition is read from its manifest.json (params[--key]); replicates are the runs
that share a condition. Per species x lineage x condition, the mean over replicates of:
  quit GUD   food left where a feeding bout ended voluntarily (2 s without eating)
  move GUD   food left in a cell when a feeding animal moved on to the next one
  quits/fled share of bouts that ended voluntarily vs by fleeing
  habitat    energy intake per animal-second over all animals of that species and lineage
Cells with fewer than --min voluntary bouts in a run are skipped for quit GUD.

Marginal value theorem reading: a forager should leave when its intake drops to the habitat
average, so in richer habitats (higher growth) GUDs should be higher. A fixed rule of thumb
(the Instinct lineage eats whenever food > 0.15) should give GUDs that don't track habitat.
Standard library only.
"""
import json, os, sys, glob, collections, statistics as st

def arg(k, d):
    return sys.argv[sys.argv.index(k)+1] if k in sys.argv else d

def main():
    files = [f for f in sys.argv[1:] if f.endswith('patches.json')]
    key = arg('--key', 'growth'); nmin = int(arg('--min', 30))
    cells = collections.defaultdict(lambda: collections.defaultdict(list))   # (sp, lin) -> cond -> [(qgud, mgud, quitshare, habitat, nq)]
    for f in files:
        d = json.load(open(f)); man = json.load(open(os.path.join(os.path.dirname(f), 'manifest.json')))
        cond = man['params'].get(key)
        for k, c in d['by'].items():
            sp, lin = k.split(':')
            q = c['quit']; bouts = q + c['fled']
            qg = c['gud']/q if q >= nmin else None
            mg = c['moveGud']/c['moves'] if c['moves'] else None
            hab = c['energy']/c['animalSecs'] if c['animalSecs'] else None
            cells[(sp, lin)][cond].append((qg, mg, q/bouts if bouts else None, hab, q))
    def m(xs):
        xs = [x for x in xs if x is not None]
        if not xs: return '   —  '
        return f"{st.mean(xs):.3f}" + (f"±{(max(xs)-min(xs))/2:.3f}" if len(xs) > 1 else '')
    print(f"Mean over replicates (± half-range). Condition = params.{key}.\n")
    print(f"{'species':9} {'lineage':9} {key:>6}  {'quit GUD':>13} {'move GUD':>13} {'quit share':>13} {'habitat rate':>15} {'quits/run':>9}")
    for (sp, lin) in sorted(cells):
        for cond in sorted(cells[(sp, lin)]):
            R = cells[(sp, lin)][cond]
            print(f"{sp:9} {lin:9} {cond:>6}  {m([r[0] for r in R]):>13} {m([r[1] for r in R]):>13} {m([r[2] for r in R]):>13} {m([r[3] for r in R]):>15} {st.mean(r[4] for r in R):9.0f}")

if __name__ == '__main__':
    main()
