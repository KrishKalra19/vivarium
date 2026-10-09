/* Cartoon rigs for the Arena: action clips.

   Each clip is a duration and a function of time that adds to the pose. Clips name the
   quadruped bones (hips, chest, neck, head, shoulderL/R, elbowL/R, thighL/R, kneeL/R,
   tail1-4); bones a body doesn't have are skipped, so snakes and birds can reuse the
   face work and override the body work with 'species:clip' entries.
   cue(time, name) fires once as the clip passes that moment. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};

  function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t){ return a + (b - a)*t; }
  function ramp(t, a, b){ return clamp((t - a)/(b - a), 0, 1); }
  function bump(t, a, b){ return t <= a || t >= b ? 0 : Math.sin((t - a)/(b - a)*Math.PI); }
  function ease(t){ t = clamp(t, 0, 1); return t*t*(3 - 2*t); }
  // Rises fast to 1 by `peak`, then decays to 0 at `end`: the shape of a flinch.
  function kick(t, peak, end){ return t < peak ? t/peak : 1 - ease(ramp(t, peak, end)); }

  var A = {};

  /* ----- attacks ----- */
  A.pounce = {
    dur:1.3, priority:2,
    run:function(P, c){
      var t = c.t, dist = c.o.dist == null ? 1.7 : c.o.dist;
      var crouch = ramp(t, 0, 0.3)*(1 - ramp(t, 0.34, 0.42));
      var wiggle = Math.sin(t*42)*0.09*ramp(t, 0.08, 0.28)*(1 - ramp(t, 0.28, 0.34));
      P.pos('hips', 0, -0.26*crouch, 0).rot('hips', 0, wiggle, 0);
      P.pos('chest', 0, -0.16*crouch, 0).rot('chest', 0, 0, -0.1*crouch);
      P.rot('neck', 0, 0, -0.14*crouch);
      P.pair('shoulder', 0, 0, -0.35*crouch); P.pair('elbow', 0, 0, 0.5*crouch);
      P.pair('thigh', 0, 0, 0.55*crouch); P.pair('knee', 0, 0, -0.9*crouch);
      P.rot('tail4', 0, Math.sin(t*30)*0.4*crouch, 0);

      var p = ramp(t, 0.34, 0.72), air = bump(t, 0.34, 0.72);
      var back = ramp(t, 0.98, 1.3);
      if(c.rootMotion) P.move(dist*ease(p)*(1 - ease(back)), 0, 0);
      P.move(0, Math.sin(p*Math.PI)*0.9 + bump(t, 1.0, 1.25)*0.25, 0, 0, 0, (p < 0.5 ? 0.28 : -0.32)*air);
      P.pair('shoulder', 0, 0, 1.35*air); P.pair('elbow', 0, 0, 0.35*air);
      P.pair('thigh', 0, 0, -1.15*air); P.pair('knee', 0, 0, 0.45*air);
      P.rot('tail1', 0, 0, -0.6*air); P.rot('tail2', 0, 0, 0.3*air);

      var land = bump(t, 0.7, 1.0);
      P.pair('shoulder', 0, 0, 0.55*land);
      P.rot('neck', 0, 0, -0.4*land); P.rot('head', 0, 0, -0.2*land);
      P.pos('hips', 0, -0.14*land, 0);

      P.mood('hunt', 1 - ramp(t, 0.3, 0.4));
      P.mood('angry', bump(t, 0.3, 1.1));
      P.face({ jaw:t > 0.36 && t < 0.72 ? 1 : (t < 0.9 ? 0.15 : 0.1) }, t > 0.3 && t < 1.0 ? 1 : 0);
      c.cue(0.34, 'leap');
      c.cue(0.72, 'impact', { kind:'pounce', power:1 });
    }
  };

  A.swipe = {
    dur:0.78, priority:2,
    run:function(P, c){
      var t = c.t, rear = bump(t, 0, 0.72);
      P.rot('chest', 0, 0, 0.35*rear).pos('hips', 0, -0.08*rear, 0);
      P.pair('thigh', 0, 0, 0.25*rear); P.pair('knee', 0, 0, -0.35*rear);
      var raise = ramp(t, 0, 0.24)*(1 - ramp(t, 0.44, 0.66)), swing = ease(ramp(t, 0.3, 0.42));
      P.rot('shoulderR', lerp(-0.6, 1.0, swing)*raise, 0, 2.1*raise - 0.9*swing*raise);
      P.rot('elbowR', 0, 0, -1.3*raise*(1 - swing) + 0.4*swing*raise);
      P.rot('shoulderL', 0, 0, -0.3*rear);
      P.rot('head', -0.22*rear, 0.15*rear, 0).rot('neck', 0, 0, -0.1*rear);
      if(c.rootMotion) P.move(0.25*bump(t, 0.25, 0.75), 0, 0);
      P.mood('angry', bump(t, 0, 0.78));
      c.cue(0.37, 'impact', { kind:'swipe', power:0.8 });
    }
  };

  A.bite = {
    dur:0.68, priority:2,
    run:function(P, c){
      var t = c.t;
      var wind = ramp(t, 0, 0.22)*(1 - ramp(t, 0.22, 0.32));
      P.rot('neck', 0, 0, 0.38*wind).rot('head', 0, 0, 0.2*wind);
      var strike = bump(t, 0.22, 0.52);
      P.move(0.4*strike, 0, 0);
      P.rot('neck', 0, 0, -0.5*strike).rot('head', 0, 0, -0.22*strike);
      P.rot('chest', 0, 0, -0.12*strike);
      var shake = bump(t, 0.36, 0.58);
      P.rot('head', Math.sin(t*48)*0.38*shake, 0, 0).rot('neck', 0, Math.sin(t*48 + 1)*0.18*shake, 0);
      P.face({ jaw:t < 0.34 ? 1 : 0.05 }, bump(t, 0, 0.66) > 0 ? 1 : 0);
      P.mood('angry', bump(t, 0, 0.68));
      c.cue(0.34, 'impact', { kind:'bite', power:0.9 });
    }
  };

  /* ----- being hit ----- */
  A.hit = {
    dur:0.5, priority:1, loco:0.5,
    run:function(P, c){
      var k = kick(c.t, 0.05, 0.5), pw = c.o.power == null ? 1 : c.o.power;
      P.move(-0.2*k*pw, 0.04*k, 0);
      P.rot('chest', 0, 0, 0.22*k).rot('neck', 0, 0, 0.3*k).rot('head', 0.22*k, 0, 0.15*k);
      P.pair('shoulder', 0, 0, -0.25*k);
      P.mood('hurt', Math.min(1, k*1.6));
      P.flash(kick(c.t, 0.02, 0.18));
    }
  };

  A.crit = {
    dur:0.95, priority:3,
    run:function(P, c){
      var t = c.t, k = kick(t, 0.06, 0.8);
      P.move(-0.6*k, bump(t, 0, 0.45)*0.5, 0, 0.55*bump(t, 0.02, 0.6), 0, 0.3*bump(t, 0, 0.45));
      P.pair('shoulder', 0.5*k, 0, 0.5*k); P.pair('thigh', 0.5*k, 0, -0.6*k);
      P.rot('neck', 0, 0, 0.45*k).rot('head', 0.3*k, 0, 0.2*k);
      P.pos('hips', 0, -0.12*bump(t, 0.4, 0.8), 0);
      P.mood('shock', 1 - ramp(t, 0.12, 0.2));
      P.mood('hurt', ramp(t, 0.12, 0.2)*(1 - ramp(t, 0.8, 0.95)));
      if(t > 0.25 && t < 0.9) P.fx('stars', 1);
      P.flash(kick(t, 0.02, 0.26));
    }
  };

  A.dodge = {
    dur:0.58, priority:2,
    run:function(P, c){
      var t = c.t, side = c.o.side || 1, hop = bump(t, 0, 0.58), air = bump(t, 0.02, 0.32);
      P.move(0, air*0.4, side*0.8*hop, -side*0.4*air, 0, 0);
      P.pair('shoulder', 0, 0, 0.5*air); P.pair('thigh', 0, 0, -0.5*air);
      P.pair('elbow', 0, 0, -0.6*air); P.pair('knee', 0, 0, 0.5*air);
      P.rot('neck', 0, -side*0.3*hop, 0);
      P.mood('smug', hop);
      c.cue(0.04, 'dodge');
    }
  };

  /* ----- life ----- */
  A.taunt = {
    dur:1.45, priority:1,
    run:function(P, c){
      var t = c.t, rear = bump(t, 0, 1.4), up = bump(t, 0, 0.42), roar = bump(t, 0.32, 1.2);
      P.rot('chest', 0, 0, 0.3*rear).pos('hips', 0, -0.06*rear, 0);
      P.rot('neck', 0, 0, 0.5*up - 0.28*roar).rot('head', Math.sin(t*34)*0.07*roar, 0, 0.25*up - 0.1*roar);
      P.pair('shoulder', 0, 0, 0.25*roar);
      P.face({ jaw:t > 0.34 && t < 1.12 ? 1 : 0.1, tongue:0.25*roar }, rear > 0 ? 1 : 0);
      P.mood('angry', rear);
      c.cue(0.36, 'roar');
    }
  };

  A.spot = {
    dur:1.0, priority:1, loco:1,
    run:function(P, c){
      var t = c.t;
      var s = t < 0.12 ? t/0.12*1.35 : lerp(1.35, 1, ramp(t, 0.12, 0.26));
      P.fx('bang', s*(1 - ramp(t, 0.8, 0.95)));
      P.move(0, bump(t, 0, 0.26)*0.16, 0);
      P.rot('neck', 0, 0, 0.14*bump(t, 0, 0.35));
      P.face({ ear:-0.35 }, bump(t, 0, 1));
      P.mood('shock', 1 - ramp(t, 0.25, 0.45));
      P.mood('hunt', ramp(t, 0.3, 0.5));
      c.cue(0.01, 'spot');
    }
  };

  A.startle = {
    dur:1.1, priority:1,
    run:function(P, c){
      var t = c.t, away = bump(t, 0, 0.32), jump = bump(t, 0.36, 0.66);
      P.rot('neck', 0, 0.6*away, 0);
      P.move(0, jump*0.5, 0, 0, 0, 0.15*jump);
      P.pair('shoulder', 0, 0, 0.5*jump); P.pair('thigh', 0, 0, -0.5*jump);
      P.fx('bang', t > 0.34 ? 1 - ramp(t, 0.9, 1.05) : 0);
      P.mood('calm', away);
      P.mood('scared', ramp(t, 0.34, 0.4));
      c.cue(0.36, 'startle');
    }
  };

  A.victory = {
    dur:4.2, loop:true, loopFrom:1.5, priority:4,
    run:function(P, c){
      var t = c.t;
      var rearUp = bump(t, 0, 1.25);
      P.rot('hips', 0, 0, 0.85*rearUp).pos('hips', 0, 0.12*rearUp, 0);
      P.pair('thigh', 0, 0, -0.7*rearUp); P.pair('knee', 0, 0, 0.3*rearUp);
      P.rot('shoulderL', 0, 0, (-0.3 + Math.sin(t*11)*0.6)*rearUp);
      P.rot('shoulderR', 0, 0, (-0.3 + Math.sin(t*11 + 2)*0.6)*rearUp);
      P.pair('elbow', 0, 0, 0.7*rearUp);
      P.rot('neck', 0, 0, 0.35*rearUp);
      P.face({ jaw:t > 0.25 && t < 1.0 ? 1 : 0.12 }, rearUp > 0.05 ? 1 : 0);

      var sit = ease(ramp(t, 1.0, 1.5)), bob = t > 1.5 ? Math.sin((t - 1.5)*2.4) : 0;
      P.pos('hips', 0, -0.5*sit, 0).rot('hips', 0, 0, 0.42*sit);
      P.pair('thigh', 0, 0, 1.2*sit); P.pair('knee', 0, 0, -2.1*sit);
      P.pair('shoulder', 0, 0, -0.42*sit); P.rot('chest', 0, 0, -0.05*sit);
      P.rot('neck', 0, 0, 0.15*sit + bob*0.04).rot('head', 0, bob*0.12*sit, 0.1*sit);
      P.rot('tail1', 0, 0.6*sit, -0.5*sit).rot('tail3', 0, 0.5*sit, 0).rot('tail4', 0, 0.6*sit + bob*0.2, 0);
      P.mood('angry', rearUp);
      P.mood('smug', sit);
      c.cue(0.3, 'roar');
    }
  };

  A.death = {
    dur:1.3, hold:true, priority:9,
    run:function(P, c){
      var t = c.t, buckle = ramp(t, 0, 0.35), fall = ramp(t, 0.3, 0.75);
      fall = fall*fall;
      P.move(0, 0, 0, Math.sin(t*22)*0.1*bump(t, 0, 0.4), 0, 0);
      P.pos('hips', 0, -0.12*buckle, 0);
      P.pair('elbow', 0, 0, -0.5*buckle*(1 - fall)); P.pair('knee', 0, 0, 0.5*buckle*(1 - fall));
      P.move(0, 0.42*fall + bump(t, 0.75, 0.92)*0.12, -0.95*fall, 1.45*fall, 0, 0);
      P.rot('shoulderL', -0.5*fall, 0, 0.5*fall).rot('shoulderR', -0.2*fall, 0, -0.35*fall);
      P.rot('thighL', -0.5*fall, 0, -0.4*fall).rot('thighR', -0.2*fall, 0, 0.45*fall);
      P.rot('neck', 0, 0, -0.1*fall).rot('tail1', 0, 0, -0.5*fall);
      P.mood('hurt', 1 - fall);
      P.flash(kick(t, 0.02, 0.2)*0.8);
      c.cue(0.78, 'thud');
    }
  };

  L.RigActions = A;
})(typeof window !== 'undefined' ? window : globalThis);
