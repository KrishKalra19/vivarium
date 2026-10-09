/* Impact effects for the Arena, with no blood: dust, fur tufts, a cartoon "pow" star,
   claw slashes, roar shockwaves and comic callouts. One pool per effect type, so a busy
   brawl never allocates. Requires THREE r128. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};

  function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }

  function canvasTex(size, draw){
    var c = root.document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    var t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }
  var TEX = null;
  function textures(){
    if(TEX) return TEX;
    TEX = {
      puff:canvasTex(64, function(g, s){
        var gr = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, s, s);
      }),
      pow:canvasTex(128, function(g, s){
        function star(r1, r2, n, fill){
          g.beginPath();
          for(var i=0; i<n*2; i++){
            var a = i/(n*2)*Math.PI*2, r = i % 2 ? r2 : r1*(0.85 + 0.15*Math.sin(i*7.3));
            g.lineTo(s/2 + Math.cos(a)*r, s/2 + Math.sin(a)*r);
          }
          g.closePath(); g.fillStyle = fill; g.fill();
        }
        g.lineJoin = 'round';
        star(62, 30, 11, '#1A120C');
        star(56, 26, 11, '#FFD23F');
        star(36, 18, 9, '#FFFDF5');
      }),
      slash:canvasTex(128, function(g, s){
        g.lineCap = 'round';
        for(var i=0; i<3; i++){
          var off = (i - 1)*26;
          g.beginPath();
          g.moveTo(20 + off*0.4, 108 - off*0.2);
          g.quadraticCurveTo(64 + off, 64 + off*0.2, 108 + off*0.4, 20 - off*0.2);
          g.strokeStyle = '#1A120C'; g.lineWidth = 15; g.stroke();
          g.strokeStyle = '#FFFDF5'; g.lineWidth = 8; g.stroke();
        }
      }),
      ring:canvasTex(128, function(g, s){
        g.beginPath(); g.arc(s/2, s/2, s/2 - 8, 0, Math.PI*2);
        g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 7; g.stroke();
      })
    };
    return TEX;
  }

  function create(opts){
    var scene = opts.scene, overlay = opts.overlay || null;
    var T = textures();
    var sprites = [], tufts = [], rings = [], callouts = [];

    function sprite(){
      for(var i=0; i<sprites.length; i++) if(!sprites[i].live) return sprites[i];
      if(sprites.length > 140) return null;
      var m = new THREE.SpriteMaterial({ map:T.puff, transparent:true, depthWrite:false });
      var s = new THREE.Sprite(m);
      scene.add(s);
      var o = { obj:s, live:false };
      sprites.push(o);
      return o;
    }
    function spawnSprite(tex, pos, cfg){
      var o = sprite(); if(!o) return;
      o.live = true; o.t = 0; o.life = cfg.life; o.size0 = cfg.size0; o.size1 = cfg.size1;
      o.vel = cfg.vel ? cfg.vel.clone() : new THREE.Vector3(); o.grav = cfg.grav || 0; o.alpha = cfg.alpha == null ? 1 : cfg.alpha;
      o.pop = !!cfg.pop;
      var m = o.obj.material;
      m.map = tex; m.color.set(cfg.color == null ? 0xFFFFFF : cfg.color); m.rotation = cfg.rot || 0;
      m.blending = cfg.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      m.depthTest = cfg.depthTest !== false;
      m.needsUpdate = true;
      o.obj.position.copy(pos);
      o.obj.visible = true;
      o.obj.renderOrder = cfg.top ? 20 : 0;
    }

    var tuftGeo = new THREE.SphereGeometry(1, 6, 5);
    function tuft(){
      for(var i=0; i<tufts.length; i++) if(!tufts[i].live) return tufts[i];
      if(tufts.length > 90) return null;
      var m = new THREE.Mesh(tuftGeo, new THREE.MeshLambertMaterial({ color:0xFFFFFF, transparent:true }));
      scene.add(m);
      var o = { obj:m, live:false, vel:new THREE.Vector3(), spin:new THREE.Vector3() };
      tufts.push(o);
      return o;
    }

    var ringGeo = new THREE.PlaneGeometry(1, 1);
    function ring(){
      for(var i=0; i<rings.length; i++) if(!rings[i].live) return rings[i];
      if(rings.length > 24) return null;
      var m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map:T.ring, transparent:true, depthWrite:false, side:THREE.DoubleSide }));
      scene.add(m);
      var o = { obj:m, live:false };
      rings.push(o);
      return o;
    }

    var v = new THREE.Vector3();
    var api = {
      // A hit landing: a pow star, dust and tufts of the victim's fur (or scales, or feathers).
      impact:function(pos, cfg){
        cfg = cfg || {};
        var power = clamp(cfg.power == null ? 1 : cfg.power, 0.2, 2), scale = cfg.scale || 1;
        spawnSprite(T.pow, pos, { life:0.28, size0:0.3*scale, size1:(1.3 + power*0.7)*scale, pop:true, rot:Math.random()*6, top:true, depthTest:false });
        for(var i=0; i<5 + power*4; i++){
          v.set(Math.random() - 0.5, Math.random()*0.6 + 0.2, Math.random() - 0.5).normalize().multiplyScalar((1.5 + Math.random()*2)*scale);
          spawnSprite(T.puff, pos, { life:0.5 + Math.random()*0.35, size0:0.25*scale, size1:(0.8 + Math.random()*0.6)*scale,
            vel:v, grav:-1.5, color:cfg.dust || 0xE9DCC3, alpha:0.85 });
        }
        var n = Math.round((cfg.tufts == null ? 7 : cfg.tufts)*power);
        for(var k=0; k<n; k++){
          var o = tuft(); if(!o) break;
          o.live = true; o.t = 0; o.life = 0.7 + Math.random()*0.5;
          o.obj.material.color.set(cfg.color || 0xE3A447);
          o.obj.position.copy(pos);
          o.size = (0.05 + Math.random()*0.06)*scale*(cfg.kind === 'feather' ? 1.6 : 1);
          o.flat = cfg.kind === 'scale' ? 0.35 : (cfg.kind === 'feather' ? 0.2 : 0.6);
          o.vel.set(Math.random() - 0.5, Math.random()*0.9 + 0.4, Math.random() - 0.5).normalize().multiplyScalar((2.5 + Math.random()*3)*scale);
          o.drag = cfg.kind === 'feather' ? 2.5 : 0.6;
          o.spin.set(Math.random()*10, Math.random()*10, Math.random()*10);
          o.obj.visible = true;
        }
      },
      // Three claw marks raked across the target.
      slash:function(pos, cfg){
        cfg = cfg || {};
        var scale = cfg.scale || 1;
        spawnSprite(T.slash, pos, { life:0.32, size0:0.9*scale, size1:1.8*scale, pop:true, rot:cfg.rot == null ? Math.random()*0.6 - 0.3 : cfg.rot, top:true, depthTest:false });
      },
      // A ring of dust where something lands or launches.
      dust:function(pos, cfg){
        cfg = cfg || {};
        var scale = cfg.scale || 1, n = cfg.count || 10;
        for(var i=0; i<n; i++){
          var a = i/n*Math.PI*2 + Math.random()*0.3;
          v.set(Math.cos(a), 0.15 + Math.random()*0.2, Math.sin(a)).multiplyScalar((1.6 + Math.random())*scale);
          spawnSprite(T.puff, pos, { life:0.6 + Math.random()*0.3, size0:0.3*scale, size1:(0.9 + Math.random()*0.5)*scale,
            vel:v, grav:-0.3, color:cfg.color || 0xD8C8A8, alpha:0.8 });
        }
      },
      // Sound made visible: rings rolling out of a roaring mouth along `dir`.
      shockwave:function(pos, dir, cfg){
        cfg = cfg || {};
        for(var i=0; i<3; i++){
          var o = ring(); if(!o) break;
          o.live = true; o.t = -i*0.12; o.life = 0.55; o.scale = cfg.scale || 1;
          o.obj.position.copy(pos);
          o.origin = pos.clone(); o.dir = dir.clone().normalize();
          o.obj.lookAt(pos.x + o.dir.x, pos.y + o.dir.y, pos.z + o.dir.z);
          o.obj.material.color.set(cfg.color || 0xFFF1C8);
          o.obj.visible = false;
        }
      },
      // Comic callout text above a point: CRIT!, DODGE, POUNCE!
      callout:function(text, pos, cfg){
        if(!overlay) return;
        cfg = cfg || {};
        var el = root.document.createElement('div');
        el.className = 'callout ' + (cfg.tone || '');
        el.textContent = text;
        el.style.setProperty('--tilt', ((Math.random() - 0.5)*14).toFixed(1) + 'deg');
        overlay.appendChild(el);
        callouts.push({ el:el, pos:pos.clone(), t:0, life:cfg.life || 0.95 });
      },
      update:function(dt, camera, rect){
        sprites.forEach(function(o){
          if(!o.live) return;
          o.t += dt;
          var k = o.t/o.life;
          if(k >= 1){ o.live = false; o.obj.visible = false; return; }
          o.vel.y += o.grav*dt;
          o.vel.multiplyScalar(Math.pow(0.12, dt));
          o.obj.position.addScaledVector(o.vel, dt);
          var size = o.pop ? (k < 0.25 ? o.size0 + (o.size1 - o.size0)*(k/0.25) : o.size1) : o.size0 + (o.size1 - o.size0)*Math.sqrt(k);
          o.obj.scale.set(size, size, 1);
          o.obj.material.opacity = o.alpha*(o.pop ? (k < 0.55 ? 1 : 1 - (k - 0.55)/0.45) : (1 - k)*(1 - k));
        });
        tufts.forEach(function(o){
          if(!o.live) return;
          o.t += dt;
          var k = o.t/o.life;
          if(k >= 1){ o.live = false; o.obj.visible = false; return; }
          o.vel.y -= 9*dt/(1 + o.drag);
          o.vel.multiplyScalar(Math.pow(0.3/(1 + o.drag), dt));
          o.obj.position.addScaledVector(o.vel, dt);
          o.obj.rotation.x += o.spin.x*dt; o.obj.rotation.y += o.spin.y*dt; o.obj.rotation.z += o.spin.z*dt;
          o.obj.scale.set(o.size, o.size*o.flat, o.size*0.8);
          o.obj.material.opacity = 1 - Math.max(0, (k - 0.6)/0.4);
        });
        rings.forEach(function(o){
          if(!o.live) return;
          o.t += dt;
          if(o.t < 0){ o.obj.visible = false; return; }
          var k = o.t/o.life;
          if(k >= 1){ o.live = false; o.obj.visible = false; return; }
          o.obj.visible = true;
          o.obj.position.copy(o.origin).addScaledVector(o.dir, k*1.6*o.scale);
          var s = (0.3 + k*1.6)*o.scale;
          o.obj.scale.set(s, s, s);
          o.obj.material.opacity = (1 - k)*0.9;
        });
        if(overlay && camera && rect){
          for(var i=callouts.length - 1; i>=0; i--){
            var c = callouts[i];
            c.t += dt;
            if(c.t > c.life){ c.el.remove(); callouts.splice(i, 1); continue; }
            v.copy(c.pos).project(camera);
            var x = (v.x*0.5 + 0.5)*rect.width, y = (-v.y*0.5 + 0.5)*rect.height - c.t*38;
            c.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%)';
            c.el.style.opacity = v.z > 1 ? 0 : Math.min(1, (c.life - c.t)/0.25);
          }
        }
      },
      clear:function(){
        sprites.concat(tufts, rings).forEach(function(o){ o.live = false; o.obj.visible = false; });
        callouts.forEach(function(c){ c.el.remove(); });
        callouts.length = 0;
      }
    };
    return api;
  }

  L.ArenaFX = { create:create };
})(typeof window !== 'undefined' ? window : globalThis);
