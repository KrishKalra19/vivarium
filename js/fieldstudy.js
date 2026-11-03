/* Field-methods teaching mode: instantaneous focal sampling, scored against ground truth.

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

  function start(){
    if(study) return;
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

  function stop(){ if(study) finish('You stopped the study early.'); }

  // UI wiring
  var sel = $('fsSpecies');
  ['agouti','howler','capybara','tapir'].forEach(function(id){
    var o = document.createElement('option'); o.value = id; o.textContent = V.species[id].name; sel.appendChild(o);
  });
  $('fsStart').addEventListener('click', start);
  $('fsStop').addEventListener('click', stop);
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
    if(!study || !study.waiting) return;
    var k = e.key;
    if(k >= '1' && k <= '4'){ answer(CATS[+k-1].key); e.preventDefault(); }
    else if(k === '0'){ answer('skip'); e.preventDefault(); }
  });

  /* Headless hook for tests: FieldStudy.start(), FieldStudy.answer(key), FieldStudy.state(). */
  window.FieldStudy = { start:start, stop:stop, answer:answer, cats:CATS,
    state:function(){ return study ? { waiting:study.waiting, n:study.samples.length, pending:study.pending, focal:study.focal.uid } : null; } };
})();
