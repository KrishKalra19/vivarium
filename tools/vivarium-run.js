/* Headless Vivarium run: seeded, synchronous, measured.

     node tools/vivarium-run.js [--secs 1200] [--seed 1] [--mode instinct|mixed|brains]
                                [--every 10] [--out runs/<name>]

   Loads index.html in headless Chromium, replaces Math.random with a seeded
   generator, parks the page's own loop and steps the sim directly. Every
   --every sim-seconds it samples species counts, trait means and foliage.
   Writes <out>/run.json, <out>/chart.png (population + trait means) and
   <out>/map.png, and prints a short verdict: crashes, species that sat at
   zero for 30+ sim-seconds, and final counts. Exit code 1 on a page error. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

function args(){
  const a = { secs:1200, seed:1, mode:'instinct', every:10, out:null, river:0, sexual:0, costs:0, uiseed:0, lifetable:0, set:'' };
  const v = process.argv.slice(2);
  for(let i=0;i<v.length;i+=2){ const k=v[i].replace(/^--/,''); a[k] = isNaN(+v[i+1]) ? v[i+1] : +v[i+1]; }
  if(!a.out) a.out = path.join('runs', `${a.mode}-s${a.seed}-${a.secs}${a.river ? '-river' : ''}${a.sexual ? '-sex' : ''}`);
  return a;
}

(async () => {
  const opt = args();
  fs.mkdirSync(opt.out, { recursive:true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1400, height:900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  // Serve three.js r128 from a local cache (the CDN can be unreachable from sandboxes).
  const three = path.join(__dirname, '..', 'runs', '.cache', 'three.min.js');
  if(!fs.existsSync(three)){
    const { execSync } = require('child_process'), tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'three-'));
    execSync('npm pack three@0.128.0 --silent', { cwd:tmp });
    execSync('tar xzf three-0.128.0.tgz package/build/three.min.js', { cwd:tmp });
    fs.mkdirSync(path.dirname(three), { recursive:true });
    fs.copyFileSync(path.join(tmp, 'package/build/three.min.js'), three);
  }
  await page.route(/three\.min\.js/, r => r.fulfill({ status:200, contentType:'text/javascript', body:fs.readFileSync(three, 'utf8') }));
  await page.addInitScript(seed => {
    let s = seed >>> 0 || 1;
    Math.random = function(){ s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }, opt.uiseed || opt.seed);   // page-side randomness (UI); the sim has its own seeded generator
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.Vivarium);

  const t0 = Date.now();
  const result = await page.evaluate(async opt => {
    const V = window.Vivarium, DT = 1/30;
    V.setPaused(true);
    // --set '{"mutationRate":0.1,"hunt":{"lungeCost":12}}': overrides for Vivarium.params / Vivarium.hunt
    if(opt.set){ const o = JSON.parse(opt.set); Object.keys(o).forEach(k => { if(k==='hunt') Object.assign(V.hunt, o.hunt); else V.params[k] = o[k]; }); }
    if(opt.costs) V.traitCosts(true);   // before seeding, so the founders pay too
    if(opt.lifetable) V.lifeTable(true);
    V.reset(opt.seed);   // seeds the simulation's own generator
    if(opt.mode !== 'instinct') V.brainMode(opt.mode);
    if(opt.river) V.river(true);
    if(opt.sexual) V.sexual(true);
    const ids = Object.keys(V.species), traits = ['mass','speed','sense','metab','choosy'];
    const samples = [], zeroRun = {}, stuck = {};
    ids.forEach(id => { zeroRun[id] = 0; });
    const sample = () => {
      const st = V.stats(), means = {};
      ids.forEach(id => { means[id] = {}; traits.forEach(k => { means[id][k] = 0; }); });
      V.animals().forEach(a => { if(a.dead) return; traits.forEach(k => { means[a.sid][k] += (a.genome[k] == null ? 0 : a.genome[k]); }); });
      ids.forEach(id => { const n = st.counts[id] || 0; traits.forEach(k => { means[id][k] = n ? +(means[id][k]/n).toFixed(4) : null; }); });
      samples.push({ t:+st.t.toFixed(1), total:st.total, counts:st.counts, foliage:+st.foliage.toFixed(3), means });
      ids.forEach(id => {
        zeroRun[id] = (st.counts[id]||0) === 0 ? zeroRun[id] + opt.every : 0;
        if(zeroRun[id] >= 30) stuck[id] = Math.max(stuck[id]||0, zeroRun[id]);
      });
    };
    sample();
    const steps = Math.round(opt.every / DT);
    for(let t = 0; t < opt.secs; t += opt.every){
      for(let i=0;i<steps;i++) V.step(DT);
      sample();
      await new Promise(r => setTimeout(r, 0));
    }
    const banks = {};
    V.animals().forEach(a => { if(a.dead) return; const b = banks[a.genome.clade] = banks[a.genome.clade] || [0,0]; b[V.bankOf ? (V.bankOf(a.x,a.y) < 0 ? 0 : 1) : 0]++; });
    const clades = V.clades ? V.clades().map(c => Object.assign(c, { west:(banks[c.id]||[0,0])[0], east:(banks[c.id]||[0,0])[1] })) : [];
    const tl = V.timelapse ? { frames:V.timelapse.count(), every:V.timelapse.every(),
      mb:+(V.timelapse.frames().reduce((n,f) => n + f.data.byteLength + f.veg.byteLength, 0)/1048576).toFixed(2) } : null;
    const heap = performance.memory ? +(performance.memory.usedJSHeapSize/1048576).toFixed(1) : null;
    // Fingerprint of the final state: equal fingerprints = bit-identical runs.
    let h = 2166136261 >>> 0;
    const mix = v => { h ^= v; h = Math.imul(h, 16777619) >>> 0; };
    V.animals().forEach(a => { if(a.dead) return; mix(a.uid); mix(Math.round(a.x*1000)); mix(Math.round(a.y*1000)); mix(Math.round(a.energy*1000)); });
    const manifest = V.manifest ? V.manifest() : null;
    const life = opt.lifetable ? V.lifeTableCSV() : null;
    const ethogram = V.ethogram ? V.ethogram() : null;
    return { life, ethogram, ids, samples, stuck, deaths:V.deaths(), clades, mating:V.mating ? V.mating() : null, alarm:V.alarmStats ? V.alarmStats() : null, tl, heap, manifest, fingerprint:h.toString(16) };
  }, opt);
  const wallSec = (Date.now() - t0) / 1000;

  if(result.life){ fs.writeFileSync(path.join(opt.out, 'life.csv'), result.life); delete result.life; }
  if(result.ethogram){ fs.writeFileSync(path.join(opt.out, 'ethogram.json'), JSON.stringify(result.ethogram)); delete result.ethogram; }
  if(result.manifest) fs.writeFileSync(path.join(opt.out, 'manifest.json'), JSON.stringify(result.manifest, null, 2));
  fs.writeFileSync(path.join(opt.out, 'run.json'), JSON.stringify({ opt, wallSec, errors, ...result }));
  await page.screenshot({ path:path.join(opt.out, 'map.png') });

  // Chart: populations (log scale) on top, trait-mean drift below.
  const chart = await browser.newPage({ viewport:{ width:1200, height:900 } });
  await chart.setContent('<canvas id=c width=1200 height=900></canvas>');
  await chart.evaluate(({ ids, samples, colors }) => {
    const c = document.getElementById('c').getContext('2d');
    c.fillStyle = '#111'; c.fillRect(0,0,1200,900);
    const T = samples[samples.length-1].t || 1;
    const X = t => 60 + t/T*1100;
    function panel(y0, h, title, val, lo, hi, dash){
      c.fillStyle = '#ccc'; c.font = '14px sans-serif'; c.fillText(title, 60, y0-6);
      c.strokeStyle = '#333'; c.strokeRect(60, y0, 1100, h);
      ids.forEach(id => {
        c.strokeStyle = colors[id]; c.setLineDash(dash||[]); c.lineWidth = 2; c.beginPath();
        let on = false;
        samples.forEach(s => { const v = val(s, id); if(v == null){ on = false; return; }
          const y = y0 + h - (Math.min(Math.max(v,lo),hi)-lo)/(hi-lo)*h;
          on ? c.lineTo(X(s.t), y) : c.moveTo(X(s.t), y); on = true; });
        c.stroke();
      });
      c.setLineDash([]);
    }
    panel(30, 300, 'Population (log scale)', (s,id) => Math.log10((s.counts[id]||0)+1), 0, 3.3);
    panel(370, 220, 'Mean mass multiplier', (s,id) => s.means[id].mass, 0.55, 1.7);
    panel(630, 220, 'Mean speed multiplier', (s,id) => s.means[id].speed, 0.6, 1.5);
    c.font = '13px sans-serif';
    ids.forEach((id,i) => { c.fillStyle = colors[id]; c.fillText(id, 70 + i*120, 890); });
  }, { ids:result.ids, samples:result.samples,
       colors:Object.fromEntries(await page.evaluate(() => Object.entries(Vivarium.species).map(([k,v]) => [k, v.color]))) });
  await chart.screenshot({ path:path.join(opt.out, 'chart.png') });
  await browser.close();

  const last = result.samples[result.samples.length-1];
  console.log(`run ${opt.out}: ${opt.secs} sim-s, ${opt.mode}, seed ${opt.seed}, ${wallSec.toFixed(1)} s wall`);
  console.log('final counts', JSON.stringify(last.counts), 'foliage', last.foliage);
  console.log('stuck at zero (≥30 s):', Object.keys(result.stuck).length ? JSON.stringify(result.stuck) : 'none');
  const cl = result.clades.filter(c => c.depth > 0);
  console.log(`subspecies founded: ${cl.length} (${cl.filter(c => c.died == null).length} alive)`);
  cl.forEach(c => console.log(`  t=${c.born} ${c.name} <- ${(result.clades.find(p => p.id === c.parent)||{}).name}  n=${c.n} (W${c.west}/E${c.east}) peak=${c.peak}${c.died != null ? ' died t=' + c.died : ''}`));
  if(result.mating && opt.sexual) console.log('mating', JSON.stringify(result.mating), 'hybrid share', (result.mating.hybrids/Math.max(1,result.mating.matings)).toFixed(3));
  if(result.tl) console.log('time-lapse', JSON.stringify(result.tl), 'JS heap MB', result.heap);
  console.log('fingerprint', result.fingerprint, 'manifest', JSON.stringify(result.manifest));
  console.log('page errors:', errors.length ? errors : 'none');
  process.exit(errors.length ? 1 : 0);
})();
