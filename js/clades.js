/* Clades: named subspecies that branch off when part of a population drifts away.

   Every animal's genome carries a clade id, inherited unchanged by its offspring.
   Each clade keeps a "type": the average trait genome it was founded with, measured
   in band-normalised units, so 1.0 is a trait's full evolvable range. A periodic
   check looks for a group of members that has drifted at least SPLIT from that
   type. Once a group is big enough, it becomes a daughter clade with its own type
   and a name taken from the direction it moved ("Swift Agouti", "Dwarf Keen-eyed
   Tapir").

   This is a census of divergence rather than reproductive isolation: offspring never
   change clade, so a clade is a true lineage, and a split marks the point where a
   lineage had become measurably different. */
(function(L){
  "use strict";

  var SPLIT = 0.22;      // normalised distance from the clade type that counts as diverged
  var GAP = 0.15;        // ...and the diverged group must also sit this far from the rest of its clade
  var MIN_GROUP = 20;    // diverged members needed before a split is declared
  var MIN_SHARE = 0.2;   // ...and at least this share of the clade
  var MIN_AGE = 120;     // sim-seconds a clade must exist before it can split again
  var MAX_LIVE = 5;      // living subspecies per species, so the tree stays readable

  var WORDS = {
    mass:  ['Dwarf', 'Giant'],
    speed: ['Plodding', 'Swift'],
    sense: ['Dim-eyed', 'Keen-eyed'],
    metab: ['Frugal', 'Ravenous']
  };
  var ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

  function create(TRAITS, BAND, SPECIES){
    var list = [], byId = {}, nextId = 1, rootOf = {}, nameUse = {};

    function norm(g, k){ var b = BAND[k]; return (g[k] - b[0])/(b[1] - b[0]); }
    function dist(a, b){
      var s = 0;
      for(var i=0;i<TRAITS.length;i++){ var d = a[i]-b[i]; s += d*d; }
      return Math.sqrt(s);
    }
    function vec(g){ return TRAITS.map(function(k){ return norm(g, k); }); }

    function add(sid, parent, type, t, name){
      var c = { id:nextId++, sid:sid, parent:parent ? parent.id : 0, depth:parent ? parent.depth+1 : 0,
                type:type, born:t, died:null, name:name, adj:[], n:0, peak:0, history:[] };
      list.push(c); byId[c.id] = c;
      return c;
    }

    function reset(){
      list = []; byId = {}; nextId = 1; rootOf = {}; nameUse = {};
      Object.keys(SPECIES).forEach(function(sid){
        var mid = TRAITS.map(function(k){ var b = BAND[k]; return (1 - b[0])/(b[1] - b[0]); });
        rootOf[sid] = add(sid, null, mid, 0, SPECIES[sid].name);
        nameUse[SPECIES[sid].name] = 1;   // a lineage drifting back is "Capybara II", never the root's name
      });
    }

    /* Every new genome without a clade joins its species' living root lineage. */
    function assign(sid, g){
      if(g.clade && byId[g.clade]) return;
      g.clade = rootOf[sid].id;
    }

    /* Name a daughter from the trait that moved most (and a second one if it also moved a lot). */
    function nameFor(parent, centroid){
      var moves = TRAITS.map(function(k, i){ return { k:k, d:centroid[i] - parent.type[i] }; })
        .sort(function(a, b){ return Math.abs(b.d) - Math.abs(a.d); });
      var adj = parent.adj.slice();
      var pick = function(m){
        var w = WORDS[m.k][m.d > 0 ? 1 : 0], opp = WORDS[m.k][m.d > 0 ? 0 : 1];
        var i = adj.indexOf(opp);
        if(i >= 0) adj.splice(i, 1);          // "Dwarf" reverting to large drops the word
        else if(adj.indexOf(w) < 0) adj.push(w);
      };
      pick(moves[0]);
      if(Math.abs(moves[1].d) > SPLIT*0.6) pick(moves[1]);
      if(adj.length > 2) adj = adj.slice(adj.length - 2);
      var base = (adj.length ? adj.join(' ') + ' ' : '') + SPECIES[parent.sid].name;
      nameUse[base] = (nameUse[base] || 0) + 1;
      var n = nameUse[base];
      return { adj:adj, name:base + (n > 1 ? (ROMAN[n-1] || ' #' + n) : '') };
    }

    /* Census plus split check. Returns the clades founded this call. */
    function update(animals, t){
      var members = {}, born = [];
      list.forEach(function(c){ c.n = 0; });
      for(var i=0;i<animals.length;i++){
        var a = animals[i];
        if(a.dead) continue;
        var c = byId[a.genome.clade];
        if(!c) continue;
        c.n++;
        (members[c.id] = members[c.id] || []).push(a);
      }
      list.slice().forEach(function(c){
        var ms = members[c.id] || [];
        if(c.died == null && !ms.length && t > 0) c.died = t;
        if(c.died != null && ms.length) c.died = null;   // recolonised from a stray survivor
        c.peak = Math.max(c.peak, c.n);
        c.history.push([t, c.n]);
        if(c.history.length > 600) c.history.splice(0, c.history.length - 600);
        if(ms.length < MIN_GROUP || t - c.born < MIN_AGE) return;
        var far = [], fv = [];
        for(var j=0;j<ms.length;j++){
          var v = vec(ms[j].genome);
          if(dist(v, c.type) >= SPLIT){ far.push(ms[j]); fv.push(v); }
        }
        if(far.length < MIN_GROUP || far.length < ms.length*MIN_SHARE) return;
        // Diverged members can scatter in several directions; keep the group nearest their mean.
        var cen = TRAITS.map(function(_, k){ var s = 0; fv.forEach(function(v){ s += v[k]; }); return s/fv.length; });
        var group = [], gv = [];
        for(var q=0;q<far.length;q++) if(dist(fv[q], cen) < dist(fv[q], c.type)){ group.push(far[q]); gv.push(fv[q]); }
        if(group.length < MIN_GROUP) return;
        cen = TRAITS.map(function(_, k){ var s = 0; gv.forEach(function(v){ s += v[k]; }); return s/gv.length; });
        if(dist(cen, c.type) < SPLIT*0.8) return;
        // Cladogenesis, not a whole population drifting together: the group must differ from the rest.
        var inGroup = {}; group.forEach(function(a){ inGroup[a.uid] = 1; });
        var rest = ms.filter(function(a){ return !inGroup[a.uid]; }).map(function(a){ return vec(a.genome); });
        if(rest.length < MIN_GROUP/2) return;
        var rcen = TRAITS.map(function(_, k){ var s = 0; rest.forEach(function(v){ s += v[k]; }); return s/rest.length; });
        if(dist(cen, rcen) < GAP) return;
        var live = 0; list.forEach(function(o){ if(o.sid === c.sid && o.died == null) live++; });
        if(live >= MAX_LIVE) return;
        var nm = nameFor(c, cen);
        var d = add(c.sid, c, cen, t, nm.name);
        d.adj = nm.adj;
        group.forEach(function(a){ a.genome.clade = d.id; });
        d.n = group.length; d.peak = d.n; d.history.push([t, d.n]);
        c.n -= group.length;
        // If nearly the whole parent moved, the daughter is now the species' main line.
        if(c === rootOf[c.sid] && c.n < d.n) rootOf[c.sid] = d;
        born.push({ clade:d, parent:c, share:group.length/ms.length });
      });
      return born;
    }

    reset();
    return {
      reset:reset, assign:assign, update:update,
      all:function(){ return list; },
      get:function(id){ return byId[id]; },
      living:function(sid){ return list.filter(function(c){ return c.died == null && (!sid || c.sid === sid); }); },
      SPLIT:SPLIT
    };
  }

  L.clades = { create:create };
})(window.Ludus = window.Ludus || {});
