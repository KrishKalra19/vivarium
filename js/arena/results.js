/* Results: the victory card, Play of the Game, a highlight reel, a day-by-day recap,
   awards and final placings. Replays go through the same 3D stage as the live match,
   fed from the recording instead of the running engine. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};
  var doc = root.document;

  var R = null;   // the results session
  var HOW_TAG = { pounce:'pounced on', ambush:'ambushed', dive:'dove on', deathroll:'death-rolled', charge:'trampled', constrict:'crushed', crit:'savaged' };
  var HOW_CAUSE = { mauled:'mauled', fire:'drove into the fire', drowned:'drowned', venom:'poisoned', constricted:'crushed' };
  var ALONE = { fire:'burned in the wildfire', drowned:'drowned in the flood', venom:'succumbed to venom', constricted:'was crushed', mauled:'fell' };
  var UNIT_METRES = 0.1;   // the arena is about 104 m across

  function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t){ return a + (b - a)*t; }
  function angleLerp(a, b, t){ return a + Math.atan2(Math.sin(b - a), Math.cos(b - a))*t; }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(ch){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]; }); }
  function fmt(t){ var m = Math.floor(t/60), s = Math.floor(t%60); return m + ':' + (s < 10 ? '0' : '') + s; }
  function pct(p){ return p < 0.01 ? '<1%' : Math.round(p*100) + '%'; }
  // Form is each animal's hidden good or bad day, revealed once the result is in.
  function formLabel(f){ var d = Math.round(((f || 1) - 1)*100); return (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d) + '%'; }
  function SP(sid){ return L.ArenaSpecies[sid]; }
  function who(c){ return c.name + ' the ' + SP(c.sid).name; }
  function audio(name, opts){ if(L.ArenaAudio) L.ArenaAudio.play(name, opts); }
  function verbOf(e){
    for(var i=0; i<(e.tags || []).length; i++){ if(HOW_TAG[e.tags[i]]) return HOW_TAG[e.tags[i]]; }
    return HOW_CAUSE[e.cause] || 'killed';
  }

  /* ----- reading the recording ----- */
  function reader(rec, S){
    var stride = rec.stride, data = rec.data, frames = rec.frames, n = rec.n, P = rec.per, G = rec.global;
    function timeAt(f){ return data[f*stride]; }
    function frameFor(t){
      var lo = 0, hi = frames - 1;
      if(t <= timeAt(0)) return 0;
      if(t >= timeAt(hi)) return hi;
      while(hi - lo > 1){ var mid = (lo + hi) >> 1; if(timeAt(mid) <= t) lo = mid; else hi = mid; }
      return lo;
    }
    function feastAt(t){
      var f = null;
      S.feasts.forEach(function(x){ if(x.t <= t) f = x; });
      return f;
    }
    function view(t){
      var fa = frameFor(t), fb = Math.min(frames - 1, fa + 1);
      var ta = timeAt(fa), tb = timeAt(fb), a = tb > ta ? clamp((t - ta)/(tb - ta), 0, 1) : 0;
      var oa = fa*stride, ob = fb*stride;
      var hazard = S.hazard.kind === 'fire'
        ? { kind:'fire', cx:lerp(data[oa + 1], data[ob + 1], a), cy:lerp(data[oa + 2], data[ob + 2], a), r:lerp(data[oa + 3], data[ob + 3], a) }
        : { kind:'flood', level:lerp(data[oa + 1], data[ob + 1], a) };
      var food = data[oa + 5], f = food > 0 ? feastAt(t) : null;
      var cs = [];
      for(var i=0; i<n; i++){
        var ba = oa + G + i*P, bb = ob + G + i*P, near = a < 0.5 ? ba : bb, c = S.cs[i], flags = data[near + 7];
        cs.push({
          id:i, sid:c.sid, name:c.name, alive:(flags & 1) === 1,
          x:lerp(data[ba], data[bb], a), y:lerp(data[ba + 1], data[bb + 1], a), yaw:angleLerp(data[ba + 2], data[bb + 2], a),
          hp:lerp(data[ba + 3], data[bb + 3], a), alt:lerp(data[ba + 4], data[bb + 4], a), stealth:lerp(data[ba + 5], data[bb + 5], a),
          anim:data[near + 6], pinned:(flags & 2) === 2
        });
      }
      return { t:t, night:data[oa + 4] > 0.5, hazard:hazard, feast:f ? { x:f.x, y:f.y, food:food, active:true } : null, cs:cs, tags:true };
    }
    return { view:view, start:timeAt(0), end:timeAt(frames - 1) };
  }

  /* ----- finding the big moments ----- */
  function findMoments(S, odds){
    var cycle = S.T/4.5, winners = S.winners, moments = [];
    var favourite = odds ? odds.probs.indexOf(Math.max.apply(null, odds.probs)) : -1;
    function hitsBetween(a, b, from, to){
      var n = 0;
      S.events.forEach(function(e){
        if(e.type === 'hit' && e.t >= from && e.t <= to && ((e.a === a && e.b === b) || (e.a === b && e.b === a))) n++;
      });
      return n;
    }
    function strength(c){ return c.maxHp*c.dmg/c.cd; }

    S.events.forEach(function(e){
      if(e.type === 'kill'){
        var v = S.cs[e.b], k = e.a >= 0 ? S.cs[e.a] : null;
        if(!k) return;
        var score = 1, labels = [];
        var upset = odds ? clamp(odds.probs[e.b]/Math.max(0.001, odds.probs[e.a]), 0.2, 8)
                         : clamp(strength(v)/strength(k), 0.2, 8);
        if(upset > 1.6){ score += 1.2*Math.log2(upset); labels.push('Upset'); }
        if(e.killerHp != null && e.killerHp < 0.2){ score += 1.6; labels.push('Clutch'); }
        else if(e.killerHp != null && e.killerHp < 0.35) score += 0.6;
        if(e.streak >= 2){ score += 1.3*(e.streak - 1); labels.push(e.streak >= 3 ? 'Triple kill' : 'Double kill'); }
        var tagBonus = { ambush:1.0, pounce:0.7, dive:0.7, deathroll:0.7, constrict:0.6, charge:0.5, crit:0.4 };
        (e.tags || []).forEach(function(t){ if(tagBonus[t]){ score += tagBonus[t]; if(t === 'ambush') labels.push('Ambush'); } });
        var finalBlow = (!S.pairs && e.left === 1) || (S.pairs && e.left <= 2 && winners.indexOf(e.a) >= 0 && e.t >= S.t - 0.2);
        if(finalBlow){ score += 2; labels.push('The final blow'); }
        if(e.first){ score += 0.8; labels.push('First blood'); }
        if(e.b === favourite){ score += 1; labels.push('Favourite falls'); }
        var brawl = hitsBetween(e.a, e.b, e.t - 12, e.t);
        score += Math.min(1.2, brawl*0.08);
        if(brawl >= 10) labels.push('Brawl');
        if(e.cause === 'fire' || e.cause === 'drowned') score += 0.8;
        if(winners.indexOf(e.a) >= 0) score += 0.5;
        var desc = verbOf(e) + ' ' + v.name + ' the ' + SP(v.sid).name;
        if(e.streak >= 3) desc += ' for a triple kill';
        else if(e.streak === 2) desc += ' for a double kill';
        if(e.killerHp != null && e.killerHp < 0.2) desc += ' on ' + Math.max(1, Math.round(e.killerHp*100)) + '% health';
        else if(finalBlow) desc += ' to win the arena';
        moments.push({ kind:'kill', score:score, label:labels[0] || 'Kill', t:e.t, start:e.t - 7, end:e.t + 2.5, key:e.t,
          hero:e.a, other:e.b, title:who(k), desc:desc, day:Math.floor(e.t/cycle) + 1 });
      } else if(e.type === 'escape'){
        var a = S.cs[e.a], from = S.cs[e.b];
        var s2 = 1.2 + (e.hp < 0.1 ? 1.2 : 0.6) + (winners.indexOf(e.a) >= 0 ? 1.5 : 0);
        moments.push({ kind:'escape', score:s2, label:'Narrow escape', t:e.t, start:e.since - 3, end:e.t - 3, key:e.since + 1,
          hero:e.a, other:e.b, title:who(a), desc:'escaped ' + from.name + ' the ' + SP(from.sid).name + ' on ' + Math.max(1, Math.round(e.hp*100)) + '% health',
          day:Math.floor(e.t/cycle) + 1 });
      }
    });
    moments.forEach(function(m){ m.end = Math.max(m.end, m.key + 1.5); });
    moments.sort(function(x, y){ return y.score - x.score; });
    var picked = [];
    moments.forEach(function(m){
      if(picked.length >= 5) return;
      var overlaps = picked.some(function(p){
        var o = Math.min(p.end, m.end) - Math.max(p.start, m.start);
        return o > 0.5*Math.min(p.end - p.start, m.end - m.start);
      });
      if(!overlaps) picked.push(m);
    });
    return picked;
  }

  /* ----- awards ----- */
  function awards(S){
    var cs = S.cs, used = {}, out = [];
    function give(kind, ranked, why){
      var c = ranked.filter(function(x){ return !used[x.id]; })[0] || ranked[0];
      if(!c) return;
      used[c.id] = true;
      out.push({ kind:kind, who:c, why:why(c) });
    }
    function by(f){ return cs.slice().sort(function(a, b){ return f(b) - f(a); }); }
    var w = cs[S.winners[0]];
    if(w.stats.lowest < 0.25){
      used[w.id] = true;
      out.push({ kind:'Survived on fumes', who:w, why:'Dropped to ' + Math.max(1, Math.round(w.stats.lowest*100)) + '% health and still won' });
    }
    give('Apex predator', by(function(c){ return c.stats.kills*1000 + c.stats.dealt; }), function(c){ return c.stats.kills + (c.stats.kills === 1 ? ' kill' : ' kills') + ', ' + Math.round(c.stats.dealt) + ' damage dealt'; });
    give('Marathon', by(function(c){ return c.stats.distance; }), function(c){ return 'Covered ' + (c.stats.distance*UNIT_METRES/1000).toFixed(2) + ' km'; });
    give('Hit and run', by(function(c){ return c.stats.fleeTime; }), function(c){ return 'Spent ' + fmt(c.stats.fleeTime) + ' running away'; });
    give('Untouchable', by(function(c){ return c.stats.dodged; }), function(c){ return 'Dodged ' + c.stats.dodged + ' bites'; });
    give('Iron hide', by(function(c){ return c.stats.taken*(c.place <= 4 ? 1.3 : 1); }), function(c){ return 'Soaked up ' + Math.round(c.stats.taken) + ' damage'; });
    give('Glutton', by(function(c){ return c.stats.healed; }), function(c){ return 'Ate back ' + Math.round(c.stats.healed) + ' health'; });
    return out.slice(0, 6);
  }

  /* ----- recap, BrantSteele style ----- */
  function recap(S){
    var cycle = S.T/4.5, periods = {}, order = [];
    function key(t){
      var day = Math.floor(t/cycle) + 1, night = ((t % cycle)/cycle) > 0.62;
      var k = (night ? 'Night ' : 'Day ') + day;
      if(!periods[k]){ periods[k] = { name:k, lines:[], fallen:[] }; order.push(k); }
      return periods[k];
    }
    S.events.forEach(function(e){
      var p;
      if(e.type === 'kill'){
        p = key(e.t);
        var v = S.cs[e.b], k = e.a >= 0 ? S.cs[e.a] : null;
        var html = k
          ? '<b>' + esc(k.name) + '</b> (' + esc(SP(k.sid).name) + ') ' + esc(verbOf(e)) + ' <b>' + esc(v.name) + '</b> (' + esc(SP(v.sid).name) + ').'
          : '<b>' + esc(v.name) + '</b> (' + esc(SP(v.sid).name) + ') ' + esc(ALONE[e.cause] || 'fell') + '.';
        p.lines.push({ t:e.t, html:html, death:true });
        p.fallen.push(v);
      } else if(e.type === 'escape'){
        p = key(e.t);
        p.lines.push({ t:e.t, html:'<b>' + esc(S.cs[e.a].name) + '</b> escaped <b>' + esc(S.cs[e.b].name) + '</b> with ' + Math.max(1, Math.round(e.hp*100)) + '% health.' });
      } else if(e.type === 'feast'){
        key(e.t).lines.push({ t:e.t, html:'A feast was laid out ' + (S.hazard.kind === 'fire' ? 'at the centre of the ring.' : 'on the high ground.') });
      } else if(e.type === 'zone' && !e.final){
        key(e.t).lines.push({ t:e.t, html:S.hazard.kind === 'fire' ? 'The fire closed in.' : 'The water rose.' });
      } else if(e.type === 'special' && e.kind === 'constrict'){
        // holds show up through the kills they cause
      }
    });
    return order.map(function(k){ return periods[k]; });
  }

  /* ----- page ----- */
  function show(session){
    close();
    var S = session.state, opts = session.opts;
    L.Arena.showView('results');
    var host = doc.getElementById('arenaResultsView');
    var moments = findMoments(S, opts.odds);
    var winners = S.winners.map(function(id){ return S.cs[id]; });
    var w = winners[0];

    var facts = [
      { v:w.stats.kills, l:w.stats.kills === 1 ? 'kill' : 'kills' },
      { v:Math.round(w.stats.dealt), l:'damage dealt' },
      { v:Math.round(w.hp/w.maxHp*100) + '%', l:'health left' },
      { v:fmt(S.t), l:'match length' }
    ];
    if(opts.odds) facts.push({ v:pct(opts.odds.probs[w.id]), l:'pre-match odds' });
    facts.push({ v:formLabel(w.form), l:'form' });

    var v = session.verdict || { picked:false }, verdictHtml;
    if(!v.picked) verdictHtml = '<div class="verdict miss">No pick this time.</div>';
    else if(v.hit) verdictHtml = '<div class="verdict hit">You called it. +' + v.points + (v.points === 1 ? ' point' : ' points') +
      (v.p ? ' for backing a ' + pct(v.p) + ' shot' : '') + (v.streak > 1 ? ' · streak of ' + v.streak : '') + '</div>';
    else {
      var picked = S.cs.filter(function(c){ return c.name === v.name && c.sid === v.sid; })[0];
      verdictHtml = '<div class="verdict miss">You backed ' + esc(v.name) + (picked ? ', who finished ' + ordinal(picked.place) : '') + '. Streak reset.</div>';
    }

    var formNote = '';
    if(w.form < 0.93) formNote = '<div class="verdict miss">Won through an off day: form ' + formLabel(w.form) + '.</div>';
    else if(w.form > 1.12) formNote = '<div class="verdict miss">Rode the form of their life: ' + formLabel(w.form) + '.</div>';
    var aw = awards(S), rc = recap(S);
    var placed = S.cs.slice().sort(function(a, b){ return a.place - b.place || (b.deathT || 0) - (a.deathT || 0); });

    host.innerHTML =
      '<div class="stage" id="replayStage" hidden>' +
        '<canvas aria-label="Replay"></canvas><div class="tags"></div><div class="potg" hidden></div>' +
        '<div class="replay-badge"><span class="rec"></span><span data-badge>Replay</span></div>' +
        '<div class="slowmo" hidden>SLOW MOTION</div>' +
        '<button class="a-btn replay-skip" data-act="skip">Skip</button>' +
      '</div>' +
      '<div class="victory">' +
        '<div class="laurel">' + (S.pairs ? 'Last pair standing' : 'Victor') + '</div>' +
        '<h2>' + winners.map(function(c){ return esc(c.name); }).join(' &amp; ') + '</h2>' +
        '<div class="species">' + winners.map(function(c){ return esc(SP(c.sid).name); }).join(' &amp; ') + '</div>' +
        '<div class="facts">' + facts.map(function(f){ return '<div><b>' + f.v + '</b><span>' + f.l + '</span></div>'; }).join('') + '</div>' +
        verdictHtml + formNote +
      '</div>' +
      '<div class="results-actions">' +
        (moments.length ? '<button class="a-btn gold" data-act="potg">Play of the Game</button><button class="a-btn" data-act="reel">Highlight reel</button>' : '') +
        '<button class="a-btn" data-act="rematch">Rematch</button>' +
        '<button class="a-btn ghost" data-act="lobby">Back to the lobby</button>' +
      '</div>' +
      (moments.length ? '<div><div class="eyebrow" style="margin-bottom:10px">Highlights</div><div class="reel-list">' +
        moments.map(function(m, i){
          return '<button class="moment" data-moment="' + i + '"><span class="rank">' + (i === 0 ? 'Play of the Game' : '#' + (i + 1) + ' · ' + esc(m.label)) + '</span>' +
            '<span class="title">' + esc(m.title) + '</span><span class="meta">' + esc(m.desc) + ' · ' + fmt(m.t) + '</span></button>';
        }).join('') + '</div></div>' : '') +
      '<div class="two-col">' +
        '<div class="panel-a"><h3>Recap</h3>' + rc.map(function(p){
          return '<div class="recap-day"><h4>' + esc(p.name) + '</h4>' +
            (p.lines.length ? p.lines.map(function(l){
              return '<div class="recap-line"><span class="t">' + fmt(l.t) + '</span><span' + (l.death ? '' : ' class="muted"') + '>' + l.html + '</span></div>';
            }).join('') : '<div class="recap-line"><span class="muted">A quiet stretch.</span></div>') +
            (p.fallen.length ? '<div class="recap-line"><span class="t"></span><span class="cannon">' + p.fallen.length + (p.fallen.length === 1 ? ' cannon: ' : ' cannons: ') +
              p.fallen.map(function(c){ return esc(c.name); }).join(', ') + '</span></div>' : '') +
            '</div>';
        }).join('') + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:18px">' +
          '<div class="panel-a"><h3>Awards</h3><div class="awards">' + aw.map(function(a){
            return '<div class="award"><span class="kind">' + esc(a.kind) + '</span><span class="who" style="color:' + SP(a.who.sid).color + '">' + esc(a.who.name) + '</span>' +
              '<span class="why">' + esc(SP(a.who.sid).name) + ' · ' + esc(a.why) + '</span></div>';
          }).join('') + '</div></div>' +
          '<div class="panel-a"><h3>Placings</h3><div style="overflow-x:auto"><table class="placings"><thead><tr><th>#</th><th>Contestant</th><th>Kills</th><th>Form</th><th>Lasted</th><th>Fate</th></tr></thead><tbody>' +
            placed.map(function(c){
              var fate = c.place === 1 ? 'Victor' : c.killer >= 0 ? verbFate(c, S) : (ALONE[c.cause] || 'Fell');
              return '<tr class="' + (c.place === 1 ? 'win' : '') + '"><td class="n">' + ordinal(c.place) + '</td>' +
                '<td>' + esc(c.name) + '<br><span class="sp"><i style="background:' + SP(c.sid).color + '"></i>' + esc(SP(c.sid).name) + '</span></td>' +
                '<td>' + c.stats.kills + '</td><td>' + formLabel(c.form) + '</td><td>' + fmt(c.deathT != null ? c.deathT : S.t) + '</td><td>' + esc(fate) + '</td></tr>';
            }).join('') +
          '</tbody></table></div></div>' +
        '</div>' +
      '</div>';

    R = { session:session, host:host, moments:moments, stage:null, play:null, queue:[], reader:reader(session.recording, S) };
    host.addEventListener('click', onClick);
    doc.addEventListener('keydown', onKey);
    root.addEventListener('resize', onResize);

    if(moments.length){
      R.autoTimer = root.setTimeout(function(){ playSequence([0], true); }, 1600);
    }
  }

  function ordinal(n){ var s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function verbFate(c, S){
    var k = S.cs[c.killer];
    var e = S.events.filter(function(x){ return x.type === 'kill' && x.b === c.id; })[0];
    var verb = e ? verbOf(e) : 'killed';
    return (verb.charAt(0).toUpperCase() + verb.slice(1)).replace(/ (on|into)$/, '') + ' by ' + k.name;
  }

  /* ----- replay ----- */
  function ensureStage(){
    var S = R.session.state, wrap = R.host.querySelector('#replayStage');
    wrap.hidden = false;
    if(!R.stage){
      R.stage = L.ArenaStage3D.create({ canvas:wrap.querySelector('canvas'), tags:wrap.querySelector('.tags'), world:S, height:R.session.height });
      R.stage.camera.free = false;
    }
    R.stage.resize();
    return wrap;
  }

  function playSequence(indices, isPotg){
    if(!R || !indices.length) return;
    root.clearTimeout(R.autoTimer);
    stopPlay();
    R.queue = indices.slice();
    var wrap = ensureStage();
    wrap.scrollIntoView({ behavior:'smooth', block:'center' });
    if(L.ArenaAudio){ L.ArenaAudio.unlock(); }
    next(isPotg);
  }

  function next(isPotg){
    if(!R) return;
    var idx = R.queue.shift();
    if(idx == null){ finishPlay(); return; }
    var m = R.moments[idx], wrap = R.host.querySelector('#replayStage'), S = R.session.state;
    var start = clamp(m.start, R.reader.start, R.reader.end), end = clamp(m.end, R.reader.start, R.reader.end);
    var card = wrap.querySelector('.potg');
    card.hidden = false;
    card.innerHTML =
      '<div class="kicker">' + (idx === 0 ? 'Play of the Game' : '#' + (idx + 1) + ' · ' + esc(m.label)) + '</div>' +
      '<div class="bar"></div>' +
      '<div class="name">' + esc(S.cs[m.hero].name) + '</div>' +
      '<div class="desc">' + esc(SP(S.cs[m.hero].sid).name) + ' · ' + esc(m.desc) + '</div>';
    wrap.querySelector('[data-badge]').textContent = idx === 0 && isPotg ? 'Play of the Game' : 'Highlight ' + (idx + 1);
    if(idx === 0) audio('potg');
    var lastEvent = start;
    var titleUntil = root.performance.now() + 2600;

    R.play = { t:start, end:end, m:m, lastT:root.performance.now(), raf:0, shook:false };
    var tick = function(now){
      if(!R || !R.play) return;
      var p = R.play, dt = Math.min(0.1, (now - p.lastT)/1000);
      p.lastT = now;
      var slow = p.t > m.key - 1.1 && p.t < m.key + 0.7;
      wrap.querySelector('.slowmo').hidden = !slow;
      p.t += dt*(slow ? 0.3 : 1);
      if(now > titleUntil) card.hidden = true;

      replaySounds(lastEvent, p.t, m);
      lastEvent = p.t;
      if(!p.shook && p.t >= m.key){ p.shook = true; R.stage.camera.shake = 1.4; }

      var view = R.reader.view(p.t);
      var hero = view.cs[m.hero], other = view.cs[m.other];
      view.focusId = m.hero;
      view.targetId = other && other.alive ? m.other : null;
      var cx = hero.x, cy = hero.y, d = 24;
      if(other){
        var gap = Math.hypot(hero.x - other.x, hero.y - other.y);
        if(gap < 260){ cx = (hero.x + other.x)/2; cy = (hero.y + other.y)/2; d = clamp(gap*0.07 + 18, 18, 38); }
      }
      R.stage.camera.lookAt(cx, cy, d, 0.42);
      R.stage.camera.yaw += dt*(slow ? 0.35 : 0.12);
      R.stage.setView(view);
      R.stage.render(dt);

      if(p.t >= p.end){ R.play = null; root.setTimeout(function(){ next(isPotg); }, 500); return; }
      p.raf = root.requestAnimationFrame(tick);
    };
    R.play.raf = root.requestAnimationFrame(tick);
  }

  function replaySounds(from, to, m){
    var S = R.session.state;
    S.events.forEach(function(e){
      if(e.t <= from || e.t > to) return;
      var involved = e.a === m.hero || e.b === m.hero || e.a === m.other || e.b === m.other;
      if(!involved) return;
      if(e.type === 'hit') audio(e.tags.indexOf('crit') >= 0 ? 'crit' : 'hit', { power:0.8 });
      else if(e.type === 'kill') audio('cannon', { delay:0.1 });
      else if(e.type === 'special' && (e.kind === 'pounce' || e.kind === 'charge' || e.kind === 'dive')) audio('lunge');
      else if(e.type === 'special' && e.kind === 'howl') audio('howl');
    });
  }

  function stopPlay(){
    if(R && R.play){ root.cancelAnimationFrame(R.play.raf); R.play = null; }
  }
  function finishPlay(){
    if(!R) return;
    stopPlay();
    R.queue = [];
    var wrap = R.host.querySelector('#replayStage');
    wrap.querySelector('.potg').hidden = true;
    wrap.querySelector('.slowmo').hidden = true;
    wrap.hidden = true;
    R.host.querySelector('.victory').scrollIntoView({ behavior:'smooth', block:'start' });
  }

  /* ----- input and teardown ----- */
  function onClick(e){
    var b = e.target.closest('button');
    if(!b || !R) return;
    if(b.dataset.moment != null){ playSequence([+b.dataset.moment], false); return; }
    var act = b.dataset.act, opts = R.session.opts;
    if(act === 'potg') playSequence([0], true);
    else if(act === 'reel') playSequence(R.moments.map(function(_, i){ return i; }), false);
    else if(act === 'skip') finishPlay();
    else if(act === 'rematch'){
      close();
      L.ArenaMatch.start({ roster:opts.roster, settings:opts.settings, pick:opts.pick, odds:opts.odds, seed:(Math.random()*4294967296) >>> 0 });
    }
    else if(act === 'lobby'){ close(); L.Arena.showView('lobby'); }
  }
  function onKey(e){ if(R && R.play && e.key === 'Escape') finishPlay(); }
  function onResize(){ if(R && R.stage) R.stage.resize(); }

  function close(){
    if(!R) return;
    root.clearTimeout(R.autoTimer);
    stopPlay();
    R.host.removeEventListener('click', onClick);
    doc.removeEventListener('keydown', onKey);
    root.removeEventListener('resize', onResize);
    if(R.stage) R.stage.dispose();
    R = null;
  }

  L.ArenaResults = {
    show:show, close:close, findMoments:findMoments,
    /* Dev hook: draw one replay frame synchronously. index is into the highlights,
       offset is seconds from that highlight's key moment. */
    debugFrame:function(index, offset){
      if(!R || !R.moments[index]) return null;
      root.clearTimeout(R.autoTimer);
      var m = R.moments[index], wrap = ensureStage();
      var view = R.reader.view(clamp(m.key + (offset || 0), R.reader.start, R.reader.end));
      view.focusId = m.hero;
      view.targetId = view.cs[m.other] && view.cs[m.other].alive ? m.other : null;
      var hero = view.cs[m.hero];
      R.stage.camera.lookAt(hero.x, hero.y, 26, 0.42);
      R.stage.camera.cut();
      R.stage.setView(view);
      R.stage.render(0.016);
      return { title:m.title, label:m.label, desc:m.desc, t:m.key, stageShown:!wrap.hidden };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
