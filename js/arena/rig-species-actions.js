/* Cartoon rigs for the Arena: signature moves and species overrides.

   'clip' entries are moves any species can list; 'species:clip' entries replace a shared
   clip for one species (the ocelot's dodge is a backflip, a snake's hit doesn't use legs). */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};
  var A = L.RigActions = L.RigActions || {};
  var M = L.RigModels;

  function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t){ return a + (b - a)*t; }
  function ramp(t, a, b){ return clamp((t - a)/(b - a), 0, 1); }
  function bump(t, a, b){ return t <= a || t >= b ? 0 : Math.sin((t - a)/(b - a)*Math.PI); }
  function ease(t){ t = clamp(t, 0, 1); return t*t*(3 - 2*t); }
  function kick(t, peak, end){ return t < peak ? t/peak : 1 - ease(ramp(t, peak, end)); }
  // Spin the whole body about its middle rather than its feet.
  function spin(P, c, rx, rz){
    var h = c.rig.model.height*0.45;
    P.move(h*Math.sin(rz) , h - h*Math.cos(rz)*Math.cos(rx), -h*Math.sin(rx), rx, 0, rz);
  }
  function reach(c, fallback){ return (c.o.dist == null ? fallback : c.o.dist)*(c.rootMotion ? 1 : 0.3); }

  /* ----- signature moves ----- */
  A.charge = {
    dur:1.25, priority:2,
    run:function(P, c){
      var t = c.t, scrape = bump(t, 0, 0.38);
      P.rot('neck', 0, 0, -0.35*scrape).rot('head', 0, 0, -0.15*scrape);
      P.rot('shoulderR', 0, 0, -Math.abs(Math.sin(t*22))*0.6*scrape).pos('hips', 0, 0.05*scrape, 0);
      var run = bump(t, 0.36, 0.84), p = ease(ramp(t, 0.38, 0.8)), ph = t*18;
      P.pair('shoulder', 0, 0, Math.sin(ph)*0.8*run); P.pair('thigh', 0, 0, -Math.sin(ph)*0.8*run);
      P.rot('neck', 0, 0, -0.5*run).rot('head', 0, 0, -0.25*run).move(0, Math.abs(Math.sin(ph))*0.12*run, 0);
      P.move(reach(c, 2.2)*p*(1 - ease(ramp(t, 0.92, 1.25))), 0, 0);
      var hit = bump(t, 0.8, 1.05);
      P.move(-0.2*hit, 0.15*hit, 0, 0, 0, 0.2*hit).rot('neck', 0, 0, 0.3*hit);
      P.mood('angry', bump(t, 0, 1.25)); P.face({ ear:1 }, bump(t, 0.3, 0.9));
      c.cue(0.4, 'leap'); c.cue(0.8, 'impact', { kind:'charge', power:1.2 });
    }
  };

  A.stomp = {
    dur:1.1, priority:2,
    run:function(P, c){
      var t = c.t, rear = ramp(t, 0, 0.45)*(1 - ease(ramp(t, 0.5, 0.62)));
      P.rot('chest', 0, 0, 0.55*rear).pos('hips', 0, -0.08*rear, 0).rot('neck', 0, 0, 0.3*rear);
      P.pair('shoulder', 0, 0, 1.0*rear); P.pair('elbow', 0, 0, -0.8*rear); P.pair('thigh', 0, 0, 0.3*rear);
      var slam = bump(t, 0.58, 0.9);
      P.pos('chest', 0, -0.1*slam, 0).rot('neck', 0, 0, -0.2*slam);
      P.move(reach(c, 0.8)*ease(ramp(t, 0, 0.5))*(1 - ramp(t, 0.8, 1.1)), 0, 0);
      P.mood('angry', bump(t, 0, 1.1));
      c.cue(0.6, 'impact', { kind:'stomp', power:1.1 }); c.cue(0.6, 'thud');
    }
  };

  A.shrug = {
    dur:1.3, priority:1, loco:1,
    run:function(P, c){
      var t = c.t, s = bump(t, 0, 1.3);
      P.pos('chest', 0, 0.06*bump(t, 0.2, 0.7), 0).rot('head', 0.3*s, 0, 0).rot('earL', 0.4*bump(t, 0.3, 0.6), 0, 0);
      P.face({ lidTop:0.62, lidBot:0.3, browAsym:0.6, jaw:0.04 }, s > 0 ? 1 : 0);
      c.cue(0.3, 'shrug');
    }
  };

  A.flip = {
    dur:0.85, priority:2,
    run:function(P, c){
      var t = c.t, side = c.o.side || 1, air = bump(t, 0.05, 0.7), p = ease(ramp(t, 0.08, 0.62));
      spin(P, c, 0, p*Math.PI*2);
      P.move(-0.5*air, 0.9*air, side*0.3*air);
      P.pair('shoulder', 0, 0, 0.9*air); P.pair('thigh', 0, 0, -0.9*air);
      P.pair('elbow', 0, 0, -0.8*air); P.pair('knee', 0, 0, 0.8*air);
      P.rot('tail1', 0, 0, -0.6*air).pos('hips', 0, -0.1*bump(t, 0.62, 0.85), 0);
      P.mood('smug', 1);
      c.cue(0.05, 'dodge'); c.cue(0.66, 'thud');
    }
  };

  A.panic = {
    dur:0.8, priority:2,
    run:function(P, c){
      var t = c.t, side = c.o.side || 1, b = bump(t, 0, 0.8);
      P.move(0, Math.abs(Math.sin(t*20))*0.15*b, side*0.7*Math.sin(ramp(t, 0, 0.8)*Math.PI*3)*b);
      P.pair('shoulder', 0, 0, Math.sin(t*40)*0.7*b); P.pair('thigh', 0, 0, -Math.sin(t*40)*0.7*b);
      P.rot('neck', 0, Math.sin(t*25)*0.4*b, 0);
      P.mood('scared', 1); P.fx('sweat', 1);
      c.cue(0.05, 'dodge');
    }
  };

  A.flurry = {
    dur:1.0, priority:2,
    run:function(P, c){
      var t = c.t, open = 0.05;
      for(var i=0; i<3; i++){
        var s = 0.05 + i*0.3, b = bump(t, s, s + 0.28);
        P.move(0.3*b, 0, 0).rot('neck', 0, (i - 1)*0.25*b, -0.4*b).rot('head', 0, 0, -0.2*b);
        if(t > s && t < s + 0.13) open = 1;
        c.cue(s + 0.14, 'impact', { kind:'bite', power:0.45 });
      }
      P.face({ jaw:open }, 1);
      P.mood('angry', bump(t, 0, 1));
    }
  };

  A.howl = {
    dur:1.8, priority:1,
    run:function(P, c){
      var t = c.t, r = bump(t, 0, 1.8), loud = t > 0.3 && t < 1.5;
      P.rot('hips', 0, 0, 0.6*r).pos('hips', 0, -0.18*r, 0);
      P.pair('shoulder', 0, 0, 2.5*r); P.pair('elbow', 0, 0, -0.6*r);
      P.rot('neck', 0, 0, 0.45*r).rot('head', Math.sin(t*40)*0.05*(loud ? 1 : 0), 0, 0.2*r);
      P.face({ jaw:loud ? 1 : 0.1, lidTop:0.85, browA:-0.45, browY:0.06 }, r > 0 ? 1 : 0);
      c.cue(0.35, 'roar'); c.cue(0.85, 'roar');
    }
  };

  A.deathroll = {
    dur:1.6, priority:2,
    run:function(P, c){
      var t = c.t, strike = bump(t, 0, 0.4);
      P.move(0.5*strike, 0, 0).rot('neck', 0, 0, -0.2*strike);
      P.face({ jaw:t < 0.3 ? 1 : 0.05 }, t < 1.5 ? 1 : 0);
      var roll = bump(t, 0.35, 1.3), p = ease(ramp(t, 0.35, 1.3));
      spin(P, c, p*Math.PI*4, 0);
      P.move(0.5*roll, 0.1*roll, 0);
      P.pair('shoulder', 0.6*roll, 0, 0); P.pair('thigh', 0.6*roll, 0, 0);
      for(var k=1; k<=5; k++) P.rot('tail' + k, 0, Math.sin(t*20 - k)*0.3*roll, 0);
      P.mood('angry', bump(t, 0, 1.6));
      c.cue(0.3, 'impact', { kind:'bite', power:0.8 }); c.cue(0.85, 'impact', { kind:'roll', power:0.9 });
    }
  };

  /* ----- snakes ----- */
  function snakeStrike(dur, kind, power, dist){
    return { dur:dur, priority:2, run:function(P, c){
      var t = c.t, D = dur;
      var coil = ramp(t, 0, 0.32*D)*(1 - ease(ramp(t, 0.34*D, 0.42*D)));
      P.rot('neck', 0, 0, 0.55*coil).rot('head', 0, 0, -0.35*coil);
      P.rot('body1', 0, 0.5*coil, 0).rot('body2', 0, -0.7*coil, 0).rot('body3', 0, 0.5*coil, 0);
      P.move(-0.15*coil, 0, 0);
      var strike = bump(t, 0.34*D, 0.62*D), p = ease(ramp(t, 0.34*D, 0.46*D));
      P.move(reach(c, dist)*p*(1 - ease(ramp(t, 0.6*D, D))), 0.25*strike, 0).rot('neck', 0, 0, -0.25*strike);
      P.face({ jaw:t > 0.3*D && t < 0.48*D ? 1 : 0.05, lidTop:0 }, 1);
      P.mood('angry', bump(t, 0, D));
      c.cue(0.46*D, 'impact', { kind:kind, power:power });
    }};
  }
  var snakeClips = {
    pounce:snakeStrike(1.2, 'strike', 1, 1.7),
    bite:snakeStrike(0.8, 'bite', 0.8, 0.6),
    venom:snakeStrike(1.0, 'venom', 0.9, 1.2),
    constrict:{ dur:1.8, priority:2, run:function(P, c){
      var t = c.t, coil = ease(ramp(t, 0, 0.5))*(1 - ease(ramp(t, 1.5, 1.8)));
      for(var k=1; k<10; k++) P.rot('body' + k, 0, 0.6*coil, 0);
      P.rot('neck', 0, 0, 0.35*coil).rot('head', 0, 0, -0.4*coil);
      var squeeze = t > 0.5 && t < 1.5 ? Math.abs(Math.sin(t*9)) : 0;
      for(var s=2; s<8; s++) P.scale('body' + s, 1, 1 - 0.14*squeeze, 1 - 0.14*squeeze);
      P.face({ lidTop:0.5, browA:0.6 }, coil);
      c.cue(0.6, 'impact', { kind:'constrict', power:0.5 }); c.cue(1.0, 'impact', { kind:'constrict', power:0.5 }); c.cue(1.4, 'impact', { kind:'constrict', power:0.6 });
    }},
    swipe:null,
    hit:{ dur:0.5, priority:1, loco:0.5, run:function(P, c){
      var k = kick(c.t, 0.05, 0.5);
      P.move(-0.15*k, 0.04*k, 0).rot('neck', 0, 0, 0.35*k).rot('head', 0.25*k, 0, 0).rot('body1', 0, 0.3*k, 0);
      P.mood('hurt', Math.min(1, k*1.6)); P.flash(kick(c.t, 0.02, 0.18));
    }},
    crit:{ dur:0.95, priority:3, run:function(P, c){
      var t = c.t, k = kick(t, 0.06, 0.8);
      P.move(-0.5*k, bump(t, 0, 0.45)*0.35, 0, 0.5*bump(t, 0.02, 0.6), 0, 0);
      for(var s=1; s<10; s++) P.rot('body' + s, 0, Math.sin(t*30 - s)*0.3*k, 0);
      P.rot('neck', 0, 0, 0.4*k);
      P.mood('shock', 1 - ramp(t, 0.12, 0.2)); P.mood('hurt', ramp(t, 0.12, 0.2)*(1 - ramp(t, 0.8, 0.95)));
      if(t > 0.25 && t < 0.9) P.fx('stars', 1);
      P.flash(kick(t, 0.02, 0.26));
    }},
    dodge:{ dur:0.55, priority:2, run:function(P, c){
      var t = c.t, side = c.o.side || 1, b = bump(t, 0, 0.55);
      P.move(0, 0, side*0.7*b);
      for(var s=0; s<10; s++) P.rot('body' + s, 0, (s % 2 ? 1 : -1)*side*0.25*b, 0);
      P.rot('neck', 0, -side*0.3*b, 0); P.mood('smug', b);
      c.cue(0.04, 'dodge');
    }},
    taunt:{ dur:1.3, priority:1, run:function(P, c){
      var t = c.t, r = bump(t, 0, 1.3);
      P.rot('neck', 0, Math.sin(t*6)*0.15*r, 0.7*r).rot('head', 0, 0, -0.3*r);
      P.rot('body1', 0, 0.4*r, 0).rot('body2', 0, -0.5*r, 0);
      P.face({ jaw:t > 0.25 && t < 1.1 ? 1 : 0.1, tongue:Math.abs(Math.sin(t*25))*r }, r > 0 ? 1 : 0);
      P.mood('angry', r);
      c.cue(0.3, 'roar');
    }},
    victory:{ dur:4, loop:true, loopFrom:1.2, priority:4, run:function(P, c){
      var t = c.t, coil = ease(ramp(t, 0, 1.2));
      for(var k=1; k<10; k++) P.rot('body' + k, 0, 0.62*coil, 0);
      P.rot('neck', 0, Math.sin(t*1.5)*0.2*coil, 0.9*coil).rot('head', 0, 0, -0.35*coil);
      P.face({ tongue:(t % 1.6) < 0.4 ? Math.abs(Math.sin(t*25)) : 0 }, 0.6);
      P.mood('smug', coil);
      c.cue(0.2, 'roar');
    }},
    death:{ dur:1.4, hold:true, priority:9, run:function(P, c){
      var t = c.t, writhe = bump(t, 0, 0.7), p = ease(ramp(t, 0.4, 1.0));
      for(var k=1; k<10; k++) P.rot('body' + k, 0, Math.sin(t*18 - k)*0.4*writhe, 0);
      P.move(0, 0.6*p, 0, Math.PI*p, 0, 0);
      P.rot('neck', 0, 0, -0.45*p);
      P.mood('hurt', 1 - p); P.flash(kick(t, 0.02, 0.2)*0.8);
      c.cue(1.0, 'thud');
    }}
  };
  snakeClips.swipe = snakeClips.constrict;
  ['anaconda', 'bushmaster'].forEach(function(sid){
    for(var name in snakeClips) A[sid + ':' + name] = snakeClips[name];
  });
  A['bushmaster:swipe'] = snakeClips.venom;
  A.venom = snakeClips.venom;
  A.constrict = snakeClips.constrict;

  /* ----- harpy eagle ----- */
  A['harpy:pounce'] = { dur:1.5, priority:2, run:function(P, c){
    var t = c.t, dist = reach(c, 2.3);
    if(t < 0.62){
      M.harpyFly(P, t, ramp(t, 0, 0.2), 12);
      P.move(0, 0.9*ease(ramp(t, 0.05, 0.55)), 0);
      P.mood('hunt', 1);
    } else if(t < 0.86){
      var d = ease(ramp(t, 0.62, 0.86));
      P.move(dist*d, lerp(2.2, 0.15, d), 0, 0, 0, -0.55*(1 - d*0.5));
      P.pair('wing', 0.2, 0.3, 0); P.pair('thigh', 0, 0, 1.2); P.pair('knee', 0, 0, -0.5);
      P.mood('angry', 1); P.face({ jaw:1 }, 1);
    } else {
      P.move(dist*(1 - ease(ramp(t, 1.05, 1.5))), bump(t, 0.86, 1.35)*0.5, 0);
      M.harpyFly(P, t, bump(t, 0.86, 1.4)*0.6, 13);
      P.mood('smug', 1);
    }
    c.cue(0.05, 'leap'); c.cue(0.86, 'impact', { kind:'dive', power:1.2 });
  }};
  A['harpy:swipe'] = { dur:0.9, priority:2, run:function(P, c){
    var t = c.t, b = bump(t, 0, 0.9), flap = Math.sin(t*14);
    P.pair('wing', -flap*0.6*b, 1.35*b, 0); P.pair('wingTip', -flap*0.3*b, 0.2*b, 0);
    P.rot('chest', 0, 0, 0.2*b).move(0.2*b, 0.2*b, 0);
    P.mood('angry', b);
    c.cue(0.4, 'impact', { kind:'buffet', power:0.6 });
  }};
  A['harpy:bite'] = { dur:0.6, priority:2, run:function(P, c){
    var t = c.t, wind = bump(t, 0, 0.26), strike = bump(t, 0.22, 0.45);
    P.rot('neck', 0, 0, 0.4*wind - 0.6*strike).rot('head', 0, 0, -0.3*strike).move(0.25*strike, 0, 0);
    P.face({ jaw:t < 0.3 ? 0.8 : 0 }, 1); P.mood('angry', bump(t, 0, 0.6));
    c.cue(0.32, 'impact', { kind:'peck', power:0.7 });
  }};
  A['harpy:taunt'] = { dur:1.3, priority:1, run:function(P, c){
    var t = c.t, r = bump(t, 0, 1.3);
    P.pair('wing', -Math.sin(t*6)*0.3*r, 1.35*r, 0);
    P.rot('neck', 0, 0, 0.3*r).rot('head', Math.sin(t*30)*0.05*r, 0, 0.15*r);
    P.face({ jaw:t > 0.3 && t < 1.1 ? 1 : 0 }, r > 0 ? 1 : 0); P.mood('smug', r);
    c.cue(0.35, 'roar');
  }};
  A['harpy:victory'] = { dur:3.2, loop:true, loopFrom:0, priority:4, run:function(P, c){
    var t = c.t;
    M.harpyFly(P, t, 0.25 + 0.2*bump(t, 0, 1.2), 4);
    P.pair('wing', 0, 1.0, 0);
    P.rot('neck', 0, 0, 0.35).rot('head', 0, Math.sin(t*1.2)*0.2, 0.1);
    P.face({ jaw:t > 0.2 && t < 0.9 ? 1 : 0 }, 1); P.mood('smug', 1);
    c.cue(0.2, 'roar');
  }};
  A['harpy:death'] = { dur:1.3, hold:true, priority:9, run:function(P, c){
    var t = c.t, flutter = bump(t, 0, 0.5), p = ease(ramp(t, 0.35, 0.8));
    P.pair('wing', -Math.sin(t*30)*0.5*flutter + 0.3*p, 1.2*Math.max(flutter, p), 0);
    P.move(0, 0.3*p, -0.5*p, 1.45*p, 0, 0);
    P.pair('thigh', 0.5*p, 0, 0.8*p);
    P.mood('hurt', 1 - p); P.flash(kick(t, 0.02, 0.2)*0.8);
    c.cue(0.8, 'thud');
  }};
  A['harpy:dodge'] = { dur:0.6, priority:2, run:function(P, c){
    var t = c.t, b = bump(t, 0, 0.6), side = c.o.side || 1;
    M.harpyFly(P, t, b*0.5, 14);
    P.move(0, 0, side*0.8*b); P.mood('smug', b);
    c.cue(0.04, 'dodge');
  }};

  /* ----- other species overrides ----- */
  A['ocelot:dodge'] = A.flip;
  A['spider:dodge'] = A.flip;
  A['agouti:dodge'] = A.panic;
  A['otter:bite'] = A.flurry;
  A['howler:taunt'] = A.howl;
  A['howler:victory'] = { dur:A.howl.dur, loop:true, loopFrom:0, priority:4, run:A.howl.run };

  A['caiman:pounce'] = { dur:1.1, priority:2, run:function(P, c){
    var t = c.t, lurk = ramp(t, 0, 0.3)*(1 - ramp(t, 0.35, 0.4));
    P.pos('hips', 0, -0.1*lurk, 0).pos('chest', 0, -0.1*lurk, 0);
    P.face({ lidTop:0.7 }, lurk);
    var p = ease(ramp(t, 0.36, 0.55));
    P.move(reach(c, 1.8)*p*(1 - ease(ramp(t, 0.7, 1.1))), 0.15*bump(t, 0.36, 0.6), 0);
    P.pair('shoulder', 0, 0, 0.8*bump(t, 0.36, 0.6));
    P.face({ jaw:t > 0.36 && t < 0.54 ? 1 : 0.05, lidTop:0 }, bump(t, 0.33, 1.1) > 0 ? 1 : 0);
    P.mood('angry', bump(t, 0.3, 1.1));
    c.cue(0.54, 'impact', { kind:'ambush', power:1.1 });
  }};
  A['caiman:taunt'] = { dur:1.4, priority:1, run:function(P, c){
    var t = c.t, r = bump(t, 0, 1.4), buzz = t > 0.3 && t < 1.1 ? Math.sin(t*60)*0.015 : 0;
    P.rot('neck', 0, 0, 0.35*r).rot('tail1', 0, 0, -0.3*r).move(0, buzz, 0);
    P.face({ jaw:0.6*r }, r > 0 ? 1 : 0);
    c.cue(0.3, 'roar');
  }};
  A['caiman:victory'] = { dur:3.0, loop:true, loopFrom:0, priority:4, run:function(P, c){
    var t = c.t, r = bump(t, 0, 1.4);
    P.rot('neck', 0, 0, 0.35*r).rot('tail1', 0, 0, -0.4*r).rot('tail3', 0, 0, 0.5*bump(t, 1.4, 1.9));
    P.face({ jaw:0.7*r }, r > 0 ? 1 : 0); P.mood('smug', 0.8);
    c.cue(0.3, 'roar'); c.cue(1.65, 'thud');
  }};

  A['capybara:taunt'] = { dur:1.6, priority:1, run:function(P, c){
    var t = c.t, y = bump(t, 0.1, 1.4);
    P.rot('neck', 0, 0, 0.25*y);
    P.face({ jaw:y, lidTop:1 }, y > 0 ? 1 : 0);
    c.cue(0.5, 'yawn');
  }};
  A['capybara:victory'] = { dur:3.5, loop:true, loopFrom:1.0, priority:4, run:function(P, c){
    var t = c.t, loaf = ease(ramp(t, 0, 1.0));
    P.pos('hips', 0, -0.32*loaf, 0).pos('chest', 0, -0.28*loaf, 0);
    P.pair('shoulder', 0, 0, -1.3*loaf); P.pair('elbow', 0, 0, 2.2*loaf);
    P.pair('thigh', 0, 0, 1.2*loaf); P.pair('knee', 0, 0, -2.0*loaf);
    P.rot('head', 0, Math.sin(t*0.8)*0.1, 0);
    P.face({ lidTop:0.78, lidBot:0.35 }, loaf);
  }};
})(typeof window !== 'undefined' ? window : globalThis);
