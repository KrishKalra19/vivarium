/* Experiment runner: conditions × replicates, headless and in parallel, into tidy CSVs.

     node tools/experiment.js experiments/many-eyes-pilot.json [--parallel 4] [--only cond]

   Spec (JSON):
     {
       "name": "many-eyes-pilot",
       "secs": 900,                 // sim-seconds per run
       "every": 10,                 // census interval for populations.csv
       "replicates": 4,
       "seed0": 1000,               // replicate r uses seed seed0 + r (same seeds in every condition)
       "base": { "mode":"brains", "costs":1, "river":0, "sexual":0, "set":{} },
       "conditions": [ { "name":"control" }, { "name":"river", "river":1 } ],
       "lifetable": false           // also keep each run's life.csv (large)
     }
   Each condition is `base` with its own fields laid over it ("set" objects are merged).
   Using the same seeds across conditions pairs the replicates (a common-random-numbers
   design), so condition differences aren't swamped by seed-to-seed noise.

   Output in experiments/out/<name>/:
     spec.json        the spec as run, plus code version and timestamp
     runs.csv         one row per run: condition, replicate, seed, fingerprint, wall time, final counts
     populations.csv  condition, replicate, t, species, count
     budgets.csv      condition, replicate, species, state, scans
     vigilance.csv    condition, replicate, species, group_size, feed, vigilant
     runs/<cond>-r<k>/ each run's own run.json, manifest.json, ethogram.json, chart.png, map.png
   A run whose output already exists with the same spec is skipped, so an interrupted
   experiment resumes where it stopped. */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const argv = process.argv.slice(2);
if(!argv[0]){ console.error('usage: node tools/experiment.js <spec.json> [--parallel N] [--only condition]'); process.exit(2); }
const specPath = argv[0];
const flag = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i+1] : d; };
const parallel = +flag('parallel', Math.max(1, require('os').cpus().length));
const only = flag('only', null);

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'experiments', 'out', spec.name);
fs.mkdirSync(path.join(outDir, 'runs'), { recursive:true });

const jobs = [];
for(const cond of spec.conditions){
  if(only && cond.name !== only) continue;
  const c = Object.assign({}, spec.base || {}, cond);
  c.set = Object.assign({}, (spec.base || {}).set || {}, cond.set || {});
  for(let r=0; r<spec.replicates; r++){
    const seed = (spec.seed0 || 1) + r;
    const dir = path.join(outDir, 'runs', `${cond.name}-r${r}`);
    const a = ['tools/vivarium-run.js', '--secs', spec.secs, '--every', spec.every || 10, '--seed', seed,
               '--mode', c.mode || 'instinct', '--river', c.river ? 1 : 0, '--sexual', c.sexual ? 1 : 0,
               '--costs', c.costs ? 1 : 0, '--lifetable', spec.lifetable ? 1 : 0, '--out', dir];
    if(Object.keys(c.set).length) a.push('--set', JSON.stringify(c.set));
    jobs.push({ cond:cond.name, r, seed, dir, args:a.map(String), key:JSON.stringify(a) });
  }
}

function done(job){
  try { return JSON.parse(fs.readFileSync(path.join(job.dir, 'job.json'), 'utf8')).key === job.key && fs.existsSync(path.join(job.dir, 'run.json')); }
  catch(e){ return false; }
}

function runJob(job){
  return new Promise(resolve => {
    if(done(job)){ console.log(`skip  ${job.cond} r${job.r} (already done)`); return resolve(true); }
    const t0 = Date.now();
    const p = spawn(process.execPath, job.args, { cwd:root, stdio:['ignore', 'pipe', 'pipe'] });
    let log = '';
    p.stdout.on('data', d => { log += d; }); p.stderr.on('data', d => { log += d; });
    p.on('close', code => {
      fs.mkdirSync(job.dir, { recursive:true });
      fs.writeFileSync(path.join(job.dir, 'stdout.txt'), log);
      if(code === 0) fs.writeFileSync(path.join(job.dir, 'job.json'), JSON.stringify({ key:job.key }));
      console.log(`${code === 0 ? 'ok   ' : 'FAIL '} ${job.cond} r${job.r} seed ${job.seed}  ${((Date.now()-t0)/1000).toFixed(0)} s`);
      resolve(code === 0);
    });
  });
}

const csv = rows => rows.map(r => r.map(v => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}).join(',')).join('\n') + '\n';

function collect(){
  const runs = [['condition','replicate','seed','fingerprint','wall_s','sim_s','subspecies','page_errors']];
  const pops = [['condition','replicate','t','species','count']];
  const budgets = [['condition','replicate','species','state','scans']];
  const vig = [['condition','replicate','species','group_size','feed','vigilant']];
  let species = null, missing = 0;
  for(const job of jobs){
    let run, eth;
    try { run = JSON.parse(fs.readFileSync(path.join(job.dir, 'run.json'), 'utf8')); }
    catch(e){ missing++; continue; }
    try { eth = JSON.parse(fs.readFileSync(path.join(job.dir, 'ethogram.json'), 'utf8')); } catch(e){ eth = null; }
    species = species || run.ids;
    if(runs[0].length === 8) species.forEach(s => runs[0].push('final_' + s));
    const last = run.samples[run.samples.length-1];
    runs.push([job.cond, job.r, job.seed, run.fingerprint, run.wallSec.toFixed(1), last.t,
               (run.clades || []).filter(c => c.depth > 0).length, (run.errors || []).length]
               .concat(species.map(s => last.counts[s] || 0)));
    for(const smp of run.samples) for(const s of species) pops.push([job.cond, job.r, smp.t, s, smp.counts[s] || 0]);
    if(eth){
      for(const s of Object.keys(eth.budget)) eth.budget[s].forEach((n, k) => budgets.push([job.cond, job.r, s, eth.states[k], n]));
      for(const s of Object.keys(eth.eyes)){
        const e = eth.eyes[s];
        for(let g=1; g<e.feed.length; g++) if(e.feed[g] || e.vigilant[g]) vig.push([job.cond, job.r, s, g, e.feed[g], e.vigilant[g]]);
      }
    }
  }
  fs.writeFileSync(path.join(outDir, 'runs.csv'), csv(runs));
  fs.writeFileSync(path.join(outDir, 'populations.csv'), csv(pops));
  fs.writeFileSync(path.join(outDir, 'budgets.csv'), csv(budgets));
  fs.writeFileSync(path.join(outDir, 'vigilance.csv'), csv(vig));
  return { runs:runs.length-1, missing };
}

(async () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const code = (html.match(/js\/vivarium\.js\?v=\d+/) || [''])[0];
  fs.writeFileSync(path.join(outDir, 'spec.json'), JSON.stringify(Object.assign({}, spec, { _code:code, _started:new Date().toISOString() }), null, 2));
  console.log(`${spec.name}: ${jobs.length} runs (${spec.conditions.length} conditions × ${spec.replicates} replicates), ${parallel} at a time`);
  const t0 = Date.now(), queue = jobs.slice(); let failed = 0;
  await Promise.all(Array.from({ length:parallel }, async () => {
    while(queue.length){ const j = queue.shift(); if(!(await runJob(j))) failed++; }
  }));
  const c = collect();
  console.log(`finished in ${((Date.now()-t0)/60000).toFixed(1)} min: ${c.runs} runs collected, ${failed} failed, ${c.missing} missing`);
  console.log(`tidy CSVs in ${path.relative(root, outDir)}/`);
  process.exit(failed ? 1 : 0);
})();
