/* Cartoon rigs for the Arena: four-legged body helpers, and the ocelot, capybara, tapir,
   peccary and agouti. Legs are sized so every foot meets the ground whatever the body
   proportions. Loads after rig-models.js. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};
  var M = L.RigModels = L.RigModels || {};
  var Q = M.Q = M.Q || {};

  Q.spine = function(B, o){
    B.bone('root', null, 0, 0, 0);
    B.bone('hips', 'root', o.hipsX, o.hipsY, 0);
    B.bone('chest', 'hips', o.chestX, o.chestY, 0);
  };
  Q.neckHead = function(B, o){
    B.bone('neck', 'chest', o.neck[0], o.neck[1], 0);
    B.bone('head', 'neck', o.head[0], o.head[1], 0);
  };

  // o: { hipsY, chestY, front:[x,y,z], hind:[x,y,z], rf:[upper, lower], rh:[upper, lower],
  //      paw:[sx,sy,sz], fur, paws, low, splay }
  Q.legs = function(B, o){
    var sets = [
      ['shoulder', 'elbow', 'chest', o.front, o.rf, o.hipsY + o.chestY, 1],
      ['thigh', 'knee', 'hips', o.hind, o.rh, o.hipsY, 1.3]
    ];
    sets.forEach(function(s){
      var total = Math.max(0.2, s[5] + s[3][1] - o.paw[1]);
      var up = total*0.5, low = total - up, r = s[4];
      ['L', 'R'].forEach(function(side){
        var z = side === 'L' ? 1 : -1, splay = (o.splay || 0)*z;
        B.bone(s[0] + side, s[2], s[3][0], s[3][1], s[3][2]*z, splay, 0, 0);
        B.part(s[0] + side, 'sphere', 0, -up*0.48, 0, r[0]*s[6], up*0.56, r[0]*(s[6] > 1 ? 1.05 : 0.95), o.fur);
        B.bone(s[1] + side, s[0] + side, 0, -up, 0, -splay, 0, 0);
        B.part(s[1] + side, 'sphere', 0, -low*0.5, 0, r[1], low*0.56, r[1], o.low || o.fur);
        B.part(s[1] + side, 'sphere', o.paw[0]*0.45, -low, 0, o.paw[0], o.paw[1], o.paw[2], o.paws || o.fur);
      });
    });
  };

  // o: { parent, at:[x,y], n, seg, r:[], rot:[], color, tip, rings, flat }
  Q.tail = function(B, o){
    for(var t=0; t<o.n; t++){
      var name = 'tail' + (t + 1), r = o.r[t], fl = o.flat || 1;
      B.bone(name, t ? 'tail' + t : (o.parent || 'hips'), t ? -o.seg : o.at[0], t ? 0 : o.at[1], 0, 0, 0, o.rot[t] || 0);
      B.part(name, 'sphere', -o.seg*0.5, 0, 0, o.seg*0.62, r*fl, r, t === o.n - 1 && o.tip != null ? o.tip : o.color);
      if(o.rings != null && t < o.n - 1) B.part(name, 'sphere', -o.seg*0.8, 0, 0, o.seg*0.1, r*fl*1.08, r*1.08, o.rings);
    }
  };

  // o: { type:'round'|'pointy'|'oval'|'tiny', x, y, z, s, fur, inner, tip, tilt }
  Q.ears = function(B, o){
    ['L', 'R'].forEach(function(side){
      var z = side === 'L' ? 1 : -1, s = o.s || 1, n = 'ear' + side;
      B.bone(n, 'head', o.x, o.y, o.z*z, (o.tilt == null ? 0.3 : o.tilt)*z, 0, 0);
      if(o.type === 'pointy'){
        B.part(n, 'cone', 0, 0.13*s, 0, 0.07*s, 0.3*s, 0.13*s, o.fur);
        B.part(n, 'cone', 0.035*s, 0.11*s, 0, 0.03*s, 0.2*s, 0.08*s, o.inner || o.fur);
      } else if(o.type === 'oval'){
        B.part(n, 'sphere', 0, 0.14*s, 0, 0.06*s, 0.18*s, 0.11*s, o.fur);
        B.part(n, 'sphere', 0.035*s, 0.13*s, 0, 0.03*s, 0.13*s, 0.07*s, o.inner || o.fur);
        if(o.tip != null) B.part(n, 'sphere', 0, 0.29*s, 0, 0.05*s, 0.05*s, 0.08*s, o.tip);
      } else if(o.type === 'tiny'){
        B.part(n, 'sphere', 0, 0.04*s, 0, 0.06*s, 0.07*s, 0.07*s, o.fur);
      } else {
        B.part(n, 'sphere', 0, 0.12*s, 0, 0.07*s, 0.17*s, 0.15*s, o.fur);
        B.part(n, 'sphere', 0.045*s, 0.1*s, 0, 0.03*s, 0.11*s, 0.09*s, o.inner || o.fur);
      }
    });
  };

  // o: { at:[x,y], len, w, h, color, mouth, fangs, teeth, tusks, tongue }
  Q.jaw = function(B, o){
    B.bone('jaw', 'head', o.at[0], o.at[1], 0);
    var J = o.len, W = o.w, H = o.h || 0.08, WHITE = 0xFFF8EC;
    B.part('jaw', 'sphere', J*0.8, -H*0.5, 0, J, H, W, o.color);
    B.part('jaw', 'sphere', J*0.8, H*0.25, 0, J*0.82, H*0.45, W*0.8, o.mouth || 0x6B1E22);
    if(o.fangs){
      B.part('jaw', 'cone', J*1.4, H*0.6, W*0.5, 0.03, 0.08, 0.03, WHITE);
      B.part('jaw', 'cone', J*1.4, H*0.6, -W*0.5, 0.03, 0.08, 0.03, WHITE);
    }
    if(o.tusks){
      B.part('jaw', 'cone', J*1.25, H*1.1, W*0.62, 0.035, 0.16, 0.035, WHITE);
      B.part('jaw', 'cone', J*1.25, H*1.1, -W*0.62, 0.035, 0.16, 0.035, WHITE);
    }
    if(o.teeth){
      B.part('jaw', 'box', J*1.62, H*0.7, 0.026, 0.022, 0.08, 0.045, WHITE);
      B.part('jaw', 'box', J*1.62, H*0.7, -0.026, 0.022, 0.08, 0.045, WHITE);
    }
    B.bone('tongue', 'jaw', J*0.3, H*0.3, 0);
    B.part('tongue', 'sphere', J*0.55, 0, 0, J*0.7, 0.03, W*0.5, o.tongue || 0xE07A84);
  };

  /* ----- ocelot: a show-off, all eyes and ears ----- */
  M.ocelot = {
    height:1.9, length:2.7, nocturnal:true, voice:'yowl', personality:'show-off',
    fx:{ kind:'fur', color:0xD6A25A }, moodMap:{ calm:'proud' },
    moves:[{ clip:'pounce', label:'Pounce' }, { clip:'swipe', label:'Swipe' }, { clip:'bite', label:'Bite' }],
    build:function(B){
      var FUR = 0xD6A25A, CREAM = 0xF3E5C6, SPOT = 0x3B2A1A, DARK = 0x4A3220;
      Q.spine(B, { hipsX:-0.5, hipsY:1.0, chestX:0.84, chestY:0.04 });
      B.part('hips', 'sphere', 0.1, 0.02, 0, 0.6, 0.42, 0.4, FUR);
      B.part('chest', 'sphere', -0.02, 0.03, 0, 0.58, 0.47, 0.42, FUR);
      B.part('chest', 'sphere', 0.05, -0.22, 0, 0.46, 0.25, 0.32, CREAM);
      for(var i=0; i<12; i++){
        var h = i < 6;
        B.patch(h ? 'hips' : 'chest', h ? 0.1 : -0.02, h ? 0.02 : 0.03, 0, h ? 0.6 : 0.58, h ? 0.42 : 0.47, h ? 0.4 : 0.42,
          (i % 2 ? 1 : -1)*(0.5 + (i % 3)*0.8), 0.25 + (i % 4)*0.25, 0.07 + (i % 3)*0.02, 0.05, SPOT);
      }
      Q.neckHead(B, { neck:[0.4, 0.24], head:[0.28, 0.34] });
      B.part('neck', 'sphere', 0.02, 0, 0, 0.28, 0.33, 0.3, FUR);
      B.part('head', 'sphere', 0, 0.06, 0, 0.46, 0.42, 0.46, FUR);
      B.part('head', 'sphere', 0.32, -0.13, 0.14, 0.18, 0.15, 0.17, CREAM);
      B.part('head', 'sphere', 0.32, -0.13, -0.14, 0.18, 0.15, 0.17, CREAM);
      B.part('head', 'sphere', 0.41, -0.02, 0, 0.1, 0.07, 0.11, 0xC98A84);
      B.part('head', 'cone', 0.42, -0.29, 0.07, 0.03, 0.1, 0.03, 0xFFF8EC, Math.PI, 0, 0);
      B.part('head', 'cone', 0.42, -0.29, -0.07, 0.03, 0.1, 0.03, 0xFFF8EC, Math.PI, 0, 0);
      B.patch('head', 0, 0.06, 0, 0.46, 0.42, 0.46, 2.7, 0.85, 0.05, 0.03, SPOT);
      B.patch('head', 0, 0.06, 0, 0.46, 0.42, 0.46, -2.7, 0.85, 0.05, 0.03, SPOT);
      B.patch('head', 0, 0.06, 0, 0.46, 0.42, 0.46, 3.14, 0.5, 0.06, 0.03, SPOT);
      Q.jaw(B, { at:[0.1, -0.2], len:0.24, w:0.18, h:0.08, color:CREAM, fangs:true });
      Q.ears(B, { type:'pointy', x:-0.06, y:0.34, z:0.26, s:1.2, fur:FUR, inner:0xE8B7A0 });
      M.face(B, { eyeX:0.33, eyeY:0.15, eyeZ:0.19, eyeR:0.18, iris:0xB9C94A, pupilSlit:true, lid:FUR,
                  brow:DARK, browX:0.36, browY:0.36, top:0.48, side:0.46 });
      Q.legs(B, { hipsY:1.0, chestY:0.04, front:[0.14, -0.18, 0.27], hind:[-0.06, -0.1, 0.27],
                  rf:[0.14, 0.1], rh:[0.15, 0.09], paw:[0.16, 0.08, 0.13], fur:FUR, paws:CREAM });
      Q.tail(B, { at:[-0.54, 0.12], n:4, seg:0.34, r:[0.085, 0.075, 0.07, 0.06], rot:[0.7, -0.3, -0.35, -0.35], color:FUR, rings:SPOT, tip:SPOT });
    }
  };

  /* ----- capybara: completely unbothered, radiates calm ----- */
  M.capybara = {
    height:1.6, length:2.9, voice:'chirp', personality:'unbothered',
    fx:{ kind:'fur', color:0x9C6B43 },
    moodMap:{ calm:'chill', hunt:'chill', angry:'chill', scared:'chill', smug:'chill', happy:'chill', shock:'mild', hurt:'mild', dizzy:'chill' },
    moves:[{ clip:'bite', label:'Bite' }, { clip:'charge', label:'Shove' }, { clip:'shrug', label:'Shrug' }],
    idle:function(P, st, rig){
      var a = rig.fx.aura;
      if(!a) return;
      a.visible = !st.dead;
      var k = (st.t*0.45) % 1;
      a.scale.setScalar(1 + k*1.6);
      a.material.opacity = 0.5*(1 - k);
    },
    build:function(B){
      var FUR = 0x9C6B43, DARK = 0x5A3B24, MUZ = 0x7E5436;
      Q.spine(B, { hipsX:-0.55, hipsY:0.8, chestX:0.95, chestY:0.05 });
      B.part('hips', 'sphere', 0.05, 0.05, 0, 0.72, 0.55, 0.55, FUR);
      B.part('chest', 'sphere', 0, 0.05, 0, 0.66, 0.55, 0.55, FUR);
      B.part('chest', 'sphere', -0.3, -0.22, 0, 0.75, 0.3, 0.46, 0xB58660);
      Q.neckHead(B, { neck:[0.45, 0.2], head:[0.35, 0.25] });
      B.part('neck', 'sphere', 0, 0, 0, 0.32, 0.36, 0.36, FUR);
      B.part('head', 'sphere', 0.05, 0.02, 0, 0.55, 0.42, 0.42, FUR);
      B.part('head', 'sphere', 0.42, -0.08, 0, 0.26, 0.3, 0.34, MUZ);
      B.part('head', 'sphere', 0.66, 0.02, 0.09, 0.03, 0.035, 0.03, 0x2E1F16);
      B.part('head', 'sphere', 0.66, 0.02, -0.09, 0.03, 0.035, 0.03, 0x2E1F16);
      Q.jaw(B, { at:[0.3, -0.3], len:0.2, w:0.22, h:0.07, color:MUZ, teeth:true });
      Q.ears(B, { type:'tiny', x:-0.2, y:0.38, z:0.26, s:1.2, fur:DARK });
      M.face(B, { eyeX:0.36, eyeY:0.22, eyeZ:0.27, eyeR:0.14, iris:0x3A2618, lid:FUR,
                  brow:DARK, browX:0.39, browY:0.4, top:0.44, side:0.42 });
      Q.legs(B, { hipsY:0.8, chestY:0.05, front:[0.2, -0.3, 0.3], hind:[-0.1, -0.3, 0.32],
                  rf:[0.17, 0.13], rh:[0.16, 0.13], paw:[0.14, 0.07, 0.13], fur:FUR, paws:DARK });
      var aura = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 48), new THREE.MeshBasicMaterial({
        color:0x5CC7B8, transparent:true, opacity:0.4, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending }));
      aura.rotation.x = -Math.PI/2;
      aura.position.y = 0.04;
      B.attach('root', 'aura', aura);
    }
  };

  /* ----- tapir: a gentle giant who panics ----- */
  M.tapir = {
    height:2.0, length:3.2, voice:'whistle', personality:'gentle giant',
    fx:{ kind:'fur', color:0x4E433E }, moodMap:{ calm:'gentle' },
    moves:[{ clip:'charge', label:'Charge' }, { clip:'stomp', label:'Stomp' }, { clip:'bite', label:'Bite' }],
    idle:function(P, st){
      P.rot('snout2', 0, Math.sin(st.t*2.1)*0.25, Math.sin(st.t*1.3)*0.12);
      P.rot('snout1', 0, Math.sin(st.t*1.7)*0.1, 0);
      if(st.mood === 'scared' && !st.dead){ P.move(Math.sin(st.t*41)*0.02, 0, Math.cos(st.t*37)*0.02); P.fx('sweat', 1); }
    },
    build:function(B){
      var FUR = 0x4E433E, DARK = 0x2E2622, LIP = 0x9A8F88;
      Q.spine(B, { hipsX:-0.6, hipsY:1.0, chestX:1.0, chestY:0.02 });
      B.part('hips', 'sphere', 0.05, 0.08, 0, 0.75, 0.62, 0.56, FUR);
      B.part('chest', 'sphere', 0, 0.02, 0, 0.7, 0.6, 0.55, FUR);
      Q.neckHead(B, { neck:[0.5, 0.1], head:[0.35, 0.12] });
      B.part('neck', 'sphere', 0, 0, 0, 0.35, 0.4, 0.38, FUR);
      B.part('neck', 'sphere', -0.05, 0.34, 0, 0.3, 0.1, 0.07, DARK);
      B.part('head', 'sphere', 0.05, 0, 0, 0.48, 0.38, 0.36, FUR);
      B.part('head', 'sphere', 0.33, -0.2, 0, 0.2, 0.12, 0.22, LIP);
      B.bone('snout1', 'head', 0.46, -0.02, 0, 0, 0, -0.3);
      B.part('snout1', 'sphere', 0.14, 0, 0, 0.18, 0.13, 0.14, FUR);
      B.bone('snout2', 'snout1', 0.26, 0, 0, 0, 0, -0.35);
      B.part('snout2', 'sphere', 0.12, 0, 0, 0.15, 0.1, 0.11, FUR);
      B.part('snout2', 'sphere', 0.26, 0, 0, 0.04, 0.08, 0.09, DARK);
      Q.jaw(B, { at:[0.22, -0.26], len:0.2, w:0.18, h:0.07, color:LIP });
      Q.ears(B, { type:'oval', x:-0.2, y:0.3, z:0.24, s:1.0, fur:FUR, inner:0x6E625C, tip:0xEDE6DC });
      M.face(B, { eyeX:0.38, eyeY:0.08, eyeZ:0.2, eyeR:0.12, iris:0x2A1E18, lid:FUR,
                  brow:DARK, browX:0.38, browY:0.23, top:0.38, side:0.38 });
      Q.legs(B, { hipsY:1.0, chestY:0.02, front:[0.18, -0.25, 0.32], hind:[-0.05, -0.2, 0.32],
                  rf:[0.2, 0.16], rh:[0.18, 0.16], paw:[0.16, 0.09, 0.16], fur:FUR, paws:DARK });
      Q.tail(B, { at:[-0.72, 0.2], n:1, seg:0.16, r:[0.07], rot:[0.9], color:FUR });
    }
  };

  /* ----- white-lipped peccary: hot-headed, clacks its tusks ----- */
  M.peccary = {
    height:1.6, length:2.4, voice:'grunt', personality:'hot-headed',
    fx:{ kind:'fur', color:0x4F4945 }, moodMap:{ calm:'cross' },
    moves:[{ clip:'charge', label:'Charge' }, { clip:'bite', label:'Tusk bite' }, { clip:'taunt', label:'Tusk clack' }],
    build:function(B){
      var FUR = 0x4F4945, DARK = 0x2A2522, LIP = 0xEDE7DC, SNOUT = 0xC9A7A0;
      Q.spine(B, { hipsX:-0.45, hipsY:0.85, chestX:0.8, chestY:0.08 });
      B.part('hips', 'sphere', 0.05, 0.03, 0, 0.58, 0.5, 0.45, FUR);
      B.part('chest', 'sphere', 0, 0.06, 0, 0.58, 0.58, 0.48, FUR);
      for(var i=0; i<7; i++){
        var onHip = i < 3;
        B.part(onHip ? 'hips' : 'chest', 'cone', onHip ? -0.25 + i*0.22 : -0.35 + (i - 3)*0.2, onHip ? 0.5 : 0.62, 0, 0.06, 0.22, 0.05, DARK, 0, 0, 0.5);
      }
      Q.neckHead(B, { neck:[0.38, 0.12], head:[0.26, 0.02] });
      B.part('neck', 'sphere', 0, 0, 0, 0.3, 0.36, 0.34, FUR);
      B.part('head', 'sphere', 0.08, 0.02, 0, 0.42, 0.34, 0.32, FUR);
      B.part('head', 'cone', 0.46, -0.07, 0, 0.16, 0.36, 0.15, FUR, 0, 0, -Math.PI/2);
      B.part('head', 'sphere', 0.64, -0.07, 0, 0.04, 0.12, 0.13, SNOUT);
      B.part('head', 'sphere', 0.67, -0.04, 0.05, 0.02, 0.025, 0.025, DARK);
      B.part('head', 'sphere', 0.67, -0.04, -0.05, 0.02, 0.025, 0.025, DARK);
      Q.jaw(B, { at:[0.22, -0.2], len:0.26, w:0.16, h:0.07, color:LIP, tusks:true });
      Q.ears(B, { type:'pointy', x:-0.12, y:0.28, z:0.2, s:0.85, fur:FUR, inner:0x6E5E58, tilt:0.5 });
      M.face(B, { eyeX:0.33, eyeY:0.12, eyeZ:0.18, eyeR:0.12, iris:0x3A2618, lid:FUR,
                  brow:0x1E1A18, browX:0.35, browY:0.26, top:0.36, side:0.34 });
      Q.legs(B, { hipsY:0.85, chestY:0.08, front:[0.18, -0.25, 0.24], hind:[-0.05, -0.22, 0.24],
                  rf:[0.14, 0.08], rh:[0.13, 0.08], paw:[0.08, 0.07, 0.09], fur:FUR, paws:0x1E1A18 });
      Q.tail(B, { at:[-0.62, 0.18], n:1, seg:0.12, r:[0.05], rot:[1.0], color:FUR });
    }
  };

  /* ----- agouti: an anxious wreck ----- */
  M.agouti = {
    height:1.4, length:2.0, voice:'squeak', personality:'anxious',
    fx:{ kind:'fur', color:0xA86F3A }, moodMap:{ calm:'nervous', hunt:'nervous', smug:'nervous', proud:'nervous' },
    moves:[{ clip:'bite', label:'Nip' }, { clip:'swipe', label:'Scratch' }],
    idle:function(P, st){
      if(st.dead) return;
      P.move(Math.sin(st.t*47)*0.008, 0, 0);
      if((st.t % 5) < 1.2) P.fx('sweat', 1);
      if(!st.look) P.rot('neck', 0, Math.round(Math.sin(st.t*1.7)*2)/2*0.45, 0);
    },
    build:function(B){
      var FUR = 0xA86F3A, BELLY = 0xD9B889, MUZ = 0xC99A66, DARK = 0x3A2618;
      Q.spine(B, { hipsX:-0.35, hipsY:0.85, chestX:0.6, chestY:-0.02 });
      B.part('hips', 'sphere', 0, 0.05, 0, 0.52, 0.5, 0.42, FUR);
      B.part('chest', 'sphere', 0, -0.02, 0, 0.42, 0.38, 0.34, FUR);
      B.part('chest', 'sphere', 0.05, -0.2, 0, 0.32, 0.18, 0.25, BELLY);
      Q.neckHead(B, { neck:[0.3, 0.12], head:[0.24, 0.14] });
      B.part('neck', 'sphere', 0, 0, 0, 0.22, 0.25, 0.22, FUR);
      B.part('head', 'sphere', 0.04, 0.02, 0, 0.36, 0.3, 0.3, FUR);
      B.part('head', 'sphere', 0.3, -0.06, 0, 0.16, 0.14, 0.16, MUZ);
      B.part('head', 'sphere', 0.44, -0.02, 0, 0.05, 0.04, 0.06, DARK);
      Q.jaw(B, { at:[0.2, -0.16], len:0.14, w:0.12, h:0.05, color:MUZ, teeth:true });
      Q.ears(B, { type:'round', x:-0.08, y:0.24, z:0.18, s:0.75, fur:FUR, inner:0xD99A8A });
      M.face(B, { eyeX:0.25, eyeY:0.1, eyeZ:0.16, eyeR:0.15, iris:0x2A1A10, lid:FUR,
                  brow:0x5A3A20, browX:0.28, browY:0.28, top:0.34, side:0.32 });
      Q.legs(B, { hipsY:0.85, chestY:-0.02, front:[0.1, -0.15, 0.18], hind:[0, -0.2, 0.2],
                  rf:[0.08, 0.06], rh:[0.1, 0.06], paw:[0.09, 0.05, 0.07], fur:FUR, paws:DARK });
      Q.tail(B, { at:[-0.5, 0.2], n:1, seg:0.1, r:[0.05], rot:[0.6], color:FUR });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
