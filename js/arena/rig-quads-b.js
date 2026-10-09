/* Cartoon rigs for the Arena: the giant otter, black caiman, howler monkey and spider
   monkey. Uses the four-legged helpers from rig-quads.js. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};
  var M = L.RigModels = L.RigModels || {};
  var Q = M.Q;

  /* ----- giant otter: hyper, chattering, never still ----- */
  M.otter = {
    height:1.3, length:3.0, voice:'chatter', personality:'hyper',
    fx:{ kind:'fur', color:0x5B3A26 }, moodMap:{ calm:'eager' },
    moves:[{ clip:'bite', label:'Bite flurry' }, { clip:'pounce', label:'Lunge' }, { clip:'swipe', label:'Paw swat' }],
    idle:function(P, st){
      if(st.dead) return;
      P.pos('chest', 0, Math.abs(Math.sin(st.t*6))*0.025, 0);
      if(!st.look) P.rot('head', Math.sin(st.t*2.3)*0.18, Math.sin(st.t*3.1)*0.2, 0);
      var chatter = (st.t % 3.2) < 0.9;
      if(chatter) P.face({ jaw:Math.sin(st.t*22) > 0.3 ? 0.4 : 0.05 }, 0.5);
    },
    build:function(B){
      var FUR = 0x5B3A26, BIB = 0xE6CFA6, MUZ = 0x7A5238, DARK = 0x2E1C12;
      Q.spine(B, { hipsX:-0.6, hipsY:0.62, chestX:1.0, chestY:0.06 });
      B.part('hips', 'sphere', 0, 0.02, 0, 0.72, 0.38, 0.38, FUR);
      B.part('chest', 'sphere', 0, 0.04, 0, 0.68, 0.4, 0.38, FUR);
      Q.neckHead(B, { neck:[0.5, 0.18], head:[0.3, 0.18] });
      B.part('neck', 'sphere', 0, 0, 0, 0.3, 0.3, 0.3, FUR);
      B.part('neck', 'sphere', 0.14, -0.06, 0.02, 0.2, 0.2, 0.24, BIB);
      B.part('head', 'sphere', 0.02, 0.02, 0, 0.38, 0.32, 0.36, FUR);
      B.part('head', 'sphere', 0.28, -0.08, 0, 0.18, 0.14, 0.2, MUZ);
      B.part('head', 'sphere', 0.44, -0.02, 0, 0.07, 0.05, 0.08, 0x1E140E);
      [1, -1].forEach(function(z){
        for(var w=0; w<2; w++) B.part('head', 'cyl', 0.36, -0.08 - w*0.04, 0.17*z, 0.006, 0.26, 0.006, 0xF4EEE2, 1.2*z, 0, 0.15 - w*0.2);
      });
      Q.jaw(B, { at:[0.14, -0.2], len:0.2, w:0.16, h:0.07, color:MUZ, fangs:true });
      Q.ears(B, { type:'tiny', x:-0.1, y:0.26, z:0.28, s:0.9, fur:FUR });
      M.face(B, { eyeX:0.27, eyeY:0.1, eyeZ:0.18, eyeR:0.14, iris:0x1E140E, lid:FUR,
                  brow:DARK, browX:0.3, browY:0.26, top:0.34, side:0.36 });
      Q.legs(B, { hipsY:0.62, chestY:0.06, front:[0.3, -0.2, 0.28], hind:[-0.2, -0.18, 0.28],
                  rf:[0.11, 0.09], rh:[0.11, 0.09], paw:[0.15, 0.05, 0.14], fur:FUR, paws:0x3A2418 });
      Q.tail(B, { at:[-0.66, 0.02], n:4, seg:0.3, r:[0.18, 0.13, 0.09, 0.05], rot:[0.3, 0.05, -0.1, -0.1], color:FUR, flat:0.6 });
    }
  };

  /* ----- black caiman: a grumpy old man in armour ----- */
  M.caiman = {
    height:0.9, length:4.0, nocturnal:true, voice:'bellow', personality:'grumpy',
    fx:{ kind:'scale', color:0x3E4A33 }, moodMap:{ calm:'grumpy', happy:'grumpy', proud:'grumpy', eager:'grumpy' },
    moves:[{ clip:'deathroll', label:'Death roll' }, { clip:'pounce', label:'Ambush' }, { clip:'bite', label:'Snap' }],
    idle:function(P, st){
      for(var k=1; k<=5; k++) P.rot('tail' + k, 0, Math.sin(st.t*0.6 - k*0.5)*0.06, 0);
    },
    build:function(B){
      var SCALE = 0x3E4A33, DARK = 0x2A3322, BELLY = 0xBDB78E, WHITE = 0xFFF8EC;
      Q.spine(B, { hipsX:-0.5, hipsY:0.5, chestX:0.95, chestY:0.02 });
      B.part('hips', 'sphere', 0, 0, 0, 0.75, 0.3, 0.48, SCALE);
      B.part('chest', 'sphere', 0, 0.02, 0, 0.7, 0.32, 0.5, SCALE);
      B.part('chest', 'sphere', 0, -0.14, 0, 0.62, 0.16, 0.42, BELLY);
      for(var i=0; i<8; i++){
        var bone = i < 4 ? 'hips' : 'chest', x = -0.45 + (i % 4)*0.3;
        B.part(bone, 'cone', x, 0.28, 0.14, 0.05, 0.1, 0.05, DARK);
        B.part(bone, 'cone', x, 0.28, -0.14, 0.05, 0.1, 0.05, DARK);
      }
      Q.neckHead(B, { neck:[0.5, 0.02], head:[0.3, 0.03] });
      B.part('neck', 'sphere', 0, 0, 0, 0.3, 0.26, 0.36, SCALE);
      B.part('head', 'sphere', 0, 0.05, 0, 0.34, 0.22, 0.32, SCALE);
      B.part('head', 'sphere', 0.55, -0.02, 0, 0.5, 0.12, 0.22, SCALE);
      B.part('head', 'sphere', 1.0, 0.06, 0, 0.08, 0.05, 0.09, DARK);
      B.part('head', 'sphere', 0.12, 0.14, 0.16, 0.14, 0.12, 0.14, SCALE);
      B.part('head', 'sphere', 0.12, 0.14, -0.16, 0.14, 0.12, 0.14, SCALE);
      for(var t=0; t<5; t++){
        B.part('head', 'cone', 0.3 + t*0.14, -0.12, 0.17 - t*0.012, 0.022, 0.07, 0.022, WHITE, Math.PI, 0, 0);
        B.part('head', 'cone', 0.3 + t*0.14, -0.12, -0.17 + t*0.012, 0.022, 0.07, 0.022, WHITE, Math.PI, 0, 0);
      }
      Q.jaw(B, { at:[0.02, -0.1], len:0.55, w:0.2, h:0.09, color:BELLY, mouth:0xD9A07A });
      for(var u=0; u<4; u++){
        B.part('jaw', 'cone', 0.35 + u*0.16, 0.06, 0.15 - u*0.015, 0.02, 0.06, 0.02, WHITE);
        B.part('jaw', 'cone', 0.35 + u*0.16, 0.06, -0.15 + u*0.015, 0.02, 0.06, 0.02, WHITE);
      }
      M.face(B, { eyeX:0.18, eyeY:0.25, eyeZ:0.19, eyeR:0.13, iris:0xC9A33A, pupilSlit:true, lid:SCALE,
                  brow:DARK, browX:0.16, browY:0.34, top:0.36, side:0.34 });
      Q.legs(B, { hipsY:0.5, chestY:0.02, front:[0.25, -0.1, 0.42], hind:[-0.1, -0.08, 0.45], splay:0.55,
                  rf:[0.12, 0.1], rh:[0.13, 0.1], paw:[0.16, 0.05, 0.14], fur:SCALE });
      Q.tail(B, { at:[-0.7, 0.02], n:5, seg:0.4, r:[0.28, 0.23, 0.17, 0.12, 0.07], rot:[0.1, -0.03, 0, 0, 0], color:SCALE });
      for(var c=1; c<=4; c++) B.part('tail' + c, 'cone', -0.2, 0.22 - c*0.04, 0, 0.05, 0.11, 0.04, DARK);
    }
  };

  /* ----- howler monkey: a dramatic loudmouth ----- */
  M.howler = {
    height:1.8, length:2.0, voice:'howl', personality:'dramatic',
    fx:{ kind:'fur', color:0x7A3520 },
    moves:[{ clip:'howl', label:'Howl' }, { clip:'swipe', label:'Slap' }, { clip:'bite', label:'Bite' }],
    idle:function(P, st){
      if(st.dead) return;
      var k = (st.t % 6.5);
      if(k < 0.9){ var b = Math.sin(k/0.9*Math.PI); P.face({ jaw:0.7*b }, 0.5); P.rot('neck', 0, 0, 0.25*b); }
      for(var i=1; i<=5; i++) P.rot('tail' + i, Math.sin(st.t*1.2 - i*0.6)*0.08, 0, 0);
    },
    build:function(B){
      var FUR = 0x7A3520, BEARD = 0x5E2616, FACE = 0x2A1A14;
      Q.spine(B, { hipsX:-0.3, hipsY:0.95, chestX:0.62, chestY:0.12 });
      B.part('hips', 'sphere', 0, 0, 0, 0.42, 0.4, 0.36, FUR);
      B.part('chest', 'sphere', 0, 0.05, 0, 0.44, 0.46, 0.4, FUR);
      Q.neckHead(B, { neck:[0.28, 0.24], head:[0.2, 0.28] });
      B.part('neck', 'sphere', 0, 0, 0, 0.24, 0.26, 0.26, FUR);
      B.part('head', 'sphere', 0, 0.06, 0, 0.36, 0.34, 0.36, FUR);
      B.part('head', 'sphere', 0.22, 0, 0, 0.16, 0.26, 0.26, FACE);
      B.part('head', 'sphere', 0.12, -0.28, 0, 0.22, 0.2, 0.24, BEARD);
      B.part('head', 'sphere', 0.38, -0.02, 0, 0.04, 0.04, 0.08, 0x1A100C);
      Q.jaw(B, { at:[0.2, -0.14], len:0.16, w:0.15, h:0.06, color:FACE, fangs:true });
      Q.ears(B, { type:'tiny', x:-0.05, y:0.15, z:0.33, s:0.9, fur:FACE });
      M.face(B, { eyeX:0.3, eyeY:0.1, eyeZ:0.12, eyeR:0.12, iris:0x5A3018, lid:FACE,
                  brow:0x1A100C, browX:0.33, browY:0.24, top:0.42, side:0.36 });
      Q.legs(B, { hipsY:0.95, chestY:0.12, front:[0.12, -0.1, 0.28], hind:[-0.05, -0.1, 0.26],
                  rf:[0.11, 0.09], rh:[0.1, 0.09], paw:[0.1, 0.06, 0.1], fur:FUR, paws:FACE });
      Q.tail(B, { at:[-0.38, 0.1], n:5, seg:0.3, r:[0.07, 0.065, 0.06, 0.055, 0.05], rot:[-1.0, -0.4, -0.4, -0.5, -0.9], color:FUR });
    }
  };

  /* ----- spider monkey: a cheeky trickster, all limbs and tail ----- */
  M.spider = {
    height:2.0, length:1.8, voice:'screech', personality:'cheeky',
    fx:{ kind:'fur', color:0x3E322A }, moodMap:{ calm:'cheeky' },
    moves:[{ clip:'swipe', label:'Slap' }, { clip:'bite', label:'Bite' }, { clip:'flip', label:'Backflip' }],
    idle:function(P, st){
      if(st.dead) return;
      for(var i=1; i<=6; i++) P.rot('tail' + i, 0, Math.sin(st.t*1.8 - i*0.7)*0.12, Math.sin(st.t*1.1 - i*0.5)*0.05*i);
      P.rot('head', Math.sin(st.t*1.4)*0.12, 0, 0);
    },
    build:function(B){
      var FUR = 0x3E322A, PALE = 0xD9B08A, BELLY = 0xC9A27E;
      Q.spine(B, { hipsX:-0.25, hipsY:1.15, chestX:0.5, chestY:0.12 });
      B.part('hips', 'sphere', 0, 0, 0, 0.34, 0.32, 0.3, FUR);
      B.part('chest', 'sphere', 0, 0.05, 0, 0.36, 0.36, 0.32, FUR);
      B.part('chest', 'sphere', 0.04, -0.12, 0, 0.26, 0.22, 0.24, BELLY);
      Q.neckHead(B, { neck:[0.24, 0.22], head:[0.18, 0.24] });
      B.part('neck', 'sphere', 0, 0, 0, 0.18, 0.2, 0.2, FUR);
      B.part('head', 'sphere', 0, 0.05, 0, 0.32, 0.3, 0.32, FUR);
      B.part('head', 'sphere', 0.2, 0, 0, 0.16, 0.24, 0.24, PALE);
      B.part('head', 'sphere', 0.3, -0.08, 0, 0.1, 0.08, 0.12, PALE);
      B.part('head', 'sphere', 0.38, -0.03, 0, 0.03, 0.03, 0.06, 0x2A1E16);
      Q.jaw(B, { at:[0.18, -0.13], len:0.13, w:0.11, h:0.05, color:PALE });
      Q.ears(B, { type:'tiny', x:-0.02, y:0.1, z:0.3, s:0.9, fur:FUR });
      M.face(B, { eyeX:0.28, eyeY:0.06, eyeZ:0.12, eyeR:0.12, iris:0x4A2A16, lid:PALE,
                  brow:0x1A120C, browX:0.31, browY:0.2, top:0.38, side:0.32 });
      Q.legs(B, { hipsY:1.15, chestY:0.12, front:[0.1, -0.1, 0.24], hind:[-0.02, -0.08, 0.22],
                  rf:[0.07, 0.06], rh:[0.07, 0.06], paw:[0.08, 0.05, 0.08], fur:FUR });
      Q.tail(B, { at:[-0.3, 0.1], n:6, seg:0.32, r:[0.06, 0.055, 0.05, 0.045, 0.04, 0.035], rot:[-1.2, -0.3, -0.3, -0.3, -0.4, -0.8], color:FUR });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
