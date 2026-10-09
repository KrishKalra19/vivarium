/* Arena sound. Everything is synthesised with the Web Audio API, so there are no audio
   files to host or license. The context starts on the first click (browsers require a
   user gesture), and the mute setting is remembered between visits. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};

  var ctx = null, master = null, noise = null;
  var muted = false;
  var ambience = null;
  var lastHit = 0;

  try { muted = root.localStorage && root.localStorage.getItem('ludus.muted') === '1'; } catch(e){ muted = false; }

  function ensure(){
    if(!ctx){
      var AC = root.AudioContext || root.webkitAudioContext;
      if(!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.7;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate*2, ctx.sampleRate);
      var data = noise.getChannelData(0);
      for(var i=0; i<data.length; i++) data[i] = Math.random()*2 - 1;
    }
    if(ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function out(pan){
    var g = ctx.createGain();
    if(pan && ctx.createStereoPanner){
      var p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); p.connect(master);
    } else {
      g.connect(master);
    }
    return g;
  }

  function envelope(param, t, attack, decay, peak){
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function tone(type, f0, f1, dur, peak, dest, t){
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if(f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    envelope(g.gain, t, 0.005, dur, peak);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  function burst(filterType, freq, q, dur, peak, dest, t, sweepTo){
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise;
    s.loop = true;
    f.type = filterType;
    f.frequency.setValueAtTime(freq, t);
    if(sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    envelope(g.gain, t, 0.004, dur, peak);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random()*1.5);
    s.stop(t + dur + 0.05);
  }

  var sounds = {
    // The BrantSteele cannon: a falling sub thump under a low roar of noise.
    cannon: function(t, dest){
      tone('sine', 95, 32, 1.2, 0.9, dest, t);
      burst('lowpass', 420, 0.7, 1.6, 0.5, dest, t, 90);
    },
    hit: function(t, dest, power){
      var p = 0.25 + 0.75*(power || 0.5);
      burst('bandpass', 1100, 1.2, 0.07, 0.45*p, dest, t);
      tone('sine', 150, 55, 0.12, 0.6*p, dest, t);
    },
    crit: function(t, dest){
      burst('bandpass', 1500, 2, 0.1, 0.55, dest, t);
      tone('triangle', 220, 70, 0.22, 0.7, dest, t);
    },
    lunge: function(t, dest){ burst('bandpass', 380, 1.4, 0.28, 0.4, dest, t, 2600); },
    miss: function(t, dest){ burst('highpass', 3000, 0.8, 0.05, 0.12, dest, t); },
    howl: function(t, dest){
      var o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      var f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(170, t);
      o.frequency.linearRampToValueAtTime(260, t + 0.35);
      o.frequency.linearRampToValueAtTime(150, t + 1.0);
      lfo.frequency.value = 7; lg.gain.value = 9;
      lfo.connect(lg); lg.connect(o.frequency);
      f.type = 'lowpass'; f.frequency.value = 900;
      envelope(g.gain, t, 0.08, 1.0, 0.35);
      o.connect(f); f.connect(g); g.connect(dest);
      o.start(t); lfo.start(t); o.stop(t + 1.15); lfo.stop(t + 1.15);
    },
    feast: function(t, dest){
      [880, 1320, 1760, 2640].forEach(function(fq, i){ tone('sine', fq, fq, 1.4 - i*0.2, 0.22/(i + 1), dest, t + i*0.01); });
    },
    zone: function(t, dest){ burst('lowpass', 160, 0.9, 1.8, 0.55, dest, t, 60); },
    countdown: function(t, dest){ tone('square', 660, 660, 0.12, 0.18, dest, t); },
    go: function(t, dest){ tone('square', 990, 990, 0.35, 0.22, dest, t); },
    // Play of the Game: a rising detuned chord that lands on an impact.
    potg: function(t, dest){
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(5000, t + 0.9);
      f.connect(dest);
      [146.8, 220, 293.7, 440].forEach(function(fq){
        [-6, 6].forEach(function(det){
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sawtooth'; o.frequency.value = fq; o.detune.value = det;
          envelope(g.gain, t, 0.6, 1.1, 0.07);
          o.connect(g); g.connect(f);
          o.start(t); o.stop(t + 1.8);
        });
      });
      tone('sine', 110, 40, 0.9, 0.9, dest, t + 0.65);
      burst('lowpass', 900, 0.7, 0.8, 0.5, dest, t + 0.65, 120);
    },
    victory: function(t, dest){
      [523.3, 659.3, 784, 1046.5].forEach(function(fq, i){ tone('triangle', fq, fq, 0.5, 0.25, dest, t + i*0.12); });
    },
    // Species voices. kind: taunt, pain (short and high), death (long and falling), victory.
    voice: function(t, dest, power, opts){
      var v = opts.voice || 'grunt', kind = opts.kind || 'taunt';
      var pitch = kind === 'pain' ? 1.35 : (kind === 'death' ? 0.75 : 1), len = kind === 'pain' ? 0.5 : (kind === 'death' ? 1.5 : 1);
      var peak = kind === 'victory' ? 0.5 : 0.38;
      switch(v){
        case 'roar':
          voiced('sawtooth', [120*pitch, 150*pitch, 70*pitch], 0.9*len, 700, peak, dest, t, 5, 6);
          burst('bandpass', 320*pitch, 0.8, 0.8*len, peak*0.5, dest, t, 180);
          break;
        case 'yowl':
          voiced('sawtooth', [300*pitch, 520*pitch, 260*pitch], 0.7*len, 1800, peak*0.8, dest, t, 7, 14);
          break;
        case 'bellow':
          voiced('sawtooth', [62*pitch, 75*pitch, 55*pitch], 1.0*len, 420, peak*1.2, dest, t, 18, 4);
          break;
        case 'hiss':
          burst('highpass', 3200, 0.6, 0.85*len, peak*0.7, dest, t, kind === 'death' ? 900 : 5000);
          break;
        case 'screech':
          voiced('square', [1500*pitch, 2600*pitch, 1200*pitch], 0.6*len, 3200, peak*0.45, dest, t, 11, 40);
          break;
        case 'chatter':
          for(var i=0; i<(kind === 'pain' ? 3 : 6); i++) tone('square', (900 + (i % 3)*220)*pitch, 1300*pitch, 0.045, peak*0.35, dest, t + i*0.07);
          break;
        case 'whistle':
          voiced('sine', [1200*pitch, 1850*pitch, 900*pitch], 0.55*len, 4000, peak*0.7, dest, t, 5, 20);
          break;
        case 'squeak':
          tone('sine', 1800*pitch, 2500*pitch, 0.1*len, peak*0.6, dest, t);
          tone('sine', 2000*pitch, 2700*pitch, 0.08*len, peak*0.5, dest, t + 0.13);
          break;
        case 'chirp':
          for(var k=0; k<3; k++) tone('sine', 520*pitch, 760*pitch, 0.1, peak*0.45, dest, t + k*0.16);
          break;
        case 'howl':
          sounds.howl(t, dest);
          break;
        default:   // grunt
          voiced('sawtooth', [95*pitch, 70*pitch, 55*pitch], 0.16*len, 520, peak, dest, t, 20, 3);
          voiced('sawtooth', [90*pitch, 65*pitch, 50*pitch], 0.16*len, 520, peak*0.8, dest, t + 0.2, 20, 3);
      }
    }
  };

  // A pitched cry: frequency glides through three points, with vibrato, through a lowpass.
  function voiced(type, freqs, dur, cutoff, peak, dest, t, vibRate, vibDepth){
    var o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    var f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freqs[0], t);
    o.frequency.linearRampToValueAtTime(freqs[1], t + dur*0.3);
    o.frequency.linearRampToValueAtTime(freqs[2], t + dur);
    lfo.frequency.value = vibRate; lg.gain.value = vibDepth;
    lfo.connect(lg); lg.connect(o.frequency);
    f.type = 'lowpass'; f.frequency.value = cutoff;
    envelope(g.gain, t, Math.min(0.06, dur*0.2), dur, peak);
    o.connect(f); f.connect(g); g.connect(dest);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }
  var lastVoice = {};

  function play(name, opts){
    if(muted || !sounds[name]) return;
    if(!ensure()) return;
    opts = opts || {};
    if(name === 'hit' || name === 'miss'){
      var now = ctx.currentTime;
      if(now - lastHit < 0.07) return;   // keep a brawl from turning into static
      lastHit = now;
    }
    if(name === 'voice'){
      var key = (opts.voice || '') + opts.kind;
      if(ctx.currentTime - (lastVoice[key] || -9) < 0.35) return;   // one cry at a time per species and kind
      lastVoice[key] = ctx.currentTime;
    }
    var t = ctx.currentTime + (opts.delay || 0);
    var dest = out(opts.pan);
    dest.gain.value = opts.volume == null ? 1 : opts.volume;
    sounds[name](t, dest, opts.power, opts);
  }

  /* Ambience: a soft bed of forest air with birds by day and insects by night. */
  function startAmbience(){
    if(muted || ambience || !ensure()) return;
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; s.loop = true;
    f.type = 'lowpass'; f.frequency.value = 700;
    g.gain.value = 0.05;
    s.connect(f); f.connect(g); g.connect(master);
    s.start();
    ambience = { source:s, gain:g, night:false, timer:null };
    (function chirp(){
      if(!ambience) return;
      var t = ctx.currentTime, dest = out((Math.random() - 0.5)*1.4);
      if(ambience.night){
        dest.gain.value = 0.35;
        var o = ctx.createOscillator(), am = ctx.createOscillator(), ag = ctx.createGain(), eg = ctx.createGain();
        o.type = 'square'; o.frequency.value = 4200 + Math.random()*800;
        am.frequency.value = 28 + Math.random()*10; ag.gain.value = 0.5;
        am.connect(ag); ag.connect(eg.gain);
        envelope(eg.gain, t, 0.05, 0.6, 0.03);
        o.connect(eg); eg.connect(dest);
        o.start(t); am.start(t); o.stop(t + 0.7); am.stop(t + 0.7);
      } else {
        dest.gain.value = 0.5;
        var base = 1800 + Math.random()*1600;
        for(var i=0; i<2 + Math.floor(Math.random()*3); i++){
          tone('sine', base, base*1.35, 0.09, 0.05, dest, t + i*0.11);
        }
      }
      ambience.timer = setTimeout(chirp, 900 + Math.random()*2600);
    })();
  }
  function stopAmbience(){
    if(!ambience) return;
    clearTimeout(ambience.timer);
    try { ambience.source.stop(); } catch(e){}
    ambience = null;
  }
  function setNight(night){ if(ambience) ambience.night = !!night; }

  function setMuted(on){
    muted = !!on;
    try { root.localStorage.setItem('ludus.muted', muted ? '1' : '0'); } catch(e){}
    if(master) master.gain.value = muted ? 0 : 0.7;
    if(muted) stopAmbience();
  }

  L.ArenaAudio = {
    play:play, unlock:ensure, setMuted:setMuted,
    isMuted:function(){ return muted; },
    startAmbience:startAmbience, stopAmbience:stopAmbience, setNight:setNight
  };
})(typeof window !== 'undefined' ? window : globalThis);
