/* Cartoon rigs for the Arena: body plans.

   Units are roughly the animal's radius, +X is forward, +Y is up, +Z is the animal's left.
   Every face gets the same controls (brows, upper and lower lids, pupils, jaw, ears), so
   one expression system drives every species. Requires THREE r128 and rig.js. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};
  var M = L.RigModels = L.RigModels || {};

  var INK = 0x1A120C;

  function basic(color, extra){
    return new THREE.MeshBasicMaterial(Object.assign({ color:color, transparent:true, depthWrite:true }, extra || {}));
  }
  // A cheap outline for effect meshes: a slightly larger dark copy drawn from behind.
  function inked(geo, color, grow){
    var g = new THREE.Group();
    g.add(new THREE.Mesh(geo, basic(color)));
    var o = new THREE.Mesh(geo, basic(INK, { side:THREE.BackSide }));
    o.scale.setScalar(grow || 1.22);
    g.add(o);
    return g;
  }
  function starGeo(r){
    var s = new THREE.Shape();
    for(var i=0; i<10; i++){
      var a = i/10*Math.PI*2 + Math.PI/2, rr = i % 2 ? r*0.45 : r;
      if(i === 0) s.moveTo(Math.cos(a)*rr, Math.sin(a)*rr); else s.lineTo(Math.cos(a)*rr, Math.sin(a)*rr);
    }
    var g = new THREE.ExtrudeGeometry(s, { depth:r*0.3, bevelEnabled:false });
    g.translate(0, 0, -r*0.15);
    return g;
  }

  /* ----- the shared face: eyes, lids, brows, jaw, ears, and the effect symbols ----- */
  // f: { eyeX, eyeY, eyeZ, eyeR, iris, pupilSlit, lid (fur colour), brow, browX, browY,
  //      top (head top y for symbols), side (head half-width) }
  M.face = function(B, f){
    ['L', 'R'].forEach(function(s){
      var z = s === 'L' ? f.eyeZ : -f.eyeZ, er = f.eyeR;
      B.bone('eye' + s, 'head', f.eyeX, f.eyeY, z, 0, s === 'L' ? -0.22 : 0.22, 0);
      B.part('eye' + s, 'sphere', 0, 0, 0, er*0.82, er*1.05, er*0.95, 0xFFFDF5);
      B.bone('pupil' + s, 'eye' + s, er*0.68, 0, 0);
      B.part('pupil' + s, 'ball', er*0.1, 0, 0, er*0.14, er*0.62, er*0.56, f.iris);
      B.part('pupil' + s, 'ball', er*0.16, 0, 0, er*0.12, er*(f.pupilSlit ? 0.46 : 0.34), er*(f.pupilSlit ? 0.16 : 0.32), 0x15100C);
      B.part('pupil' + s, 'ball', er*0.24, er*0.22, er*0.16, er*0.08, er*0.13, er*0.11, 0xFFFFFF);
      var lr = er*1.12;
      B.bone('lid' + s, 'eye' + s, 0, 0, 0);
      B.part('lid' + s, 'capTop', 0, 0, 0, lr, lr, lr, f.lid);
      B.bone('low' + s, 'eye' + s, 0, 0, 0);
      B.part('low' + s, 'capBot', 0, 0, 0, lr*0.98, lr*0.98, lr*0.98, f.lid);
      B.bone('brow' + s, 'head', f.browX, f.browY, z*1.02);
      B.part('brow' + s, 'ball', 0, 0, 0, er*0.3, er*0.22, er*0.85, f.brow, 0, 0, 0);

      // X eyes for the fallen
      var x = new THREE.Group();
      [0.78, -0.78].forEach(function(a){
        var bar = new THREE.Mesh(new THREE.BoxGeometry(er*0.18, er*1.5, er*0.22), basic(INK));
        bar.rotation.x = a;
        x.add(bar);
      });
      x.position.x = er*1.2;
      B.attach('eye' + s, 'x' + s, x);

      // Glowing eyes at night for the nocturnal
      var glow = new THREE.Mesh(new THREE.SphereGeometry(er*0.5, 10, 8),
        basic(0xFFE27A, { blending:THREE.AdditiveBlending, depthWrite:false, opacity:0.8 }));
      glow.position.x = er*0.3;
      B.attach('pupil' + s, 'glow' + s, glow);
    });

    // "!" when a hunter locks on
    var bang = new THREE.Group();
    var bar = inked(new THREE.BoxGeometry(0.09, 0.3, 0.07), 0xFFD23F, 1.3);
    bar.position.y = 0.12;
    var dot = inked(new THREE.SphereGeometry(0.06, 10, 8), 0xFFD23F, 1.3);
    dot.position.y = -0.12;
    bang.add(bar); bang.add(dot);
    bang.position.set(0, f.top + 0.45, 0);
    B.attach('head', 'bang', bang);

    // Sweat drop when scared
    var drop = new THREE.Group();
    drop.add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), basic(0x8FD3FF)));
    var tip = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.14, 10), basic(0x8FD3FF));
    tip.position.y = 0.09;
    drop.add(tip);
    drop.position.set(-0.05, f.top - 0.05, f.side + 0.08);
    B.attach('head', 'sweat', drop);

    // Anger mark
    var vein = new THREE.Group();
    for(var k=0; k<4; k++){
      var a = k*Math.PI/2 + Math.PI/4;
      var seg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.11, 0.03), basic(0xE0302A));
      seg.position.set(Math.cos(a)*0.07, Math.sin(a)*0.07, 0);
      seg.rotation.z = a;
      vein.add(seg);
    }
    vein.position.set(0.02, f.top - 0.02, -f.side*0.8);
    B.attach('head', 'vein', vein);

    // Stun stars circling the head
    var stars = new THREE.Group(), sg = starGeo(0.09);
    for(var j=0; j<3; j++){
      var st = inked(sg, 0xFFD23F, 1.35);
      st.position.set(Math.cos(j*2.09)*f.side*1.25, 0, Math.sin(j*2.09)*f.side*1.25);
      stars.add(st);
    }
    stars.position.y = f.top + 0.15;
    B.attach('head', 'stars', stars);

    // Halo for the fallen
    var halo = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 8, 24), basic(0xFFD86B));
    halo.rotation.x = Math.PI/2;
    halo.position.y = f.top + 0.35;
    B.attach('head', 'halo', halo);
  };

  /* ----- jaguar: cocky, heavy-headed, all shoulders ----- */
  M.jaguar = {
    height:2.1, length:2.8, nocturnal:true, voice:'roar',
    personality:'cocky', fx:{ kind:'fur', color:0xD9953A },
    moves:[{ clip:'pounce', label:'Pounce' }, { clip:'swipe', label:'Swipe' }, { clip:'bite', label:'Bite' }],
    build:function(B){
      var FUR = 0xD9953A, CREAM = 0xF1DDB4, SPOT = 0x3A2414, DARK = 0x4A2E18;
      B.bone('root', null, 0, 0, 0);
      B.bone('hips', 'root', -0.5, 1.0, 0);
      B.part('hips', 'sphere', 0.12, 0.02, 0, 0.64, 0.5, 0.47, FUR);
      B.bone('chest', 'hips', 0.86, 0.06, 0);
      B.part('chest', 'sphere', -0.02, 0.04, 0, 0.62, 0.55, 0.5, FUR);
      B.part('chest', 'sphere', 0.06, -0.26, 0, 0.5, 0.3, 0.38, CREAM);
      var spots = [[-0.4, 0.5], [0.3, 0.8], [1.2, 0.35], [2.2, 0.7], [2.9, 0.3], [-1.2, 0.3], [0.8, 1.2], [-0.7, 1.0], [1.8, 1.1], [2.6, 1.3]];
      spots.forEach(function(s, i){
        var side = i % 2 ? 1 : -1;
        B.patch(i < 5 ? 'hips' : 'chest', i < 5 ? 0.12 : -0.02, 0.03, 0, 0.64, 0.52, 0.48, s[0]*side, s[1]*0.6, 0.1 + (i%3)*0.025, 0.05, SPOT);
      });

      B.bone('neck', 'chest', 0.42, 0.24, 0);
      B.part('neck', 'sphere', 0.02, 0, 0, 0.32, 0.36, 0.34, FUR);
      B.bone('head', 'neck', 0.3, 0.34, 0);
      B.part('head', 'sphere', 0, 0.06, 0, 0.5, 0.45, 0.5, FUR);
      B.part('head', 'sphere', 0.34, -0.14, 0.15, 0.2, 0.17, 0.19, CREAM);
      B.part('head', 'sphere', 0.34, -0.14, -0.15, 0.2, 0.17, 0.19, CREAM);
      B.part('head', 'sphere', 0.44, -0.02, 0, 0.12, 0.08, 0.13, 0x5A3530);
      B.part('head', 'cone', 0.46, -0.31, 0.08, 0.035, 0.11, 0.035, 0xFFF8EC, Math.PI, 0, 0);
      B.part('head', 'cone', 0.46, -0.31, -0.08, 0.035, 0.11, 0.035, 0xFFF8EC, Math.PI, 0, 0);
      B.patch('head', 0, 0.06, 0, 0.5, 0.45, 0.5, 2.6, 0.9, 0.06, 0.025, SPOT);
      B.patch('head', 0, 0.06, 0, 0.5, 0.45, 0.5, -2.6, 0.9, 0.06, 0.025, SPOT);
      B.patch('head', 0, 0.06, 0, 0.5, 0.45, 0.5, 3.14, 0.6, 0.07, 0.025, SPOT);

      B.bone('jaw', 'head', 0.12, -0.22, 0);
      B.part('jaw', 'sphere', 0.2, -0.05, 0, 0.26, 0.09, 0.2, CREAM);
      B.part('jaw', 'sphere', 0.2, 0.02, 0, 0.21, 0.045, 0.16, 0x6B1E22);
      B.part('jaw', 'cone', 0.36, 0.06, 0.1, 0.03, 0.08, 0.03, 0xFFF8EC);
      B.part('jaw', 'cone', 0.36, 0.06, -0.1, 0.03, 0.08, 0.03, 0xFFF8EC);
      B.bone('tongue', 'jaw', 0.08, 0.03, 0);
      B.part('tongue', 'sphere', 0.14, 0, 0, 0.17, 0.035, 0.1, 0xE07A84);

      ['L', 'R'].forEach(function(s){
        var z = s === 'L' ? 1 : -1;
        B.bone('ear' + s, 'head', -0.08, 0.4, 0.3*z, 0.32*z, 0, 0);
        B.part('ear' + s, 'sphere', 0, 0.12, 0, 0.07, 0.17, 0.15, FUR);
        B.part('ear' + s, 'sphere', 0.045, 0.1, 0, 0.03, 0.11, 0.09, 0xE8B7A0);
        B.part('ear' + s, 'sphere', -0.03, 0.2, 0, 0.05, 0.07, 0.1, SPOT);
      });

      M.face(B, { eyeX:0.35, eyeY:0.15, eyeZ:0.2, eyeR:0.17, iris:0xE8B82A, pupilSlit:true, lid:FUR,
                  brow:DARK, browX:0.39, browY:0.34, top:0.5, side:0.5 });

      ['L', 'R'].forEach(function(s){
        var z = s === 'L' ? 1 : -1;
        B.bone('shoulder' + s, 'chest', 0.16, -0.2, 0.3*z);
        B.part('shoulder' + s, 'sphere', 0, -0.2, 0, 0.17, 0.32, 0.15, FUR);
        B.bone('elbow' + s, 'shoulder' + s, 0, -0.44, 0);
        B.part('elbow' + s, 'sphere', 0, -0.16, 0, 0.11, 0.22, 0.11, FUR);
        B.part('elbow' + s, 'sphere', 0.07, -0.34, 0, 0.18, 0.09, 0.15, CREAM);
        B.bone('thigh' + s, 'hips', -0.08, -0.12, 0.3*z);
        B.part('thigh' + s, 'sphere', 0.02, -0.2, 0, 0.23, 0.33, 0.17, FUR);
        B.patch('thigh' + s, 0.02, -0.2, 0, 0.23, 0.33, 0.17, 1.6*z, 0.2, 0.07, 0.02, SPOT);
        B.bone('knee' + s, 'thigh' + s, 0.04, -0.42, 0);
        B.part('knee' + s, 'sphere', -0.03, -0.17, 0, 0.1, 0.24, 0.1, FUR);
        B.part('knee' + s, 'sphere', 0.06, -0.37, 0, 0.18, 0.09, 0.15, CREAM);
      });

      var tailR = [0.1, 0.09, 0.08, 0.075], tailRot = [0.65, -0.35, -0.45, -0.45];
      for(var t=0; t<4; t++){
        B.bone('tail' + (t + 1), t ? 'tail' + t : 'hips', t ? -0.34 : -0.58, t ? 0 : 0.14, 0, 0, 0, tailRot[t]);
        B.part('tail' + (t + 1), 'sphere', -0.18, 0, 0, 0.23, tailR[t], tailR[t], t === 3 ? SPOT : FUR);
        if(t < 3) B.patch('tail' + (t + 1), -0.18, 0, 0, 0.23, tailR[t], tailR[t], 1.57, 1.2, 0.05, 0.02, SPOT);
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
