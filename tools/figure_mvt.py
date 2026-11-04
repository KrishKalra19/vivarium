"""Figure for docs/mvt-findings.md: giving-up density in poor vs rich habitat, evolved vs unevolved.

    python3 tools/figure_mvt.py    # writes docs/figures/mvt-gud.svg and prints the numbers

Reads committed patch logs only:
  evolved   experiments/out/mvt-quit-context-c40/m0.07-*  (seeds 1000, 1001)
            experiments/out/mvt-replication-c44/g*        (seeds 1002-1005)
  unevolved experiments/out/mvt-quit-context-c40/m0-*     (seeds 1000, 1001; identical seed brains, no mutation)
Brains mode, predators off, growth 0.6 vs 1.6, measured 10-30 sim-min. Quit GUD = food left where a
voluntary feeding bout ended; cells with fewer than 20 quits are skipped. Thin lines are single
seeds; the thick line is the mean with 95% t intervals. Hand-written SVG, stdlib only.
"""
import glob, json, os, re, statistics as st

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'experiments', 'out')
SPECIES = [('agouti', 'Agouti'), ('howler', 'Howler'), ('capybara', 'Capybara')]
T = [12.71, 4.30, 3.18, 2.78, 2.57, 2.45]
GROWTHS = [0.6, 1.6]

def load(pattern):
    runs = {}   # seed -> growth -> by
    for f in glob.glob(os.path.join(OUT, pattern)):
        man = json.load(open(f.replace('-patches.json', '-manifest.json')))
        runs.setdefault(man['seed'], {})[float(man['params']['growth'])] = json.load(open(f))['by']
    return runs

def series(runs, sp):
    lines = []
    for seed, g in sorted(runs.items()):
        pts = []
        for gr in GROWTHS:
            c = g.get(gr, {}).get(f'{sp}:brain')
            pts.append(c['gud']/c['quit'] if c and c['quit'] >= 20 else None)
        if None not in pts: lines.append(pts)
    means = []
    for i in range(len(GROWTHS)):
        xs = [l[i] for l in lines]
        m = st.mean(xs); h = T[len(xs)-2]*st.stdev(xs)/len(xs)**0.5 if len(xs) > 1 else 0
        means.append((m, m-h, m+h))
    return lines, means

def main():
    evolved = load('mvt-quit-context-c40/m0.07-*-patches.json'); evolved.update(load('mvt-replication-c44/g*-patches.json'))
    null = load('mvt-quit-context-c40/m0-*-patches.json')
    W, H, PW, PH, L, T0 = 960, 446, 250, 260, 70, 86
    ymax = 0.5
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="system-ui, sans-serif" font-size="12">',
           f'<rect width="{W}" height="{H}" fill="#fff"/>',
           f'<text x="{L}" y="24" font-size="15" font-weight="600">Food left behind when foragers quit, poor vs rich habitat</text>',
           f'<text x="{L}" y="42" fill="#555">Quit giving-up density (GUD). Evolved brains: thin lines = single seeds, thick = mean ± 95% CI (6 seeds).</text>',
           f'<text x="{L}" y="58" fill="#555">Dashed grey: unevolved seed brains (2 seeds; thin = each seed). Brains mode, predators off, measured 10–30 sim-min.</text>']
    for p, (sp, title) in enumerate(SPECIES):
        x0 = L + p*(PW + 60); y0 = T0 + 10
        X = lambda i: x0 + 50 + i*(PW - 100)
        Y = lambda v: y0 + PH - v/ymax*PH
        svg.append(f'<text x="{x0}" y="{y0-8}" font-weight="600">{title}</text>')
        for v in [0, 0.1, 0.2, 0.3, 0.4, 0.5]:
            svg.append(f'<line x1="{x0}" x2="{x0+PW}" y1="{Y(v):.1f}" y2="{Y(v):.1f}" stroke="#eee"/>')
            svg.append(f'<text x="{x0-6}" y="{Y(v)+4:.1f}" text-anchor="end" fill="#666">{v:.1f}</text>')
        for i, gr in enumerate(GROWTHS):
            svg.append(f'<text x="{X(i):.1f}" y="{y0+PH+18}" text-anchor="middle" fill="#666">{"poor" if i == 0 else "rich"} ({gr:g}×)</text>')
        svg.append(f'<text x="{x0+PW/2}" y="{y0+PH+36}" text-anchor="middle" fill="#444">habitat (plant regrowth)</text>')
        lines, means = series(evolved, sp)
        for l in lines:
            svg.append(f'<line x1="{X(0):.1f}" y1="{Y(l[0]):.1f}" x2="{X(1):.1f}" y2="{Y(l[1]):.1f}" stroke="#2a7f9e" stroke-opacity="0.3" stroke-width="1.2"/>')
        svg.append(f'<line x1="{X(0):.1f}" y1="{Y(means[0][0]):.1f}" x2="{X(1):.1f}" y2="{Y(means[1][0]):.1f}" stroke="#2a7f9e" stroke-width="3"/>')
        for i, (m, lo, hi) in enumerate(means):
            svg.append(f'<line x1="{X(i):.1f}" x2="{X(i):.1f}" y1="{Y(lo):.1f}" y2="{Y(hi):.1f}" stroke="#2a7f9e" stroke-width="2"/>')
            svg.append(f'<circle cx="{X(i):.1f}" cy="{Y(m):.1f}" r="4.5" fill="#2a7f9e"/>')
        nl, nm = series(null, sp)
        for l in nl:
            svg.append(f'<line x1="{X(0):.1f}" y1="{Y(l[0]):.1f}" x2="{X(1):.1f}" y2="{Y(l[1]):.1f}" stroke="#8a8f98" stroke-opacity="0.45" stroke-width="1.2" stroke-dasharray="3 3"/>')
        if nl:
            svg.append(f'<line x1="{X(0):.1f}" y1="{Y(nm[0][0]):.1f}" x2="{X(1):.1f}" y2="{Y(nm[1][0]):.1f}" stroke="#8a8f98" stroke-width="2.5" stroke-dasharray="6 4"/>')
            for i, (m, lo, hi) in enumerate(nm):
                svg.append(f'<circle cx="{X(i):.1f}" cy="{Y(m):.1f}" r="4" fill="#fff" stroke="#8a8f98" stroke-width="2"/>')
        print(f"{sp:9} evolved ({len(lines)} seeds): {means[0][0]:.3f} → {means[1][0]:.3f}   unevolved ({len(nl)} seeds): " +
              (f"{nm[0][0]:.3f} → {nm[1][0]:.3f}" if nl else '—'))
    lx = L; ly = H - 22
    svg.append(f'<line x1="{lx}" x2="{lx+28}" y1="{ly}" y2="{ly}" stroke="#2a7f9e" stroke-width="3"/><text x="{lx+36}" y="{ly+4}">evolved brains</text>')
    svg.append(f'<line x1="{lx+160}" x2="{lx+188}" y1="{ly}" y2="{ly}" stroke="#8a8f98" stroke-width="2.5" stroke-dasharray="6 4"/><text x="{lx+196}" y="{ly+4}">unevolved seed brains (no mutation)</text>')
    svg.append('</svg>')
    os.makedirs(os.path.join(ROOT, 'docs', 'figures'), exist_ok=True)
    open(os.path.join(ROOT, 'docs', 'figures', 'mvt-gud.svg'), 'w').write('\n'.join(svg))
    print('wrote docs/figures/mvt-gud.svg')

if __name__ == '__main__':
    main()
