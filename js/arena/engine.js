/* Arena match engine: sixteen named animals, one closing arena, one winner.

   Pure simulation: no DOM, no rendering and no Math.random. A seed, a roster and the
   settings always produce the same match, which is what pre-match odds, replays and
   share links rely on. Loads in the browser or in Node. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};

  var DT = 0.05;
  var ARENA_R = 520;
  var START_FREEZE = 2.5;
  var LENGTHS = { standard:340, epic:850 };
  var ANIM = { idle:0, move:1, attack:2, special:3, hurt:4 };
  var FRAME_EVERY = 2;   // record every other step: 10 frames a second
  var PER = 8;           // floats per contestant per recorded frame
  var GLOBAL = 6;        // floats per frame: time, hazard (3), night, feast

  var DPS_FACTOR = { pounce:1.25, ambush:1.3, venom:1.4, charge:1.15, frenzy:1.2, dive:1.3, deathroll:1.25, constrict:1.25 };
  var SURVIVE_FACTOR = { flight:1.35, nimble:1.1, climber:1.05 };

  function mulberry32(seed){
    var a = seed >>> 0;
    return function(){
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }
  function hasAb(sp, ab){ return sp.abilities.indexOf(ab) >= 0; }

  // Health and bite damage both grow with body mass, but gently enough that a big animal
  // is favoured rather than guaranteed. DMG_SCALE sets how many bites a fight takes.
  var DMG_SCALE = 0.33;
  function rawStats(sp){
    return { hp: 16*Math.pow(sp.mass, 0.5), dmg: DMG_SCALE*4*Math.pow(sp.mass, 0.38)*sp.bite };
  }
  function dpsBonusOf(sp){
    var k = 1;
    sp.abilities.forEach(function(ab){ if(DPS_FACTOR[ab]) k *= DPS_FACTOR[ab]; });
    return k;
  }
  // Effective health times damage per second, with abilities folded in. Dodge is only
  // half-counted: venom, holds, charge stuns and exhaustion all get around it.
  function powerOf(sp){
    var s = rawStats(sp);
    var eff = s.hp/((1 - sp.armor)*(1 - sp.dodge*0.45));
    sp.abilities.forEach(function(ab){ if(SURVIVE_FACTOR[ab]) eff *= SURVIVE_FACTOR[ab]; });
    return eff * (s.dmg/sp.cd) * dpsBonusOf(sp);
  }

  function createMatch(opts){
    var SPECIES = L.ArenaSpecies, TUNE = L.ArenaTuning || {};
    var seed = (opts.seed == null ? 1 : opts.seed) >>> 0;
    var rng = mulberry32(seed);
    // A duel is a calibration fixture: two animals close together, no hazard, no night.
    var T = opts.duel ? 3000 : (LENGTHS[opts.length] || LENGTHS.standard);
    var n = opts.roster.length;

    var S = {
      seed:seed, T:T, t:0, step:0, length:opts.length || 'standard',
      balanced:opts.balanced !== false, pairs:!!opts.pairs, duel:!!opts.duel,
      hazard:null, feast:null, feasts:[], bushes:[], trees:[], hills:[],
      peak:null, peakH:0, minH:0,
      cs:[], events:[], ended:false, winners:[], endReason:null,
      night:false, day:1, killsSoFar:0
    };

    /* ----- terrain: gentle hills, the same function the renderer draws ----- */
    for(var h=0; h<6; h++){
      var wl = 320 + rng()*650, th = rng()*Math.PI;
      S.hills.push({ kx:Math.cos(th)*2*Math.PI/wl, ky:Math.sin(th)*2*Math.PI/wl, ph:rng()*6.283, amp:0.6 + rng()*0.9 });
    }
    function height(x, y){
      var v = 0;
      for(var i=0; i<S.hills.length; i++){ var q = S.hills[i]; v += q.amp*Math.sin(x*q.kx + y*q.ky + q.ph); }
      return v;
    }
    (function surveyTerrain(){
      var best = -1e9, low = 1e9, bx = 0, by = 0;
      for(var gy=-24; gy<=24; gy++){
        for(var gx=-24; gx<=24; gx++){
          var x = gx*ARENA_R/24, y = gy*ARENA_R/24;
          if(x*x + y*y > ARENA_R*ARENA_R*0.72) continue;
          var v = height(x, y);
          if(v > best){ best = v; bx = x; by = y; }
          if(v < low) low = v;
        }
      }
      S.peak = { x:bx, y:by }; S.peakH = best; S.minH = low;
    })();

    function randomInArena(frac){
      var a = rng()*6.283, d = Math.sqrt(rng())*ARENA_R*frac;
      return { x:Math.cos(a)*d, y:Math.sin(a)*d };
    }
    for(var tr=0; tr<46; tr++) S.trees.push(randomInArena(0.93));
    for(var tries=0; S.bushes.length<12 && tries<400; tries++){
      var p = randomInArena(0.85), ok = true;
      for(var bi=0; bi<S.bushes.length; bi++){
        if(Math.hypot(p.x - S.bushes[bi].x, p.y - S.bushes[bi].y) < 110){ ok = false; break; }
      }
      if(ok) S.bushes.push({ x:p.x, y:p.y, food:1 });
    }

    /* ----- the closing hazard ----- */
    var kind = (opts.hazard === 'fire' || opts.hazard === 'flood') ? opts.hazard : (rng() < 0.5 ? 'fire' : 'flood');
    if(kind === 'fire'){
      var keys = [{ t:0, cx:0, cy:0, r:ARENA_R }], cx = 0, cy = 0, r = ARENA_R;
      // [hold until, shrink finished by, new radius as a fraction of the arena]
      [[0.14,0.26,0.66], [0.36,0.48,0.42], [0.56,0.66,0.24], [0.72,0.82,0.11]].forEach(function(st){
        keys.push({ t:st[0]*T, cx:cx, cy:cy, r:r });
        var nr = st[2]*ARENA_R, ang = rng()*6.283, off = rng()*(r - nr)*0.8;
        cx += Math.cos(ang)*off; cy += Math.sin(ang)*off; r = nr;
        keys.push({ t:st[1]*T, cx:cx, cy:cy, r:r });
      });
      keys.push({ t:1.12*T, cx:cx, cy:cy, r:0 });
      S.hazard = { kind:'fire', keys:keys, stage:0, cx:0, cy:0, r:ARENA_R, nextR:ARENA_R, shrinking:false };
    } else {
      S.hazard = { kind:'flood', stage:0, level:S.minH - 0.5, rising:false,
        keys:[ { t:0, level:S.minH - 0.5 }, { t:0.14*T, level:S.minH - 0.5 },
               { t:0.82*T, level:S.peakH - 0.9 }, { t:1.12*T, level:S.peakH + 1.5 } ] };
    }
    S.feastTimes = S.length === 'epic' ? [0.25, 0.5, 0.75] : [0.38, 0.66];
    if(S.duel){
      S.hazard = { kind:'fire', keys:[{ t:0, cx:0, cy:0, r:ARENA_R }, { t:1e9, cx:0, cy:0, r:ARENA_R }],
                   stage:0, cx:0, cy:0, r:ARENA_R, nextR:ARENA_R, shrinking:false };
      S.feastTimes = [];
    }

    /* ----- contestants ----- */
    // Balanced mode flattens the stats a matchup hides (speed, dodge, reach, armour, sense),
    // pulling every species most of the way to the average. Abilities, size and temperament stay.
    var MEAN = (function(){
      var ids = Object.keys(SPECIES), m = { speed:0, dodge:0, reach:0, sense:0, armor:0 };
      ids.forEach(function(id){ Object.keys(m).forEach(function(k){ m[k] += SPECIES[id][k]; }); });
      Object.keys(m).forEach(function(k){ m[k] /= ids.length; });
      return m;
    })();
    function effective(sp){
      if(!S.balanced) return sp;
      var e = Object.assign({}, sp);
      e.speed = sp.speed + (MEAN.speed - sp.speed)*0.6;
      e.dodge = sp.dodge + (MEAN.dodge - sp.dodge)*0.6;
      e.reach = sp.reach + (MEAN.reach - sp.reach)*0.5;
      e.sense = sp.sense + (MEAN.sense - sp.sense)*0.5;
      e.armor = sp.armor + (MEAN.armor - sp.armor)*0.6;
      return e;
    }
    var target = 1;
    (function balanceTarget(){
      var ids = Object.keys(SPECIES), logSum = 0;
      ids.forEach(function(id){ logSum += Math.log(powerOf(effective(SPECIES[id]))); });
      target = Math.exp(logSum/ids.length);
    })();

    opts.roster.forEach(function(entry, i){
      var sp = SPECIES[entry.sid];
      if(!sp) throw new Error('Unknown arena species: ' + entry.sid);
      var ef = effective(sp);
      var base = rawStats(ef);
      var k = S.balanced ? Math.sqrt(target/powerOf(ef)) * (TUNE[entry.sid] || 1) : 1;
      // Form: a hidden good or bad day, about 20% either way. Without it the stronger animal wins
      // so reliably that small edges become lopsided win rates and upsets almost never happen.
      var form = 1;
      if(!S.duel){
        var u1 = Math.max(1e-6, rng()), u2 = rng();
        form = clamp(Math.exp(0.2*Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2)), 0.7, 1.4);
      }
      k *= form;
      var ang = (i/n)*Math.PI*2, rad = S.duel ? 70 : ARENA_R*0.86;
      S.cs.push({
        id:i, sid:entry.sid, name:entry.name || sp.name, sp:sp, team: S.pairs ? Math.floor(i/2) : i,
        x:Math.cos(ang)*rad, y:Math.sin(ang)*rad, vx:0, vy:0, yaw:Math.atan2(-Math.sin(ang), -Math.cos(ang)),
        r:3*Math.pow(sp.mass, 1/3),
        maxHp:base.hp*k, hp:base.hp*k, dmg:base.dmg*k, cd:sp.cd, reach:ef.reach,
        armor:ef.armor, dodge:ef.dodge, speed:ef.speed, sense:ef.sense, dpsBonus:dpsBonusOf(sp), power:k, form:form,
        stamina:100, sprinting:false, atkT:rng()*0.5, specT:2 + rng()*2, decideT:rng()*0.3,
        intent:'roam', target:null, threat:null, wander:null, wanderT:0, hz:{ urgency:0, x:0, y:0 },
        stealth:0, stillTime:0, alt:hasAb(sp, 'flight') ? 1 : 0, diving:false, diveStart:0, climbUntil:0, landed:false,
        dashUntil:0, dashKind:null, dashX:0, dashY:0, stunUntil:0, pinnedBy:null, pinUntil:0, holding:null,
        venom:null, howledUntil:0, engagedWith:null, lastHitBy:null, lastHitT:-99, damagers:[],
        anim:ANIM.idle, animT:0, alive:true, place:0, deathT:null, deathDay:null, killer:-1, cause:null, kills:[],
        brush:null,
        stats:{ dealt:0, taken:0, kills:0, landed:0, missed:0, dodged:0, distance:0, fleeTime:0, healed:0, lowest:1, specials:0 }
      });
    });

    /* ----- recording ----- */
    var stride = GLOBAL + PER*n;
    var rec = opts.record ? { stride:stride, n:n, per:PER, global:GLOBAL, frameDt:DT*FRAME_EVERY, frames:0, data:new Float32Array(stride*512) } : null;

    /* ----- helpers ----- */
    function has(c, ab){ return hasAb(c.sp, ab); }
    function dist(a, b){ return Math.hypot(a.x - b.x, a.y - b.y); }
    function swims(c){ return c.sp.swim; }
    function event(e){ e.t = +S.t.toFixed(2); S.events.push(e); return e; }
    function aliveList(){ return S.cs.filter(function(c){ return c.alive; }); }
    function partnerOf(c){
      if(!S.pairs) return null;
      for(var i=0; i<S.cs.length; i++){ var o = S.cs[i]; if(o !== c && o.team === c.team) return o; }
      return null;
    }
    function isEnemy(a, b){ return a !== b && b.alive && !(S.pairs && a.team === b.team); }
    function nearTree(c){
      for(var i=0; i<S.trees.length; i++){ if(Math.hypot(c.x - S.trees[i].x, c.y - S.trees[i].y) < 28) return true; }
      return false;
    }
    function senseOf(c){ return c.sense * (S.night && !c.sp.nocturnal ? 0.65 : 1); }
    function canSee(c, o){
      if(S.duel) return true;
      var eff = senseOf(c)*(1 - 0.45*o.stealth);
      if(o.alt > 0.5) eff *= 1.2;
      return dist(c, o) <= eff;
    }
    function airborne(c){ return c.alt > 0.5; }
    function canStrike(a, b){ return !airborne(b) || a.diving; }
    function dpsAgainst(a, b){
      return a.dmg/a.cd * 0.85*(1 - b.dodge*0.8) * (1 - b.armor) * a.dpsBonus;
    }
    function advantage(c, e){
      var tMe = c.hp/Math.max(0.01, dpsAgainst(e, c));
      var tThem = e.hp/Math.max(0.01, dpsAgainst(c, e));
      return tMe/tThem;
    }
    function waterDepth(x, y){ return S.hazard.kind === 'flood' ? S.hazard.level - height(x, y) : -99; }
    function safePoint(){
      return S.hazard.kind === 'fire' ? { x:S.hazard.cx, y:S.hazard.cy } : { x:S.peak.x, y:S.peak.y };
    }
    function isSafe(x, y){
      if(S.hazard.kind === 'fire') return Math.hypot(x - S.hazard.cx, y - S.hazard.cy) < Math.min(S.hazard.r, S.hazard.nextR)*0.9;
      return height(x, y) > S.hazard.level + 0.3;
    }

    function hazardInfo(c){
      var hz = S.hazard, u = 0, p = safePoint();
      if(hz.kind === 'fire'){
        var margin = Math.min(hz.r, hz.nextR) - Math.hypot(c.x - hz.cx, c.y - hz.cy);
        u = margin < 50 ? clamp((50 - margin)/100, 0, 1) : 0;
      } else {
        var depth = hz.level - height(c.x, c.y) + (hz.rising ? 0.35 : 0);
        u = depth > -0.3 ? clamp((depth + 0.3)/1.1, 0, 1) : 0;
        if(swims(c) && hz.level < S.peakH - 0.5) u *= 0.35;
      }
      if(airborne(c)) u *= 0.5;
      return { urgency:u, x:p.x, y:p.y };
    }

    function nearestBush(c){
      var best = null, bd = 260;
      S.bushes.forEach(function(b){
        if(b.food < 0.2 || !isSafe(b.x, b.y)) return;
        var d = Math.hypot(c.x - b.x, c.y - b.y);
        if(d < bd){ bd = d; best = b; }
      });
      return best;
    }

    function pickWander(c){
      var p = safePoint(), wx, wy, early = S.t < 0.14*S.T;
      if(early){
        var q = randomInArena(0.85); wx = q.x; wy = q.y;
      } else {
        var rad = S.hazard.kind === 'fire'
          ? Math.max(20, Math.min(S.hazard.r, S.hazard.nextR)*0.7)
          : ARENA_R*0.6*(1 - clamp((S.t - 0.14*S.T)/(0.7*S.T), 0, 1)*0.8);
        var a = rng()*6.283, d = Math.sqrt(rng())*rad;
        wx = p.x + Math.cos(a)*d; wy = p.y + Math.sin(a)*d;
      }
      var m = partnerOf(c);
      if(m && m.alive){ wx = (wx + m.x)/2; wy = (wy + m.y)/2; }
      c.wander = { x:wx, y:wy };
      c.wanderT = S.t + 5 + rng()*4;
    }

    function setIntent(c, intent, target){
      c.intent = intent;
      c.target = intent === 'hunt' ? target : null;
      c.threat = intent === 'flee' ? target : null;
    }

    /* ----- decisions, a few times a second ----- */
    function decide(c){
      c.hz = hazardInfo(c);
      if(S.duel){
        // Calibration duels measure combat strength, so neither animal may decline the fight.
        var foe = S.cs.filter(function(o){ return isEnemy(c, o); })[0];
        if(foe && canStrike(c, foe)) setIntent(c, "hunt", foe);
        else setIntent(c, "roam");
        return;
      }
      // Cagey early, bloodthirsty late: aggression ramps up as the arena closes.
      var ramp = clamp((S.t/S.T - 0.12)/0.45, 0, 1);
      var late = S.t > S.T*0.85 ? 0.55 : (S.t > S.T*0.7 ? 0.25 : 0);
      var aggr = clamp(c.sp.aggression*(0.25 + 0.75*ramp) + late, 0, 1.2);
      // A final four this early lies low and lets the arena bring them together.
      if(S.t < S.T*0.72 && aliveList().length <= 5) aggr *= 0.35;
      if(S.duel) aggr = 1.2;
      // Early on only a lopsided fight is worth starting; the margin needed shrinks as the arena closes.
      var caution = (!S.duel && S.t < S.T*0.45) ? 0.35*(1 - S.t/(S.T*0.45)) : 0;
      var ally = partnerOf(c);
      var best = null, bestScore = 0, threat = null, threatScore = 0;

      // Stay committed to a fight in progress unless it has turned bad.
      if(c.intent === 'hunt' && c.target && c.target.alive && canSee(c, c.target) && advantage(c, c.target) > 0.7){
        best = c.target; bestScore = 1e9;
      }

      for(var i=0; i<S.cs.length; i++){
        var o = S.cs[i];
        if(!isEnemy(c, o) || !canSee(c, o)) continue;
        var d = dist(c, o), adv = advantage(c, o);
        if(ally && ally.alive && ally.target === o && dist(ally, o) < 150) adv *= 1.7;
        var danger = (1/Math.max(adv, 0.05)) * (o.target === c ? 1.6 : 0.8) / (1 + d/120);
        if(danger > threatScore){ threatScore = danger; threat = o; }
        if(airborne(o) && !has(c, 'flight')) continue;   // nothing to bite
        var score = adv*(0.6 + aggr)/(1 + d/180);
        if(o.hp < o.maxHp*0.35) score *= 1.4;
        score *= 1 + 0.3*o.stats.kills;   // the arena turns on whoever is winning
        if(adv > 1.35 - aggr*0.7 + caution && score > bestScore){ best = o; bestScore = score; }
      }
      // Help a partner who is already fighting.
      if(!best && ally && ally.alive && ally.target && ally.target.alive && dist(c, ally.target) < senseOf(c)*1.2
         && advantage(c, ally.target) > 0.5 && canStrike(c, ally.target)){
        best = ally.target;
      }

      var hpf = c.hp/c.maxHp;
      var fighting = best && dist(c, best) < (c.r + best.r + c.reach)*2.2;
      if(c.hz.urgency > 0.55 && !fighting) setIntent(c, 'hazard');
      else if(threat && ((hpf < 0.32 && threatScore > 0.5) || threatScore > 2.2) && threat !== best) setIntent(c, 'flee', threat);
      else if(best) setIntent(c, 'hunt', best);
      else if(S.feast && S.feast.active && (hpf < 0.75 || aggr > 0.6)) setIntent(c, 'feast');
      else if(has(c, 'ambush') && c.hz.urgency < 0.25 && S.t < S.T*0.75) setIntent(c, 'lurk');
      else if(hpf < 0.85 && nearestBush(c)) setIntent(c, 'forage');
      else setIntent(c, 'roam');
    }

    /* ----- combat ----- */
    function noteDamager(t, by){
      for(var i=0; i<t.damagers.length; i++){
        if(t.damagers[i].id === by.id){ t.damagers[i].t = S.t; return; }
      }
      t.damagers.push({ id:by.id, t:S.t });
    }

    function damage(t, amount, by, tags, cause, quiet){
      if(!t.alive || amount <= 0) return;
      amount = Math.min(amount, t.hp);
      t.hp -= amount;
      t.stats.taken += amount;
      if(by){
        by.stats.dealt += amount;
        t.lastHitBy = by; t.lastHitT = S.t;
        noteDamager(t, by);
      }
      var f = t.hp/t.maxHp;
      if(f < t.stats.lowest) t.stats.lowest = f;
      if(f < 0.25 && by && !t.brush) t.brush = { from:by.id, t:S.t };
      if(!quiet){
        if(t.anim !== ANIM.attack){ t.anim = ANIM.hurt; t.animT = S.t; }
        if(by) S.events.push({ t:+S.t.toFixed(2), type:'hit', a:by.id, b:t.id, dmg:+amount.toFixed(1), tags:tags || [] });
      }
      if(t.hp <= 1e-4) kill(t, by, cause || 'mauled', tags);
    }

    function kill(t, by, cause, tags){
      t.alive = false; t.hp = 0; t.deathT = S.t; t.deathDay = S.day;
      var credit = by;
      if(!credit && t.lastHitBy && S.t - t.lastHitT < 6 && t.lastHitBy.alive) credit = t.lastHitBy;
      if(credit === t) credit = null;
      t.killer = credit ? credit.id : -1;
      t.cause = cause;
      if(t.pinnedBy){ t.pinnedBy.holding = null; t.pinnedBy = null; }
      if(t.holding){ t.holding.pinnedBy = null; t.holding = null; }
      var left = aliveList().length;
      t.place = left + 1;
      var assists = t.damagers.filter(function(d){ return S.t - d.t < 8 && (!credit || d.id !== credit.id); }).map(function(d){ return d.id; });
      var streak = 0;
      if(credit){
        credit.kills.push(S.t);
        credit.stats.kills++;
        if(credit.alive){
          // Feeding on the kill: finishing a fight is rewarded, not just surviving one.
          var fed = Math.min(credit.maxHp - credit.hp, credit.maxHp*0.1);
          credit.hp += fed;
          credit.stats.healed += fed;
        }
        streak = credit.kills.filter(function(k){ return S.t - k <= 12; }).length;
      }
      event({ type:'kill', a:credit ? credit.id : -1, b:t.id, cause:cause, tags:tags || [], assists:assists,
              killerHp:credit ? +(credit.hp/credit.maxHp).toFixed(3) : null, streak:streak, left:left,
              first:S.killsSoFar === 0, day:S.day, night:S.night });
      S.killsSoFar++;
    }

    function knockback(c, t){
      var dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy) || 1;
      t.x += dx/d*45; t.y += dy/d*45;
      t.stunUntil = S.t + 0.8;
    }

    function attack(c, t){
      var frenzy = has(c, 'frenzy') && t.hp < t.maxHp*0.5;
      c.atkT = c.cd*(frenzy ? 0.65 : 1)*(0.9 + 0.2*rng());
      c.anim = ANIM.attack; c.animT = S.t;
      var held = t.pinnedBy || t.stunUntil > S.t;
      var dodge = held ? 0 : t.dodge*(t.stamina > 10 ? 1 : 0.3);
      if(has(t, 'climber') && nearTree(t)) dodge = Math.min(0.7, dodge + 0.12);
      var acc = 0.86*(c.howledUntil > S.t ? 0.75 : 1);
      if(rng() > acc*(1 - dodge)){
        c.stats.missed++; t.stats.dodged++;
        return;
      }
      // Wide rolls and big crits keep fights from being foregone conclusions: without them the
      // stronger animal wins almost every exchange, which makes upsets rare and balance brittle.
      var dmg = c.dmg*(0.65 + 0.7*rng()), tags = [];
      if(c.dashUntil > S.t && c.dashKind === 'pounce'){ dmg *= 1.6; tags.push('pounce'); c.dashUntil = 0; }
      else if(c.dashUntil > S.t && c.dashKind === 'charge'){ dmg *= 1.35; tags.push('charge'); c.dashUntil = 0; knockback(c, t); }
      if(c.stealth > 0.75){ dmg *= 1.8; tags.push('ambush'); }
      else if(has(c, 'deathroll') && c.engagedWith !== t){ dmg *= 1.35; tags.push('deathroll'); }
      if(c.diving){ dmg *= 2.0; tags.push('dive'); c.diving = false; c.climbUntil = S.t + 0.9; }
      if(rng() < 0.16){ dmg *= 2.3; tags.push('crit'); }
      if(S.night && c.sp.nocturnal) dmg *= 1.1;
      // Adrenaline: a badly hurt animal bites harder. The stronger animal is still favoured, but a
      // fight it is winning can turn, which keeps small strength edges from snowballing into sure wins.
      var hurt = c.hp/c.maxHp;
      if(hurt < 0.4){
        var rush = 1 + 0.6*(0.4 - hurt)/0.4;
        dmg *= rush;
        if(rush > 1.3) tags.push('desperate');
      }
      if(t.intent === 'flee') dmg *= 1.15;
      if(held) tags.push('helpless');
      c.engagedWith = t;
      c.stealth = 0; c.stillTime = 0;
      c.stats.landed++;
      if(tags.length && tags[0] !== 'helpless') c.stats.specials++;

      if(has(c, 'venom')){
        // Venom strength comes from the snake, so Balanced scaling applies to it too.
        t.venom = { perSec:c.dmg*2.2/6, until:S.t + 6, from:c.id };
        tags.push('venom');
      }
      if(has(c, 'constrict') && !t.pinnedBy && !c.holding && !airborne(t) && rng() < 0.4){
        t.pinnedBy = c; t.pinUntil = S.t + 2.2; c.holding = t;
        tags.push('constrict');
      }
      damage(t, dmg*(1 - t.armor), c, tags, 'mauled');
      // An eagle that has just struck is on the ground: the prey gets a bite back.
      if(c.climbUntil > S.t && t.alive) t.atkT = Math.min(t.atkT, 0);
    }

    function howl(c){
      c.specT = 12;
      c.anim = ANIM.special; c.animT = S.t;
      var hit = [];
      S.cs.forEach(function(o){
        if(isEnemy(c, o) && dist(c, o) < 110){ o.howledUntil = S.t + 3; hit.push(o.id); }
      });
      if(hit.length) event({ type:'special', a:c.id, kind:'howl', b:hit });
    }

    function flightTick(c){
      if(c.diving){
        c.alt = Math.max(0, c.alt - DT*2.6);
        if(S.t - c.diveStart > 1.6){ c.diving = false; c.climbUntil = S.t + 1; }
      } else if(S.t < c.climbUntil){
        c.alt = Math.max(0, c.alt - DT*3);
      } else if(c.landed){
        c.alt = Math.max(0, c.alt - DT*2);
        if(c.stamina > 60){ c.landed = false; }
      } else {
        c.alt = Math.min(1, c.alt + DT*1.2);
        c.stamina -= 3*DT;
        if(c.stamina < 15){ c.landed = true; event({ type:'special', a:c.id, kind:'landed' }); }
      }
    }

    function act(c){
      if(S.t < START_FREEZE) return;
      c.atkT -= DT; c.specT -= DT;
      if(has(c, 'flight')) flightTick(c);
      if(c.stunUntil > S.t) return;
      if(has(c, 'howl') && c.specT <= 0){
        for(var i=0; i<S.cs.length; i++){ if(isEnemy(c, S.cs[i]) && dist(c, S.cs[i]) < 100){ howl(c); break; } }
      }

      var t = c.target;
      // A pinned or bitten animal fights back even if it had other plans.
      if((!t || !t.alive) && c.lastHitBy && c.lastHitBy.alive && S.t - c.lastHitT < 1.5 && isEnemy(c, c.lastHitBy)) t = c.lastHitBy;
      if(!t || !t.alive || !isEnemy(c, t)) return;
      if(c.holding && c.holding !== t) return;

      var d = dist(c, t), contact = c.r + t.r + c.reach;
      if(c.dashUntil <= S.t && c.specT <= 0 && c.stamina > 25 && c.intent === 'hunt' && !c.pinnedBy){
        if((has(c, 'pounce') || has(c, 'charge')) && d > contact*1.3 && d < contact + 70 && !airborne(t)){
          c.dashKind = has(c, 'pounce') ? 'pounce' : 'charge';
          c.dashUntil = S.t + 0.38;
          var dd = d || 1; c.dashX = (t.x - c.x)/dd; c.dashY = (t.y - c.y)/dd;
          c.specT = c.dashKind === 'pounce' ? 5 : 7;
          c.stamina -= 20;
          c.anim = ANIM.special; c.animT = S.t;
          event({ type:'special', a:c.id, b:t.id, kind:c.dashKind });
        } else if(has(c, 'dive') && c.alt > 0.8 && !c.landed && d < 200){
          c.diving = true; c.diveStart = S.t; c.specT = 6; c.stamina -= 25;
          c.anim = ANIM.special; c.animT = S.t;
          event({ type:'special', a:c.id, b:t.id, kind:'dive' });
        }
      }
      if(!canStrike(c, t)) return;
      if(airborne(c) && !c.diving) return;
      if(d <= contact && c.atkT <= 0) attack(c, t);
    }

    /* ----- movement ----- */
    function envSpeed(c){
      if(airborne(c)) return 1;
      var depth = waterDepth(c.x, c.y);
      if(depth <= 0) return 1;
      if(swims(c)) return c.sid === 'otter' ? 1.3 : 1.15;
      return depth < 0.8 ? 0.6 : 0.45;
    }

    function move(c){
      if(S.t < START_FREEZE){ c.vx = 0; c.vy = 0; return; }
      if(c.pinnedBy || c.holding || c.stunUntil > S.t){
        c.vx *= 0.5; c.vy *= 0.5;
        c.x += c.vx*DT; c.y += c.vy*DT;
        confine(c);
        return;
      }
      var gx = null, gy = null, want = 0.45, sprint = false, t = c.target;
      switch(c.intent){
        case 'hunt':
          if(t && t.alive){
            gx = t.x + t.vx*0.25; gy = t.y + t.vy*0.25; want = 1;
            var d = dist(c, t);
            sprint = d < 160 && c.stamina > 12;
            if(d < (c.r + t.r + c.reach)*0.9) want = 0.15;
          }
          break;
        case 'flee':
          if(c.threat && c.threat.alive){
            var ax = c.x - c.threat.x, ay = c.y - c.threat.y, al = Math.hypot(ax, ay) || 1;
            var sx = c.hz.x - c.x, sy = c.hz.y - c.y, sl = Math.hypot(sx, sy) || 1;
            gx = c.x + (ax/al + 0.6*sx/sl)*100; gy = c.y + (ay/al + 0.6*sy/sl)*100;
            want = has(c, 'climber') ? 1.15 : 1;
            sprint = al < 150;
          }
          break;
        case 'hazard':
          gx = c.hz.x; gy = c.hz.y; want = 0.9; sprint = c.hz.urgency > 0.8;
          break;
        case 'feast':
          if(S.feast){ gx = S.feast.x; gy = S.feast.y; want = 0.8; }
          break;
        case 'forage':
          var b = nearestBush(c);
          if(b){ gx = b.x; gy = b.y; want = Math.hypot(c.x - b.x, c.y - b.y) < 10 ? 0 : 0.55; }
          break;
        case 'lurk':
          want = 0;
          break;
      }
      if(gx === null && c.intent !== 'lurk'){
        if(!c.wander || S.t > c.wanderT || Math.hypot(c.x - c.wander.x, c.y - c.wander.y) < 20) pickWander(c);
        gx = c.wander.x; gy = c.wander.y;
      }

      if(c.intent === 'lurk'){
        c.stillTime += DT;
        c.stealth = Math.min(1, c.stillTime/2.5*(nearTree(c) ? 1.4 : 1));
      } else if(c.stealth > 0){
        c.stillTime = 0;
        c.stealth = Math.max(0, c.stealth - DT*1.5);
      }

      sprint = sprint && c.stamina > 5 && !airborne(c);
      c.sprinting = sprint;
      var cap = c.speed*want*(sprint ? 1.55 : 1)*envSpeed(c);
      var dvx = 0, dvy = 0;
      if(c.dashUntil > S.t){
        dvx = c.dashX*c.speed*2.6; dvy = c.dashY*c.speed*2.6;
      } else if(gx !== null && want > 0){
        var dx = gx - c.x, dy = gy - c.y, dl = Math.hypot(dx, dy) || 1;
        dvx = dx/dl*cap; dvy = dy/dl*cap;
      }
      var k = Math.min(1, (c.dashUntil > S.t ? 20 : 7)*DT);
      c.vx += (dvx - c.vx)*k; c.vy += (dvy - c.vy)*k;
      c.x += c.vx*DT; c.y += c.vy*DT;
      confine(c);

      var sp = Math.hypot(c.vx, c.vy);
      if(sp > 5) c.yaw = Math.atan2(c.vy, c.vx);
      if(c.anim === ANIM.idle || c.anim === ANIM.move){ c.anim = sp > 5 ? ANIM.move : ANIM.idle; }
      else if(S.t - c.animT > 0.5){ c.anim = sp > 5 ? ANIM.move : ANIM.idle; c.animT = S.t; }
      if(!has(c, 'flight')) c.stamina = clamp(c.stamina + (sprint ? -22 : 12)*DT, 0, 100);
      else if(c.landed) c.stamina = clamp(c.stamina + 14*DT, 0, 100);
      c.stats.distance += sp*DT;
      if(c.intent === 'flee') c.stats.fleeTime += DT;
    }

    function confine(c){
      var d = Math.hypot(c.x, c.y), lim = ARENA_R - c.r;
      if(d > lim){ c.x *= lim/d; c.y *= lim/d; c.vx *= 0.3; c.vy *= 0.3; }
    }

    function separate(){
      for(var i=0; i<S.cs.length; i++){
        var a = S.cs[i];
        if(!a.alive || airborne(a)) continue;
        for(var j=i+1; j<S.cs.length; j++){
          var b = S.cs[j];
          if(!b.alive || airborne(b)) continue;
          if(a.holding === b || b.holding === a) continue;
          var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.r + b.r)*0.9;
          if(d < min && d > 1e-3){
            var push = (min - d)/2;
            a.x -= dx/d*push; a.y -= dy/d*push;
            b.x += dx/d*push; b.y += dy/d*push;
          }
        }
      }
    }

    /* ----- hazards, venom, holds, food ----- */
    function tickStatus(c){
      var hz = S.hazard;
      if(hz.kind === 'fire'){
        if(Math.hypot(c.x - hz.cx, c.y - hz.cy) > hz.r){
          var pct = S.t > S.T ? 0.12 : 0.03 + 0.012*hz.stage;
          damage(c, c.maxHp*pct*(airborne(c) ? 0.5 : 1)*DT, null, ['fire'], 'fire', true);
        }
      } else if(!airborne(c)){
        var depth = waterDepth(c.x, c.y), surge = hz.level > S.peakH - 0.4;
        if(depth > 0.8 && (!swims(c) || surge)){
          damage(c, c.maxHp*(swims(c) ? 0.03 : 0.06)*DT, null, ['flood'], 'drowned', true);
        }
      }
      if(!c.alive) return;
      if(c.venom){
        if(S.t > c.venom.until) c.venom = null;
        else damage(c, c.venom.perSec*DT, S.cs[c.venom.from], ['venom'], 'venom', true);
      }
      if(!c.alive) return;
      if(c.pinnedBy){
        if(S.t > c.pinUntil || !c.pinnedBy.alive){ c.pinnedBy.holding = null; c.pinnedBy = null; }
        else damage(c, c.pinnedBy.dmg*0.55*DT, c.pinnedBy, ['constrict'], 'constricted', true);
      }
      if(!c.alive) return;
      var heal = 0;
      if(S.feast && S.feast.active && S.feast.food > 0 && Math.hypot(c.x - S.feast.x, c.y - S.feast.y) < 30){
        heal = 0.09; S.feast.food -= 0.02*DT;
      } else if(c.intent === 'forage'){
        var b = nearestBush(c);
        if(b && Math.hypot(c.x - b.x, c.y - b.y) < 12){ heal = 0.03; b.food -= 0.05*DT; }
      }
      if(heal && c.hp < c.maxHp){
        var add = Math.min(c.maxHp - c.hp, c.maxHp*heal*DT);
        c.hp += add; c.stats.healed += add;
      }
      if(c.brush && S.t - c.lastHitT > 6){
        var from = S.cs[c.brush.from];
        if(!from.alive || dist(c, from) > 200){
          event({ type:'escape', a:c.id, b:c.brush.from, hp:+(c.hp/c.maxHp).toFixed(3), since:+c.brush.t.toFixed(2) });
        }
        c.brush = null;
      }
    }

    /* ----- the arena itself ----- */
    function updateEnvironment(){
      var hz = S.hazard;
      if(hz.kind === 'fire'){
        var k = hz.keys, i = 0;
        while(i < k.length - 1 && k[i + 1].t <= S.t) i++;
        var a = k[i], b = k[Math.min(i + 1, k.length - 1)];
        var f = b.t > a.t ? clamp((S.t - a.t)/(b.t - a.t), 0, 1) : 1;
        hz.cx = a.cx + (b.cx - a.cx)*f; hz.cy = a.cy + (b.cy - a.cy)*f; hz.r = a.r + (b.r - a.r)*f;
        var nr = hz.r;
        for(var j=i + 1; j<k.length; j++){ if(k[j].r < hz.r - 1){ nr = k[j].r; break; } }
        hz.nextR = nr;
        var shrinking = b.r < a.r - 1 && f < 1;
        if(shrinking && !hz.shrinking){ hz.stage++; event({ type:'zone', kind:'fire', stage:hz.stage, r:Math.round(b.r), final:b.r < 1 }); }
        hz.shrinking = shrinking;
      } else {
        var fk = hz.keys, fi = 0;
        while(fi < fk.length - 1 && fk[fi + 1].t <= S.t) fi++;
        var fa = fk[fi], fb = fk[Math.min(fi + 1, fk.length - 1)];
        var ff = fb.t > fa.t ? clamp((S.t - fa.t)/(fb.t - fa.t), 0, 1) : 1;
        hz.level = fa.level + (fb.level - fa.level)*ff;
        hz.rising = fb.level > fa.level + 0.01 && ff < 1;
        var progress = clamp((S.t - 0.14*S.T)/(0.68*S.T), 0, 1);
        var stage = S.t > S.T ? 5 : Math.floor(progress*4) + (hz.rising ? 1 : 0);
        if(stage > hz.stage){ hz.stage = stage; event({ type:'zone', kind:'flood', stage:stage, final:stage >= 5 }); }
      }

      var cycle = S.T/4.5, night = ((S.t % cycle)/cycle) > 0.62;
      S.day = Math.floor(S.t/cycle) + 1;
      if(night !== S.night){ S.night = night; event({ type:night ? 'night' : 'day', day:S.day }); }

      var ft = S.feastTimes[S.feasts.length];
      if(ft != null && S.t >= ft*S.T){
        var p = safePoint();
        S.feast = { x:p.x, y:p.y, food:1, until:S.t + 30, active:true };
        S.feasts.push({ t:S.t, x:p.x, y:p.y });
        event({ type:'feast', x:Math.round(p.x), y:Math.round(p.y) });
      }
      if(S.feast && S.feast.active && (S.t > S.feast.until || S.feast.food <= 0)) S.feast.active = false;
      S.bushes.forEach(function(bu){ bu.food = Math.min(1, bu.food + 0.01*DT); });
    }

    function checkEnd(){
      var alive = aliveList();
      if(S.pairs){
        var teams = {};
        alive.forEach(function(c){ teams[c.team] = true; });
        var ids = Object.keys(teams);
        if(ids.length <= 1){
          var team = ids.length ? +ids[0] : lastStanding()[0].team;
          return finish(S.cs.filter(function(c){ return c.team === team; }), 'last-pair');
        }
      } else if(alive.length <= 1){
        return finish(alive.length ? alive : lastStanding(), 'last-standing');
      }
      if(S.duel && S.t > 60){
        alive.sort(function(a, b){ return b.hp/b.maxHp - a.hp/a.maxHp; });
        alive.forEach(function(c, i){ c.place = i + 1; });
        return finish([alive[0]], 'timeout');
      }
      if(S.t > S.T*1.6){
        alive.sort(function(a, b){ return b.hp/b.maxHp - a.hp/a.maxHp; });
        alive.forEach(function(c, i){ c.place = i + 1; });
        var top = alive[0];
        finish(S.pairs ? S.cs.filter(function(c){ return c.team === top.team; }) : [top], 'timeout');
      }
    }
    function lastStanding(){
      return S.cs.slice().sort(function(a, b){ return (b.deathT - a.deathT) || (b.stats.dealt - a.stats.dealt); }).slice(0, 1);
    }
    function finish(winners, reason){
      S.ended = true;
      S.endReason = reason;
      winners.forEach(function(c){ c.place = 1; });
      S.winners = winners.map(function(c){ return c.id; });
      event({ type:'winner', ids:S.winners, reason:reason, day:S.day });
      record(true);
    }

    function record(force){
      if(!rec || (!force && S.step % FRAME_EVERY !== 0)) return;
      if((rec.frames + 1)*stride > rec.data.length){
        var grown = new Float32Array(rec.data.length*2);
        grown.set(rec.data);
        rec.data = grown;
      }
      var o = rec.frames*stride, d = rec.data, hz = S.hazard;
      d[o] = S.t;
      d[o + 1] = hz.kind === 'fire' ? hz.cx : hz.level;
      d[o + 2] = hz.kind === 'fire' ? hz.cy : 0;
      d[o + 3] = hz.kind === 'fire' ? hz.r : 0;
      d[o + 4] = S.night ? 1 : 0;
      d[o + 5] = S.feast && S.feast.active ? Math.max(0, S.feast.food) : 0;
      for(var i=0; i<n; i++){
        var c = S.cs[i], b = o + GLOBAL + i*PER;
        d[b] = c.x; d[b + 1] = c.y; d[b + 2] = c.yaw;
        d[b + 3] = c.alive ? c.hp/c.maxHp : 0;
        d[b + 4] = c.alt; d[b + 5] = c.stealth;
        d[b + 6] = c.anim + Math.min(0.99, Math.max(0, S.t - c.animT));
        d[b + 7] = (c.alive ? 1 : 0) | (c.pinnedBy ? 2 : 0) | (c.stunUntil > S.t ? 4 : 0) | (c.sprinting ? 8 : 0)
                 | (c.dashUntil > S.t ? 16 : 0) | (c.intent === 'flee' ? 32 : 0) | (c.holding ? 64 : 0);
      }
      rec.frames++;
    }

    function step(){
      if(S.ended) return;
      S.step++;
      S.t += DT;
      updateEnvironment();
      var i, c;
      for(i=0; i<S.cs.length; i++){
        c = S.cs[i];
        if(!c.alive) continue;
        c.decideT -= DT;
        if(c.decideT <= 0){ decide(c); c.decideT = 0.22 + rng()*0.1; }
      }
      for(i=0; i<S.cs.length; i++){ c = S.cs[i]; if(c.alive) act(c); }
      for(i=0; i<S.cs.length; i++){ c = S.cs[i]; if(c.alive) move(c); }
      separate();
      for(i=0; i<S.cs.length; i++){ c = S.cs[i]; if(c.alive) tickStatus(c); }
      checkEnd();
      record(false);
    }

    event({ type:'day', day:1 });
    event({ type:'start', hazard:S.hazard.kind, balanced:S.balanced, pairs:S.pairs, length:S.length, seed:seed });
    record(true);

    return {
      state:S, recording:rec, height:height,
      step:step,
      runToEnd:function(){ while(!S.ended) step(); return S; }
    };
  }

  L.ArenaEngine = {
    create:createMatch, rng:mulberry32, powerOf:powerOf, rawStats:rawStats,
    DT:DT, ARENA_R:ARENA_R, LENGTHS:LENGTHS, ANIM:ANIM, PER:PER, GLOBAL:GLOBAL, START_FREEZE:START_FREEZE
  };
})(typeof window !== 'undefined' ? window : globalThis);
