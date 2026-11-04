/* Field-methods teaching mode: instantaneous focal sampling, scan sampling and feeding trays
   (giving-up densities), scored against ground truth where there is one.

   A student follows one animal. Every `interval` sim-seconds the range pauses and asks
   what the focal animal is doing at that instant. Their answer is stored next to the true
   state the simulation knows. At the end the student sees:
     - observer error: their answers vs the truth at the same instants (% agreement,
       Cohen's kappa, confusion table), the way observer reliability is assessed in the field;
     - sampling error: the time budget estimated from those few instants vs the animal's
       true continuous budget over the whole session (from its 1 Hz scan counters).
   Field mode hides the caption, sensor ring and threat line, which would give the answer
   away, and draws a posture cue instead (head held out = head up; head tucked = feeding). */
(function(){
  "use strict";
  var V = window.Vivarium;
  if(!V) return;

  var CATS = [
    { key:'feed',     label:'Feeding',  hint:'head down, eating',          truth:['feed'] },
    { key:'vigilant', label:'Vigilant', hint:'head up, standing still',    truth:['vigilant'] },
    { key:'travel',   label:'Moving',   hint:'head up, walking',           truth:['travel','forage'] },
    { key:'flee',     label:'Fleeing',  hint:'running from a predator',    truth:['flee'] }
  ];
  function catOf(state){ for(var i=0;i<CATS.length;i++) if(CATS[i].truth.indexOf(state)>=0) return CATS[i].key; return null; }
  // indices into the animal's 1 Hz scan counters (ETHO order in vivarium.js)
  function ethIndex(name){ return V.ethoStates.indexOf(name); }

  var study = null, pollTimer = null;
  var $ = function(id){ return document.getElementById(id); };

  function pickFocal(sid){
    var pool = V.animals().filter(function(a){
      return !a.dead && a.sid===sid && a.genome.brain && a.age >= (a.minAge||0) && a.age < a.maxAge*0.4;   // young adults, so few die of old age mid-study
    });
    if(!pool.length) return null;
    return pool[Math.floor(Math.random()*pool.length)];   // UI randomness on purpose: never touch the sim's stream
  }

  // Bank the current focal's true scan counts since it was picked (for the continuous budget).
  function addContinuous(st){
    var now = snapshotEth(st.focal);
    Object.keys(st.cont).forEach(function(k){ st.cont[k] += (now[k]||0) - (st.eth0[k]||0); });
    st.eth0 = now;
  }
  function snapshotEth(a){ var o = {}; ['feed','vigilant','travel','forage','flee'].forEach(function(k){ o[k] = a.eth[ethIndex(k)]; }); return o; }

  /* ---------- scan sampling ----------
     At each sample point a circle is drawn around a random adult of the species; the
     student counts head-down vs head-up animals of that species inside it. Scored against
     the true counts in the circle (counting error) and against the whole population at
     that instant (placement error: circles centred on an animal over-sample groups). */
  var SCAN_R = 110;
  function startScan(){
    var sid = $('fsSpecies').value, n = +$('fsSamples').value, interval = +$('fsInterval').value;
    if(!pickFocal(sid)){
      $('fsStatus').textContent = 'No adult evolved-brain ' + V.species[sid].name.toLowerCase() +
        ' on the range. Scan samples need Mixed A/B or Brains mode (Controls → Behaviour).';
      return;
    }
    V.fieldMode(true);
    study = { kind:'scan', sid:sid, n:n, interval:interval, samples:[], next:V.stats().t + interval, waiting:false, wasPaused:V.params.paused };
    $('fsResults').innerHTML = ''; $('fsStart').disabled = true; $('fsStop').disabled = false;
    $('fsStatus').textContent = 'Scan sampling ' + V.species[sid].name.toLowerCase() + ' · first scan in ' + interval + ' sim-s';
    pollTimer = setInterval(pollScan, 100);
  }
  function pollScan(){
    if(!study || study.waiting) return;
    if(V.stats().t < study.next) return;
    var a = pickFocal(study.sid);
    if(!a){ study.next = V.stats().t + 2; return; }
    study.waiting = true; study.wasPaused = V.params.paused; V.setPaused(true);
    V.fieldScan({ x:a.x, y:a.y, r:SCAN_R, sid:study.sid });
    study.pending = { i:study.samples.length + 1, t:V.stats().t, truth:V.scanTruth() };
    $('fsScanSp').textContent = V.species[study.sid].name.toLowerCase() + 's';
    $('fsScanN').textContent = study.pending.i + ' / ' + study.n;
    $('fsDown').value = ''; $('fsUp').value = '';
    $('fsScanPrompt').hidden = false;
    setTimeout(function(){ try { $('fsDown').focus(); } catch(e){} }, 50);
    $('fsStatus').textContent = 'Scan ' + study.pending.i + ' of ' + study.n + ': count heads in the dashed circle';
  }
  function recordScan(skip){
    if(!study || !study.waiting || study.kind!=='scan') return;
    var p = study.pending, d = parseInt($('fsDown').value, 10), u = parseInt($('fsUp').value, 10);
    if(!skip && (isNaN(d) || isNaN(u) || d < 0 || u < 0)){ $('fsStatus').textContent = 'Enter both counts (0 is fine), or press Lost count.'; return; }
    study.samples.push({ i:p.i, t:+p.t.toFixed(1), skip:!!skip, down:skip ? null : d, up:skip ? null : u,
                         tDown:p.truth.down, tUp:p.truth.up, tFlee:p.truth.flee, popDown:p.truth.popDown, popUp:p.truth.popUp });
    study.waiting = false; $('fsScanPrompt').hidden = true; V.fieldScan(null);
    V.setPaused(study.wasPaused); study.next = p.t + study.interval;
    if(study.samples.length >= study.n) finishScan(null);
    else $('fsStatus').textContent = 'Recorded scan ' + p.i + ' of ' + study.n + ' · next in ' + study.interval + ' sim-s';
  }
  function finishScan(note){
    clearInterval(pollTimer); pollTimer = null;
    var s = study; study = null;
    $('fsScanPrompt').hidden = true; V.fieldScan(null); V.fieldMode(false);
    $('fsStart').disabled = false; $('fsStop').disabled = true;
    if(s.waiting) V.setPaused(s.wasPaused);
    var done = s.samples.filter(function(x){ return !x.skip; });
    var n = done.length, mae = 0, sumD = 0, sumN = 0, tD = 0, tN = 0, pD = 0, pN = 0, exact = 0;
    done.forEach(function(x){
      mae += Math.abs(x.down - x.tDown) + Math.abs(x.up - x.tUp);
      if(x.down === x.tDown && x.up === x.tUp) exact++;
      sumD += x.down; sumN += x.down + x.up; tD += x.tDown; tN += x.tDown + x.tUp; pD += x.popDown; pN += x.popDown + x.popUp;
    });
    var mine = sumN ? sumD/sumN : null, circle = tN ? tD/tN : null, pop = pN ? pD/pN : null;
    var pc = function(x){ return x == null ? '—' : (x*100).toFixed(0) + '%'; };
    var html = note ? '<p class="hint">' + note + '</p>' : '';
    html += '<div class="fs-score"><div><b>' + (n ? (exact/n*100).toFixed(0) + '%' : '—') + '</b><span>scans counted exactly</span></div>' +
            '<div><b>' + (n ? (mae/n).toFixed(1) : '—') + '</b><span>animals off per scan</span></div>' +
            '<div><b>' + n + '</b><span>scans recorded</span></div></div>';
    html += '<table class="fs-table"><thead><tr><th>share feeding (head down)</th><th>your counts</th><th>truth in your circles</th><th>truth, whole population</th></tr></thead><tbody>' +
            '<tr><th>estimate</th><td>' + pc(mine) + '</td><td>' + pc(circle) + '</td><td>' + pc(pop) + '</td></tr></tbody></table>';
    html += '<p class="caption">Column 1 vs 2 is <b>counting error</b>: what you counted vs what was in the circle. Column 2 vs 3 is <b>placement error</b>: each circle was centred on an animal, so circles land in groups and miss loners; if feeding differs between groups and loners, your estimate is biased however well you count. Fleeing animals in a circle are left out of both counts.</p>';
    html += '<table class="fs-table"><thead><tr><th>scan</th><th>you: down / up</th><th>truth: down / up</th></tr></thead><tbody>' +
      s.samples.map(function(x){ return '<tr><th>' + x.i + '</th><td>' + (x.skip ? 'lost count' : x.down + ' / ' + x.up) + '</td><td class="' +
        (!x.skip && (x.down !== x.tDown || x.up !== x.tUp) ? 'off' : 'diag') + '">' + x.tDown + ' / ' + x.tUp + '</td></tr>'; }).join('') + '</tbody></table>';
    $('fsResults').innerHTML = html;
    $('fsStatus').textContent = 'Finished: ' + s.samples.length + ' scans of ' + V.species[s.sid].name.toLowerCase() + 's.';
    window.FieldStudy.last = { kind:'scan', samples:s.samples, mine:mine, circle:circle, pop:pop, mae:n ? mae/n : null, exact:n ? exact/n : null };
  }

  /* ---------- Feeding trays: giving-up densities (GUD) in rich vs poor habitat ----------
     Trays are cells refilled to full foliage that don't regrow during the trial. Half are placed
     where the surrounding 100 px are richest, half where they're poorest. At the end each tray's
     remaining food is its GUD. Trays no animal ate from are reported but left out of the means:
     an unfound tray says nothing about when a forager gives up. */
  var TRAY_R = 100, TRAY_GAP = 90;
  function tCrit(df){ var t = [12.71,4.30,3.18,2.78,2.57,2.45,2.36,2.31,2.26,2.23,2.20,2.18,2.16,2.14,2.13,2.12,2.11,2.10,2.09,2.09];
                      return df < 1 ? null : df <= 20 ? t[df-1] : df <= 30 ? 2.05 : df <= 60 ? 2.01 : 1.98; }
  function meanCI(xs){
    var n = xs.length; if(!n) return { n:0 };
    var m = xs.reduce(function(a, b){ return a + b; }, 0)/n;
    if(n < 2) return { n:n, m:m };
    var v = xs.reduce(function(a, b){ return a + (b-m)*(b-m); }, 0)/(n-1);
    return { n:n, m:m, sd:Math.sqrt(v), se:Math.sqrt(v/n), lo:m - tCrit(n-1)*Math.sqrt(v/n), hi:m + tCrit(n-1)*Math.sqrt(v/n) };
  }
  function placeTrays(n){
    var W = V.worldSize(), pts = [];
    for(var i=0; i<800; i++){
      var x = TRAY_R/2 + Math.random()*(W.w - TRAY_R), y = TRAY_R/2 + Math.random()*(W.h - TRAY_R);
      pts.push({ x:x, y:y, f:V.foodNear(x, y, TRAY_R) });
    }
    pts.sort(function(a, b){ return b.f - a.f; });
    var chosen = [];
    function take(list, zone){
      var got = 0;
      for(var i=0; i<list.length && got<n; i++){
        var p = list[i];
        if(chosen.some(function(c){ var dx=c.x-p.x, dy=c.y-p.y; return dx*dx+dy*dy < TRAY_GAP*TRAY_GAP; })) continue;
        chosen.push({ x:p.x, y:p.y, amount:1, zone:zone, around:p.f }); got++;
      }
    }
    var third = Math.floor(pts.length/3);
    take(pts.slice(0, third), 'rich');
    take(pts.slice(pts.length - third).reverse(), 'poor');
    return chosen;
  }
  function startTrays(){
    var n = +$('fsSamples').value/2, dur = +$('fsTrayDur').value, pred = $('fsPredict').value;
    if(!pred){ $('fsStatus').textContent = 'Make a prediction first: where will foragers leave more food behind?'; return; }
    var list = placeTrays(n), placed = V.trays(list);
    study = { kind:'trays', n:n, dur:dur, pred:pred, t0:V.stats().t, list:list, placed:placed, wasPaused:V.params.paused };
    $('fsResults').innerHTML = ''; $('fsStart').disabled = true; $('fsStop').disabled = false;
    if(V.params.paused) V.setPaused(false);
    pollTimer = setInterval(pollTrays, 250);
    pollTrays();
  }
  function pollTrays(){
    if(!study || study.kind !== 'trays') return;
    var left = study.dur - (V.stats().t - study.t0);
    if(left <= 0) return finishTrays(null);
    var st = V.trayState() || [], visited = st.filter(function(t){ return t.nVisitors > 0; }).length;
    $('fsStatus').textContent = 'Trial running: ' + Math.ceil(left) + ' sim-s left · ' + visited + ' of ' + st.length + ' trays visited so far';
  }
  function finishTrays(note){
    clearInterval(pollTimer); pollTimer = null;
    var s = study; study = null;
    var st = V.trayState() || []; V.trays(null);
    $('fsStart').disabled = false; $('fsStop').disabled = true;
    var zones = { rich:[], poor:[] }, unvisited = { rich:0, poor:0 }, visitors = { rich:0, poor:0 }, bySp = {};
    st.forEach(function(t){
      if(t.nVisitors > 0){ zones[t.zone].push(t.left); visitors[t.zone] += t.nVisitors; }
      else unvisited[t.zone]++;
      Object.keys(t.visitors).forEach(function(k){ bySp[k] = (bySp[k]||0) + t.visitors[k]; });
    });
    var R = meanCI(zones.rich), P = meanCI(zones.poor);
    var diff = null;
    if(R.n >= 2 && P.n >= 2){
      var se = Math.sqrt(R.se*R.se + P.se*P.se);
      var df = Math.pow(se, 4) / (Math.pow(R.se, 4)/(R.n-1) + Math.pow(P.se, 4)/(P.n-1));   // Welch
      var tc = tCrit(Math.max(1, Math.floor(df)));
      diff = { m:R.m - P.m, lo:R.m - P.m - tc*se, hi:R.m - P.m + tc*se };
    }
    var verdict = !diff ? 'too few visited trays to compare' : diff.lo > 0 ? 'rich' : diff.hi < 0 ? 'poor' : 'same';
    var f = function(x){ return x == null ? '—' : x.toFixed(2); };
    var html = note ? '<p class="hint">' + note + '</p>' : '';
    html += '<div class="fs-score"><div><b>' + f(R.m) + '</b><span>mean GUD, rich habitat (' + R.n + ' trays)</span></div>' +
            '<div><b>' + f(P.m) + '</b><span>mean GUD, poor habitat (' + P.n + ' trays)</span></div>' +
            '<div><b>' + (diff ? (diff.m >= 0 ? '+' : '') + diff.m.toFixed(2) : '—') + '</b><span>rich − poor' + (diff ? ' (95% CI ' + f(diff.lo) + ' to ' + f(diff.hi) + ')' : '') + '</span></div></div>';
    var predTxt = { rich:'more food left in rich-habitat trays', poor:'more food left in poor-habitat trays', same:'no difference' };
    html += '<p>You predicted <b>' + predTxt[s.pred] + '</b>. ' +
      (verdict === s.pred ? 'Your data support it.' : verdict === 'same' ? 'The difference isn’t distinguishable from zero with these trays (the interval spans 0).' :
       verdict.indexOf('too few') === 0 ? 'Too few trays were visited to test it: run a longer trial or use more trays.' : 'Your data point the other way.') + '</p>';
    html += '<table class="fs-table"><thead><tr><th></th><th>rich</th><th>poor</th></tr></thead><tbody>' +
      '<tr><th>trays placed</th><td>' + (R.n + unvisited.rich) + '</td><td>' + (P.n + unvisited.poor) + '</td></tr>' +
      '<tr><th>never visited</th><td>' + unvisited.rich + '</td><td>' + unvisited.poor + '</td></tr>' +
      '<tr><th>mean GUD ± 95% CI</th><td>' + f(R.m) + (R.lo != null ? ' (' + f(R.lo) + '–' + f(R.hi) + ')' : '') + '</td><td>' + f(P.m) + (P.lo != null ? ' (' + f(P.lo) + '–' + f(P.hi) + ')' : '') + '</td></tr>' +
      '<tr><th>animals per visited tray</th><td>' + (R.n ? (visitors.rich/R.n).toFixed(1) : '—') + '</td><td>' + (P.n ? (visitors.poor/P.n).toFixed(1) : '—') + '</td></tr>' +
      '</tbody></table>';
    html += '<p class="caption">Visitors by species: ' + (Object.keys(bySp).map(function(k){ return V.species[k].name.toLowerCase() + ' ' + bySp[k]; }).join(', ') || 'none') + '. ' +
      '<b>Reading it:</b> the marginal value theorem says a forager should leave a patch when its intake there falls to what it could get on average elsewhere. Where the surroundings are rich, that point comes sooner, so more food is left: a higher GUD. ' +
      'Unvisited trays are left out of the means (an unfound tray says nothing about giving up), so check whether one zone simply had fewer visits. ' +
      'And think about placement: trays in rich surroundings may also sit where more animals are, so a difference could be about crowding as well as food. In Vivarium\u2019s own research the GUD pattern turned out to be partly produced by how animals move, not only by a decision to quit (docs/mvt-findings.md).</p>';
    $('fsResults').innerHTML = html;
    $('fsStatus').textContent = 'Finished: ' + st.length + ' trays, ' + (R.n + P.n) + ' visited.';
    window.FieldStudy.last = { kind:'trays', trays:st, rich:R, poor:P, diff:diff, verdict:verdict, pred:s.pred, unvisited:unvisited };
  }
  function syncMode(){
    var m = $('fsMode').value;
    $('fsTrayOpts').hidden = m !== 'trays';
    $('fsSpeciesRow').hidden = m === 'trays';
    $('fsIntervalRow').hidden = m === 'trays';
    $('fsSamplesLabel').textContent = m === 'trays' ? 'Trays (half per habitat)' : 'Samples';
    $('fsStart').textContent = m === 'trays' ? 'Place trays and start' : m === 'scan' ? 'Start scan sampling' : 'Start focal follow';
  }

  function start(){
    if(study) return;
    if($('fsMode').value === 'scan') return startScan();
    if($('fsMode').value === 'trays') return startTrays();
    var sid = $('fsSpecies').value, n = +$('fsSamples').value, interval = +$('fsInterval').value;
    var focal = pickFocal(sid);
    if(!focal){
      $('fsStatus').textContent = 'No adult evolved-brain ' + V.species[sid].name.toLowerCase() +
        ' to follow. Field studies need Mixed A/B or Brains mode (Controls → Behaviour).';
      return;
    }
    V.fieldMode(true);
    V.follow(focal.uid);
    var t = V.stats().t;
    study = { sid:sid, focal:focal, n:n, interval:interval, samples:[], next:t + interval, t0:t,
              eth0:snapshotEth(focal), waiting:false, wasPaused:V.params.paused, ended:null,
              focals:1, losses:[], cont:{ feed:0, vigilant:0, travel:0, forage:0, flee:0 } };
    $('fsResults').innerHTML = '';
    $('fsStart').disabled = true; $('fsStop').disabled = false;
    status();
    pollTimer = setInterval(poll, 100);
  }

  function status(){
    if(!study) return;
    $('fsStatus').textContent = 'Following ' + V.species[study.sid].name.toLowerCase() + ' #' + study.focal.uid + (study.focals > 1 ? ' (focal ' + study.focals + ')' : '') +
      ' · sample ' + Math.min(study.samples.length + (study.waiting ? 1 : 0), study.n) + ' of ' + study.n +
      ' · every ' + study.interval + ' sim-s';
  }

  function poll(){
    if(!study || study.waiting) return;
    var a = study.focal;
    if(a.dead){
      var how = a.cause==='predated' && a.killedBy ? 'was taken by ' + V.species[a.killedBy.sid].name.toLowerCase()
              : a.cause==='starved' ? 'starved' : a.cause==='age' ? 'died of old age' : 'died';
      // Field practice: when a focal is lost, move to a new one and keep sampling.
      study.losses.push(V.species[study.sid].name + ' #' + a.uid + ' ' + how + ' after sample ' + study.samples.length);
      addContinuous(study);
      var next = pickFocal(study.sid);
      if(!next) return finish('Your focal animal ' + how + ' and no other adult was left to follow.');
      study.focal = next; study.eth0 = snapshotEth(next); study.focals++;
      V.follow(next.uid);
      status();
      return;
    }
    if(V.stats().t >= study.next) prompt();
  }

  function prompt(){
    study.waiting = true;
    study.wasPaused = V.params.paused;
    V.setPaused(true);
    study.pending = { i:study.samples.length + 1, t:V.stats().t, truth:V.truthState(study.focal.uid) };
    $('fsPromptN').textContent = study.pending.i + ' / ' + study.n;
    $('fsPrompt').hidden = false;
    status();
  }

  function answer(key){
    if(!study || !study.waiting) return;
    var p = study.pending;
    study.samples.push({ i:p.i, t:+p.t.toFixed(1), answer:key, truth:catOf(p.truth) || p.truth });
    study.waiting = false;
    $('fsPrompt').hidden = true;
    V.setPaused(study.wasPaused);
    study.next = p.t + study.interval;
    status();
    if(study.samples.length >= study.n) finish(null);
  }

  function kappa(pairs, keys){
    var n = pairs.length; if(!n) return { po:null, k:null };
    var po = pairs.filter(function(p){ return p.answer===p.truth; }).length / n, pe = 0;
    keys.forEach(function(k){
      var pa = pairs.filter(function(p){ return p.answer===k; }).length / n;
      var pt = pairs.filter(function(p){ return p.truth===k; }).length / n;
      pe += pa*pt;
    });
    return { po:po, k: pe < 1 ? (po - pe)/(1 - pe) : null };
  }

  function pct(x){ return x==null ? '—' : Math.round(x*100) + '%'; }

  function finish(note){
    clearInterval(pollTimer); pollTimer = null;
    var s = study; study = null;
    $('fsPrompt').hidden = true;
    V.fieldMode(false);
    $('fsStart').disabled = false; $('fsStop').disabled = true;
    if(s.waiting) V.setPaused(s.wasPaused);
    var keys = CATS.map(function(c){ return c.key; });
    var scored = s.samples.filter(function(p){ return p.answer !== 'skip' && keys.indexOf(p.truth) >= 0; });
    var r = kappa(scored, keys);
    // true continuous budget over the session, from the focal animal's 1 Hz scan counters
    if(!s.focal.dead) addContinuous(s);
    var cont = {}, contN = 0;
    keys.forEach(function(k){
      var c = CATS.filter(function(x){ return x.key===k; })[0], d = 0;
      c.truth.forEach(function(t){ d += s.cont[t]||0; });
      cont[k] = d; contN += d;
    });
    var html = '';
    if(note) html += '<p class="hint">' + note + '</p>';
    if(s.losses.length) html += '<p class="hint">You followed ' + s.focals + ' animals: ' + s.losses.join('; ') + '. Switching focal when one is lost is standard practice; note that it biases the sample towards survivors.</p>';
    html += '<div class="fs-score"><div><b>' + pct(r.po) + '</b><span>agreement</span></div>' +
            '<div><b>' + (r.k==null ? '—' : r.k.toFixed(2)) + '</b><span>Cohen\'s κ</span></div>' +
            '<div><b>' + scored.length + '</b><span>samples scored</span></div></div>';
    html += '<p class="caption">κ corrects agreement for chance: below 0.4 is poor, 0.4–0.6 moderate, 0.6–0.8 good, above 0.8 excellent (Landis &amp; Koch 1977). Trained observers are usually expected to reach about 0.8 before collecting data.</p>';
    // confusion table
    html += '<table class="fs-table"><thead><tr><th>you said ↓ / truth →</th>' + CATS.map(function(c){ return '<th>' + c.label + '</th>'; }).join('') + '</tr></thead><tbody>';
    CATS.forEach(function(row){
      html += '<tr><th>' + row.label + '</th>' + CATS.map(function(col){
        var n = scored.filter(function(p){ return p.answer===row.key && p.truth===col.key; }).length;
        return '<td class="' + (row.key===col.key ? 'diag' : (n ? 'off' : '')) + '">' + (n || '') + '</td>';
      }).join('') + '</tr>';
    });
    html += '</tbody></table>';
    // budgets: yours, truth at the same instants, truth continuous
    html += '<table class="fs-table"><thead><tr><th>time budget</th><th>your samples</th><th>truth at those instants</th><th>truth, continuous</th></tr></thead><tbody>';
    CATS.forEach(function(c){
      var mine = scored.length ? scored.filter(function(p){ return p.answer===c.key; }).length/scored.length : null;
      var inst = scored.length ? scored.filter(function(p){ return p.truth===c.key; }).length/scored.length : null;
      html += '<tr><th>' + c.label + '</th><td>' + pct(mine) + '</td><td>' + pct(inst) + '</td><td>' + pct(contN ? cont[c.key]/contN : null) + '</td></tr>';
    });
    html += '</tbody></table>';
    html += '<p class="caption">Column 1 vs 2 is <b>observer error</b> (what you saw vs what was happening). Column 2 vs 3 is <b>sampling error</b> (a few instants vs the animal\'s whole session, ' + contN + ' s). Field studies have both; here you can see each one separately.</p>';
    html += '<button class="btn wide" id="fsCsv">Download your samples (CSV)</button>';
    $('fsResults').innerHTML = html;
    $('fsStatus').textContent = 'Finished: ' + V.species[s.sid].name.toLowerCase() + ' #' + s.focal.uid + ', ' + s.samples.length + ' samples.';
    var csv = 'sample,t,answer,truth\n' + s.samples.map(function(p){ return [p.i, p.t, p.answer, p.truth].join(','); }).join('\n') + '\n';
    $('fsCsv').addEventListener('click', function(){
      var url = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
      var link = document.createElement('a'); link.href = url; link.download = 'field-study-' + s.sid + '-' + s.focal.uid + '.csv';
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    });
    window.FieldStudy.last = { samples:s.samples, agreement:r.po, kappa:r.k, continuous:cont, contN:contN, focals:s.focals };
  }

  function stop(){ if(study){ if(study.kind==='scan') finishScan('You stopped early.'); else if(study.kind==='trays') finishTrays('You stopped the trial early.'); else finish('You stopped the study early.'); } }

  // UI wiring
  var sel = $('fsSpecies');
  ['agouti','howler','capybara','tapir'].forEach(function(id){
    var o = document.createElement('option'); o.value = id; o.textContent = V.species[id].name; sel.appendChild(o);
  });
  $('fsStart').addEventListener('click', start);
  $('fsMode').addEventListener('change', syncMode); syncMode();
  $('fsStop').addEventListener('click', stop);
  $('fsScanOk').addEventListener('click', function(){ recordScan(false); });
  $('fsScanSkip').addEventListener('click', function(){ recordScan(true); });
  ['fsDown','fsUp'].forEach(function(id){ $(id).addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); if(id === 'fsDown') $('fsUp').focus(); else recordScan(false); }
    e.stopPropagation();   // digits typed here mustn't trigger the focal-mode shortcuts
  }); });
  var host = $('fsButtons');
  CATS.forEach(function(c, i){
    var b = document.createElement('button');
    b.className = 'btn'; b.innerHTML = '<kbd>' + (i+1) + '</kbd> ' + c.label + '<span class="sub">' + c.hint + '</span>';
    b.addEventListener('click', function(){ answer(c.key); });
    host.appendChild(b);
  });
  var sk = document.createElement('button');
  sk.className = 'btn quiet'; sk.innerHTML = '<kbd>0</kbd> Lost sight<span class="sub">not scored</span>';
  sk.addEventListener('click', function(){ answer('skip'); });
  host.appendChild(sk);
  document.addEventListener('keydown', function(e){
    if(!study || !study.waiting || study.kind === 'scan' || study.kind === 'trays') return;
    var k = e.key;
    if(k >= '1' && k <= '4'){ answer(CATS[+k-1].key); e.preventDefault(); }
    else if(k === '0'){ answer('skip'); e.preventDefault(); }
  });

  /* Headless hook for tests: FieldStudy.start(), FieldStudy.answer(key), FieldStudy.state(). */
  window.FieldStudy = { start:start, stop:stop, answer:answer, cats:CATS,
    scan:function(down, up){ $('fsDown').value = down; $('fsUp').value = up; recordScan(down == null); },
    trays:function(){ return study && study.kind === 'trays' ? { t0:study.t0, dur:study.dur, placed:study.placed } : null; },
    state:function(){ return study ? { kind:study.kind || 'focal', waiting:study.waiting, n:study.samples.length, pending:study.pending, focal:study.focal ? study.focal.uid : null } : null; } };
})();
