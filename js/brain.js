/* Evolvable brains for the Vivarium: small fixed-topology networks whose
   weights ride along in the genome and mutate at reproduction. Herbivores and
   predators sense and act differently, so each role has its own layout. */
(function(L){
  "use strict";

  function gauss(){
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  }

  /* One input→hidden(tanh)→output(tanh) network shape. Weight rows end in a bias. */
  function layout(IN, OUT, NH, I, O){
    var NI = IN.length, NO = OUT.length;
    var W1 = (NI+1)*NH, SIZE = W1 + (NH+1)*NO;
    var lay = {
      IN:IN, OUT:OUT, NI:NI, NH:NH, NO:NO, SIZE:SIZE, I:I, O:O, W1:W1,
      wIn:function(w,h,i,v){ w[h*(NI+1)+i] = v; },
      bIn:function(w,h,v){ w[h*(NI+1)+NI] = v; },
      wOut:function(w,o,h,v){ w[W1+o*(NH+1)+h] = v; },
      bOut:function(w,o,v){ w[W1+o*(NH+1)+NH] = v; },
      weightIn:function(w,h,i){ return w[h*(NI+1)+i]; },
      weightOut:function(w,o,h){ return w[W1+o*(NH+1)+h]; },
      blank:function(noise){
        var w = new Float32Array(SIZE), n = noise==null ? 0.08 : noise;
        for(var k=0;k<SIZE;k++) w[k] = gauss()*n;
        return w;
      },
      /* inp: NI floats; hid: NH floats (written); out: NO floats (written). */
      forward:function(w, inp, hid, out){
        var h, i, s, row;
        for(h=0;h<NH;h++){
          row = h*(NI+1);
          s = w[row+NI];
          for(i=0;i<NI;i++) s += w[row+i]*inp[i];
          hid[h] = Math.tanh(s);
        }
        for(var o=0;o<NO;o++){
          row = W1 + o*(NH+1);
          s = w[row+NH];
          for(h=0;h<NH;h++) s += w[row+h]*hid[h];
          out[o] = Math.tanh(s);
        }
      }
    };
    return lay;
  }

  /* ---------------- herbivores ---------------- */
  var HERB = layout(
    ['threat ↺', 'threat ↑', 'threat near',
     'food ↺', 'food ↑', 'food pull', 'food here',
     'kin ↺', 'kin ↑', 'kin near',
     'crowding', 'energy', 'age', 'can breed',
     'memory 1', 'memory 2'],
    ['turn', 'throttle', 'head down', 'breed', 'memory 1', 'memory 2'], 8,
    { tSin:0, tCos:1, tNear:2, fSin:3, fCos:4, fPull:5, fHere:6, kSin:7, kCos:8, kNear:9,
      crowd:10, energy:11, age:12, canBreed:13, mem1:14, mem2:15 },
    { turn:0, throttle:1, headDown:2, breed:3, mem1:4, mem2:5 });

  /* Hand-wired starting point that roughly reproduces the scripted herbivore:
     steer to food, turn tail on a threat, sprint while one is near, graze with
     the head down only when it's quiet, breed when able. Every weight also gets
     a little noise so unused connections have somewhere to start evolving from. */
  HERB.seed = function(noise, sp){
    var L=HERB, I=L.I, O=L.O, w=L.blank(noise), herd = sp ? sp.herd||0 : 0;
    L.wIn(w,0,I.fSin,1.6);                                  // h0: food is to the left
    L.wIn(w,1,I.tSin,-2.2); L.wIn(w,1,I.tCos,0.9);          // h1: turn away from threat
    L.wIn(w,2,I.tNear,3.0);                                 // h2: threat level
    L.wIn(w,3,I.fHere,6.0); L.bIn(w,3,-1.0);                // h3: food underfoot (> ~0.17)
    L.wIn(w,4,I.canBreed,2.2); L.wIn(w,4,I.energy,5.0); L.bIn(w,4,-6.1); // h4: ready and well fed (~80%)
    L.wIn(w,5,I.kSin,1.2);                                  // h5: kin is to the left
    L.wIn(w,6,I.fPull,2.0);                                 // h6: food worth walking to
    L.wIn(w,7,I.tNear,2.2); L.wIn(w,7,I.mem1,1.4); L.bIn(w,7,-0.4); // h7: recent fright, decays

    L.wOut(w,O.turn,0,0.9); L.wOut(w,O.turn,1,2.4); L.wOut(w,O.turn,5,0.15+herd*1.2); // herding species stick together
    L.wOut(w,O.throttle,2,2.4); L.wOut(w,O.throttle,6,0.9); L.wOut(w,O.throttle,7,0.9); L.bOut(w,O.throttle,-0.5);
    L.wOut(w,O.headDown,3,2.2); L.wOut(w,O.headDown,2,-3.2); L.wOut(w,O.headDown,7,-1.2); L.bOut(w,O.headDown,-0.1);
    L.wOut(w,O.breed,4,2.4);
    L.wOut(w,O.mem1,7,1.2);
    return w;
  };

  /* ---------------- predators ----------------
     "target" is the prey it's locked onto; "other" is the best alternative in
     range (the most catchable one, or the biggest meal if that's the target).
     The switch output swaps them, so prey choice can evolve. */
  var PRED = layout(
    ['target ↺', 'target ↑', 'target near', 'target odds', 'target size',
     'other ↺', 'other ↑', 'other near', 'other odds', 'other size',
     'rival ↺', 'rival near',
     'in reach', 'lunge ready', 'energy', 'age', 'can breed',
     'memory 1', 'memory 2'],
    ['turn', 'throttle', 'lunge', 'breed', 'switch prey', 'memory 1', 'memory 2'], 8,
    { pSin:0, pCos:1, pNear:2, pOdds:3, pSize:4, aSin:5, aCos:6, aNear:7, aOdds:8, aSize:9,
      rSin:10, rNear:11, reach:12, ready:13, energy:14, age:15, canBreed:16, mem1:17, mem2:18 },
    { turn:0, throttle:1, lunge:2, breed:3, swap:4, mem1:5, mem2:6 });

  /* Starting predator, wired to mimic the scripted hunter: turn onto the target
     and run it down (ambushers wait until it's inside strike range), strike
     whenever in reach and recovered, rest once fed past the satiety limit, give
     rivals room, breed near the species' usual threshold. Restraint beyond that
     (holding back a strike, picking prey) is left for selection to find. */
  PRED.seed = function(noise, sp){
    var L=PRED, I=L.I, O=L.O, w=L.blank(noise);
    var thr = sp ? sp.repro.threshold : 0.85, ambush = !!(sp && sp.ambush);
    // closeness reads 0.3 + 0.7·(1 − d/sense); this is its value at the strike range
    var strikeNear = ambush ? 0.3 + 0.7*(1 - sp.strikeRange/sp.sense) : 0;
    L.wIn(w,0,I.pSin,5.0);                                  // h0: target is to the left (steep, so prey behind still turns it)
    L.wIn(w,1,I.pNear,3.0);                                 // h1: a target exists / is close
    if(ambush){ L.wIn(w,2,I.pNear,10.0); L.bIn(w,2,-10.0*strikeNear); } // h2: target inside strike range
    else { L.wIn(w,2,I.pNear,0.5); }
    L.wIn(w,3,I.energy,12.0); L.bIn(w,3,-7.4);              // h3: −1 hungry, +1 fed (switches ~62%, just under the satiety limit)
    L.wIn(w,4,I.canBreed,2.2); L.wIn(w,4,I.energy,5.0); L.bIn(w,4,-(2.2+5*thr)); // h4: ready and at the usual breeding threshold
    L.wIn(w,5,I.reach,3.0); L.wIn(w,5,I.ready,2.0); L.bIn(w,5,-4.0); // h5: strike now
    L.wIn(w,6,I.rSin,-1.5);                                 // h6: rival to the left
    L.wIn(w,7,I.pNear,2.0); L.wIn(w,7,I.mem1,1.2); L.bIn(w,7,-0.5); // h7: still on the hunt

    L.wOut(w,O.turn,0,2.0); L.wOut(w,O.turn,6,0.4);
    if(ambush){ L.wOut(w,O.throttle,2,3.5); L.wOut(w,O.throttle,1,-0.6); L.bOut(w,O.throttle,-1.6); } // ambushers lie still, fed or not
    else {
      L.wOut(w,O.throttle,1,2.0); L.wOut(w,O.throttle,7,0.4); L.bOut(w,O.throttle,-1.5); // roam ~45% when hungry
      L.wOut(w,O.throttle,3,-1.5);                          // fed: stop hunting and rest
    }
    L.wOut(w,O.lunge,5,3.0); L.bOut(w,O.lunge,-1.0);        // strike when in reach and ready
    L.wOut(w,O.breed,4,2.4);
    L.bOut(w,O.swap,-2.0); L.wOut(w,O.swap,3,0);
    L.wOut(w,O.mem1,7,1.2);
    return w;
  };

  /* Gaussian drift on every weight, plus a rare larger jump so lineages can
     escape a local optimum. `rate` is the shared mutation slider (0–0.3). */
  function mutate(w, rate){
    var out = new Float32Array(w.length);
    var sigma = rate*0.6;
    for(var k=0;k<w.length;k++){
      var v = w[k] + gauss()*sigma;
      if(Math.random() < rate*0.02) v += gauss()*0.8;
      out[k] = v<-6 ? -6 : (v>6 ? 6 : v);
    }
    return out;
  }

  function distance(a, b){
    var s=0, n=Math.min(a.length,b.length);
    for(var k=0;k<n;k++){ var d=a[k]-b[k]; s+=d*d; }
    return Math.sqrt(s/n);
  }

  HERB.mutate = PRED.mutate = mutate;
  HERB.distance = PRED.distance = distance;

  L.brain = {
    herbivore:HERB, predator:PRED,
    forRole:function(role){ return role==='predator' ? PRED : HERB; },
    mutate:mutate, distance:distance
  };
})(window.Ludus = window.Ludus || {});
