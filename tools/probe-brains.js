/* Probe evolved herbivore brains: does the head-down decision respond to threat, and to group size?

     node tools/probe-brains.js [--seed 1000] [--secs 1500] [--predators 1] [--out runs/probe]

   Evolves a brains-mode world (trait costs on, caps x1.6, as in the many-eyes pilots), then,
   for every living evolved-brain herbivore, takes its ACTUAL current input vector and edits
   only the inputs under test, running the network forward for each variant:
     threat:  none  vs  predator close ahead (threat near 0.8)  vs  close behind
     group:   alone (no kin, no crowding)  vs  crowded (kin close, crowding 1.0); no threat
   The head-down output > 0 means "head down" (eat, can't watch). The same inputs are also
   fed to the hand-wired seed brain, so evolved and starting behaviour can be compared.
   Writes <out>/probe.json and prints a table. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const a = { seed:1000, secs:1500, predators:1, out:'runs/probe' };
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
    const V = Vivarium, Br = Ludus.brain, H = Br.herbivore, I = H.I, O = H.O;
    V.setPaused(true); V.traitCosts(true); V.params.capScale = 1.6; V.params.predators = !!o.predators;
    V.reset(o.seed); V.brainMode('brains');
    for(let t=0; t<o.secs; t+=10){ for(let i=0;i<300;i++) V.step(1/30); await new Promise(r => setTimeout(r, 0)); }
    const hid = new Float32Array(H.NH), out = new Float32Array(H.NO);
    const run = (w, inp) => { H.forward(w, inp, hid, out); return { down:out[O.headDown], throttle:out[O.throttle] }; };
    const variant = (base, edit) => { const x = Float32Array.from(base); edit(x); return x; };
    const result = {};
    ['agouti','howler','capybara','tapir'].forEach(sid => {
      const sp = V.species[sid], seedW = H.seed(null, sp);
      const pop = V.animals().filter(an => !an.dead && an.sid===sid && an.genome.brain && an.bIn).slice(0, 300);
      const acc = { n:pop.length };
      [['evolved', an => an.genome.brain], ['seed', () => seedW]].forEach(([tag, W]) => {
        let downNo=0, downAhead=0, downBehind=0, flipAhead=0, baseDown=0, alone=0, crowded=0, dNo=0, dAhead=0;
        pop.forEach(an => {
          const none = variant(an.bIn, x => { x[I.tSin]=0; x[I.tCos]=0; x[I.tNear]=0; });
          const ahead = variant(an.bIn, x => { x[I.tSin]=0; x[I.tCos]=1; x[I.tNear]=0.8; });
          const behind = variant(an.bIn, x => { x[I.tSin]=0; x[I.tCos]=-1; x[I.tNear]=0.8; });
          const lone = variant(none, x => { x[I.kSin]=0; x[I.kCos]=0; x[I.kNear]=0; x[I.crowd]=0; });
          const crowd = variant(none, x => { x[I.kNear]=0.9; x[I.crowd]=1.0; });
          const rN = run(W(an), none), rA = run(W(an), ahead), rB = run(W(an), behind);
          dNo += rN.down; dAhead += rA.down;
          if(rN.down > 0){ baseDown++; if(rA.down <= 0) flipAhead++; }
          if(rN.down > 0) downNo++; if(rA.down > 0) downAhead++; if(rB.down > 0) downBehind++;
          if(run(W(an), lone).down > 0) alone++; if(run(W(an), crowd).down > 0) crowded++;
        });
        const n = pop.length || 1;
        acc[tag] = { headDownNoThreat:downNo/n, headDownThreatAhead:downAhead/n, headDownThreatBehind:downBehind/n,
                     liftsHeadForThreat: baseDown ? flipAhead/baseDown : null, meanOutNoThreat:dNo/n, meanOutThreat:dAhead/n,
                     headDownAlone:alone/n, headDownCrowded:crowded/n };
      });
      result[sid] = acc;
    });
    return { result, manifest:V.manifest() };
  }, a);
  fs.writeFileSync(path.join(a.out, 'probe.json'), JSON.stringify(res, null, 2));
  const pc = x => x == null ? '  —  ' : (x*100).toFixed(0).padStart(4) + '%';
  console.log(`seed ${a.seed}, ${a.secs} sim-s, predators ${a.predators ? 'on' : 'off'}; share of brains choosing head DOWN under each input variant`);
  console.log('species   brain    n  | no threat | threat ahead | threat behind | lifts head for threat | alone | crowded');
  for(const [sid, r] of Object.entries(res.result)) for(const tag of ['evolved','seed'])
    console.log(`${sid.padEnd(9)} ${tag.padEnd(7)} ${String(r.n).padStart(4)} | ${pc(r[tag].headDownNoThreat)}     | ${pc(r[tag].headDownThreatAhead)}        | ${pc(r[tag].headDownThreatBehind)}         | ${pc(r[tag].liftsHeadForThreat)}                 | ${pc(r[tag].headDownAlone)} | ${pc(r[tag].headDownCrowded)}`);
  console.log('page errors:', errs.length ? errs : 'none');
  await b.close();
})();
