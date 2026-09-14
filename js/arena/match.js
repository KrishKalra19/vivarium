/* A live arena match. Runs the engine in real time, feeds the 3D stage, and narrates it:
   a director camera that finds the fight, a kill feed, banners, a slow-motion kill cam
   and sound. The engine records every frame as it goes, which is what the results
   screen replays. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};
  var doc = root.document;

  var HOW_TAG = { pounce:'pounced on', ambush:'ambushed', dive:'dove on', deathroll:'death-rolled', charge:'trampled', constrict:'crushed', crit:'savaged' };
  var HOW_CAUSE = { mauled:'mauled', fire:'drove into the fire', drowned:'drowned', venom:'poisoned', constricted:'crushed' };
  var ALONE_CAUSE = { fire:'burned', drowned:'drowned', venom:'succumbed to venom', constricted:'was crushed', mauled:'fell' };
  var STREAK = { 2:'Double kill', 3:'Triple kill', 4:'Rampage' };

  var M = null;

  function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t){ return a + (b - a)*t; }
  function angleLerp(a, b, t){ return a + Math.atan2(Math.sin(b - a), Math.cos(b - a))*t; }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(ch){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]; }); }
  function fmt(t){ var m = Math.floor(t/60), s = Math.floor(t%60); return m + ':' + (s < 10 ? '0' : '') + s; }
  function now(){ return root.performance.now(); }
  function SP(sid){ return L.ArenaSpecies[sid]; }
  function audio(name, opts){ if(L.ArenaAudio) L.ArenaAudio.play(name, opts); }

  function killVerb(e){
    for(var i=0; i<(e.tags || []).length; i++){ if(HOW_TAG[e.tags[i]]) return HOW_TAG[e.tags[i]]; }
    return HOW_CAUSE[e.cause] || 'killed';
  }

  /* ----- building the stage ----- */
  function build(host, opts){
    var rules = [opts.settings.balanced ? 'Balanced' : 'Open weight', opts.settings.length === 'epic' ? 'Epic' : 'Standard',
                 opts.settings.pairs ? 'Pairs' : 'Free-for-all'].join(' · ');
    host.innerHTML =
      '<div class="stage">' +
        '<canvas aria-label="Arena"></canvas>' +
        '<div class="tags"></div>' +
        '<div class="hud-top">' +
          '<div class="hud-chip">' +
            '<span class="alive"><b data-hud="alive">16</b> alive</span><span class="sep"></span>' +
            '<span class="phase" data-hud="phase">Day 1</span><span class="sep"></span>' +
            '<span class="hazard" data-hud="hazard"></span>' +
          '</div>' +
          '<div class="hud-chip"><span data-hud="clock">0:00</span><span class="sep"></span>' +
            '<button class="a-btn icon" data-act="mute" style="padding:2px 8px;font-size:13px"></button></div>' +
        '</div>' +
        '<div class="killfeed"></div>' +
        '<div class="banner" aria-live="polite"></div>' +
        '<div class="focus-card" hidden><i></i><div><div class="who"></div><div class="what"></div></div></div>' +
        '<div class="cam-bar"><div class="toggle" data-group="cam">' +
          '<button data-cam="director" class="on">Director</button><button data-cam="free">Free camera</button></div></div>' +
        '<div class="speed-bar"><div class="toggle" data-group="speed">' +
          '<button data-speed="1" class="on">1×</button><button data-speed="2">2×</button><button data-speed="4">4×</button><button data-speed="8">8×</button>' +
          '</div><button class="a-btn" data-act="pause">Pause</button></div>' +
      '</div>' +
      '<div class="stage-foot">' +
        '<div class="eyebrow">' + esc(rules) + '</div>' +
        '<div class="roster-actions"><button class="a-btn" data-act="skip">Skip to the result</button>' +
        '<button class="a-btn ghost" data-act="leave">Leave the arena</button></div>' +
      '</div>' +
      '<div class="strip"></div>';

    var q = function(sel){ return host.querySelector(sel); };
    return {
      host:host, stage:q('.stage'), canvas:q('canvas'), tags:q('.tags'), feed:q('.killfeed'), banner:q('.banner'),
      focus:q('.focus-card'), strip:q('.strip'),
      alive:q('[data-hud="alive"]'), phase:q('[data-hud="phase"]'), hazard:q('[data-hud="hazard"]'), clock:q('[data-hud="clock"]'),
      mute:q('[data-act="mute"]'), pause:q('[data-act="pause"]')
    };
  }

  /* ----- start ----- */
  function start(opts){
    stop();
    var E = L.ArenaEngine;
    var match = E.create({ roster:opts.roster, seed:opts.seed, balanced:opts.settings.balanced,
      length:opts.settings.length, pairs:opts.settings.pairs, hazard:opts.settings.hazard, record:true });
    var S = match.state;

    L.Arena.showView('stage');
    var host = doc.getElementById('arenaStageView');
    var el = build(host, opts);

    var stage = L.ArenaStage3D.create({ canvas:el.canvas, tags:el.tags, world:S, height:match.height });

    M = {
      opts:opts, match:match, S:S, el:el, stage:stage,
      prev:S.cs.map(function(c){ return { x:c.x, y:c.y, yaw:c.yaw, alt:c.alt }; }),
      acc:0, lastT:now(), speed:1, paused:false, running:true, raf:0,
      evIdx:0, heat:new Array(S.cs.length).fill(0),
      camMode:'director', focus:null, holdUntil:0, slowUntil:0,
      bannerQueue:[], bannerUntil:0, countdown:-1, endAt:0, finished:false, hudT:0,
      verdict:null
    };

    stage.bindInput(function(kind, e){
      if(kind === 'click'){
        var id = stage.pick(e.clientX, e.clientY);
        if(id != null){ M.focus = id; setCam('follow'); }
      } else {
        setCam('free');
      }
    });
    host.addEventListener('click', onClick);
    root.addEventListener('resize', onResize);
    doc.addEventListener('keydown', onKey);

    renderStrip(true);
    el.mute.textContent = L.ArenaAudio && L.ArenaAudio.isMuted() ? 'Muted' : 'Sound on';
    el.hazard.textContent = S.hazard.kind === 'fire' ? 'Wildfire' : 'Flood';
    el.hazard.classList.toggle('flood', S.hazard.kind === 'flood');
    if(L.ArenaAudio) L.ArenaAudio.startAmbience();
    stage.camera.overview();
    M.raf = root.requestAnimationFrame(loop);
  }

  function stop(){
    if(!M) return;
    M.running = false;
    root.cancelAnimationFrame(M.raf);
    root.removeEventListener('resize', onResize);
    doc.removeEventListener('keydown', onKey);
    M.el.host.removeEventListener('click', onClick);
    M.stage.dispose();
    if(L.ArenaAudio) L.ArenaAudio.stopAmbience();
    M = null;
  }

  /* ----- the loop ----- */
  function loop(t){
    if(!M || !M.running) return;
    var dt = Math.min(0.1, (t - M.lastT)/1000);
    M.lastT = t;
    var E = L.ArenaEngine, S = M.S;

    if(!M.paused && !S.ended){
      var slow = t < M.slowUntil ? 0.3 : 1;
      M.acc += dt*M.speed*slow;
      var steps = 0;
      while(M.acc >= E.DT && steps < 24 && !S.ended){
        for(var i=0; i<S.cs.length; i++){ var c = S.cs[i], p = M.prev[i]; p.x = c.x; p.y = c.y; p.yaw = c.yaw; p.alt = c.alt; }
        M.match.step();
        M.acc -= E.DT;
        steps++;
        processEvents(true);
      }
    }
    countdown();
    director(dt);
    M.stage.setView(buildView(clamp(M.acc/E.DT, 0, 1)));
    M.stage.render(dt);
    M.heat = M.heat.map(function(h){ return Math.max(0, h - dt*0.6); });

    M.hudT += dt;
    if(M.hudT > 0.2){ M.hudT = 0; renderHud(); renderStrip(false); renderFocus(); }
    pumpBanner(t);
    if(S.ended) endSequence(t);
    M.raf = root.requestAnimationFrame(loop);
  }

  function buildView(alpha){
    var S = M.S;
    var focus = M.focus != null ? S.cs[M.focus] : null;
    return {
      t:S.t, night:S.night, hazard:S.hazard,
      feast:S.feast && S.feast.active ? S.feast : null,
      bushes:S.bushes.map(function(b){ return b.food; }),
      focusId:M.focus, targetId:focus && focus.alive && focus.target && focus.target.alive ? focus.target.id : null,
      tags:true,
      cs:S.cs.map(function(c, i){
        var p = M.prev[i];
        return {
          id:c.id, sid:c.sid, name:c.name, alive:c.alive,
          x:lerp(p.x, c.x, alpha), y:lerp(p.y, c.y, alpha), yaw:angleLerp(p.yaw, c.yaw, alpha), alt:lerp(p.alt, c.alt, alpha),
          hp:c.alive ? c.hp/c.maxHp : 0, stealth:c.stealth,
          anim:c.anim + Math.min(0.99, Math.max(0, S.t - c.animT)),
          pinned:!!c.pinnedBy
        };
      })
    };
  }

  /* ----- narration ----- */
  function processEvents(live){
    var S = M.S, ev = S.events;
    for(; M.evIdx < ev.length; M.evIdx++){
      var e = ev[M.evIdx];
      switch(e.type){
        case 'hit': {
          var victim = S.cs[e.b], share = e.dmg/Math.max(1, victim.maxHp);
          M.heat[e.a] += share*3; M.heat[e.b] += share*3;
          if(live && (e.a === M.focus || e.b === M.focus)){
            audio(e.tags.indexOf('crit') >= 0 ? 'crit' : 'hit', { power:clamp(share*4, 0.2, 1), pan:pan(victim) });
            if(share > 0.18) M.stage.camera.shake = Math.max(M.stage.camera.shake, 0.7);
          }
          break;
        }
        case 'special':
          if(!live) break;
          if(e.kind === 'howl' && near(S.cs[e.a])) audio('howl', { pan:pan(S.cs[e.a]) });
          else if((e.kind === 'pounce' || e.kind === 'charge' || e.kind === 'dive') && (e.a === M.focus || e.b === M.focus)) audio('lunge', { pan:pan(S.cs[e.a]) });
          break;
        case 'kill':
          onKill(e, live);
          break;
        case 'zone':
          if(!live) break;
          if(e.final) banner('Sudden death', 'The arena will not wait', 'blood');
          else banner(e.kind === 'fire' ? 'The fire closes in' : 'The water rises', e.kind === 'fire' ? 'Get inside the ring' : 'Find high ground', '');
          audio('zone');
          break;
        case 'feast':
          if(!live) break;
          banner('Feast', M.S.hazard.kind === 'fire' ? 'Food at the centre of the ring' : 'Food on the high ground', 'gold');
          audio('feast');
          break;
        case 'night':
          if(live){ banner('Night ' + e.day, 'Nocturnal hunters see further', ''); if(L.ArenaAudio) L.ArenaAudio.setNight(true); }
          break;
        case 'day':
          if(live && e.day > 1){ banner('Day ' + e.day, '', ''); if(L.ArenaAudio) L.ArenaAudio.setNight(false); }
          break;
      }
    }
  }

  function onKill(e, live){
    var S = M.S, victim = S.cs[e.b], killer = e.a >= 0 ? S.cs[e.a] : null;
    addFeed(e, killer, victim);
    if(!live) return;
    audio('cannon', { delay:0.15, pan:pan(victim) });
    M.heat[e.b] += 2;
    if(killer) M.heat[e.a] += 2;
    var big = e.first || e.streak >= 2 || e.left <= 3 || e.b === M.focus || e.a === M.focus;
    if(big){
      M.slowUntil = now() + 900;
      M.stage.camera.shake = Math.max(M.stage.camera.shake, 1.1);
      if(e.a === M.focus || e.b === M.focus || e.first || e.streak >= 2){ M.focus = killer ? killer.id : M.focus; M.holdUntil = now() + 2600; }
    }
    if(e.first) banner('First blood', killer ? killer.name + ' draws it' : victim.name + ' is the first to fall', 'blood');
    else if(e.streak >= 2) banner(STREAK[Math.min(4, e.streak)], killer ? killer.name + ' the ' + SP(killer.sid).name : '', 'blood');
    if(e.left === 3 && !S.pairs) banner('Final three', '', 'gold');
    else if(e.left === 2 && !S.pairs) banner('Final two', 'One more to go', 'gold');
  }

  function addFeed(e, killer, victim){
    var html;
    if(killer){
      html = '<i style="background:' + SP(killer.sid).color + '"></i><span>' + esc(killer.name) + '</span>' +
        '<span class="how">' + esc(killVerb(e)) + '</span>' +
        '<i style="background:' + SP(victim.sid).color + '"></i><span class="victim">' + esc(victim.name) + '</span>';
    } else {
      html = '<i style="background:' + SP(victim.sid).color + '"></i><span class="victim">' + esc(victim.name) + '</span>' +
        '<span class="how">' + esc(ALONE_CAUSE[e.cause] || 'fell') + '</span>';
    }
    var row = doc.createElement('div');
    row.className = 'kill';
    row.innerHTML = html;
    M.el.feed.prepend(row);
    while(M.el.feed.children.length > 6) M.el.feed.lastChild.remove();
    root.setTimeout(function(){ row.classList.add('fade'); }, 8000);
    root.setTimeout(function(){ row.remove(); }, 8700);
  }

  function banner(big, small, tone){ M.bannerQueue.push({ big:big, small:small, tone:tone }); }
  function pumpBanner(t){
    if(!M.bannerQueue.length || t < M.bannerUntil) return;
    var b = M.bannerQueue.shift(), el = M.el.banner;
    el.classList.remove('show');
    void el.offsetWidth;   // restart the CSS animation
    el.innerHTML = '<div class="big ' + (b.tone || '') + '">' + esc(b.big) + '</div>' + (b.small ? '<div class="small">' + esc(b.small) + '</div>' : '');
    el.classList.add('show');
    M.bannerUntil = t + 2000;
  }

  function countdown(){
    var S = M.S, phase = S.t < 0.8 ? 3 : S.t < 1.6 ? 2 : S.t < 2.5 ? 1 : 0;
    if(phase === M.countdown || S.ended) return;
    M.countdown = phase;
    if(phase > 0){ banner(String(phase), phase === 3 ? 'The gates open' : '', 'gold'); audio('countdown'); }
    else { banner('Begin', 'Sixteen enter. One survives.', 'gold'); audio('go'); }
  }

  function pan(c){ return M.stage.screenX(c.x, c.y)*0.8; }
  function near(c){ var f = M.focus != null ? M.S.cs[M.focus] : null; return f && Math.hypot(f.x - c.x, f.y - c.y) < 220; }

  /* ----- director: put the camera where the fight is ----- */
  function director(dt){
    var S = M.S, t = now(), cam = M.stage.camera;
    if(M.camMode === 'free') return;
    var focus = M.focus != null ? S.cs[M.focus] : null;
    if(M.camMode === 'director' && (t > M.holdUntil || !focus || !focus.alive)){
      var best = null, bestScore = 0.25;
      S.cs.forEach(function(c, i){
        if(!c.alive) return;
        var s = M.heat[i];
        if(c.intent === 'hunt' && c.target && c.target.alive && Math.hypot(c.x - c.target.x, c.y - c.target.y) < 140) s += 0.6;
        if(c.stealth > 0.7) s += 0.2;
        if(c.hp < c.maxHp*0.3) s += 0.3;
        if(c === focus) s *= 1.35;
        if(s > bestScore){ bestScore = s; best = c; }
      });
      if(best && best !== focus){ M.focus = best.id; M.holdUntil = t + 3500; focus = best; }
      else if(!best && (!focus || !focus.alive)){ M.focus = null; focus = null; }
    }
    if(focus && focus.alive){
      var tx = focus.x, ty = focus.y, d = 30;
      var tg = focus.target;
      if(tg && tg.alive && Math.hypot(focus.x - tg.x, focus.y - tg.y) < 220){
        tx = (focus.x + tg.x)/2; ty = (focus.y + tg.y)/2;
        d = clamp(Math.hypot(focus.x - tg.x, focus.y - tg.y)*0.08 + 20, 20, 44);
      }
      cam.lookAt(tx, ty, d, 0.52);
    } else {
      var alive = S.cs.filter(function(c){ return c.alive; }), cx = 0, cy = 0, spread = 0;
      alive.forEach(function(c){ cx += c.x; cy += c.y; });
      if(alive.length){ cx /= alive.length; cy /= alive.length; }
      alive.forEach(function(c){ spread = Math.max(spread, Math.hypot(c.x - cx, c.y - cy)); });
      cam.lookAt(cx, cy, clamp(spread*0.16 + 40, 50, 118), 0.78);
    }
  }

  function setCam(mode){
    if(!M) return;
    M.camMode = mode;
    M.stage.camera.free = mode === 'free';
    M.el.host.querySelectorAll('[data-cam]').forEach(function(b){
      b.classList.toggle('on', b.dataset.cam === mode || (mode === 'follow' && b.dataset.cam === 'director' && false));
    });
    if(mode === 'director') M.holdUntil = 0;
  }

  /* ----- HUD ----- */
  function renderHud(){
    var S = M.S, alive = S.cs.filter(function(c){ return c.alive; }).length;
    M.el.alive.textContent = alive;
    M.el.phase.textContent = (S.night ? 'Night ' : 'Day ') + S.day;
    M.el.clock.textContent = fmt(S.t);
    var hz = S.hazard;
    M.el.hazard.textContent = hz.kind === 'fire' ? (hz.shrinking ? 'Fire closing' : 'Wildfire') : (hz.rising ? 'Water rising' : 'Flood');
  }

  function intentLine(c){
    var S = M.S;
    if(!c.alive){
      var k = c.killer >= 0 ? S.cs[c.killer] : null;
      return { text:k ? 'Killed by ' + k.name : (ALONE_CAUSE[c.cause] || 'Fell'), hot:true };
    }
    if(c.pinnedBy) return { text:'Caught in ' + c.pinnedBy.name + '\'s coils', hot:true };
    if(c.holding) return { text:'Crushing ' + c.holding.name, hot:true };
    if(c.intent === 'hunt' && c.target) return { text:'Hunting ' + c.target.name + ' the ' + SP(c.target.sid).name, hot:true };
    if(c.intent === 'flee' && c.threat) return { text:'Fleeing ' + c.threat.name, hot:true };
    if(c.intent === 'hazard') return { text:S.hazard.kind === 'fire' ? 'Running from the fire' : 'Climbing out of the water', hot:false };
    if(c.intent === 'lurk') return { text:c.stealth > 0.7 ? 'Hidden, waiting to strike' : 'Settling into cover', hot:false };
    if(c.intent === 'feast') return { text:'Heading for the feast', hot:false };
    if(c.intent === 'forage') return { text:'Eating to recover', hot:false };
    return { text:'Prowling', hot:false };
  }

  function renderFocus(){
    var card = M.el.focus, c = M.focus != null ? M.S.cs[M.focus] : null;
    if(!c){ card.hidden = true; return; }
    card.hidden = false;
    card.querySelector('i').style.background = SP(c.sid).color;
    card.querySelector('.who').textContent = c.name + ' · ' + SP(c.sid).name;
    var line = intentLine(c), w = card.querySelector('.what');
    w.textContent = line.text + (c.alive ? ' · ' + Math.round(c.hp/c.maxHp*100) + '% health' : '');
    w.classList.toggle('hot', line.hot);
  }

  function renderStrip(full){
    var S = M.S, pick = M.opts.pick;
    if(full){
      M.el.strip.innerHTML = S.cs.map(function(c){
        var mine = pick && (pick.index === c.id || (S.pairs && Math.floor(pick.index/2) === c.team));
        return '<button class="chip-t' + (mine ? ' mine' : '') + '" data-id="' + c.id + '">' +
          '<span class="nm">' + esc(c.name) + '</span>' +
          '<span class="row"><span><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + SP(c.sid).color + '"></i> ' +
          esc(L.Arena.roman(c.id)) + '</span><b></b></span>' +
          '<span class="hp"><i></i></span></button>';
      }).join('');
    }
    Array.prototype.forEach.call(M.el.strip.children, function(node, i){
      var c = S.cs[i];
      node.classList.toggle('dead', !c.alive);
      node.classList.toggle('on', M.focus === i);
      node.querySelector('.hp i').style.width = (c.alive ? Math.round(c.hp/c.maxHp*100) : 0) + '%';
      node.querySelector('b').textContent = c.stats.kills ? c.stats.kills + (c.stats.kills === 1 ? ' kill' : ' kills') : '';
    });
  }

  /* ----- input ----- */
  function onClick(e){
    var b = e.target.closest('button');
    if(!b || !M) return;
    if(b.dataset.cam){ setCam(b.dataset.cam); return; }
    if(b.dataset.speed){
      M.speed = +b.dataset.speed;
      M.el.host.querySelectorAll('[data-speed]').forEach(function(x){ x.classList.toggle('on', x === b); });
      return;
    }
    if(b.dataset.id){ M.focus = +b.dataset.id; setCam('follow'); return; }
    var act = b.dataset.act;
    if(act === 'pause') togglePause();
    else if(act === 'mute'){
      var muted = !L.ArenaAudio.isMuted();
      L.ArenaAudio.setMuted(muted);
      if(!muted) L.ArenaAudio.startAmbience();
      b.textContent = muted ? 'Muted' : 'Sound on';
    }
    else if(act === 'skip') skip();
    else if(act === 'leave'){ stop(); L.Arena.showView('lobby'); }
  }
  function onKey(e){
    if(!M || e.target.matches && e.target.matches('input, select, textarea')) return;
    if(e.code === 'Space'){ e.preventDefault(); togglePause(); }
  }
  function onResize(){ if(M) M.stage.resize(); }
  function togglePause(){
    if(!M || M.S.ended) return;
    M.paused = !M.paused;
    M.el.pause.textContent = M.paused ? 'Resume' : 'Pause';
  }

  function skip(){
    if(!M || M.S.ended) return;
    M.match.runToEnd();
    processEvents(false);
    M.endAt = now() - 10000;   // go straight to the results
  }

  /* ----- the end ----- */
  function endSequence(t){
    if(M.finished) return;
    var S = M.S;
    if(!M.endAt){
      M.endAt = t;
      M.slowUntil = t + 1800;
      var w = S.cs[S.winners[0]];
      M.focus = w.id;
      M.holdUntil = t + 99999;
      banner(S.pairs ? 'Last pair standing' : 'Victor', S.winners.map(function(id){ return S.cs[id].name; }).join(' & ') + ' the ' + SP(w.sid).name, 'gold');
      audio('victory', { delay:0.3 });
    }
    scorePrediction();
    if(t - M.endAt < 3400) return;
    M.finished = true;
    var session = { opts:M.opts, state:S, recording:M.match.recording, height:M.match.height, verdict:M.verdict };
    stop();
    if(L.ArenaResults) L.ArenaResults.show(session);
    else L.Arena.showView('lobby');
  }

  function scorePrediction(){
    if(M.verdict) return;
    var S = M.S, pick = M.opts.pick, rec = L.Arena.record();
    rec.played++;
    var verdict = { picked:!!pick };
    if(pick){
      var hit = S.winners.indexOf(pick.index) >= 0;
      var points = hit ? Math.max(1, Math.round(pick.p ? 1/pick.p : 1)) : 0;
      rec.picks++;
      if(hit){ rec.hits++; rec.streak++; rec.points += points; } else rec.streak = 0;
      rec.best = Math.max(rec.best, rec.streak);
      var c = S.cs[pick.index];
      if(hit && pick.p && (!rec.upset || pick.p < rec.upset.p)){
        rec.upset = { name:c.name, sid:c.sid, p:pick.p, pct:(pick.p < 0.01 ? '<1' : Math.round(pick.p*100)) + '%' };
      }
      verdict = { picked:true, hit:hit, points:points, name:c.name, sid:c.sid, p:pick.p, streak:rec.streak };
    }
    L.Arena.saveRecord(rec);
    M.verdict = verdict;
  }

  L.ArenaMatch = {
    start:start,
    /* Dev hooks: advance and finish a match synchronously, for testing in a background tab
       where the browser pauses animation frames. */
    advance:function(seconds){
      if(!M) return null;
      var E = L.ArenaEngine, S = M.S, steps = Math.round(seconds/E.DT);
      for(var n=0; n<steps && !S.ended; n++){
        for(var i=0; i<S.cs.length; i++){ var c = S.cs[i], p = M.prev[i]; p.x = c.x; p.y = c.y; p.yaw = c.yaw; p.alt = c.alt; }
        M.match.step();
        processEvents(true);
      }
      director(0.05);
      M.stage.setView(buildView(1));
      M.stage.render(0.05);
      renderHud(); renderStrip(false); renderFocus(); pumpBanner(now() + 1e6);
      return { t:+S.t.toFixed(1), alive:S.cs.filter(function(c){ return c.alive; }).length, ended:S.ended, focus:M.focus };
    },
    finishNow:function(){
      if(!M) return false;
      if(!M.S.ended) skip();
      M.endAt = 1;
      endSequence(1e9);
      return true;
    },
    setActive:function(on){
      if(!M) return;
      if(!on){ M.wasPaused = M.paused; M.paused = true; if(L.ArenaAudio) L.ArenaAudio.stopAmbience(); }
      else { M.paused = !!M.wasPaused; M.lastT = now(); M.stage.resize(); if(L.ArenaAudio) L.ArenaAudio.startAmbience(); }
    },
    stop:stop,
    current:function(){ return M; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
