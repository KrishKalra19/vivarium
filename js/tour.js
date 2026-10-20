/* Guided tour of the evolved-brain features. It grows out of the Genetics
   intro ("What am I looking at?"): each step opens the right tab, spotlights
   one control or chart and explains it in plain English. Pure UI: it never
   touches the simulation except through the same buttons a person would press. */
(function(){
  "use strict";

  function $(sel){ return document.querySelector(sel); }
  function brainsOn(){ var g = $('#brainGroup'); return g && !g.hidden; }
  function tab(name){ var t = $('.tab[data-tab="'+name+'"]'); if(t && !t.classList.contains('active')) t.click(); }

  /* Each step: tab to open, target to spotlight (selector or function), title, text.
     `brains` steps need a Mixed or Brains world; in Instinct they're skipped. */
  var STEPS = [
    { tab:'controls', target:'#brainSeg', title:'Three ways to run the forest',
      text:'<b>Instinct</b> runs every animal on hand-written rules. <b>Brains</b> gives every animal a small neural network instead. '+
           '<b>Mixed A/B</b> splits each species in half, so brains and instinct compete in the same forest.',
      action:{ label:'Switch to Mixed for me', when:function(){ return !brainsOn(); },
               run:function(){ var b=$('#brainSeg [data-mode="mixed"]'); if(b) b.click(); } } },
    { tab:'controls', target:'#evolveBtn', title:'Evolve, then challenge',
      text:'Brains start out hand-wired to copy instinct. This runs a brains-only forest on turbo for 10 sim-minutes, '+
           'so selection can reshape them, then drops the evolved brains into a Mixed forest against instinct.' },
    { tab:'controls', target:'#turboBtn', title:'Turbo',
      text:'Evolution needs generations. Turbo runs the simulation as fast as your device allows and draws less often.' },
    { target:'.viewport', title:'Brains on the map',
      text:'Teal rings mark animals driven by a brain. Click any animal to follow it; its Specimen card shows what its brain is doing.' },
    { tab:'genetics', target:'#brainSpeciesSeg', brains:true, title:'Pick a species',
      text:'Every species has its own brains and its own charts. Predators decide which prey to chase and when to strike; herbivores decide when to graze, flee and breed.' },
    { tab:'genetics', target:function(){ var c=$('#chartLineage'); return c && c.closest('.card'); }, brains:true, title:'Who is winning',
      text:'Brain versus instinct head-count for the chosen species. Dashed lines mark events: a lineage taking the lead, every tenth generation, a prey species vanishing, a predator boom.' },
    { tab:'genetics', target:'.card.story', brains:true, title:'What\'s happening',
      text:'A plain-English read-out of how the brain lineage now behaves differently from instinct, and how much its wiring has drifted from the starting brain.' },
    { tab:'genetics', target:function(){
        var cards = document.querySelectorAll('#brainGroup [data-metric]');
        for(var i=0;i<cards.length;i++) if(!cards[i].hidden) return cards[i];
        return null;
      }, brains:true, title:'Behaviour charts',
      text:'Teal is the brain lineage, the other colour is instinct. Tap any chart to enlarge it and hover for exact values.' },
    { target:'.tab[data-tab="specimen"]', title:'Specimen',
      text:'Follow one animal: its traits, what its brain intends right now, the live network, and the top three ways its wiring differs from the starting brain.' },
    { target:'.tab[data-tab="log"]', title:'Field log',
      text:'Notable hunts, takeovers, extinctions and recolonisations, newest first. That\'s the tour. Reopen it any time from the Genetics intro.' }
  ];

  var ui = null, at = 0, list = [];

  function build(){
    ui = {
      shade: document.createElement('div'),
      ring: document.createElement('div'),
      card: document.createElement('div')
    };
    ui.shade.className = 'tour-shade';
    ui.ring.className = 'tour-ring';
    ui.card.className = 'tour-card';
    ui.card.setAttribute('role', 'dialog');
    ui.card.setAttribute('aria-live', 'polite');
    ui.shade.addEventListener('click', stop);
    document.body.appendChild(ui.shade);
    document.body.appendChild(ui.ring);
    document.body.appendChild(ui.card);
  }

  function targetOf(s){
    var t = typeof s.target === 'function' ? s.target() : $(s.target);
    return t && t.getClientRects().length ? t : null;
  }

  function place(){
    if(!ui) return;
    var s = list[at], t = targetOf(s), pad = 6, vw = window.innerWidth, vh = window.innerHeight;
    var r = t ? t.getBoundingClientRect() : null;
    if(r){
      ui.ring.hidden = false;
      ui.ring.style.left = (r.left-pad)+'px'; ui.ring.style.top = (r.top-pad)+'px';
      ui.ring.style.width = (r.width+pad*2)+'px'; ui.ring.style.height = (r.height+pad*2)+'px';
    } else ui.ring.hidden = true;
    var cw = Math.min(340, vw-32), x, y;
    ui.card.style.width = cw+'px';
    var ch = ui.card.offsetHeight;
    if(vw < 640 || !r){
      x = (vw-cw)/2; y = vh-ch-16;                       // phones: a bottom sheet
    } else {
      x = r.left + r.width/2 - cw/2;
      y = r.bottom + 14;
      if(y+ch > vh-12) y = r.top - ch - 14;               // no room below: go above
      if(y < 12){ y = Math.min(vh-ch-12, r.top + 12); x = r.left - cw - 14; if(x < 12) x = r.right + 14; }
    }
    ui.card.style.left = Math.max(16, Math.min(vw-cw-16, x))+'px';
    ui.card.style.top = Math.max(12, Math.min(vh-ch-12, y))+'px';
  }

  function show(i){
    at = i;
    var s = list[at];
    if(s.tab) tab(s.tab);
    var t = targetOf(s);
    // phones show the card as a bottom sheet, so bring the target up top
    if(t) t.scrollIntoView({ block: window.innerWidth < 640 ? 'start' : 'nearest', inline:'nearest' });
    var act = s.action && s.action.when() ? '<button class="btn" data-tour="act">'+s.action.label+'</button>' : '';
    ui.card.innerHTML =
      '<div class="tour-step">'+(at+1)+' of '+list.length+'</div>'+
      '<h4>'+s.title+'</h4><p>'+s.text+'</p>'+
      (!brainsOn() && at===0 ? '<p class="tour-note">The brain charts appear once the forest runs Mixed or Brains.</p>' : '')+
      '<div class="tour-btns">'+act+
        '<button class="btn quiet" data-tour="stop">Skip</button>'+
        (at>0 ? '<button class="btn quiet" data-tour="back">Back</button>' : '')+
        '<button class="btn" data-tour="next">'+(at===list.length-1 ? 'Done' : 'Next')+'</button>'+
      '</div>';
    place();
    requestAnimationFrame(place);   // after tab switches and scrolling settle
    setTimeout(place, 320);
    var nb = ui.card.querySelector('[data-tour="next"]');
    if(nb) nb.focus({ preventScroll:true });
  }

  /* The step list is rebuilt whenever the tour moves, so switching to Mixed
     mid-tour brings the brain steps in. */
  function steps(){ return STEPS.filter(function(s){ return !s.brains || brainsOn(); }); }

  function go(d){
    var cur = list[at];
    list = steps();
    var i = list.indexOf(cur);
    i = (i<0 ? at : i) + d;
    if(i >= list.length){ stop(); return; }
    show(Math.max(0, i));
  }

  function onClick(e){
    var b = e.target.closest('[data-tour]');
    if(!b) return;
    var k = b.getAttribute('data-tour');
    if(k==='next') go(1);
    else if(k==='back') go(-1);
    else if(k==='stop') stop();
    else if(k==='act'){ list[at].action.run(); setTimeout(function(){ go(0); }, 50); }
  }
  function onKey(e){
    if(!ui) return;
    if(e.key==='Escape') stop();
    else if(e.key==='ArrowRight') go(1);
    else if(e.key==='ArrowLeft') go(-1);
  }

  function start(){
    if(!ui){ build(); ui.card.addEventListener('click', onClick); }
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.body.classList.add('touring');
    list = steps();
    show(0);
  }
  function stop(){
    if(!ui) return;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    document.body.classList.remove('touring');
    ['shade','ring','card'].forEach(function(k){ ui[k].remove(); });
    ui = null;
  }

  // Launchers live in the Genetics intro and the Behaviour group; they may be built later.
  document.addEventListener('click', function(e){
    if(e.target.closest('[data-tour-start]')){ e.preventDefault(); start(); }
  });

  window.VivTour = { start:start, stop:stop };
})();
