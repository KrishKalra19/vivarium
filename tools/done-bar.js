/* In-page harness for the Brains Stage 4b done bar. Load it into a running Vivarium tab:

     var s=document.createElement('script'); s.src='tools/done-bar.js?'+Date.now(); document.head.appendChild(s);
     DoneBar.start({ seed:1 });          // Evolve (600 sim-s brains-only), then 600 sim-s of Mixed
     DoneBar.status();                   // poll; .done and .result when finished

   It replaces Math.random with a seeded generator so runs repeat, parks the
   page's own loop and steps the sim in short chunks (under ~0.25 s of wall time
   each) so the tab never freezes. The verdict follows the run sheet:
   - no prey species sits at zero (a stretch of 30+ sim-seconds at 0 counts as stuck);
   - evolved-brain predators are at least 40% of all predators, both at the end
     and on average over the last 5 sim-minutes. */
(function(){
  var V = window.Vivarium, DT = 1/30, CHUNK_MS = 250, STUCK = 30;
  var PREY = ['agouti','howler','capybara','tapir'], PRED = ['ocelot','harpy','jaguar','anaconda'];
  var job = null, realRandom = Math.random;
  // Hidden tabs throttle chained setTimeout to about once a minute; a MessageChannel
  // hop yields to the event loop without that throttle.
  var mc = new MessageChannel(), pending = [];
  mc.port1.onmessage = function(){ var f = pending.shift(); if(f) f(); };
  function soon(f){ pending.push(f); mc.port2.postMessage(0); }

  function mulberry32(a){
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a>>>15, 1 | a);
      t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t;
      return ((t ^ t>>>14) >>> 0) / 4294967296;
    };
  }

  function snapshot(){
    var c = { brainPred:0, pred:0 }, per = {};
    PREY.concat(PRED).forEach(function(id){ per[id] = { b:0, i:0 }; });
    V.animals().forEach(function(a){
      if(a.dead || !per[a.sid]) return;
      per[a.sid][a.genome.brain ? 'b' : 'i']++;
    });
    PRED.forEach(function(id){ c.pred += per[id].b + per[id].i; c.brainPred += per[id].b; });
    c.per = per;
    return c;
  }

  function start(opt){
    opt = opt || {};
    Math.random = mulberry32(opt.seed || 1);
    if(opt.hunt) Object.assign(V.hunt, opt.hunt);
    V.setActive(false);   // no rAF stepping or drawing, so nothing else draws on the seeded stream
    document.getElementById('evolveBtn').click();
    job = { seed:opt.seed||1, evolveSecs:opt.evolveSecs||600, mixedSecs:opt.mixedSecs||600,
            phase:'evolve', t:0, mixedT:0, nextSample:0, series:[], zeroRun:{}, maxZero:{}, minPrey:{},
            done:false, wall:0, t0:performance.now() };
    PREY.forEach(function(id){ job.zeroRun[id]=0; job.maxZero[id]=0; job.minPrey[id]=1e9; });
    soon(chunk);
    return job.seed;
  }

  function chunk(){
    if(!job || job.done) return;
    var t0 = performance.now();
    while(performance.now() - t0 < CHUNK_MS){
      V.step(DT); job.t += DT;
      if(job.phase === 'evolve'){
        if(job.t >= (job.evoNext||0)){
          job.evoNext = (job.evoNext||0) + 30;
          var e = snapshot(); job.evoTrace = job.evoTrace || [];
          job.evoTrace.push(Math.round(job.t)+' '+PREY.concat(PRED).map(function(id){ return e.per[id].b+e.per[id].i; }).join(' '));
        }
        if(V.brainMode() === 'mixed'){ job.phase = 'mixed'; job.mixedT = 0; job.nextSample = 0; job.evolvedAt = job.t; }
        continue;
      }
      job.mixedT += DT;
      if(job.mixedT >= job.nextSample){
        job.nextSample += 1;
        var s = snapshot(), row = { t:Math.round(job.mixedT), share:s.pred ? s.brainPred/s.pred : 0, pred:s.pred, prey:{} };
        PREY.forEach(function(id){
          var n = s.per[id].b + s.per[id].i;
          row.prey[id] = n;
          job.minPrey[id] = Math.min(job.minPrey[id], n);
          job.zeroRun[id] = n === 0 ? job.zeroRun[id] + 1 : 0;
          job.maxZero[id] = Math.max(job.maxZero[id], job.zeroRun[id]);
        });
        row.predPer = {}; PRED.forEach(function(id){ row.predPer[id] = s.per[id].b+'/'+(s.per[id].b+s.per[id].i); });
        job.series.push(row);
      }
      if(job.mixedT >= job.mixedSecs){ finish(); return; }
      if(job.t > job.evolveSecs + job.mixedSecs + 120){ finish('timeout'); return; }
    }
    soon(chunk);
  }

  function finish(err){
    job.done = true; job.wall = Math.round((performance.now()-job.t0)/1000);
    Math.random = realRandom;
    V.setActive(true);
    var last = job.series[job.series.length-1] || { share:0 }, tail = job.series.filter(function(r){ return r.t >= job.mixedSecs-300; });
    var mean = tail.reduce(function(s,r){ return s+r.share; }, 0) / Math.max(1, tail.length);
    var stuck = PREY.filter(function(id){ return job.maxZero[id] >= STUCK; });
    var onDone = job.onDone;
    job.result = {
      seed:job.seed, error:err||null, wallSecs:job.wall,
      finalShare:+last.share.toFixed(3), meanShareLast5:+mean.toFixed(3),
      stuckAtZero:stuck, maxZeroSecs:job.maxZero, minPrey:job.minPrey,
      finalPrey:last.prey, finalPred:last.predPer, predTotal:last.pred,
      predMeanLast5:Math.round(tail.reduce(function(s,r){ return s+r.pred; }, 0) / Math.max(1, tail.length)),
      pass: !err && stuck.length===0 && last.share>=0.4 && mean>=0.4
    };
    if(onDone) soon(onDone);
  }

  function status(){
    if(!job) return null;
    if(job.done) return { done:true, result:job.result };
    var last = job.series[job.series.length-1];
    return { done:false, phase:job.phase, simT:Math.round(job.t), mixedT:Math.round(job.mixedT),
             wall:Math.round((performance.now()-job.t0)/1000), last:last };
  }

  /* Plain run in one mode (no Evolve): DoneBar.plain({ seed, mode, secs }). Same sampling and verdict. */
  function plain(opt){
    opt = opt || {};
    Math.random = mulberry32(opt.seed || 1);
    if(opt.hunt) Object.assign(V.hunt, opt.hunt);
    V.setActive(false);
    V.brainMode(opt.mode || 'mixed');
    job = { seed:opt.seed||1, evolveSecs:0, mixedSecs:opt.secs||600, phase:'mixed', t:0, mixedT:0, nextSample:0,
            series:[], zeroRun:{}, maxZero:{}, minPrey:{}, done:false, wall:0, t0:performance.now() };
    PREY.forEach(function(id){ job.zeroRun[id]=0; job.maxZero[id]=0; job.minPrey[id]=1e9; });
    soon(chunk);
    return job.seed;
  }

  /* Runs a list of option sets back to back: DoneBar.sweep([{ seed, hunt, mode, secs, evolve }]).
     Poll DoneBar.sweepResults(). Each entry uses plain() unless evolve is true. */
  var queue = [], results = [];
  function sweep(list){
    queue = list.slice(); results = [];
    next();
  }
  function next(){
    if(job && !job.done) return;
    if(job && job.done && job.opt){ results.push({ opt:job.opt, r:job.result }); job.opt = null; }
    var o = queue.shift();
    if(!o) return;
    if(o.evolve) start(o); else plain(o);
    job.opt = o; job.onDone = next;
  }

  /* Per predator lineage: count, kills per minute of life, mean energy, mean speed share. */
  function probe(){
    var r = {};
    V.animals().forEach(function(a){
      if(PRED.indexOf(a.sid)<0) return;
      var k = a.sid+(a.genome.brain?'.B':'.I'), o = r[k] || (r[k] = { n:0, kills:0, age:0, en:0, spd:0 });
      o.n++; o.kills += a.kills; o.age += a.age; o.en += a.energy/a.maxEnergy; o.spd += Math.hypot(a.vx,a.vy)/a.speed;
    });
    Object.keys(r).sort().forEach(function(k){
      var o = r[k]; r[k] = [o.n, +(o.kills/o.age*60).toFixed(2), +(o.en/o.n).toFixed(2), +(o.spd/o.n).toFixed(2)].join(' ');
    });
    return r;
  }

  /* Compact status: when done, adds a 30 s trace "t share% agouti howler capybara tapir predators". */
  function brief(){
    var s = status();
    if(s && s.done) s.trace = job.series.filter(function(r){ return r.t%30===0; }).map(function(r){
      return [r.t, Math.round(r.share*100), r.prey.agouti, r.prey.howler, r.prey.capybara, r.prey.tapir, r.pred].join(' ');
    });
    return JSON.stringify(s);
  }

  window.DoneBar = { evoTrace:function(){ return job && job.evoTrace; }, start:start, plain:plain, sweep:sweep, sweepResults:function(){ return { left:queue.length, running:!!(job&&!job.done), results:results.map(function(x){ var r=x.r; return JSON.stringify(x.opt.hunt||{})+' s'+x.opt.seed+(x.opt.evolve?' E':'')+' pass='+r.pass+' share='+r.finalShare+'/'+r.meanShareLast5+' pred='+r.predTotal+'/'+r.predMeanLast5+' '+JSON.stringify(r.finalPred)+' minPrey='+JSON.stringify(r.minPrey)+' zero='+JSON.stringify(r.maxZeroSecs); }) }; }, status:status, brief:brief, probe:probe, series:function(){ return job && job.series; } };
})();
