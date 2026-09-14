/* The arena in 3D, shared by the live match and every replay.

   It never reads the engine directly. Each frame it is handed a "view": where every
   contestant is, how healthy, what they're doing, plus the hazard, night and feast. Live
   play builds that view from the running engine; replays build it from the recording.
   So a replay looks exactly like the moment did. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};

  var S = 0.1;    // arena units -> scene units (arena radius 520 -> 52)
  var YS = 1.2;   // terrain height scale
  var FLY = 14;   // scene height of a bird at full altitude

  function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t){ return a + (b - a)*t; }
  function angleLerp(a, b, t){ var d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d*t; }

  function create(opts){
    var canvas = opts.canvas, tagsEl = opts.tags, info = opts.world;   // info: engine state at t=0
    var R = (L.ArenaEngine ? L.ArenaEngine.ARENA_R : 520)*S;
    var height = opts.height;
    var SPECIES = L.ArenaSpecies;

    var renderer = new THREE.WebGLRenderer({ canvas:canvas, antialias:true });
    renderer.setPixelRatio(Math.min(1.75, root.devicePixelRatio || 1));
    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(46, 16/9, 0.3, 900);
    var clock = 0;

    function sceneY(x, y){ return height(x, y)*YS; }

    /* ----- sky, fog and light ----- */
    var DAY_SKY = new THREE.Color(0xBDB09A), NIGHT_SKY = new THREE.Color(0x141A26);
    var skyColor = DAY_SKY.clone();
    scene.background = skyColor;
    scene.fog = new THREE.Fog(skyColor, 90, 320);
    var hemi = new THREE.HemisphereLight(0xFFF1D6, 0x3A2A1A, 0.95);
    var sun = new THREE.DirectionalLight(0xFFE0A8, 0.8);
    sun.position.set(-60, 110, 40);
    scene.add(hemi); scene.add(sun);
    var nightMix = 0;

    /* ----- terrain: a disc of jungle floor, burn effect injected into its shader ----- */
    var fireU = { uFire:{ value:new THREE.Vector3(0, 0, 999) }, uTime:{ value:0 }, uOn:{ value:0 } };
    (function buildTerrain(){
      var NR = 56, NS = 132, verts = [], colors = [], idx = [];
      var sand = new THREE.Color(0x8E7B5C), grass = new THREE.Color(0x4E7436), dark = new THREE.Color(0x3A2E20), c = new THREE.Color();
      verts.push(0, sceneY(0, 0), 0);
      c.copy(grass).lerp(sand, 0.35); colors.push(c.r, c.g, c.b);
      for(var i=1; i<=NR; i++){
        var rr = (i/NR)*(R + 0.6);
        for(var j=0; j<NS; j++){
          var a = j/NS*Math.PI*2, wx = Math.cos(a)*rr/S, wy = Math.sin(a)*rr/S;
          verts.push(Math.cos(a)*rr, sceneY(wx, wy), Math.sin(a)*rr);
          var h = height(wx, wy), n = Math.sin(wx*0.05)*Math.sin(wy*0.043) + Math.sin((wx + wy)*0.021);
          c.copy(sand).lerp(grass, clamp(0.45 + h*0.16 + n*0.14, 0, 1));
          c.lerp(dark, clamp((i/NR - 0.9)*6, 0, 0.5));
          colors.push(c.r, c.g, c.b);
        }
      }
      for(var s=0; s<NS; s++) idx.push(0, 1 + (s + 1)%NS, 1 + s);
      for(var ri=0; ri<NR - 1; ri++){
        for(var sj=0; sj<NS; sj++){
          var a0 = 1 + ri*NS + sj, a1 = 1 + ri*NS + (sj + 1)%NS, b0 = a0 + NS, b1 = a1 + NS;
          idx.push(a0, a1, b0, a1, b1, b0);
        }
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      var m = new THREE.MeshLambertMaterial({ vertexColors:true });
      m.onBeforeCompile = function(shader){
        shader.uniforms.uFire = fireU.uFire; shader.uniforms.uTime = fireU.uTime; shader.uniforms.uOn = fireU.uOn;
        shader.vertexShader = 'varying vec3 vWP;\n' + shader.vertexShader.replace('#include <worldpos_vertex>',
          '#include <worldpos_vertex>\n  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = 'uniform vec3 uFire; uniform float uTime; uniform float uOn; varying vec3 vWP;\n' +
          shader.fragmentShader.replace('#include <dithering_fragment>', [
            '#include <dithering_fragment>',
            'if(uOn > 0.5){',
            '  float d = distance(vWP.xz, uFire.xy);',
            '  float burn = smoothstep(uFire.z - 0.3, uFire.z + 3.0, d);',
            '  float edge = exp(-pow((d - uFire.z)/1.3, 2.0));',
            '  float flick = 0.6 + 0.4*sin(uTime*9.0 + vWP.x*1.7 + vWP.z*1.3);',
            '  float ember = step(0.985, fract(sin(dot(floor(vWP.xz*2.0), vec2(12.9898, 78.233)))*43758.5453 + uTime*0.2));',
            '  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.08, 0.055, 0.045), burn*0.85);',
            '  gl_FragColor.rgb += vec3(1.0, 0.42, 0.08)*edge*flick*0.95 + vec3(1.0, 0.35, 0.05)*ember*burn*0.6;',
            '}'].join('\n'));
      };
      scene.add(new THREE.Mesh(g, m));
    })();

    /* ----- the amphitheatre: stepped stone seating and torches on the wall ----- */
    var torches = [];
    (function buildAmphitheatre(){
      var pts = [], base = R + 1.2, lowest = -6;
      pts.push(new THREE.Vector2(base, lowest));
      pts.push(new THREE.Vector2(base, 4.5));
      for(var k=0; k<6; k++){
        pts.push(new THREE.Vector2(base + 2.2 + k*3.4, 4.5 + k*3.2));
        pts.push(new THREE.Vector2(base + 2.2 + k*3.4, 7.7 + k*3.2));
      }
      pts.push(new THREE.Vector2(base + 24, 26));
      var lathe = new THREE.LatheGeometry(pts, 96);
      var stone = new THREE.Mesh(lathe, new THREE.MeshLambertMaterial({ color:0x8A7560, side:THREE.DoubleSide, flatShading:true }));
      scene.add(stone);
      var wallTop = new THREE.Mesh(new THREE.TorusGeometry(base, 0.35, 6, 96), new THREE.MeshLambertMaterial({ color:0x6E5A45 }));
      wallTop.rotation.x = Math.PI/2; wallTop.position.y = 4.6;
      scene.add(wallTop);
      var postGeo = new THREE.CylinderGeometry(0.18, 0.24, 2.4, 6);
      var flameGeo = new THREE.ConeGeometry(0.42, 1.25, 7);
      var postMat = new THREE.MeshLambertMaterial({ color:0x3A2A1C });
      for(var t=0; t<24; t++){
        var a = t/24*Math.PI*2, x = Math.cos(a)*(base - 0.2), z = Math.sin(a)*(base - 0.2);
        var post = new THREE.Mesh(postGeo, postMat);
        post.position.set(x, 5.8, z);
        scene.add(post);
        var fm = new THREE.MeshBasicMaterial({ color:0xFFB03A, transparent:true, opacity:0.95 });
        var flame = new THREE.Mesh(flameGeo, fm);
        flame.position.set(x, 7.5, z);
        scene.add(flame);
        torches.push({ flame:flame, phase:t*1.7 });
      }
    })();

    /* ----- trees and fruit bushes from the engine's layout ----- */
    var bushMeshes = [], trees = [];
    (function buildFlora(){
      var trunkGeo = new THREE.CylinderGeometry(0.28, 0.5, 1, 6); trunkGeo.translate(0, 0.5, 0);
      var crownGeo = new THREE.IcosahedronGeometry(1, 0);
      info.trees.forEach(function(tr, i){
        var h = 5 + ((i*37)%10)/10*4, cr = 2.2 + ((i*53)%10)/10*1.8;
        var gx = tr.x*S, gz = tr.y*S, gy = sceneY(tr.x, tr.y);
        // Each tree has its own materials so it can fade when it blocks the shot.
        var trunkMat = new THREE.MeshLambertMaterial({ color:0x5A4330, transparent:true });
        var crownMat = new THREE.MeshLambertMaterial({ color:0x3F6B34, flatShading:true, transparent:true });
        var trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(gx, gy, gz); trunk.scale.set(1, h, 1);
        scene.add(trunk);
        var crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.set(gx, gy + h + cr*0.5, gz); crown.scale.set(cr, cr*0.8, cr);
        crown.rotation.y = i;
        scene.add(crown);
        trees.push({ x:gx, z:gz, r:cr, trunk:trunkMat, crown:crownMat, fade:1 });
      });
      var leafGeo = new THREE.IcosahedronGeometry(1, 0), berryGeo = new THREE.SphereGeometry(0.22, 6, 5);
      var leafMat = new THREE.MeshLambertMaterial({ color:0x4F8A3C, flatShading:true });
      var berryMat = new THREE.MeshLambertMaterial({ color:0xC8352A });
      info.bushes.forEach(function(b){
        var g = new THREE.Group();
        var leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.scale.set(1.5, 1.0, 1.5);
        leaf.position.y = 0.8;
        g.add(leaf);
        var berries = [];
        for(var k=0; k<6; k++){
          var berry = new THREE.Mesh(berryGeo, berryMat);
          berry.position.set(Math.cos(k*1.05)*1.2, 0.9 + (k%2)*0.5, Math.sin(k*1.05)*1.2);
          g.add(berry);
          berries.push(berry);
        }
        g.position.set(b.x*S, sceneY(b.x, b.y), b.y*S);
        scene.add(g);
        bushMeshes.push({ group:g, berries:berries, x:b.x, y:b.y });
      });
    })();

    /* ----- hazards ----- */
    var flameCurtain = null, water = null;
    if(info.hazard.kind === 'fire'){
      fireU.uOn.value = 1;
      var curtainGeo = new THREE.CylinderGeometry(1, 1, 1, 128, 1, true);
      curtainGeo.translate(0, 0.5, 0);
      flameCurtain = new THREE.Mesh(curtainGeo, new THREE.ShaderMaterial({
        uniforms:{ uTime:fireU.uTime },
        vertexShader:'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
        fragmentShader:[
          'uniform float uTime; varying vec2 vUv;',
          'void main(){',
          '  float n = sin(vUv.x*180.0 + uTime*4.0)*0.5 + 0.5;',
          '  n = n*0.55 + (sin(vUv.x*67.0 - uTime*2.6 + vUv.y*5.0)*0.5 + 0.5)*0.45;',
          '  float h = 1.0 - vUv.y;',
          '  float a = pow(h, 1.6)*(0.3 + 0.7*n);',
          '  vec3 c = mix(vec3(1.0, 0.22, 0.02), vec3(1.0, 0.85, 0.35), h*n);',
          '  gl_FragColor = vec4(c*a*1.5, a);',
          '}'].join('\n'),
        transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide
      }));
      scene.add(flameCurtain);
    } else {
      var waterGeo = new THREE.CircleGeometry(R + 1.2, 128);
      waterGeo.rotateX(-Math.PI/2);
      water = new THREE.Mesh(waterGeo, new THREE.ShaderMaterial({
        uniforms:{ uTime:fireU.uTime },
        vertexShader:'varying vec3 vWP; void main(){ vec4 w = modelMatrix*vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
        fragmentShader:[
          'uniform float uTime; varying vec3 vWP;',
          'void main(){',
          '  float r1 = sin(vWP.x*0.9 + uTime*1.3)*sin(vWP.z*0.8 - uTime*1.1);',
          '  float r2 = sin((vWP.x + vWP.z)*1.7 - uTime*2.0);',
          '  float s = smoothstep(0.55, 1.0, r1*0.6 + r2*0.4);',
          '  vec3 c = vec3(0.10, 0.28, 0.30) + vec3(0.30, 0.42, 0.40)*s;',
          '  gl_FragColor = vec4(c, 0.8);',
          '}'].join('\n'),
        transparent:true, depthWrite:false
      }));
      scene.add(water);
    }

    /* ----- the feast: fruit piled under a shaft of gold light ----- */
    var feast = new THREE.Group();
    (function buildFeast(){
      var pile = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.6, 16), new THREE.MeshLambertMaterial({ color:0x6B4A2A }));
      pile.position.y = 0.3;
      feast.add(pile);
      var fruitMat = [0xE8892A, 0xC8352A, 0xE8C24A].map(function(c){ return new THREE.MeshLambertMaterial({ color:c }); });
      for(var k=0; k<14; k++){
        var f = new THREE.Mesh(new THREE.SphereGeometry(0.45, 7, 6), fruitMat[k%3]);
        f.position.set(Math.cos(k*2.4)*(k%3)*0.7, 0.8 + (k%4)*0.25, Math.sin(k*2.4)*(k%3)*0.7);
        feast.add(f);
      }
      var beamGeo = new THREE.CylinderGeometry(2.2, 3.4, 60, 24, 1, true);
      beamGeo.translate(0, 30, 0);
      var beam = new THREE.Mesh(beamGeo, new THREE.ShaderMaterial({
        uniforms:{ uTime:fireU.uTime },
        vertexShader:'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
        fragmentShader:'uniform float uTime; varying vec2 vUv; void main(){ float a = (1.0 - vUv.y)*0.35*(0.8 + 0.2*sin(uTime*3.0)); gl_FragColor = vec4(vec3(1.0, 0.78, 0.35)*a, a); }',
        transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide
      }));
      feast.add(beam);
      feast.visible = false;
      scene.add(feast);
    })();

    /* ----- contestants ----- */
    var bodies = [];
    var ringGeo = new THREE.RingGeometry(0.82, 1, 40); ringGeo.rotateX(-Math.PI/2);
    var shadowGeo = new THREE.CircleGeometry(1, 18); shadowGeo.rotateX(-Math.PI/2);
    var shadowMat = new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.32, depthWrite:false });
    info.cs.forEach(function(c){
      var sp = SPECIES[c.sid];
      var group = new THREE.Group();
      var mat = new THREE.MeshLambertMaterial({ vertexColors:true, emissive:0x000000, transparent:true, opacity:1 });
      var poses = [0, 1].map(function(p){
        var mesh = new THREE.Mesh(L.Bodies.build(c.sid, sp.color, p), mat);
        mesh.visible = p === 0;
        group.add(mesh);
        return mesh;
      });
      scene.add(group);
      var shadow = new THREE.Mesh(shadowGeo, shadowMat);
      scene.add(shadow);
      var tag = root.document.createElement('div');
      tag.className = 'tag';
      tag.innerHTML = '<span class="nm"></span><span class="hp"><i></i></span>';
      tag.firstChild.textContent = c.name;
      tag.style.color = sp.color;
      tagsEl.appendChild(tag);
      bodies.push({
        id:c.id, sid:c.sid, group:group, poses:poses, mat:mat, shadow:shadow, tag:tag, tagHp:tag.querySelector('i'),
        scale:Math.max(0.6, c.r*S*2.0), flash:0, lastHp:1, stride:0, lastX:c.x, lastY:c.y, deadT:null, fall:0
      });
    });
    var focusRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color:0xE8B04A, transparent:true, opacity:0.95, depthTest:false }));
    var targetRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color:0xD9452F, transparent:true, opacity:0.9, depthTest:false }));
    focusRing.renderOrder = targetRing.renderOrder = 10;
    focusRing.visible = targetRing.visible = false;
    scene.add(focusRing); scene.add(targetRing);

    /* ----- camera: an orbit that the director or the viewer can drive ----- */
    var camera = {
      tx:0, tz:0, ty:0, dist:118, yaw:0.9, pitch:0.78,
      goal:{ tx:0, tz:0, dist:118, pitch:0.78 },
      free:false, shake:0, cutNext:false,
      lookAt:function(x, y, dist, pitch){
        this.goal.tx = x*S; this.goal.tz = y*S;
        if(dist != null) this.goal.dist = dist;
        if(pitch != null) this.goal.pitch = pitch;
      },
      cut:function(){ this.cutNext = true; },
      overview:function(){ this.lookAt(0, 0, 118, 0.78); }
    };

    function updateCamera(dt){
      var k = camera.cutNext ? 1 : Math.min(1, 3.2*dt);
      camera.cutNext = false;
      if(!camera.free){
        camera.tx = lerp(camera.tx, camera.goal.tx, k);
        camera.tz = lerp(camera.tz, camera.goal.tz, k);
        camera.dist = lerp(camera.dist, camera.goal.dist, Math.min(1, k*0.8));
        camera.pitch = lerp(camera.pitch, camera.goal.pitch, Math.min(1, k*0.6));
        camera.yaw += dt*0.05;   // a slow drift keeps a static shot alive
        // Near the wall, swing round to shoot outward from the middle, not in through the stands.
        var fromCentre = Math.hypot(camera.tx, camera.tz);
        if(fromCentre > R*0.3){
          var inward = Math.atan2(-camera.tx, -camera.tz);
          var w = clamp((fromCentre - R*0.3)/(R*0.4), 0, 1);
          camera.yaw = angleLerp(camera.yaw, inward, k === 1 ? w : Math.min(1, w*2*dt));
        }
      }
      camera.tx = clamp(camera.tx, -R, R); camera.tz = clamp(camera.tz, -R, R);
      var gy = sceneY(camera.tx/S, camera.tz/S);
      camera.ty = lerp(camera.ty, gy, Math.min(1, 4*dt));
      var cp = Math.cos(camera.pitch);
      var sx = 0, sz = 0;
      if(camera.shake > 0.001){
        sx = (Math.random() - 0.5)*camera.shake; sz = (Math.random() - 0.5)*camera.shake;
        camera.shake *= Math.pow(0.02, dt);
      }
      cam.position.set(camera.tx + camera.dist*cp*Math.sin(camera.yaw) + sx,
                       camera.ty + camera.dist*Math.sin(camera.pitch),
                       camera.tz + camera.dist*cp*Math.cos(camera.yaw) + sz);
      var camR = Math.hypot(cam.position.x, cam.position.z), wall = R + 0.5;
      if(camR > wall){ cam.position.x *= wall/camR; cam.position.z *= wall/camR; }
      var floor = sceneY(cam.position.x/S, cam.position.z/S) + 1.2;
      if(cam.position.y < floor) cam.position.y = floor;
      cam.lookAt(camera.tx, camera.ty + 1.2, camera.tz);
    }

    function bindInput(onUser){
      var drag = null;
      canvas.addEventListener('contextmenu', function(e){ e.preventDefault(); });
      canvas.addEventListener('mousedown', function(e){
        drag = { x:e.clientX, y:e.clientY, moved:false, pan:e.button === 2 || e.shiftKey };
        canvas.classList.add('dragging');
      });
      root.addEventListener('mousemove', function(e){
        if(!drag) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if(!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
        drag.moved = true;
        drag.x = e.clientX; drag.y = e.clientY;
        if(onUser) onUser('drag');
        camera.free = true;
        if(drag.pan){
          var sc = camera.dist*0.0018, sy = Math.sin(camera.yaw), cy = Math.cos(camera.yaw);
          camera.tx -= (cy*dx + sy*dy)*sc;
          camera.tz += (sy*dx - cy*dy)*sc;
        } else {
          camera.yaw -= dx*0.006;
          camera.pitch = clamp(camera.pitch + dy*0.005, 0.15, 1.45);
        }
      });
      root.addEventListener('mouseup', function(e){
        if(!drag) return;
        var d = drag; drag = null;
        canvas.classList.remove('dragging');
        if(!d.moved && e.button === 0 && e.target === canvas && onUser) onUser('click', e);
      });
      canvas.addEventListener('wheel', function(e){
        e.preventDefault();
        camera.free = true;
        if(onUser) onUser('zoom');
        camera.dist = clamp(camera.dist*(e.deltaY < 0 ? 1/1.12 : 1.12), 8, 170);
        camera.goal.dist = camera.dist;
      }, { passive:false });
    }

    /* ----- per frame ----- */
    var projV = new THREE.Vector3();
    var view = null, lastViewT = null;

    function setView(v){ view = v; }

    function render(dt){
      if(!view) return;
      clock += dt;
      fireU.uTime.value = clock;
      var cutting = camera.cutNext;

      nightMix = lerp(nightMix, view.night ? 1 : 0, Math.min(1, dt*1.2));
      skyColor.copy(DAY_SKY).lerp(NIGHT_SKY, nightMix);
      scene.fog.color.copy(skyColor);
      hemi.intensity = lerp(0.95, 0.38, nightMix);
      sun.intensity = lerp(0.8, 0.18, nightMix);
      sun.color.setRGB(lerp(1, 0.55, nightMix), lerp(0.88, 0.65, nightMix), lerp(0.66, 1, nightMix));
      torches.forEach(function(t){
        var f = 0.85 + 0.15*Math.sin(clock*11 + t.phase) + 0.08*Math.sin(clock*23 + t.phase*2);
        t.flame.scale.set(f, f*(1 + 0.4*nightMix), f);
        t.flame.material.opacity = 0.75 + 0.25*nightMix;
      });

      var hz = view.hazard;
      if(flameCurtain){
        var rr = hz.r*S;
        fireU.uFire.value.set(hz.cx*S, hz.cy*S, rr);
        flameCurtain.visible = rr > 0.5;
        flameCurtain.position.set(hz.cx*S, sceneY(hz.cx, hz.cy) - 3, hz.cy*S);
        flameCurtain.scale.set(Math.max(0.5, rr), 11, Math.max(0.5, rr));
      }
      if(water) water.position.y = hz.level*YS;

      bushMeshes.forEach(function(b, i){
        var food = view.bushes ? view.bushes[i] : 1;
        b.berries.forEach(function(berry, k){ berry.visible = food > (k + 0.5)/6; });
      });

      if(view.feast && view.feast.active){
        feast.visible = true;
        feast.position.set(view.feast.x*S, sceneY(view.feast.x, view.feast.y), view.feast.y*S);
        var fs = 0.5 + 0.5*clamp(view.feast.food, 0, 1);
        feast.scale.set(fs, 1, fs);
      } else feast.visible = false;

      var rect = canvas.getBoundingClientRect();
      // A cut or a jump in time is not a hit: re-baseline health and position without flashing.
      var jumped = cutting || lastViewT === null || Math.abs(view.t - lastViewT) > 0.6;
      view.cs.forEach(function(c, i){
        var b = bodies[i];
        if(jumped){ b.lastHp = c.hp; b.lastX = c.x; b.lastY = c.y; b.flash = 0; }
        var gx = c.x*S, gz = c.y*S, ground = sceneY(c.x, c.y);
        var moved = Math.hypot(c.x - b.lastX, c.y - b.lastY);
        b.lastX = c.x; b.lastY = c.y;
        b.stride += moved*0.045;
        if(c.hp < b.lastHp - 0.005) b.flash = 1;
        b.lastHp = c.hp;
        b.flash = Math.max(0, b.flash - dt*4);

        if(!c.alive){
          if(b.deadT === null) b.deadT = clock;
          b.fall = Math.min(1, (clock - b.deadT)/0.45);
        } else { b.deadT = null; b.fall = 0; }

        var s = b.scale;
        var anim = Math.floor(c.anim), af = c.anim - anim, stretch = 1, hop = 0;
        if(anim === 2 && af < 0.3){ var q = Math.sin(af/0.3*Math.PI); stretch = 1 + 0.28*q; hop = 0.25*q*s; }
        if(anim === 3 && af < 0.45){ var q2 = Math.sin(af/0.45*Math.PI); stretch = 1 + 0.4*q2; hop = 0.9*q2*s; }
        var shakeY = c.pinned ? Math.sin(clock*40)*0.06 : 0;

        b.group.position.set(gx, ground + c.alt*FLY + hop + shakeY - b.fall*s*0.3, gz);
        b.group.rotation.set(b.fall*Math.PI*0.5, -c.yaw, 0, 'YXZ');
        b.group.scale.set(s*stretch, s*(1 - b.fall*0.1), s);
        var pose = (c.sid === 'harpy') ? (Math.sin(clock*9 + i) > 0 ? 1 : 0)
                 : (c.alive && moved > 0.4 && (b.stride % 1) > 0.5 ? 1 : 0);
        b.poses[0].visible = pose === 0;
        b.poses[1].visible = pose === 1;
        b.mat.emissive.setRGB(b.flash*0.9, b.flash*0.12, b.flash*0.05);
        b.mat.opacity = !c.alive ? Math.max(0.35, 1 - b.fall*0.3) : (c.stealth > 0.6 ? 0.45 : 1);
        b.mat.color.setScalar(c.alive ? 1 : 0.45);

        b.shadow.visible = c.alive;
        b.shadow.position.set(gx, ground + 0.06, gz);
        var fade = 1 - Math.min(0.6, c.alt*0.6);
        b.shadow.scale.set(s*1.3*fade, 1, s*0.95*fade);
        b.shadow.rotation.y = -c.yaw;

        // name tag
        projV.set(gx, ground + c.alt*FLY + s*1.9 + 0.8, gz).project(cam);
        var visible = view.tags !== false && c.alive && projV.z < 1 && projV.z > -1;
        if(visible){
          var px = (projV.x*0.5 + 0.5)*rect.width, py = (-projV.y*0.5 + 0.5)*rect.height;
          visible = px > -40 && px < rect.width + 40 && py > -20 && py < rect.height + 20;
          if(visible){
            b.tag.style.transform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px) translate(-50%,-100%)';
            b.tagHp.style.width = Math.round(c.hp*100) + '%';
            b.tag.classList.toggle('low', c.hp < 0.3);
            b.tag.classList.toggle('focus', view.focusId === c.id);
          }
        }
        b.tag.style.display = visible ? '' : 'none';
      });

      placeRing(focusRing, view.focusId, 1.9);
      placeRing(targetRing, view.targetId, 1.7);
      updateCamera(dt);
      fadeBlockingTrees(dt, cutting);
      renderer.render(scene, cam);
      lastViewT = view.t;
    }

    // Trees standing between the camera and what it is looking at thin out to a ghost.
    function fadeBlockingTrees(dt, instant){
      var ax = cam.position.x, az = cam.position.z, dx = camera.tx - ax, dz = camera.tz - az;
      var len2 = dx*dx + dz*dz || 1, k = instant ? 1 : Math.min(1, dt*6);
      trees.forEach(function(t){
        var u = clamp(((t.x - ax)*dx + (t.z - az)*dz)/len2, 0, 1);
        var px = ax + dx*u - t.x, pz = az + dz*u - t.z;
        var nearCamera = Math.hypot(t.x - ax, t.z - az) < t.r + 7;
        var blocking = nearCamera || (u < 0.97 && Math.sqrt(px*px + pz*pz) < t.r + 2.5);
        t.fade += ((blocking ? 0.15 : 1) - t.fade)*k;
        t.trunk.opacity = t.crown.opacity = t.fade;
        t.trunk.depthWrite = t.crown.depthWrite = t.fade > 0.95;
      });
    }

    function placeRing(ring, id, mult){
      var c = id == null ? null : view.cs[id];
      if(!c || !c.alive){ ring.visible = false; return; }
      ring.visible = true;
      var s = bodies[id].scale*mult;
      ring.position.set(c.x*S, sceneY(c.x, c.y) + c.alt*FLY + 0.12, c.y*S);
      ring.scale.set(s, s, s);
    }

    function resize(){
      var r = canvas.getBoundingClientRect();
      var w = Math.max(320, r.width), h = Math.max(200, r.height);
      renderer.setSize(w, h, false);
      cam.aspect = w/h;
      cam.updateProjectionMatrix();
    }

    function pick(clientX, clientY){
      if(!view) return null;
      var rect = canvas.getBoundingClientRect(), best = null, bestD = 30;
      view.cs.forEach(function(c, i){
        if(!c.alive) return;
        projV.set(c.x*S, sceneY(c.x, c.y) + c.alt*FLY + bodies[i].scale, c.y*S).project(cam);
        if(projV.z > 1 || projV.z < -1) return;
        var d = Math.hypot((projV.x*0.5 + 0.5)*rect.width - (clientX - rect.left), (-projV.y*0.5 + 0.5)*rect.height - (clientY - rect.top));
        if(d < bestD){ bestD = d; best = c.id; }
      });
      return best;
    }

    function screenX(x, y){
      projV.set(x*S, sceneY(x, y), y*S).project(cam);
      return projV.x;
    }

    function dispose(){
      bodies.forEach(function(b){ b.tag.remove(); });
      renderer.dispose();
      if(renderer.forceContextLoss) renderer.forceContextLoss();
    }

    resize();
    return { render:render, setView:setView, resize:resize, pick:pick, camera:camera, bindInput:bindInput, screenX:screenX, dispose:dispose };
  }

  L.ArenaStage3D = { create:create, S:S };
})(typeof window !== 'undefined' ? window : globalThis);
