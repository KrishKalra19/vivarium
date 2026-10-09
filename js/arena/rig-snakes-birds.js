/* Cartoon rigs for the Arena: the anaconda, the bushmaster and the harpy eagle.

   Snakes are a chain of body segments running back from 'body0', with 'neck' and 'head'
   raised in front, so the shared face and look-at code still work. The eagle keeps the
   usual hips/chest/neck/head and adds folding wings. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};
  var M = L.RigModels = L.RigModels || {};

  var SEGS = 10;

  // o: { color, belly, pattern, patternKind:'ovals'|'diamonds', r:[SEGS], tri, iris, slit, brow, fangs }
  M.snake = function(B, o){
    B.bone('root', null, 0, 0, 0);
    for(var k=0; k<SEGS; k++){
      var r = o.r[k], name = 'body' + k;
      if(k === 0) B.bone(name, 'root', 1.0, o.r[0], 0);
      else B.bone(name, 'body' + (k - 1), -0.42, 0, 0, 0, k === 1 ? 0.2 : (k % 2 ? 0.3 : -0.3), 0);
      B.part(name, 'sphere', -0.21, 0, 0, 0.32, r*0.9, r, o.color);
      B.part(name, 'sphere', -0.21, -r*0.45, 0, 0.3, r*0.5, r*0.82, o.belly);
      if(o.patternKind === 'diamonds'){
        B.patch(name, -0.21, 0, 0, 0.32, r*0.9, r, 0, 1.45, r*0.55, 0.03, o.pattern);
      } else if(k % 2 === 0){
        B.patch(name, -0.21, 0, 0, 0.32, r*0.9, r, 1.3, 0.5, r*0.45, 0.03, o.pattern);
        B.patch(name, -0.21, 0, 0, 0.32, r*0.9, r, -1.3, 0.5, r*0.45, 0.03, o.pattern);
      } else {
        B.patch(name, -0.21, 0, 0, 0.32, r*0.9, r, 0, 1.4, r*0.5, 0.03, o.pattern);
      }
    }
    B.bone('neck', 'body0', 0.28, 0.12, 0, 0, 0, 0.45);
    B.part('neck', 'sphere', 0, 0, 0, 0.24, o.r[0]*0.8, o.r[0]*0.85, o.color);
    B.bone('head', 'neck', 0.26, 0.06, 0, 0, 0, -0.45);
    if(o.tri){
      B.part('head', 'sphere', 0.02, 0.02, 0, 0.3, 0.17, 0.3, o.color);
      B.part('head', 'sphere', 0.28, -0.02, 0, 0.2, 0.11, 0.15, o.color);
      B.patch('head', 0.02, 0.02, 0, 0.3, 0.17, 0.3, 0, 1.3, 0.1, 0.03, o.pattern);
    } else {
      B.part('head', 'sphere', 0.08, 0.02, 0, 0.32, 0.18, 0.24, o.color);
      B.part('head', 'sphere', 0.3, -0.02, 0, 0.16, 0.12, 0.18, o.color);
    }
    B.part('head', 'sphere', 0.44, 0.02, 0.05, 0.02, 0.02, 0.02, 0x15100C);
    B.part('head', 'sphere', 0.44, 0.02, -0.05, 0.02, 0.02, 0.02, 0x15100C);
    if(o.fangs){
      B.part('head', 'cone', 0.34, -0.11, 0.07, 0.02, 0.12, 0.02, 0xFFF8EC, Math.PI, 0, 0);
      B.part('head', 'cone', 0.34, -0.11, -0.07, 0.02, 0.12, 0.02, 0xFFF8EC, Math.PI, 0, 0);
    }
    B.bone('jaw', 'head', 0.02, -0.08, 0);
    B.part('jaw', 'sphere', 0.2, -0.03, 0, 0.28, 0.05, 0.2, o.belly);
    B.part('jaw', 'sphere', 0.2, 0.01, 0, 0.24, 0.025, 0.16, 0xC0605A);
    B.bone('tongue', 'jaw', 0.18, 0.01, 0);
    B.part('tongue', 'sphere', 0.12, 0, 0, 0.14, 0.015, 0.025, 0xC8354A);
    B.part('tongue', 'sphere', 0.27, 0, 0.025, 0.05, 0.012, 0.012, 0xC8354A, 0, -0.4, 0);
    B.part('tongue', 'sphere', 0.27, 0, -0.025, 0.05, 0.012, 0.012, 0xC8354A, 0, 0.4, 0);
    M.face(B, { eyeX:0.26, eyeY:0.15, eyeZ:0.16, eyeR:0.13, iris:o.iris, pupilSlit:o.slit, lid:o.color,
                brow:o.brow, browX:0.29, browY:0.3, top:0.3, side:0.3 });
  };

  function snakeGait(P, st, lw){
    if(lw < 0.001) return;
    var ph = st.phase*Math.PI*2;
    for(var k=0; k<SEGS; k++) P.rot('body' + k, 0, Math.sin(ph*0.9 - k*0.9)*0.26*lw, 0);
    P.rot('neck', 0, -Math.sin(ph*0.9 + 0.9)*0.18*lw, 0);
  }
  function snakeIdle(P, st){
    for(var k=1; k<SEGS; k++) P.rot('body' + k, 0, Math.sin(st.t*0.8 - k*0.7)*0.05, 0);
    if(st.dead) return;
    var flick = (st.t % 2.3) < 0.45 ? Math.abs(Math.sin((st.t % 2.3)*28)) : 0;
    if(flick > 0) P.face({ tongue:flick, jaw:0.08 }, 0.5);
  }

  /* ----- green anaconda: sleepy, until it isn't ----- */
  M.anaconda = {
    height:0.9, length:4.4, voice:'hiss', personality:'sleepy', snake:true,
    fx:{ kind:'scale', color:0x4F6B3A }, moodMap:{ calm:'drowsy' },
    moves:[{ clip:'constrict', label:'Constrict' }, { clip:'pounce', label:'Ambush strike' }, { clip:'bite', label:'Bite' }],
    gait:snakeGait, idle:snakeIdle,
    build:function(B){
      M.snake(B, { color:0x4F6B3A, belly:0xC9B868, pattern:0x20301A, patternKind:'ovals',
        r:[0.26, 0.3, 0.32, 0.33, 0.32, 0.3, 0.26, 0.21, 0.15, 0.09], iris:0xC9B03A, slit:false, brow:0x20301A });
    }
  };

  /* ----- bushmaster: creepily calm, venomous ----- */
  M.bushmaster = {
    height:0.8, length:4.0, nocturnal:true, voice:'hiss', personality:'creepy', snake:true,
    fx:{ kind:'scale', color:0xB58A55 }, moodMap:{ calm:'creepy', drowsy:'creepy' },
    moves:[{ clip:'venom', label:'Venom strike' }, { clip:'pounce', label:'Ambush strike' }, { clip:'bite', label:'Bite' }],
    gait:snakeGait, idle:snakeIdle,
    build:function(B){
      M.snake(B, { color:0xB58A55, belly:0xE3CFA2, pattern:0x3A2A1C, patternKind:'diamonds', tri:true, fangs:true,
        r:[0.2, 0.23, 0.25, 0.26, 0.25, 0.23, 0.2, 0.16, 0.12, 0.07], iris:0xD9A13A, slit:true, brow:0x3A2A1C });
    }
  };

  /* ----- harpy eagle: a smug diva ----- */
  M.harpy = {
    height:2.1, length:1.6, voice:'screech', personality:'diva', bird:true,
    fx:{ kind:'feather', color:0x8C9096 }, moodMap:{ calm:'proud' },
    moves:[{ clip:'pounce', label:'Talon dive' }, { clip:'swipe', label:'Wing buffet' }, { clip:'bite', label:'Peck' }],
    gait:function(P, st, lw, run){
      // In a match the engine's altitude drives flight and the stage lifts the body itself.
      var engineFly = st.fly != null, ph = st.phase*Math.PI*2;
      var fly = engineFly ? st.fly : run*lw, walk = engineFly ? lw*(1 - st.fly) : lw*(1 - run);
      if(engineFly){ P.pair('wing', 0, 0, 0); }
      P.rot('thighL', 0, 0, Math.sin(ph)*0.5*walk).rot('thighR', 0, 0, -Math.sin(ph)*0.5*walk);
      P.pos('hips', 0, Math.abs(Math.sin(ph))*0.06*walk, 0);
      P.rot('neck', 0, 0, Math.sin(ph*2)*0.14*walk);
      if(fly > 0.01) M.harpyFly(P, st.t, fly, null, engineFly ? 0 : 1);
    },
    idle:function(P, st){
      if(st.dead) return;
      if(!st.look) P.rot('head', 0, Math.round(Math.sin(st.t*0.9)*2)*0.22, 0);
      var k = st.t % 6;
      if(k < 0.6){ var b = Math.sin(k/0.6*Math.PI); P.pair('wing', -0.25*b, 0.45*b, 0); }
    },
    build:function(B){
      var GREY = 0x6E747B, DARK = 0x2B2E33, WHITE = 0xEEF0F1, PALE = 0xC9CDD1, YELLOW = 0xE8C23A;
      B.bone('root', null, 0, 0, 0);
      B.bone('hips', 'root', -0.1, 1.05, 0);
      B.part('hips', 'sphere', 0, 0, 0, 0.45, 0.5, 0.42, GREY);
      B.part('hips', 'sphere', 0.15, -0.08, 0, 0.35, 0.42, 0.36, WHITE);
      B.bone('chest', 'hips', 0.25, 0.22, 0);
      B.part('chest', 'sphere', 0, 0.05, 0, 0.38, 0.4, 0.38, GREY);
      B.part('chest', 'sphere', 0.2, 0, 0, 0.22, 0.14, 0.34, DARK);
      B.bone('neck', 'chest', 0.2, 0.28, 0);
      B.part('neck', 'sphere', 0, 0, 0, 0.22, 0.24, 0.24, 0x9AA0A6);
      B.bone('head', 'neck', 0.1, 0.24, 0);
      B.part('head', 'sphere', 0, 0.05, 0, 0.32, 0.3, 0.3, PALE);
      [0.1, 0, -0.1].forEach(function(z, i){
        B.part('head', 'cone', -0.14, 0.3 + (i === 1 ? 0.04 : 0), z, 0.06, 0.34, 0.06, DARK, z*2, 0, 0.7);
      });
      B.part('head', 'cone', 0.36, -0.03, 0, 0.09, 0.26, 0.1, DARK, 0, 0, -Math.PI/2);
      B.part('head', 'sphere', 0.46, -0.09, 0, 0.05, 0.07, 0.05, DARK);
      B.bone('jaw', 'head', 0.22, -0.1, 0);
      B.part('jaw', 'sphere', 0.1, -0.01, 0, 0.12, 0.035, 0.07, DARK);
      B.bone('tongue', 'jaw', 0.05, 0.01, 0);
      B.part('tongue', 'sphere', 0.05, 0, 0, 0.06, 0.015, 0.03, 0xC8354A);
      M.face(B, { eyeX:0.22, eyeY:0.08, eyeZ:0.16, eyeR:0.13, iris:0x2A1E18, lid:PALE,
                  brow:DARK, browX:0.25, browY:0.22, top:0.4, side:0.32 });

      ['L', 'R'].forEach(function(side){
        var z = side === 'L' ? 1 : -1;
        B.bone('wing' + side, 'chest', -0.1, 0.12, 0.34*z, 0, -1.35*z, 0);
        // Parts droop a little so folded wings hug the body instead of sticking out like oars.
        B.part('wing' + side, 'sphere', -0.04, -0.1, 0.3*z, 0.26, 0.05, 0.34, DARK, 0.35*z, 0, 0);
        B.part('wing' + side, 'sphere', 0.05, -0.07, 0.25*z, 0.15, 0.055, 0.27, GREY, 0.35*z, 0, 0);
        B.bone('wingTip' + side, 'wing' + side, 0, -0.2, 0.58*z);
        B.part('wingTip' + side, 'sphere', -0.1, -0.08, 0.22*z, 0.24, 0.04, 0.28, DARK, 0.35*z, 0, 0);
        for(var f=0; f<3; f++) B.part('wingTip' + side, 'sphere', -0.2 - f*0.09, -0.15, (0.42 - f*0.05)*z, 0.07, 0.03, 0.12, DARK, 0.35*z, 0.3*z, 0);
        B.bone('thigh' + side, 'hips', 0.05, -0.32, 0.17*z);
        B.part('thigh' + side, 'sphere', 0, -0.1, 0, 0.14, 0.2, 0.12, WHITE);
        B.bone('knee' + side, 'thigh' + side, 0, -0.28, 0);
        B.part('knee' + side, 'sphere', 0, -0.17, 0, 0.05, 0.2, 0.05, YELLOW);
        [-0.06, 0, 0.06].forEach(function(tz){
          B.part('knee' + side, 'cone', 0.08, -0.37, tz, 0.025, 0.12, 0.025, DARK, 0, 0, -1.3);
        });
      });
      B.bone('tail1', 'hips', -0.38, -0.02, 0, 0, 0, 0.3);
      B.part('tail1', 'sphere', -0.26, 0, 0, 0.32, 0.04, 0.22, DARK);
      B.part('tail1', 'sphere', -0.3, 0.01, 0, 0.06, 0.045, 0.2, GREY);
    }
  };

  // Wings out and beating; shared by the flying gait and the eagle's actions.
  M.harpyFly = function(P, t, w, rate, lift){
    var flap = Math.sin(t*(rate || 11));
    P.pair('wing', -flap*0.75*w, 1.35*w, 0);
    P.pair('wingTip', -flap*0.35*w, 0.25*w, 0);
    P.move(0, (1.3*(lift == null ? 1 : lift) + flap*0.08)*w, 0, 0, 0, -0.2*w);
    P.pair('thigh', 0, 0, -0.9*w);
    P.pair('knee', 0, 0, 0.6*w);
  };
})(typeof window !== 'undefined' ? window : globalThis);
