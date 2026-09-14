/* Arena lobby: name sixteen contestants, set the rules, read the odds, make a pick.
   The roster and settings persist in the browser, as does the prediction record. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};
  var doc = root.document;

  var ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI'];
  // Carpophorus, Spiculus, Flamma and Priscus were real arena fighters; the rest are just good names.
  var NAMES = ['Carpophorus','Spiculus','Flamma','Priscus','Verus','Tetraites','Crixus','Commodus','Maximus',
    'Triumphus','Varro','Gannicus','Oenomaus','Brutus','Aurelia','Livia','Biscuit','Sir Chomps','Mango','Noodle',
    'Big Tony','Pickles','Chaos','Mr. Whiskers','Nibbles','Duchess','Pepper','Gnocchi','Tater','Zeus','Kevin','Beans'];
  var TEAM = 'ABCDEFGH';
  var OMEN_RUNS = { standard:200, epic:120 };

  var state = {
    built:false, active:false, view:'lobby',
    settings:{ balanced:true, length:'standard', pairs:false, hazard:'random' },
    roster:[], pick:null, odds:null, computing:false, progress:0, runToken:0
  };
  var portraits = {};
  var els = {};

  function SP(){ return L.ArenaSpecies; }
  function ids(){ return Object.keys(L.ArenaSpecies); }
  function max(){ return L.ARENA_MAX_PER_SPECIES || 2; }
  function shuffle(a){ for(var i=a.length - 1; i>0; i--){ var j = Math.floor(Math.random()*(i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function hash(str){ var h = 2166136261 >>> 0; for(var i=0; i<str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(ch){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]; }); }
  function count(sid, except){ var n = 0; state.roster.forEach(function(r, i){ if(r.sid === sid && i !== except) n++; }); return n; }
  function pct(p){ return p < 0.01 ? '<1%' : Math.round(p*100) + '%'; }
  function store(key, val){ try { root.localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }
  function recall(key){ try { return JSON.parse(root.localStorage.getItem(key) || 'null'); } catch(e){ return null; } }

  /* ----- roster ----- */
  function unusedName(){
    var used = {};
    state.roster.forEach(function(r){ used[r.name] = true; });
    var free = NAMES.filter(function(n){ return !used[n]; });
    return free.length ? free[Math.floor(Math.random()*free.length)] : 'Contestant ' + (state.roster.length + 1);
  }
  function fillRandom(){
    var pool = [];
    ids().forEach(function(id){ for(var k=0; k<max(); k++) pool.push(id); });
    shuffle(pool);
    var names = shuffle(NAMES.slice());
    state.roster = pool.slice(0, 16).map(function(sid, i){ return { sid:sid, name:names[i] }; });
    changed(true);
  }
  function shuffleNames(){
    var names = shuffle(NAMES.slice());
    state.roster.forEach(function(r, i){ r.name = names[i]; });
    changed(false);
  }
  function reroll(i){
    var options = ids().filter(function(id){ return count(id, i) < max() && id !== state.roster[i].sid; });
    var sid = options[Math.floor(Math.random()*options.length)] || state.roster[i].sid;
    state.roster[i] = { sid:sid, name:state.roster[i].name };
    state.roster[i].name = unusedName();
    changed(true);
  }
  function validRoster(r){
    if(!r || r.length !== 16) return false;
    var seen = {};
    return r.every(function(e){
      if(!e || !SP()[e.sid] || typeof e.name !== 'string') return false;
      seen[e.sid] = (seen[e.sid] || 0) + 1;
      return seen[e.sid] <= max();
    });
  }

  function changed(rosterChanged){
    if(rosterChanged){ state.odds = null; state.runToken++; state.computing = false; }
    store('ludus.lobby', { settings:state.settings, roster:state.roster });
    if(state.built) render();
  }

  /* ----- prediction record ----- */
  function record(){
    return Object.assign({ played:0, picks:0, hits:0, streak:0, best:0, points:0, upset:null }, recall('ludus.record') || {});
  }

  /* ----- omens: simulated matches of this exact roster and rules ----- */
  function readOmens(){
    if(state.computing || !L.ArenaEngine) return;
    var token = ++state.runToken;
    var settings = Object.assign({}, state.settings);
    var roster = state.roster.map(function(r){ return { sid:r.sid, name:r.name }; });
    var runs = OMEN_RUNS[settings.length] || 200;
    var base = hash(JSON.stringify([settings, roster.map(function(r){ return r.sid; })]));
    var wins = new Array(16).fill(0), done = 0;
    state.computing = true; state.progress = 0;
    renderSide();
    (function chunk(){
      if(token !== state.runToken) return;
      var t0 = root.performance.now();
      while(done < runs && root.performance.now() - t0 < 28){
        var S = L.ArenaEngine.create({ roster:roster, seed:(base + Math.imul(done + 1, 2654435761)) >>> 0,
          balanced:settings.balanced, length:settings.length, pairs:settings.pairs, hazard:settings.hazard }).runToEnd();
        S.winners.forEach(function(id){ wins[id] += settings.pairs ? 1 : 1/S.winners.length; });
        done++;
      }
      state.progress = done/runs;
      if(done < runs){ renderProgress(); root.setTimeout(chunk, 0); return; }
      state.computing = false;
      // A little smoothing so nobody is ever quoted a flat zero.
      var total = settings.pairs ? runs*2 : runs, k = 0.5;
      state.odds = { runs:runs, probs:wins.map(function(w){ return (w + k)/(total + 16*k)*(settings.pairs ? 2 : 1); }) };
      render();
    })();
  }

  /* ----- portraits rendered from the real 3D body plans ----- */
  function renderPortraits(){
    if(typeof THREE === 'undefined' || !L.Bodies) return;
    try {
      var w = 176, h = 112, canvas = doc.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var r = new THREE.WebGLRenderer({ canvas:canvas, antialias:true, alpha:true, preserveDrawingBuffer:true });
      r.setPixelRatio(1);
      r.setSize(w, h, false);
      var scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xfff4e0, 0x2a1d12, 1.0));
      var sun = new THREE.DirectionalLight(0xffe2b0, 0.9);
      sun.position.set(-2, 4, 3);
      scene.add(sun);
      var cam = new THREE.PerspectiveCamera(30, w/h, 0.1, 100);
      var material = new THREE.MeshLambertMaterial({ vertexColors:true });
      ids().forEach(function(id){
        var geo = L.Bodies.build(id, SP()[id].color, 1);
        geo.computeBoundingBox();
        var size = new THREE.Vector3(), center = new THREE.Vector3();
        geo.boundingBox.getSize(size);
        geo.boundingBox.getCenter(center);
        var mesh = new THREE.Mesh(geo, material);
        mesh.position.copy(center).multiplyScalar(-1);
        var pivot = new THREE.Group();
        pivot.add(mesh);
        pivot.rotation.y = -0.75;
        scene.add(pivot);
        var radius = Math.max(size.x, size.y, size.z)*0.6;
        cam.position.set(0, radius*0.55, radius/Math.sin(THREE.MathUtils.degToRad(15)));
        cam.lookAt(0, 0, 0);
        r.clear();
        r.render(scene, cam);
        portraits[id] = canvas.toDataURL('image/png');
        scene.remove(pivot);
        geo.dispose();
      });
      material.dispose();
      r.dispose();
      if(r.forceContextLoss) r.forceContextLoss();
    } catch(e){
      portraits = {};
    }
  }

  /* ----- building the page ----- */
  function toggle(name, value, label, hint){
    var on = state.settings[name] === value;
    return '<button data-set="' + name + '" data-val="' + value + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' +
      label + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</button>';
  }

  function build(host){
    host.innerHTML =
      '<section class="lobby" id="arenaLobby">' +
        '<div class="lobby-head">' +
          '<div>' +
            '<div class="eyebrow">The arena</div>' +
            '<h2 class="ludus-title">Sixteen enter. <em>One</em> survives.</h2>' +
            '<p class="lobby-sub">Name your contestants, set the rules, and read the omens before the gates open. Every fight is simulated, not scripted, so the upsets are real.</p>' +
          '</div>' +
          '<div class="settings" id="arenaSettings"></div>' +
        '</div>' +
        '<div class="lobby-body">' +
          '<div>' +
            '<div class="roster-bar">' +
              '<div class="eyebrow">Roster · up to 2 of each species</div>' +
              '<div class="roster-actions">' +
                '<button class="a-btn" data-act="fill">Random roster</button>' +
                '<button class="a-btn" data-act="names">New names</button>' +
              '</div>' +
            '</div>' +
            '<div class="tributes" id="arenaTributes"></div>' +
            '<div class="pool" id="arenaPool"></div>' +
          '</div>' +
          '<aside class="side" id="arenaSide"></aside>' +
        '</div>' +
      '</section>' +
      '<section id="arenaStageView" hidden></section>' +
      '<section class="results" id="arenaResultsView" hidden></section>';

    els.host = host;
    els.settings = host.querySelector('#arenaSettings');
    els.tributes = host.querySelector('#arenaTributes');
    els.pool = host.querySelector('#arenaPool');
    els.side = host.querySelector('#arenaSide');

    host.addEventListener('click', onClick);
    els.tributes.addEventListener('input', function(e){
      if(!e.target.matches('input.name')) return;
      var i = +e.target.closest('.tribute').dataset.i;
      state.roster[i].name = e.target.value.slice(0, 18) || SP()[state.roster[i].sid].name;
      store('ludus.lobby', { settings:state.settings, roster:state.roster });
      renderSide();
    });
    els.tributes.addEventListener('change', function(e){
      if(!e.target.matches('select')) return;
      var i = +e.target.closest('.tribute').dataset.i;
      state.roster[i].sid = e.target.value;
      changed(true);
    });
  }

  function onClick(e){
    var b = e.target.closest('button');
    if(!b || !els.host.contains(b)) return;
    if(b.dataset.set){
      var v = b.dataset.val;
      state.settings[b.dataset.set] = v === 'true' ? true : v === 'false' ? false : v;
      if(b.dataset.set === 'pairs' && state.pick != null && state.odds) state.pick = null;
      changed(true);
      return;
    }
    var act = b.dataset.act;
    if(act === 'fill') fillRandom();
    else if(act === 'names') shuffleNames();
    else if(act === 'reroll') reroll(+b.closest('.tribute').dataset.i);
    else if(act === 'pick'){
      var i = +b.closest('.tribute').dataset.i;
      state.pick = state.pick === i ? null : i;
      render();
    }
    else if(act === 'omens') readOmens();
    else if(act === 'enter') enter();
  }

  function renderSettings(){
    els.settings.innerHTML =
      '<div class="setting"><span class="setting-label">Rules</span><div class="toggle">' +
        toggle('balanced', true, 'Balanced') + toggle('balanced', false, 'Open weight') + '</div></div>' +
      '<div class="setting"><span class="setting-label">Length</span><div class="toggle">' +
        toggle('length', 'standard', 'Standard', '3–5 min') + toggle('length', 'epic', 'Epic', '8–12 min') + '</div></div>' +
      '<div class="setting"><span class="setting-label">Format</span><div class="toggle">' +
        toggle('pairs', false, 'Free-for-all') + toggle('pairs', true, 'Pairs') + '</div></div>' +
      '<div class="setting"><span class="setting-label">Arena</span><div class="toggle">' +
        toggle('hazard', 'random', 'Random') + toggle('hazard', 'fire', 'Wildfire') + toggle('hazard', 'flood', 'Flood') + '</div></div>';
  }

  function renderTributes(){
    els.tributes.classList.toggle('pairs', state.settings.pairs);
    els.tributes.innerHTML = state.roster.map(function(r, i){
      var sp = SP()[r.sid];
      var options = ids().map(function(id){
        var full = count(id, i) >= max();
        return '<option value="' + id + '"' + (id === r.sid ? ' selected' : '') + (full ? ' disabled' : '') + '>' +
          esc(SP()[id].name) + (full ? ' (2 in)' : '') + '</option>';
      }).join('');
      var art = portraits[r.sid]
        ? '<img src="' + portraits[r.sid] + '" alt="' + esc(sp.name) + '">'
        : '<span class="dot" style="background:' + sp.color + '"></span>';
      var oddsTxt = state.odds ? pct(state.odds.probs[i]) + ' to win' : '';
      var picked = state.pick === i;
      return '<div class="tribute' + (picked ? ' picked' : '') + '" data-i="' + i + '" title="' + esc(sp.blurb) + '">' +
        '<span class="num">' + ROMAN[i] + '</span>' +
        (state.settings.pairs ? '<span class="team">PAIR ' + TEAM[Math.floor(i/2)] + '</span>' : '') +
        '<div class="portrait">' + art + '</div>' +
        '<input class="name" value="' + esc(r.name) + '" maxlength="18" aria-label="Name of contestant ' + ROMAN[i] + '">' +
        '<select aria-label="Species of contestant ' + ROMAN[i] + '">' + options + '</select>' +
        '<div class="odds-tag"><span>' + oddsTxt + '</span>' + (picked ? '<span class="pick">★ your pick</span>' : '') + '</div>' +
        '<div style="display:flex;gap:6px">' +
          '<button class="choose" data-act="pick" style="flex:1">' + (picked ? 'Picked' : 'Pick to win') + '</button>' +
          '<button class="choose" data-act="reroll" title="Random species and name" aria-label="Reroll contestant ' + ROMAN[i] + '">↻</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderPool(){
    els.pool.innerHTML = ids().map(function(id){
      var n = count(id, -1), full = n >= max();
      return '<span class="' + (full ? 'full' : '') + '" title="' + esc(SP()[id].blurb) + '"><i style="background:' + SP()[id].color + '"></i>' +
        esc(SP()[id].name) + ' ' + n + '/' + max() + '</span>';
    }).join('');
  }

  function renderProgress(){
    var bar = els.side.querySelector('.progress i'), label = els.side.querySelector('[data-progress]');
    if(bar) bar.style.width = Math.round(state.progress*100) + '%';
    if(label) label.textContent = 'Simulating match ' + Math.round(state.progress*(OMEN_RUNS[state.settings.length] || 200)) + ' of ' + (OMEN_RUNS[state.settings.length] || 200) + '…';
  }

  function renderSide(){
    var runs = OMEN_RUNS[state.settings.length] || 200;
    var omens;
    if(state.computing){
      omens = '<div class="progress"><i style="width:' + Math.round(state.progress*100) + '%"></i></div><p data-progress>Simulating match 0 of ' + runs + '…</p>';
    } else if(state.odds){
      var ranked = state.roster.map(function(r, i){ return { i:i, r:r, p:state.odds.probs[i] }; })
        .sort(function(a, b){ return b.p - a.p; });
      omens = ranked.slice(0, 6).map(function(x, k){
        return '<div style="display:flex;flex-direction:column;gap:4px">' +
          '<div style="display:flex;justify-content:space-between;gap:8px;font-family:var(--font-hud);font-size:16px;font-weight:700">' +
            '<span>' + (k === 0 ? 'Favourite: ' : '') + esc(x.r.name) + ' <span class="muted" style="font-weight:500;font-size:13px">' + esc(SP()[x.r.sid].name) + '</span></span>' +
            '<span style="color:var(--a-teal)">' + pct(x.p) + '</span></div>' +
          '<div class="oddsbar"><i style="width:' + Math.max(2, Math.round(x.p/ranked[0].p*100)) + '%"></i></div></div>';
      }).join('') +
      '<p>Long shot: <b>' + esc(ranked[15].r.name) + '</b> at ' + pct(ranked[15].p) + '. Based on ' + state.odds.runs + ' simulated matches.</p>' +
      '<button class="a-btn ghost" data-act="omens">Run them again</button>';
    } else {
      omens = '<p>Simulate ' + runs + ' matches of this exact roster and rules to get each contestant\'s chance of winning. Everyone also gets a hidden form roll, a good or bad day revealed after the match, so nobody is a sure thing. Takes a few seconds.</p>' +
        '<button class="a-btn" data-act="omens">Read the omens</button>';
    }

    var pickLine;
    if(state.pick == null) pickLine = '<p>Pick a winner on any card to put your record on the line. Or just watch.</p>';
    else {
      var pr = state.roster[state.pick];
      pickLine = '<p>You\'re backing <b style="color:var(--a-gold)">' + esc(pr.name) + '</b>, the ' + esc(SP()[pr.sid].name) +
        (state.odds ? ', at ' + pct(state.odds.probs[state.pick]) + '.' : '. Read the omens first to see the odds and score more for an underdog.') + '</p>';
    }

    var rec = record();
    var accuracy = rec.picks ? Math.round(rec.hits/rec.picks*100) + '%' : '—';
    els.side.innerHTML =
      '<div class="panel-a"><h3>Read the omens</h3>' + omens + '</div>' +
      '<div class="panel-a"><h3>Your pick</h3>' + pickLine +
        '<button class="a-btn gold big" data-act="enter">Open the gates</button></div>' +
      '<div class="panel-a"><h3>Your record</h3>' +
        '<div class="record">' +
          '<div><b>' + rec.hits + '/' + rec.picks + '</b><span>called</span></div>' +
          '<div><b>' + rec.streak + '</b><span>streak</span></div>' +
          '<div><b>' + rec.points + '</b><span>points</span></div>' +
        '</div>' +
        '<p class="record-note">' + (rec.upset
          ? 'Best call: ' + esc(rec.upset.name) + ' the ' + esc(SP()[rec.upset.sid] ? SP()[rec.upset.sid].name : rec.upset.sid) + ' at ' + rec.upset.pct + '.'
          : 'Accuracy ' + accuracy + '. Calling an underdog scores more than calling the favourite.') + '</p>' +
      '</div>';
  }

  function render(){
    renderSettings();
    renderTributes();
    renderPool();
    renderSide();
  }

  function enter(){
    if(L.ArenaAudio) L.ArenaAudio.unlock();
    if(!L.ArenaMatch) return;
    L.ArenaMatch.start({
      roster:state.roster.map(function(r){ return { sid:r.sid, name:r.name }; }),
      settings:Object.assign({}, state.settings),
      pick:state.pick == null ? null : { index:state.pick, p:state.odds ? state.odds.probs[state.pick] : null },
      odds:state.odds,
      seed:(Math.random()*4294967296) >>> 0
    });
  }

  function showView(view){
    state.view = view;
    els.host.querySelector('#arenaLobby').hidden = view !== 'lobby';
    els.host.querySelector('#arenaStageView').hidden = view !== 'stage';
    els.host.querySelector('#arenaResultsView').hidden = view !== 'results';
    if(view === 'lobby') render();
  }

  function ensureBuilt(){
    if(state.built) return;
    var host = doc.getElementById('arenaMode');
    var saved = recall('ludus.lobby');
    if(saved && saved.settings) Object.assign(state.settings, saved.settings);
    if(saved && validRoster(saved.roster)) state.roster = saved.roster;
    build(host);
    state.built = true;
    if(!state.roster.length) fillRandom();
    renderPortraits();
    render();
  }

  L.Arena = {
    setActive:function(on){
      state.active = !!on;
      if(on) ensureBuilt();
      if(L.ArenaMatch && L.ArenaMatch.setActive) L.ArenaMatch.setActive(on && state.view === 'stage');
    },
    showView:showView,
    roman:function(i){ return ROMAN[i]; },
    team:function(i){ return TEAM[i]; },
    record:record,
    saveRecord:function(r){ store('ludus.record', r); },
    lobbyState:function(){ return state; },
    portrait:function(sid){ return portraits[sid] || null; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
