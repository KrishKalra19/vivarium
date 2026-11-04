/* Probe the evolved quit decision (marginal value theorem follow-up).

     node tools/probe-quit.js [--seed 1000] [--secs 1500] [--growth 1.0] [--out runs/probe-quit]

   Evolves a brains-mode world (trait costs, caps x1.6, predators off: the cycle 32 setup at a given
   growth), then, for every living evolved-brain herbivore, takes its ACTUAL current inputs, removes
   any threat, and sweeps 'food here' from 0 to 1 in steps of 0.01. The grazing threshold is the
   lowest food-here level at which the network chooses head down. Sweeps are repeated with the
   'food pull' input (strength of the best food the animal can see nearby, a local cue of how rich
   the surroundings are) at 0, 0.5 and 1, with the food direction straight ahead.
   MVT mechanism: if better food is visible nearby, a forager should quit at higher food underfoot,
   so the threshold should rise with food pull.
   --vary energy: instead sweep the 'energy' input at 0.3, 0.6, 0.9 (food pull 0): does a fuller animal
   need more food underfoot before it grazes (satiety)?
   --vary crowd: set kin proximity and crowding together to 0, 0.5, 1 (kin straight ahead when > 0):
   does a crowded animal need more food underfoot before it grazes (a density cue)?
   --measure leave: instead of the grazing threshold, put the animal on good food (food here 0.4)
   and report the share of brains whose outputs say "leave": throttle above 0.55 (the level the
   sim treats as running) or head up. Cycle 40 found evolved brains walk off food sooner in rich
   habitat; this asks which input drives that. Writes <out>/probe-quit.json and prints a table. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const a = { seed:1000, secs:1500, growth:1.0, out:'runs/probe-quit', vary:'pull', measure:'threshold' };
const v = process.argv.slice(2);
for(let i=0;i<v.length;i+=2) a[v[i].replace(/^--/,'')] = isNaN(+v[i+1]) ? v[i+1] : +v[i+1];

(async () => {
  fs.mkdirSync(a.out, { recursive:true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  const three = path.join(__dirname, '..', 'runs', '.cache', 'three.min.js');
  await p.route(/three\.min\.js/, r => r.fulfill({ status:200, contentType:'text/javascript', body:fs.existsSync(three) ? fs.readFileSync(three, 'utf8') : '' }));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => window.Vivarium);
  const res = await p.evaluate(async o => {
    const V = Vivarium, H = Ludus.brain.herbivore, I = H.I, O = H.O;
    V.setPaused(true); V.traitCosts(true); V.params.capScale = 1.6; V.params.predators = false; V.params.growth = o.growth;
    V.reset(o.seed); V.brainMode('brains');
    for(let t=0; t<o.secs; t+=10){ for(let i=0;i<300;i++) V.step(1/30); await new Promise(r => setTimeout(r, 0)); }
    const hid = new Float32Array(H.NH), out = new Float32Array(H.NO);
    const down = (w, x) => { H.forward(w, x, hid, out); return out[O.headDown] > 0; };
    const LEVELS = o.vary === 'energy' ? [0.3, 0.6, 0.9] : [0, 0.5, 1], result = {};   // crowd also uses 0 / 0.5 / 1
    ['agouti','howler','capybara','tapir'].forEach(sid => {
      const sp = V.species[sid], seedW = H.seed(null, sp);
      const pop = V.animals().filter(an => !an.dead && an.sid===sid && an.genome.brain && an.bIn).slice(0, 400);
      const r = { n:pop.length };
      [['evolved', an => an.genome.brain], ['seed', () => seedW]].forEach(([tag, W]) => {
        r[tag] = {};
        LEVELS.forEach(lv => {
          const pull = o.vary === 'pull' ? lv : 0;
          const th = [];
          pop.forEach(an => {
            const x = Float32Array.from(an.bIn);
            x[I.tSin]=0; x[I.tCos]=0; x[I.tNear]=0;
            x[I.fPull]=pull; x[I.fSin]=0; x[I.fCos]=pull > 0 ? 1 : 0;
            if(o.vary === 'energy') x[I.energy] = lv;
            if(o.vary === 'crowd'){ x[I.kNear] = lv; x[I.crowd] = lv; x[I.kSin] = 0; x[I.kCos] = lv > 0 ? 1 : 0; }
            if(o.measure === 'leave'){
              x[I.fHere] = 0.4; H.forward(W(an), x, hid, out);
              th.push((out[O.throttle]+1)*0.5 > 0.55 || out[O.headDown] <= 0 ? 1 : 0);   // the sim maps throttle as (out+1)/2
              return;
            }
            let t = null;
            for(let f=0; f<=100; f++){ x[I.fHere] = f/100; if(down(W(an), x)){ t = f/100; break; } }
            th.push(t);
          });
          if(o.measure === 'leave'){ r[tag]['L'+lv] = { leave: th.length ? th.reduce((p, q) => p + q, 0)/th.length : null }; return; }
          const ok = th.filter(t => t != null).sort((p, q) => p - q);
          r[tag]['L'+lv] = { never:th.length - ok.length, median: ok.length ? ok[Math.floor(ok.length/2)] : null,
                                  q1: ok.length ? ok[Math.floor(ok.length/4)] : null, q3: ok.length ? ok[Math.floor(ok.length*3/4)] : null };
        });
      });
      result[sid] = r;
    });
    return { result, manifest:V.manifest() };
  }, a);
  fs.writeFileSync(path.join(a.out, 'probe-quit.json'), JSON.stringify(res, null, 2));
  const f = x => x == null ? '  —  ' : x.toFixed(2);
  console.log(a.measure === 'leave' ? `seed ${a.seed}, growth ${a.growth}, ${a.secs} sim-s; on good food (0.4): share of brains whose outputs say leave (throttle > 0.55 or head up)`
    : `seed ${a.seed}, growth ${a.growth}, ${a.secs} sim-s; grazing threshold (food-here level where head goes down): median [q1–q3], never = brains that don't graze at any level`);
  const LV = a.vary === 'energy' ? [0.3, 0.6, 0.9] : [0, 0.5, 1], name = a.vary === 'energy' ? 'energy' : a.vary === 'crowd' ? 'crowd' : 'food pull';
  console.log('species   brain      n  | ' + LV.map(l => (name+' '+l).padEnd(22)).join(' | '));
  for(const [sid, r] of Object.entries(res.result)) for(const tag of ['evolved','seed']){
    const c = k => { const z = r[tag][k]; if(a.measure === 'leave') return `${z.leave == null ? '—' : Math.round(z.leave*100) + '% leave'}`.padEnd(22);
                     return `${f(z.median)} [${f(z.q1)}–${f(z.q3)}] nv ${z.never}`.padEnd(22); };
    console.log(`${sid.padEnd(9)} ${tag.padEnd(8)} ${String(r.n).padStart(4)} | ` + LV.map(l => c('L'+l)).join(' | '));
  }
  console.log('page errors:', errs.length ? errs : 'none');
  await b.close();
})();
