/* Time-lapse: a compact recording of the whole run, for scrubbing back through it.

   Every `every` sim-seconds it stores each animal as four int16s (x, y, species
   index, clade id) plus the vegetation as one byte per plant cell. When the buffer
   fills, every other frame is dropped and the interval doubles, so a recording
   always covers the whole run, just at a coarser grain the longer it goes.
   About 2,000 animals is 16 KB a frame, so the 400-frame cap stays under 10 MB. */
(function(L){
  "use strict";

  var CAP = 400;

  function create(opts){
    var every = (opts && opts.every) || 5, base = every;
    var frames = [], next = 0;

    function reset(){ frames = []; every = base; next = 0; }

    /* sids: species id list (index = stored species number). */
    function record(t, animals, sids, plants){
      if(t < next) return false;
      next = t + every;
      var live = 0, i;
      for(i=0;i<animals.length;i++) if(!animals[i].dead) live++;
      var data = new Int16Array(live*4), k = 0;
      for(i=0;i<animals.length;i++){
        var a = animals[i];
        if(a.dead) continue;
        data[k++] = Math.round(a.x); data[k++] = Math.round(a.y);
        data[k++] = sids.indexOf(a.sid); data[k++] = a.genome.clade || 0;
      }
      var veg = new Uint8Array(plants.foliage.length);
      for(i=0;i<veg.length;i++){
        // 0-199 foliage, 200-254 fruiting, 255 water
        if(plants.water && plants.water[i]) veg[i] = 255;
        else if(plants.fruit[i] > 0.15) veg[i] = 200 + Math.min(54, Math.round(plants.fruit[i]*54));
        else veg[i] = Math.round(Math.min(1, plants.foliage[i])*199);
      }
      frames.push({ t:t, data:data, veg:veg });
      if(frames.length >= CAP){
        frames = frames.filter(function(_, j){ return j%2===0; });
        every *= 2;
      }
      return true;
    }

    return {
      reset:reset, record:record,
      frames:function(){ return frames; },
      count:function(){ return frames.length; },
      at:function(i){ return frames[Math.max(0, Math.min(frames.length-1, i))]; },
      every:function(){ return every; }
    };
  }

  L.timelapse = { create:create };
})(window.Ludus = window.Ludus || {});
