/* Evolvable brains for the Vivarium: a small fixed-topology network whose
   weights ride along in the genome and mutate at reproduction. */
(function(L){
  "use strict";

  var IN = [
    'threat ↺', 'threat ↑', 'threat near',
    'food ↺', 'food ↑', 'food pull', 'food here',
    'kin ↺', 'kin ↑', 'kin near',
    'crowding', 'energy', 'age', 'can breed',
    'memory 1', 'memory 2'
  ];
  var OUT = ['turn', 'throttle', 'head down', 'breed', 'memory 1', 'memory 2'];
  var NI = IN.length, NH = 8, NO = OUT.length;
  var W1 = (NI+1)*NH;            // input→hidden, bias last in each row
  var SIZE = W1 + (NH+1)*NO;     // + hidden→output

  var I = { tSin:0, tCos:1, tNear:2, fSin:3, fCos:4, fPull:5, fHere:6, kSin:7, kCos:8, kNear:9,
            crowd:10, energy:11, age:12, canBreed:13, mem1:14, mem2:15 };
  var O = { turn:0, throttle:1, headDown:2, breed:3, mem1:4, mem2:5 };

  function wIn(w, h, i, v){ w[h*(NI+1) + i] = v; }
  function bIn(w, h, v){ w[h*(NI+1) + NI] = v; }
  function wOut(w, o, h, v){ w[W1 + o*(NH+1) + h] = v; }
  function bOut(w, o, v){ w[W1 + o*(NH+1) + NH] = v; }

  function gauss(){
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  }

  /* Hand-wired starting point that roughly reproduces the scripted agouti:
     steer to food, turn tail on a threat, sprint while one is near, graze with
     the head down only when it's quiet, breed when able. Every weight also gets
     a little noise so unused connections have somewhere to start evolving from. */
  function seedInstinct(noise){
    var w = new Float32Array(SIZE);
    var n = noise==null ? 0.08 : noise;
    for(var k=0;k<SIZE;k++) w[k] = gauss()*n;

    wIn(w,0,I.fSin,1.6);                                  // h0: food is to the left
    wIn(w,1,I.tSin,-2.2); wIn(w,1,I.tCos,0.9);            // h1: turn away from threat
    wIn(w,2,I.tNear,3.0);                                 // h2: threat level
    wIn(w,3,I.fHere,6.0); bIn(w,3,-1.0);                  // h3: food underfoot (> ~0.17)
    wIn(w,4,I.canBreed,2.2); wIn(w,4,I.energy,5.0); bIn(w,4,-6.1); // h4: ready and well fed (~80%)
    wIn(w,5,I.kSin,1.2);                                  // h5: kin is to the left
    wIn(w,6,I.fPull,2.0);                                 // h6: food worth walking to
    wIn(w,7,I.tNear,2.2); wIn(w,7,I.mem1,1.4); bIn(w,7,-0.4); // h7: recent fright, decays

    wOut(w,O.turn,0,0.9); wOut(w,O.turn,1,2.4); wOut(w,O.turn,5,0.15);
    wOut(w,O.throttle,2,2.4); wOut(w,O.throttle,6,0.9);  wOut(w,O.throttle,7,0.9); bOut(w,O.throttle,-0.5);
    wOut(w,O.headDown,3,2.2); wOut(w,O.headDown,2,-3.2); wOut(w,O.headDown,7,-1.2); bOut(w,O.headDown,-0.1);
    wOut(w,O.breed,4,2.4);
    wOut(w,O.mem1,7,1.2);
    return w;
  }

  /* Gaussian drift on every weight, plus a rare larger jump so lineages can
     escape a local optimum. `rate` is the shared mutation slider (0–0.3). */
  function mutate(w, rate){
    var out = new Float32Array(SIZE);
    var sigma = rate*0.6;
    for(var k=0;k<SIZE;k++){
      var v = w[k] + gauss()*sigma;
      if(Math.random() < rate*0.02) v += gauss()*0.8;
      out[k] = v<-6 ? -6 : (v>6 ? 6 : v);
    }
    return out;
  }

  /* inp: NI floats; hid: NH floats (written); out: NO floats (written). */
  function forward(w, inp, hid, out){
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

  function distance(a, b){
    var s=0;
    for(var k=0;k<SIZE;k++){ var d=a[k]-b[k]; s+=d*d; }
    return Math.sqrt(s/SIZE);
  }

  L.brain = {
    IN:IN, OUT:OUT, NI:NI, NH:NH, NO:NO, SIZE:SIZE, I:I, O:O, W1:W1,
    seedInstinct:seedInstinct, mutate:mutate, forward:forward, distance:distance,
    weightIn:function(w,h,i){ return w[h*(NI+1)+i]; },
    weightOut:function(w,o,h){ return w[W1+o*(NH+1)+h]; }
  };
})(window.Ludus = window.Ludus || {});
