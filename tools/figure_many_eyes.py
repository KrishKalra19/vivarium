"""Figure for docs/many-eyes-findings.md: vigilance by group size, three conditions.

    python3 tools/figure_many_eyes.py    # writes docs/figures/many-eyes.svg and prints the numbers

Reads experiments/out/many-eyes-pilot3 (no-predator control) and many-eyes-pilot4
(predators, alarm off / on). Same seeds and setup in all three. Each point is the mean
across 4 replicate runs of that run's vigilance share in the group-size bin; bars are 95%
t intervals across replicates. Hand-written SVG so it needs nothing beyond the stdlib.
"""
import csv, os, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from analyze_vigilance import mean_ci, BINS

ROOT = os.path.join(os.path.dirname(__file__), '..')
SERIES = [('many-eyes-pilot3', 'no-predators', 'No predators', '#8a8f98', '4 3'),
          ('many-eyes-pilot4', 'alarm-off', 'Predators, no alarm', '#c0582b', ''),
          ('many-eyes-pilot4', 'alarm-on', 'Predators + alarm', '#2a7f9e', '')]
SPECIES = [('agouti', 'Agouti (Dasyprocta punctata)'), ('howler', 'Howler (Alouatta seniculus)')]
MIN = 50

def bins_for(exp, cond, sp):
    per = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0]))
    for r in csv.DictReader(open(os.path.join(ROOT, 'experiments', 'out', exp, 'vigilance.csv'))):
        if r['condition'] != cond or r['species'] != sp: continue
        c = per[r['replicate']][int(r['group_size'])]; c[0] += int(r['feed']); c[1] += int(r['vigilant'])
    out = []
    for a, b in BINS:
        vals = []
        for rep in per.values():
            f = sum(rep[g][0] for g in range(a, b+1) if g in rep); v = sum(rep[g][1] for g in range(a, b+1) if g in rep)
            if f + v >= MIN: vals.append(v/(f+v)*100)
        out.append(mean_ci(vals) + (len(vals),))
    return out

def main():
    W, H, PW, PH, L, T = 920, 440, 380, 270, 70, 60
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="system-ui, sans-serif" font-size="12">',
           f'<rect width="{W}" height="{H}" fill="#fff"/>',
           f'<text x="{L}" y="24" font-size="15" font-weight="600">Vigilance by group size, after 25 sim-minutes of evolution</text>',
           f'<text x="{L}" y="42" fill="#555">Mean of 4 replicate runs ± 95% CI. Vigilance = head up and still, as a share of feeding + vigilant scans.</text>']
    ymax = 8.0
    printed = []
    for p, (sp, title) in enumerate(SPECIES):
        x0 = L + p*(PW + 90); y0 = T
        svg.append(f'<text x="{x0}" y="{y0-4+20}" font-weight="600">{title}</text>')
        y0 += 28
        X = lambda i: x0 + 30 + i*(PW-60)/(len(BINS)-1)
        Y = lambda v: y0 + PH - v/ymax*PH
        for v in range(0, int(ymax)+1, 2):
            svg.append(f'<line x1="{x0}" x2="{x0+PW}" y1="{Y(v):.1f}" y2="{Y(v):.1f}" stroke="#eee"/>')
            svg.append(f'<text x="{x0-8}" y="{Y(v)+4:.1f}" text-anchor="end" fill="#666">{v}%</text>')
        for i, (a, b) in enumerate(BINS):
            svg.append(f'<text x="{X(i):.1f}" y="{y0+PH+18}" text-anchor="middle" fill="#666">{a if a == b else f"{a}–{b}"}</text>')
        svg.append(f'<text x="{x0+PW/2}" y="{y0+PH+36}" text-anchor="middle" fill="#444">group size (conspecifics within 60 px)</text>')
        for k, (exp, cond, label, col, dash) in enumerate(SERIES):
            pts = bins_for(exp, cond, sp)
            printed.append((sp, label, pts))
            off = (k-1)*6
            path = []
            for i, (m, lo, hi, n) in enumerate(pts):
                if m is None or n < 2: continue
                x = X(i) + off
                if lo is not None:
                    svg.append(f'<line x1="{x:.1f}" x2="{x:.1f}" y1="{Y(min(hi, ymax)):.1f}" y2="{Y(max(lo, 0)):.1f}" stroke="{col}" stroke-width="1.5"/>')
                svg.append(f'<circle cx="{x:.1f}" cy="{Y(min(m, ymax)):.1f}" r="3.5" fill="{col}"/>')
                path.append(f'{x:.1f},{Y(min(m, ymax)):.1f}')
            if len(path) > 1:
                svg.append(f'<polyline points="{" ".join(path)}" fill="none" stroke="{col}" stroke-width="2"' + (f' stroke-dasharray="{dash}"' if dash else '') + '/>')
    for k, (_, _, label, col, dash) in enumerate(SERIES):
        x = L + k*230
        svg.append(f'<line x1="{x}" x2="{x+24}" y1="{H-14}" y2="{H-14}" stroke="{col}" stroke-width="2"' + (f' stroke-dasharray="{dash}"' if dash else '') + '/>')
        svg.append(f'<text x="{x+30}" y="{H-10}">{label}</text>')
    svg.append('</svg>')
    os.makedirs(os.path.join(ROOT, 'docs', 'figures'), exist_ok=True)
    open(os.path.join(ROOT, 'docs', 'figures', 'many-eyes.svg'), 'w').write('\n'.join(svg))
    for sp, label, pts in printed:
        print(sp.ljust(7), label.ljust(20), '  '.join('—' if m is None else f'{m:4.1f}%' for m, lo, hi, n in pts))

if __name__ == '__main__':
    main()
