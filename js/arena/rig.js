/* Cartoon rigs for the Arena: the core.

   Each animal is one skinned, toon-shaded mesh with a matching outline mesh. Every part
   (a torso, an eyelid, a fang) is rigidly bound to a single bone, so an animal costs two
   draw calls however many parts it has, which keeps sixteen of them smooth on a phone.
   Species body plans live in rig-models.js; animation lives in rig-anim.js. Requires THREE r128. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};

  var RES = null;             // shared outline resolution, set by whoever owns the renderer
  var gradient = null;
  var geoCache = {};

  function toonGradient(){
    if(gradient) return gradient;
    var v = [96, 172, 255], data = new Uint8Array(9);
    for(var i=0; i<3; i++){ data[i*3] = data[i*3 + 1] = data[i*3 + 2] = v[i]; }
    gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
    return gradient;
  }

  function resolution(){
    if(!RES) RES = new THREE.Vector2(1280, 720);
    return RES;
  }

  // Outline: the back faces pushed out along the screen-space normal by a fixed pixel width.
  var OUTLINE_VS = [
    '#include <common>',
    '#include <skinning_pars_vertex>',
    '#include <fog_pars_vertex>',
    'uniform float uWidth; uniform vec2 uRes;',
    'void main(){',
    '  #include <skinbase_vertex>',
    '  #include <begin_vertex>',
    '  #include <beginnormal_vertex>',
    '  #include <skinnormal_vertex>',
    '  #include <skinning_vertex>',
    '  #include <project_vertex>',
    '  vec3 n = normalize(normalMatrix*objectNormal);',
    '  vec2 d = (projectionMatrix*vec4(n, 0.0)).xy;',
    '  d /= max(length(d), 1e-4);',
    '  gl_Position.xy += d*uWidth*gl_Position.w*2.0/uRes;',
    '  #include <fog_vertex>',
    '}'].join('\n');
  var OUTLINE_FS = [
    'uniform vec3 uColor; uniform float uOpacity;',
    '#include <common>',
    '#include <fog_pars_fragment>',
    'void main(){',
    '  gl_FragColor = vec4(uColor, uOpacity);',
    '  #include <fog_fragment>',
    '}'].join('\n');

  function outlineMaterial(skinned, width){
    var u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
    u.uRes = { value:resolution() };
    u.uWidth = { value:width == null ? 2.2 : width };
    u.uColor = { value:new THREE.Color(0x1A120C) };
    u.uOpacity = { value:1 };
    return new THREE.ShaderMaterial({
      uniforms:u, vertexShader:OUTLINE_VS, fragmentShader:OUTLINE_FS,
      side:THREE.BackSide, fog:true, skinning:!!skinned, transparent:true
    });
  }

  function toonMaterial(opts){
    opts = opts || {};
    return new THREE.MeshToonMaterial({
      vertexColors:opts.vertexColors !== false, color:opts.color || 0xFFFFFF,
      gradientMap:toonGradient(), skinning:!!opts.skinned, transparent:true, emissive:0x000000
    });
  }

  /* ----- primitive shapes, built once and cloned into each body ----- */
  function prim(name){
    if(geoCache[name]) return geoCache[name];
    var g;
    switch(name){
      case 'sphere':  g = new THREE.SphereGeometry(1, 14, 10); break;
      case 'ball':    g = new THREE.SphereGeometry(1, 10, 8); break;
      case 'capTop':  g = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI*2, 0, Math.PI/2); break;
      case 'capBot':  g = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI*2, Math.PI/2, Math.PI/2); break;
      case 'cone':    g = new THREE.ConeGeometry(1, 1, 8); break;
      case 'cyl':     g = new THREE.CylinderGeometry(1, 1, 1, 10); break;
      case 'box':     g = new THREE.BoxGeometry(1, 1, 1); break;
      default: throw new Error('unknown primitive ' + name);
    }
    geoCache[name] = g;
    return g;
  }

  /* ----- a body under construction: bones plus parts bound to them ----- */
  var _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

  function Builder(){
    this.bones = []; this.by = {}; this.parts = []; this.fx = [];
  }
  Builder.prototype.bone = function(name, parent, x, y, z, rx, ry, rz){
    var b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    b.rotation.set(rx || 0, ry || 0, rz || 0);
    if(parent) this.by[parent].add(b);
    b.userData.rest = { p:b.position.clone(), r:b.rotation.clone() };
    b.userData.index = this.bones.length;
    this.by[name] = b;
    this.bones.push(b);
    return b;
  };
  // A part: primitive, centre, rotation and radii in its bone's space, and a colour.
  Builder.prototype.part = function(bone, shape, px, py, pz, sx, sy, sz, color, rx, ry, rz){
    _e.set(rx || 0, ry || 0, rz || 0);
    _q.setFromEuler(_e);
    this.parts.push({ bone:bone, geo:prim(shape), color:new THREE.Color(color),
      m:new THREE.Matrix4().compose(_v.set(px, py, pz), _q, _s.set(sx, sy, sz)) });
  };
  // A flattened blotch lying on an ellipsoid's surface: spots, stripes, patches.
  Builder.prototype.patch = function(bone, cx, cy, cz, rx, ry, rz, u, w, size, thick, color){
    var n = new THREE.Vector3(Math.cos(w)*Math.cos(u), Math.sin(w), Math.cos(w)*Math.sin(u));
    var p = new THREE.Vector3(cx + n.x*rx, cy + n.y*ry, cz + n.z*rz);
    var normal = new THREE.Vector3(n.x/rx, n.y/ry, n.z/rz).normalize();
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    this.parts.push({ bone:bone, geo:prim('ball'), color:new THREE.Color(color),
      m:new THREE.Matrix4().compose(p, _q, _s.set(size, thick, size*0.8)) });
  };
  // Effects (stun stars, sweat, the "!") are ordinary meshes hung on bones and shown on demand.
  Builder.prototype.attach = function(bone, name, object){
    this.by[bone].add(object);
    object.visible = false;
    this.fx.push({ name:name, object:object });
  };

  function finish(B){
    var rootBone = B.bones[0];
    rootBone.updateMatrixWorld(true);
    // Sit the lowest point of the body on the ground.
    var minY = Infinity, box = new THREE.Box3(), m = new THREE.Matrix4();
    B.parts.forEach(function(p){
      if(!p.geo.boundingBox) p.geo.computeBoundingBox();
      m.multiplyMatrices(B.by[p.bone].matrixWorld, p.m);
      box.copy(p.geo.boundingBox).applyMatrix4(m);
      minY = Math.min(minY, box.min.y);
    });
    rootBone.position.y -= minY;
    rootBone.userData.rest.p.y -= minY;
    rootBone.updateMatrixWorld(true);

    var nV = 0, nI = 0;
    B.parts.forEach(function(p){ nV += p.geo.attributes.position.count; nI += p.geo.index.count; });
    var pos = new Float32Array(nV*3), nor = new Float32Array(nV*3), col = new Float32Array(nV*3);
    var si = new Uint16Array(nV*4), sw = new Float32Array(nV*4), idx = new Uint32Array(nI);
    var vo = 0, io = 0;
    B.parts.forEach(function(p){
      var g = p.geo.clone();
      g.applyMatrix4(m.multiplyMatrices(B.by[p.bone].matrixWorld, p.m));
      var cnt = g.attributes.position.count, bi = B.by[p.bone].userData.index;
      pos.set(g.attributes.position.array, vo*3);
      nor.set(g.attributes.normal.array, vo*3);
      for(var v=0; v<cnt; v++){
        col[(vo + v)*3] = p.color.r; col[(vo + v)*3 + 1] = p.color.g; col[(vo + v)*3 + 2] = p.color.b;
        si[(vo + v)*4] = bi; sw[(vo + v)*4] = 1;
      }
      var gi = g.index.array;
      for(var k=0; k<gi.length; k++) idx[io + k] = gi[k] + vo;
      vo += cnt; io += gi.length;
      g.dispose();
    });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    return geo;
  }

  /* ----- assembling a rig ----- */
  function create(sid, opts){
    opts = opts || {};
    var model = L.RigModels && L.RigModels[sid];
    if(!model) throw new Error('no rig for ' + sid);
    var B = new Builder();
    model.build(B, THREE);
    var geo = finish(B);

    var group = new THREE.Group();     // placed by the stage
    var mover = new THREE.Group();     // root motion and whole-body tumbles from animation
    group.add(mover);
    var skeleton = new THREE.Skeleton(B.bones);
    var body = new THREE.SkinnedMesh(geo, toonMaterial({ skinned:true }));
    body.add(B.bones[0]);
    body.bind(skeleton);
    body.frustumCulled = false;
    mover.add(body);
    var outline = null;
    if(opts.outline !== false){
      outline = new THREE.SkinnedMesh(geo, outlineMaterial(true, opts.outlineWidth));
      outline.bind(skeleton, body.bindMatrix);
      outline.frustumCulled = false;
      mover.add(outline);
    }

    var fx = {};
    B.fx.forEach(function(f){ fx[f.name] = f.object; });
    var outlineOn = true, opacity = 1;
    // A see-through body writes no depth, so its outline would paint over it: drop the outline then.
    function syncOutline(){ if(outline) outline.visible = outlineOn && opacity > 0.95; }
    var rig = {
      sid:sid, model:model, group:group, mover:mover, body:body, outline:outline,
      bones:B.by, fx:fx, height:model.height || 2,
      setOutline:function(on){ outlineOn = on; syncOutline(); },
      setOpacity:function(a){
        if(a === opacity) return;
        opacity = a;
        body.material.opacity = a;
        body.material.depthWrite = a > 0.95;
        syncOutline();
      },
      setFlash:function(r, g, b){ body.material.emissive.setRGB(r, g, b); },
      dispose:function(){
        geo.dispose(); body.material.dispose();
        if(outline) outline.material.dispose();
      }
    };
    if(L.RigAnim) L.RigAnim.attach(rig, opts);
    return rig;
  }

  L.Rigs = {
    create:create, Builder:Builder, toonMaterial:toonMaterial, outlineMaterial:outlineMaterial,
    setResolution:function(w, h){ resolution().set(w, h); },
    has:function(sid){ return !!(L.RigModels && L.RigModels[sid]); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
