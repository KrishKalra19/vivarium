/* Top-level switch between the Vivarium ecosystem and the Arena.
   Only the visible mode runs; the other is suspended, not just hidden. */
(function(L){
  "use strict";

  var TAGLINES = {
    vivarium: 'a living selection experiment',
    arena: 'sixteen enter, one survives'
  };

  function setMode(mode){
    if(mode !== 'arena') mode = 'vivarium';
    document.querySelectorAll('.mode-tab').forEach(function(b){
      var on = b.dataset.mode === mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.getElementById('vivariumMode').hidden = mode !== 'vivarium';
    document.getElementById('vivStats').hidden = mode !== 'vivarium';
    document.getElementById('arenaMode').hidden = mode !== 'arena';
    document.getElementById('tagline').textContent = TAGLINES[mode];
    if(window.Vivarium) window.Vivarium.setActive(mode === 'vivarium');
    if(L.Arena) L.Arena.setActive(mode === 'arena');
    var hash = mode === 'arena' ? '#arena' : location.hash === '#field' ? '#field' : '';
    try { history.replaceState(null, '', location.pathname + location.search + hash); }
    catch(e){ /* file:// in some browsers */ }
  }

  document.querySelectorAll('.mode-tab').forEach(function(b){
    b.addEventListener('click', function(){ setMode(b.dataset.mode); });
  });

  /* Class link: index.html?seed=1234&mode=brains#field starts every student on the same world.
     Same order as tools/vivarium-run.js (reset, then brainMode, which reseeds from the stream),
     so a link's starting world is the harness's world for that seed and mode. */
  function applyClassLink(){
    var V = window.Vivarium;
    if(!V) return;
    var q = new URLSearchParams(location.search), seed = q.get('seed'), mode = q.get('mode');
    if(seed && /^\d+$/.test(seed) && +seed <= 4294967295) V.reset(+seed);
    if(['instinct','mixed','brains'].indexOf(mode) >= 0 && mode !== V.brainMode()) V.brainMode(mode);
    if(location.hash === '#field'){
      document.querySelector('.tab[data-tab="field"]').click();
      if(window.matchMedia('(max-width:1040px)').matches) document.querySelector('.rail').scrollIntoView();   // the rail sits under the map here
    }
  }
  function classLink(){
    var V = window.Vivarium;
    return location.href.split(/[?#]/)[0] + '?seed=' + V.seed() + '&mode=' + V.brainMode() + '#field';
  }
  function copyClassLink(){
    var link = classLink(), box = document.getElementById('fsLinkText'), note = document.getElementById('fsLinkNote');
    var warn = window.Vivarium.brainMode() === 'instinct' ? ' This world is in Instinct mode: focal and scan samples need Mixed A/B or Brains (Controls → Behaviour).' : '';
    box.value = link; box.hidden = false;
    function done(ok){
      note.textContent = (ok ? 'Copied.' : 'Couldn’t reach the clipboard here: copy the link from the box.') + warn;
      if(!ok) box.select();
    }
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function(){ done(true); }, function(){ done(false); });
    else done(false);   // no clipboard API on file:// pages
  }

  L.setMode = setMode;
  setMode(location.hash === '#arena' ? 'arena' : 'vivarium');
  applyClassLink();
  var copyBtn = document.getElementById('fsCopyLink');
  if(copyBtn) copyBtn.addEventListener('click', copyClassLink);
})(window.Ludus = window.Ludus || {});
