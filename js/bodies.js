/* Low-poly body plans shared by the Vivarium and Arena 3D views.
   Each builder returns one merged, vertex-coloured BufferGeometry; pose 0 and 1 are
   the two frames of a walk, wingbeat or slither. Requires THREE. */
(function(L){
  "use strict";

  // Body plans in units of the animal's radius, facing +X.
  var MODEL = {
    agouti:   { kind:'quad', bl:1.7, bh:0.95, bw:0.8,  leg:0.45, lr:0.1,  hs:0.42, hlong:1.3,  ears:true, tail:0.15, droop:0.2 },
    howler:   { kind:'quad', bl:1.4, bh:1.0,  bw:0.8,  leg:0.75, lr:0.1,  hs:0.5,  hlong:1.0,  tail:1.5, droop:-1.1 },
    capybara: { kind:'quad', bl:2.0, bh:1.15, bw:1.05, leg:0.42, lr:0.16, hs:0.55, hlong:1.45, ears:true },
    tapir:    { kind:'quad', bl:2.1, bh:1.2,  bw:1.0,  leg:0.55, lr:0.2,  hs:0.52, hlong:1.3,  snout:0.5, ears:true, tail:0.12 },
    ocelot:   { kind:'quad', bl:2.0, bh:0.75, bw:0.65, leg:0.6,  lr:0.1,  hs:0.38, ears:true, tail:1.0, droop:0.5, spots:6 },
    jaguar:   { kind:'quad', bl:2.2, bh:0.85, bw:0.75, leg:0.65, lr:0.13, hs:0.42, hlong:1.1,  ears:true, tail:1.4, droop:0.55, spots:8 },
    harpy:    { kind:'bird' },
    anaconda: { kind:'snake' },
    // Arena-only species
    otter:      { kind:'quad', bl:2.3, bh:0.7,  bw:0.7,  leg:0.3,  lr:0.1,  hs:0.36, hlong:1.25, tail:1.1, droop:0.35 },
    caiman:     { kind:'quad', bl:2.4, bh:0.6,  bw:0.95, leg:0.28, lr:0.14, hs:0.38, hlong:2.0,  snout:0.6, tail:1.8, droop:0.12, spots:6 },
    peccary:    { kind:'quad', bl:1.8, bh:1.0,  bw:0.85, leg:0.45, lr:0.12, hs:0.45, hlong:1.35, snout:0.35, ears:true, tail:0.1, droop:0.3 },
    spider:     { kind:'quad', bl:1.2, bh:0.9,  bw:0.7,  leg:0.95, lr:0.08, hs:0.42, hlong:1.0,  tail:1.8, droop:-1.3 },
    bushmaster: { kind:'snake' }
  };

  var _E, _Q, _V, _SC;
  function mat(px,py,pz, rx,ry,rz, sx,sy,sz){
    _E.set(rx||0, ry||0, rz||0);
    _Q.setFromEuler(_E);
    _V.set(px, py, pz);
    _SC.set(sx==null?1:sx, sy==null?1:sy, sz==null?1:sz);
    return new THREE.Matrix4().compose(_V, _Q, _SC);
  }
  function sph(){ return new THREE.SphereGeometry(1, 9, 7); }
  function cyl(r1, r2){ return new THREE.CylinderGeometry(r1, r2, 1, 6); }
  function cone(){ return new THREE.ConeGeometry(1, 1, 6); }
  function box(){ return new THREE.BoxGeometry(1, 1, 1); }
  function tint(hex, k){ return new THREE.Color(hex).multiplyScalar(k); }

  function merge(parts){
    var geos = [], total = 0;
    for(var i=0;i<parts.length;i++){
      var g = parts[i].geo.index ? parts[i].geo.toNonIndexed() : parts[i].geo;
      g.applyMatrix4(parts[i].m);
      geos.push(g);
      total += g.attributes.position.count;
    }
    var pos = new Float32Array(total*3), nor = new Float32Array(total*3), col = new Float32Array(total*3);
    var o = 0;
    for(var j=0;j<geos.length;j++){
      var cnt = geos[j].attributes.position.count, c = parts[j].color;
      pos.set(geos[j].attributes.position.array, o*3);
      nor.set(geos[j].attributes.normal.array, o*3);
      for(var v=0; v<cnt; v++){ col[(o+v)*3] = c.r; col[(o+v)*3+1] = c.g; col[(o+v)*3+2] = c.b; }
      o += cnt;
    }
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }

  function quadruped(o, pose){
    var parts = [], L = o.leg, bodyY = L + o.bh*0.42;
    parts.push({ geo:sph(), m:mat(0, bodyY, 0, 0,0,0, o.bl/2, o.bh/2, o.bw/2), color:new THREE.Color(o.color) });
    var hs = o.hs, hl = o.hlong||1.15, hx = o.bl/2 + hs*0.5, hy = bodyY + o.bh*0.22;
    parts.push({ geo:sph(), m:mat(hx, hy, 0, 0,0,0, hs*hl, hs, hs*0.9), color:tint(o.color, 0.92) });
    if(o.snout){
      parts.push({ geo:cone(), m:mat(hx + hs*hl*0.95 + o.snout*0.4, hy - hs*0.25, 0, 0,0,-Math.PI/2, hs*0.32, o.snout, hs*0.32), color:tint(o.color, 0.78) });
    }
    if(o.ears){
      for(var e=-1; e<=1; e+=2){
        parts.push({ geo:cone(), m:mat(hx - hs*0.25, hy + hs*0.85, e*hs*0.45, 0,0,0, hs*0.22, hs*0.45, hs*0.22), color:tint(o.color, 0.72) });
      }
    }
    // Two frames of a walk cycle: diagonal pairs swing together.
    var swing = pose ? 0.5 : 0, legCol = tint(o.color, 0.6);
    var legs = [[ o.bl*0.3,  o.bw*0.28,  swing], [ o.bl*0.3, -o.bw*0.28, -swing],
                [-o.bl*0.3,  o.bw*0.28, -swing], [-o.bl*0.3, -o.bw*0.28,  swing]];
    for(var i=0;i<4;i++){
      var s = legs[i][2];
      parts.push({ geo:cyl(o.lr, o.lr*0.75), m:mat(legs[i][0] + (L/2)*Math.sin(s), L - (L/2)*Math.cos(s), legs[i][1], 0,0,s, 1, L, 1), color:legCol });
    }
    if(o.tail){
      var droop = o.droop==null ? 0.45 : o.droop, n = Math.sqrt(1 + droop*droop);
      var ux = -1/n, uy = -droop/n, bx = -o.bl*0.46, by = bodyY + o.bh*0.12;
      parts.push({ geo:cyl(o.lr*0.55, o.lr*0.3), m:mat(bx + ux*o.tail/2, by + uy*o.tail/2, 0, 0,0,Math.atan2(1,-droop), 1, o.tail, 1), color:tint(o.color, 0.85) });
    }
    if(o.spots){
      var spotCol = new THREE.Color('#2b1d10');
      for(var k=0;k<o.spots;k++){
        var sx = (k/(o.spots-1) - 0.5)*o.bl*0.72, sz = (k%2 ? 1 : -1)*o.bw*0.3;
        parts.push({ geo:sph(), m:mat(sx, bodyY + o.bh*0.3, sz, 0,0,0, o.bh*0.12, o.bh*0.08, o.bh*0.12), color:spotCol });
      }
    }
    return merge(parts);
  }

  function bird(color, pose){
    var parts = [], dark = new THREE.Color('#3b4146');
    parts.push({ geo:sph(), m:mat(0,0,0, 0,0,0, 1.1,0.55,0.55), color:new THREE.Color(color) });
    parts.push({ geo:sph(), m:mat(0.95,0.2,0, 0,0,0, 0.38,0.36,0.34), color:new THREE.Color('#e4e8ea') });
    parts.push({ geo:cone(), m:mat(1.42,0.12,0, 0,0,-Math.PI/2, 0.1,0.3,0.1), color:dark });
    var up = pose ? -0.35 : 0.5, wy = 0.1 + 0.95*Math.sin(up), wz = 0.95*Math.cos(up);
    parts.push({ geo:box(), m:mat(0.05, wy,  wz, -up,0,0, 0.85,0.06,1.9), color:dark });
    parts.push({ geo:box(), m:mat(0.05, wy, -wz,  up,0,0, 0.85,0.06,1.9), color:dark });
    parts.push({ geo:box(), m:mat(-1.15,0.02,0, 0,0,0, 0.7,0.05,0.55), color:dark });
    return merge(parts);
  }

  function snake(color, pose){
    var parts = [], body = new THREE.Color(color), band = tint(color, 0.62);
    var segs = 11, len = 4.2, ph = pose ? Math.PI : 0;
    for(var i=0;i<segs;i++){
      var t = i/(segs-1), x = len*(0.5 - t);
      var z = Math.sin(t*Math.PI*2.2 + ph)*0.45*(0.25 + t*0.75);
      var r = 0.12 + 0.3*(1 - Math.abs(t - 0.35)*1.1);
      parts.push({ geo:sph(), m:mat(x, r*0.75, z, 0,0,0, r*1.25, r*0.8, r), color:(i%3===1 ? band : body) });
    }
    parts.push({ geo:sph(), m:mat(len*0.5 + 0.28, 0.2, 0, 0,0,0, 0.34,0.19,0.25), color:tint(color, 0.85) });
    return merge(parts);
  }

  function build(id, color, pose){
    if(!_E){ _E = new THREE.Euler(); _Q = new THREE.Quaternion(); _V = new THREE.Vector3(); _SC = new THREE.Vector3(); }
    var spec = MODEL[id] || { kind:'quad', bl:1.8, bh:1, bw:0.9, leg:0.5, lr:0.12, hs:0.45 };
    if(spec.kind==='bird') return bird(color, pose);
    if(spec.kind==='snake') return snake(color, pose);
    return quadruped(Object.assign({ color:color }, spec), pose);
  }

  L.Bodies = { build:build, MODEL:MODEL };
})(window.Ludus = window.Ludus || {});
