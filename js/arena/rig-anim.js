/* Cartoon rigs for the Arena: the animation system.

   Every frame each bone returns to its rest pose and layers add on top of it: gait,
   idle life (breathing, blinking, tail), where the animal is looking, its expression,
   a persistent state (stunned, eating, dead) and at most one action clip (rig-actions.js).
   Actions fire cues ('impact', 'roar', ...) at their key frames so the stage can add
   effects and sound in sync. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};

  function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t){ return a + (b - a)*t; }
  function smooth(t){ t = clamp(t, 0, 1); return t*t*(3 - 2*t); }

  // Expressions, as targets for the shared face controls.
  var MOODS = {
    calm:   { browA:0,    browY:0,     browAsym:0,   lidTop:0.15, lidBot:0,    pupil:1,    jaw:0,    ear:0,    tilt:0,    tongue:0 },
    hunt:   { browA:0.55, browY:-0.02, browAsym:0,   lidTop:0.38, lidBot:0.2,  pupil:0.75, jaw:0.08, ear:0.3,  tilt:0,    tongue:0 },
    angry:  { browA:0.8,  browY:-0.03, browAsym:0,   lidTop:0.32, lidBot:0.15, pupil:0.7,  jaw:0.5,  ear:0.75, tilt:0,    tongue:0, vein:1 },
    scared: { browA:-0.7, browY:0.06,  browAsym:0,   lidTop:0,    lidBot:0,    pupil:0.5,  jaw:0.3,  ear:1,    tilt:0,    tongue:0, sweat:1 },
    hurt:   { browA:-0.35,browY:-0.02, browAsym:0,   lidTop:0.8,  lidBot:0.5,  pupil:0.8,  jaw:0.5,  ear:0.85, tilt:0.1,  tongue:0 },
    shock:  { browA:-0.3, browY:0.08,  browAsym:0,   lidTop:0,    lidBot:0,    pupil:0.4,  jaw:0.85, ear:0.2,  tilt:0,    tongue:0 },
    smug:   { browA:0.2,  browY:0,     browAsym:0.7, lidTop:0.5,  lidBot:0.35, pupil:1,    jaw:0.12, ear:0,    tilt:0.14, tongue:0 },
    happy:  { browA:-0.25,browY:0.05,  browAsym:0,   lidTop:0.2,  lidBot:0.6,  pupil:1.1,  jaw:0.45, ear:0,    tilt:0.08, tongue:0 },
    drowsy: { browA:-0.2, browY:-0.01, browAsym:0,   lidTop:0.68, lidBot:0.1,  pupil:1.15, jaw:0,    ear:0.35, tilt:0.1,  tongue:0 },
    dizzy:  { browA:-0.45,browY:0.03,  browAsym:0,   lidTop:0.3,  lidBot:0,    pupil:0.6,  jaw:0.35, ear:0.6,  tilt:0,    tongue:0.7 },
    dead:   { browA:-0.3, browY:0,     browAsym:0,   lidTop:1,    lidBot:0,    pupil:1,    jaw:0.35, ear:1,    tilt:0,    tongue:1 },
    // Resting faces that give each species its personality.
    chill:  { browA:-0.05,browY:0,     browAsym:0,   lidTop:0.55, lidBot:0.25, pupil:0.9,  jaw:0,    ear:0,    tilt:0.05, tongue:0 },
    mild:   { browA:-0.1, browY:0,     browAsym:0,   lidTop:0.7,  lidBot:0.3,  pupil:0.9,  jaw:0.1,  ear:0.2,  tilt:0.05, tongue:0 },
    proud:  { browA:0.15, browY:0.01,  browAsym:0.35,lidTop:0.35, lidBot:0.2,  pupil:1,    jaw:0,    ear:0,    tilt:0.07, tongue:0 },
    gentle: { browA:-0.2, browY:0.02,  browAsym:0,   lidTop:0.25, lidBot:0.25, pupil:1.1,  jaw:0,    ear:0.1,  tilt:0.06, tongue:0 },
    cross:  { browA:0.5,  browY:-0.02, browAsym:0,   lidTop:0.3,  lidBot:0.1,  pupil:0.8,  jaw:0,    ear:0.3,  tilt:0,    tongue:0 },
    nervous:{ browA:-0.5, browY:0.04,  browAsym:0,   lidTop:0,    lidBot:0,    pupil:0.7,  jaw:0.1,  ear:0.45, tilt:0,    tongue:0 },
    eager:  { browA:-0.15,browY:0.04,  browAsym:0,   lidTop:0,    lidBot:0.2,  pupil:1.2,  jaw:0.3,  ear:0,    tilt:0.08, tongue:0 },
    grumpy: { browA:0.4,  browY:-0.03, browAsym:0,   lidTop:0.55, lidBot:0.1,  pupil:0.8,  jaw:0,    ear:0,    tilt:0,    tongue:0 },
    cheeky: { browA:0.05, browY:0.02,  browAsym:0.55,lidTop:0.25, lidBot:0.3,  pupil:1,    jaw:0.2,  ear:0,    tilt:0.12, tongue:0 },
    creepy: { browA:0.25, browY:0,     browAsym:0,   lidTop:0.45, lidBot:0.2,  pupil:0.55, jaw:0.04, ear:0,    tilt:0.05, tongue:0 }
  };
  var CHANNELS = ['browA', 'browY', 'browAsym', 'lidTop', 'lidBot', 'pupil', 'jaw', 'ear', 'tilt', 'tongue', 'vein', 'sweat'];

  /* ----- the pose being assembled this frame ----- */
  function Pose(rig){
    this.rig = rig;
    this.acc = {};
    this.mv = { x:0, y:0, z:0, rx:0, ry:0, rz:0 };
    this.faceOver = {}; this.faceW = {};
    this.fxOn = {};
    this.flashK = 0;
    this.moodOver = null;
  }
  Pose.prototype.reset = function(){
    for(var k in this.acc){ var a = this.acc[k]; a.px = a.py = a.pz = a.rx = a.ry = a.rz = 0; a.s = 1; a.sx = a.sy = a.sz = 1; }
    var m = this.mv; m.x = m.y = m.z = m.rx = m.ry = m.rz = 0;
    this.faceOver = {}; this.faceW = {}; this.fxOn = {}; this.flashK = 0; this.moodOver = null;
  };
  Pose.prototype.slot = function(name){
    if(!this.rig.bones[name]) return null;
    return this.acc[name] || (this.acc[name] = { px:0, py:0, pz:0, rx:0, ry:0, rz:0, s:1, sx:1, sy:1, sz:1 });
  };
  Pose.prototype.rot = function(name, x, y, z){
    var a = this.slot(name); if(!a) return this;
    a.rx += x || 0; a.ry += y || 0; a.rz += z || 0; return this;
  };
  // Mirror-aware helpers: L and R get the same swing; side-to-side terms flip sign.
  Pose.prototype.pair = function(base, x, y, z){
    this.rot(base + 'L', x, y, z); this.rot(base + 'R', -(x || 0), -(y || 0), z); return this;
  };
  Pose.prototype.pos = function(name, x, y, z){
    var a = this.slot(name); if(!a) return this;
    a.px += x || 0; a.py += y || 0; a.pz += z || 0; return this;
  };
  Pose.prototype.scale = function(name, x, y, z){
    var a = this.slot(name); if(!a) return this;
    a.sx *= x; a.sy *= (y == null ? x : y); a.sz *= (z == null ? x : z); return this;
  };
  Pose.prototype.move = function(x, y, z, rx, ry, rz){
    var m = this.mv; m.x += x || 0; m.y += y || 0; m.z += z || 0; m.rx += rx || 0; m.ry += ry || 0; m.rz += rz || 0; return this;
  };
  // Override face channels with a weight; the strongest override wins per channel.
  Pose.prototype.face = function(values, w){
    w = w == null ? 1 : w;
    for(var k in values){
      if(w >= (this.faceW[k] || 0)){ this.faceOver[k] = values[k]; this.faceW[k] = w; }
    }
    return this;
  };
  // Species can remap moods: the capybara's "scared" is still chill.
  Pose.prototype.mood = function(name, w){
    var map = this.rig.model.moodMap;
    if(map && map[name]) name = map[name];
    if(w > 0.01 && MOODS[name]) this.face(MOODS[name], w);
    return this;
  };
  Pose.prototype.fx = function(name, amount){ this.fxOn[name] = Math.max(this.fxOn[name] || 0, amount); return this; };
  Pose.prototype.flash = function(k){ this.flashK = Math.max(this.flashK, k); return this; };

  /* ----- the animation state attached to each rig ----- */
  function attach(rig, opts){
    opts = opts || {};
    var model = rig.model, P = new Pose(rig);
    var st = {
      t:Math.random()*10, phase:0, speed:0, speedS:0, mood:'calm', look:null, lookYaw:0, lookPitch:0,
      stunned:false, eating:false, pinned:false, night:false, dead:false, deadT:0,
      blinkT:0, nextBlink:1 + Math.random()*3, earT:2 + Math.random()*4, earSide:1,
      action:null, listeners:[], face:{}, rootMotion:opts.rootMotion !== false
    };
    CHANNELS.forEach(function(c){ st.face[c] = MOODS.calm[c] || 0; });

    // A small ghost that floats up from the fallen.
    var ghost = new THREE.Group();
    var gm = new THREE.MeshBasicMaterial({ color:0xFFFFFF, transparent:true, opacity:0.75, depthWrite:false });
    var gb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), gm);
    gb.scale.set(1, 1.15, 1);
    ghost.add(gb);
    var gt = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 12), gm);
    gt.rotation.x = Math.PI; gt.position.y = -0.42;
    ghost.add(gt);
    var eyeM = new THREE.MeshBasicMaterial({ color:0x1A120C, transparent:true, depthWrite:false });
    [-0.12, 0.12].forEach(function(z){
      var e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), eyeM);
      e.position.set(0.3, 0.06, z);
      ghost.add(e);
    });
    ghost.visible = false;
    rig.group.add(ghost);
    var ghostT = -1;

    var camQ = new THREE.Quaternion(), parQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();

    function emit(name, data){
      for(var i=0; i<st.listeners.length; i++) st.listeners[i](name, data || {}, rig);
    }

    rig.on = function(fn){ st.listeners.push(fn); };
    rig.state = st;
    rig.set = function(s){
      if(s.speed != null) st.speed = s.speed;
      if(s.mood) st.mood = s.mood;
      if('look' in s) st.look = s.look;
      if(s.stunned != null) st.stunned = s.stunned;
      if(s.eating != null) st.eating = s.eating;
      if(s.pinned != null) st.pinned = s.pinned;
      if(s.night != null) st.night = s.night;
    };
    rig.play = function(name, o){
      if(name === 'revive'){ st.dead = false; st.action = null; ghost.visible = false; ghostT = -1; return true; }
      var A = L.RigActions || {};
      var def = A[rig.sid + ':' + name] || A[name];
      if(!def || st.dead) return false;
      // A bigger moment interrupts a smaller one, never the reverse.
      if(st.action && (st.action.def.priority || 1) > (def.priority || 1) && st.action.t < st.action.def.dur*0.8) return false;
      st.action = { name:name, def:def, t:0, prev:-1, o:o || {} };
      if(name === 'death'){ st.dead = true; }
      return true;
    };
    rig.playing = function(){ return st.action ? st.action.name : null; };
    rig.worldOf = function(bone, out, x, y, z){
      out = out || new THREE.Vector3();
      var b = rig.bones[bone];
      out.set(x || 0, y || 0, z || 0);
      return b ? b.localToWorld(out) : rig.group.localToWorld(out);
    };

    rig.update = function(dt, camera){
      dt = Math.min(dt, 0.1);
      st.t += dt;
      P.reset();
      var bones = rig.bones, a = st.action, actionLoco = 1;

      /* locomotion */
      st.speedS = lerp(st.speedS, st.dead || st.stunned ? 0 : st.speed, Math.min(1, dt*6));
      var s = st.speedS, moving = smooth(s*3), run = smooth((s - 0.9)/0.9);
      if(a) actionLoco = a.def.loco == null ? 0 : a.def.loco;
      var lw = moving*actionLoco;
      st.phase += dt*(1.1 + 1.25*Math.min(s, 2.6));
      if(model.gait) model.gait(P, st, lw, run, dt);
      else if(lw > 0.001){
        var TAU = Math.PI*2, ph = st.phase;
        var A = lerp(0.42, 0.95, run)*lw;
        var offs = run > 0.5 ? { shoulderL:0, shoulderR:0.12, thighL:0.5, thighR:0.62 } : { shoulderL:0, thighR:0, shoulderR:0.5, thighL:0.5 };
        for(var leg in offs){
          var p = (ph + offs[leg])*TAU, swing = Math.sin(p)*A, lift = Math.max(0, Math.cos(p))*lw;
          P.rot(leg, 0, 0, swing);
          P.rot(leg.indexOf('shoulder') === 0 ? 'elbow' + leg.slice(-1) : 'knee' + leg.slice(-1), 0, 0, -lift*lerp(0.7, 1.1, run));
        }
        P.pos('hips', 0, (lerp(Math.abs(Math.sin(ph*TAU))*0.035, Math.sin(ph*TAU)*0.11, run))*lw, 0);
        P.rot('hips', 0, 0, Math.sin(ph*TAU)*0.16*run*lw);
        P.rot('chest', 0, 0, -Math.sin(ph*TAU)*0.2*run*lw);
        P.rot('neck', 0, 0, Math.sin(ph*TAU)*0.12*run*lw - 0.12*run*lw);
        P.rot('tail1', 0, 0, -0.55*run*lw);
        P.rot('tail2', 0, 0, 0.25*run*lw);
      }

      /* idle life */
      var breath = Math.sin(st.t*2.1);
      P.pos('chest', 0, breath*0.012, 0);
      P.rot('neck', 0, 0, breath*0.02);
      var twitch = st.mood === 'hunt' || st.mood === 'angry' ? 2.2 : 1;
      for(var k=1; k<=4; k++) P.rot('tail' + k, 0, Math.sin(st.t*1.5*twitch - k*0.7)*0.1*k, 0);
      if(!st.look && !st.dead){
        P.rot('neck', 0, (Math.sin(st.t*0.37) + Math.sin(st.t*0.61 + 1.3))*0.16, 0);
        P.rot('head', 0, Math.sin(st.t*0.53 + 0.4)*0.12, Math.sin(st.t*0.43)*0.05);
      }
      st.earT -= dt;
      if(st.earT < 0){ st.earT = 2 + Math.random()*5; st.earSide = Math.random() < 0.5 ? 1 : -1; }
      if(st.earT < 0.18){ var ef = Math.sin(st.earT/0.18*Math.PI)*0.5; P.rot(st.earSide > 0 ? 'earL' : 'earR', ef*st.earSide, 0, 0.3*Math.abs(ef)); }

      if(model.idle) model.idle(P, st, rig, dt);

      /* looking at something */
      var lookW = st.look && !st.dead ? 1 : 0, yawGoal = 0, pitchGoal = 0;
      if(lookW){
        rig.group.updateMatrixWorld(true);
        tmpV.copy(st.look);
        rig.group.worldToLocal(tmpV);
        yawGoal = clamp(Math.atan2(-tmpV.z, tmpV.x), -1.1, 1.1);
        pitchGoal = clamp(Math.atan2(tmpV.y - model.height*0.75, Math.hypot(tmpV.x, tmpV.z)), -0.5, 0.45);
      }
      st.lookYaw = lerp(st.lookYaw, yawGoal, Math.min(1, dt*7));
      st.lookPitch = lerp(st.lookPitch, pitchGoal, Math.min(1, dt*7));
      P.rot('neck', 0, st.lookYaw*0.45, st.lookPitch*0.3);
      P.rot('head', 0, st.lookYaw*0.55, st.lookPitch*0.7);

      /* mood and persistent states */
      P.mood(st.mood, 0.3);
      if(st.night && model.nocturnal && !st.dead) P.fx('glow', 1);
      if(st.stunned && !st.dead){
        var w6 = st.t*6;
        P.rot('head', Math.sin(w6)*0.22, 0, Math.cos(w6)*0.14);
        P.rot('neck', 0, Math.sin(w6*0.5)*0.2, -0.12);
        P.move(0, 0, 0, Math.sin(st.t*4.5)*0.07, 0, 0);
        P.pos('hips', 0, -0.06, 0);
        P.mood('dizzy', 0.9);
        P.fx('stars', 1);
        P.pos('pupilL', 0, Math.sin(st.t*9)*0.03, Math.cos(st.t*9)*0.03);
        P.pos('pupilR', 0, Math.sin(-st.t*9)*0.03, Math.cos(-st.t*9)*0.03);
      }
      if(st.eating && !st.dead){
        P.rot('neck', 0, 0, -0.75); P.rot('head', 0, 0, -0.35);
        P.face({ jaw:Math.sin(st.t*13) > 0 ? 0.55 : 0.05 }, 0.8);
        P.mood('happy', 0.7);
        for(var e=1; e<=4; e++) P.rot('tail' + e, 0, Math.sin(st.t*5 - e*0.7)*0.12*e, 0);
      }

      /* one action clip */
      if(a){
        var def = a.def, dur = def.dur;
        a.prev = a.t;
        a.t += dt;
        var t = a.t;
        if(t >= dur){
          if(def.loop){ t = (def.loopFrom || 0) + ((t - (def.loopFrom || 0)) % (dur - (def.loopFrom || 0))); a.t = t; a.prev = Math.min(a.prev, t - dt); }
          else if(def.hold){ t = dur; a.t = dur; }
          else { st.action = null; a = null; }
        }
        if(a){
          var ctx = {
            t:t, u:t/dur, o:a.o, rootMotion:st.rootMotion, rig:rig,
            cue:function(at, name, data){ if(a.prev < at && a.t >= at) emit(name, data); }
          };
          def.run(P, ctx);
        }
      }
      if(st.dead && !a){ var RA = L.RigActions || {}, dd = RA[rig.sid + ':death'] || RA.death; if(dd) dd.run(P, { t:dd.dur, u:1, o:{}, rootMotion:st.rootMotion, rig:rig, cue:function(){} }); }
      if(st.dead) P.mood('dead', 1).fx('x', 1).fx('halo', 1);

      /* blink */
      st.blinkT += dt;
      if(st.blinkT > st.nextBlink){ st.blinkT = 0; st.nextBlink = 1.6 + Math.random()*3.8; }
      var blink = st.blinkT < 0.16 ? Math.sin(st.blinkT/0.16*Math.PI) : 0;

      /* resolve the face */
      var base = MOODS.calm, fk = Math.min(1, dt*14);
      CHANNELS.forEach(function(c){
        var goal = P.faceOver[c] != null ? lerp(base[c] || 0, P.faceOver[c], Math.min(1, P.faceW[c]/0.3 >= 1 ? 1 : P.faceW[c]/0.3)) : (base[c] || 0);
        st.face[c] = lerp(st.face[c], goal, c === 'jaw' ? Math.min(1, dt*22) : fk);
      });
      var F = st.face;
      P.rot('browL', -0.5*F.browA, 0, 0).pos('browL', 0, F.browY + F.browAsym*0.06, 0);
      P.rot('browR', 0.5*F.browA, 0, 0).pos('browR', 0, F.browY - F.browAsym*0.015, 0);
      var lid = lerp(1.0, -1.5, Math.max(F.lidTop, st.dead ? 0 : blink));
      P.rot('lidL', 0, 0, lid).rot('lidR', 0, 0, lid);
      var low = lerp(-1.0, 0.9, F.lidBot);
      P.rot('lowL', 0, 0, low).rot('lowR', 0, 0, low);
      P.scale('pupilL', 1, F.pupil, F.pupil).scale('pupilR', 1, F.pupil, F.pupil);
      P.pos('pupilL', 0, st.lookPitch*0.05, -st.lookYaw*0.035).pos('pupilR', 0, st.lookPitch*0.05, -st.lookYaw*0.035);
      P.rot('jaw', 0, 0, -0.8*F.jaw);
      P.pos('tongue', 0.15*F.tongue, -0.02*F.tongue, 0).rot('tongue', 0, 0, -0.35*F.tongue);
      P.rot('earL', 0.45*F.ear, 0, 0.8*F.ear).rot('earR', -0.45*F.ear, 0, 0.8*F.ear);
      P.rot('head', F.tilt, 0, 0);
      if(F.sweat > 0.5) P.fx('sweat', 1);
      if(F.vein > 0.5) P.fx('vein', 1);

      /* write bones */
      for(var name in bones){
        var bone = bones[name], rest = bone.userData.rest, q = P.acc[name];
        if(q){
          bone.position.set(rest.p.x + q.px, rest.p.y + q.py, rest.p.z + q.pz);
          bone.rotation.set(rest.r.x + q.rx, rest.r.y + q.ry, rest.r.z + q.rz);
          bone.scale.set(q.sx, q.sy, q.sz);
        } else {
          bone.position.copy(rest.p); bone.rotation.copy(rest.r); bone.scale.set(1, 1, 1);
        }
      }
      var mv = P.mv;
      rig.mover.position.set(mv.x, mv.y, mv.z);
      rig.mover.rotation.set(mv.rx, mv.ry, mv.rz);
      rig.setFlash(P.flashK*0.95, P.flashK*0.85, P.flashK*0.75);

      /* effect symbols */
      var fxs = rig.fx;
      function show(name, on){ if(fxs[name]) fxs[name].visible = !!on; }
      show('xL', P.fxOn.x); show('xR', P.fxOn.x);
      show('glowL', P.fxOn.glow); show('glowR', P.fxOn.glow);
      show('stars', P.fxOn.stars);
      if(fxs.stars){ fxs.stars.rotation.y = st.t*4; }
      show('halo', P.fxOn.halo);
      if(fxs.halo) fxs.halo.position.y = fxs.halo.userData.y0 == null ? (fxs.halo.userData.y0 = fxs.halo.position.y) : fxs.halo.userData.y0 + Math.sin(st.t*3)*0.03;
      show('sweat', P.fxOn.sweat);
      if(fxs.sweat){ fxs.sweat.userData.y0 = fxs.sweat.userData.y0 == null ? fxs.sweat.position.y : fxs.sweat.userData.y0; fxs.sweat.position.y = fxs.sweat.userData.y0 - ((st.t*0.8) % 1)*0.25; }
      show('vein', P.fxOn.vein);
      if(fxs.vein) fxs.vein.scale.setScalar(1 + Math.max(0, Math.sin(st.t*10))*0.25);
      var bang = P.fxOn.bang || 0;
      show('bang', bang > 0.01);
      if(fxs.bang) fxs.bang.scale.setScalar(Math.max(0.001, bang));

      // Symbols face the camera.
      if(camera){
        rig.group.updateMatrixWorld(true);
        camera.getWorldQuaternion(camQ);
        ['bang', 'sweat', 'vein'].forEach(function(n){
          var o = fxs[n];
          if(!o || !o.visible) return;
          o.parent.getWorldQuaternion(parQ);
          o.quaternion.copy(parQ.invert()).multiply(camQ);
        });
      }

      /* the ghost */
      // Only a fall seen happening releases a ghost; jumping to an animal already dead doesn't.
      if(st.dead && ghostT < 0 && a && a.name === 'death' && a.prev <= 0.9 && a.t > 0.9){ ghostT = 0; }
      if(ghostT >= 0){
        ghostT += dt;
        var gk = ghostT/2.4;
        ghost.visible = gk < 1;
        ghost.position.set(0, model.height*0.6 + gk*2.4, Math.sin(ghostT*3)*0.15);
        gm.opacity = 0.75*(1 - smooth(gk));
        eyeM.opacity = gm.opacity*1.2;
        if(camera){ camera.getWorldPosition(tmpV); ghost.lookAt(tmpV.x, ghost.getWorldPosition(new THREE.Vector3()).y, tmpV.z); ghost.rotateY(-Math.PI/2); }
      }
    };
  }

  L.RigAnim = { attach:attach, MOODS:MOODS, Pose:Pose, util:{ clamp:clamp, lerp:lerp, smooth:smooth } };
})(typeof window !== 'undefined' ? window : globalThis);
