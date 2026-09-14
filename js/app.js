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
    try { history.replaceState(null, '', location.pathname + location.search + (mode === 'arena' ? '#arena' : '')); }
    catch(e){ /* file:// in some browsers */ }
  }

  document.querySelectorAll('.mode-tab').forEach(function(b){
    b.addEventListener('click', function(){ setMode(b.dataset.mode); });
  });

  L.setMode = setMode;
  setMode(location.hash === '#arena' ? 'arena' : 'vivarium');
})(window.Ludus = window.Ludus || {});
