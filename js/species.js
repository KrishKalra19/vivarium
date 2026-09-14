(function(L){
  "use strict";
  L.biomes = L.biomes || {};

  /* ---------------------------------------------------------------
     Biome definition. Everything about the ecosystem lives here —
     adding a savanna or reef later means adding another entry.
  --------------------------------------------------------------- */
  L.biomes.jungle = {
    id:'jungle',
    label:'Amazon jungle',
    world:{ w:2400, h:1600 },
    plants:{
      foliage:{ regrow:0.055, energy:45, cover:1.0 },
      fruit:{ regrow:0.020, energy:95, patches:46, patchRadius:130 }
    },
    species:{
      agouti:{
        name:'Agouti', role:'herbivore', color:'#D9A05B', mass:4,
        speed:106, sense:130, metab:1.0, lifespan:95,
        diet:{ foliage:0.4, fruit:1.0 }, herd:0.12, panic:0.62,
        repro:{ threshold:0.80, cooldown:16, minAge:12, litter:2 },
        cap:1600, start:300, floor:30, crowd:11
      },
      howler:{
        name:'Howler Monkey', role:'herbivore', color:'#B5502E', mass:7,
        speed:88, sense:158, metab:1.05, lifespan:150,
        diet:{ foliage:0.42, fruit:1.0 }, herd:0.55, panic:0.58,
        repro:{ threshold:0.85, cooldown:24, minAge:18, litter:1 },
        cap:950, start:170, floor:18, crowd:16
      },
      capybara:{
        name:'Capybara', role:'herbivore', color:'#8A6038', mass:50,
        speed:73, sense:120, metab:0.95, lifespan:170,
        diet:{ foliage:1.0, fruit:0.45 }, herd:0.75, panic:0.72,
        repro:{ threshold:0.85, cooldown:28, minAge:22, litter:3 },
        cap:750, start:130, floor:14, crowd:20
      },
      tapir:{
        name:'Tapir', role:'herbivore', color:'#6A6A78', mass:250,
        speed:58, sense:105, metab:0.85, lifespan:280,
        diet:{ foliage:1.0, fruit:0.75 }, herd:0.05, panic:0.6,
        repro:{ threshold:0.90, cooldown:70, minAge:52, litter:1 },
        cap:190, start:55, floor:10, crowd:5
      },
      ocelot:{
        name:'Ocelot', role:'predator', color:'#E2913C', mass:12,
        speed:133, sense:126, metab:0.72, lifespan:160,
        prey:['agouti','howler'], maxPreyMass:10, catchSkill:1.15,
        repro:{ threshold:0.82, cooldown:30, minAge:24, litter:1 },
        cap:150, start:34, floor:5, crowd:4
      },
      harpy:{
        name:'Harpy Eagle', role:'predator', color:'#CBD5DA', mass:7,
        speed:152, sense:245, metab:0.85, lifespan:190,
        prey:['agouti','howler'], maxPreyMass:9, catchSkill:1.3,
        repro:{ threshold:0.78, cooldown:30, minAge:26, litter:1 },
        cap:110, start:26, floor:7, crowd:7
      },
      jaguar:{
        name:'Jaguar', role:'predator', color:'#EFB13C', mass:90,
        speed:105, sense:162, metab:1.0, lifespan:230,
        prey:['agouti','howler','capybara','tapir'], maxPreyMass:300, catchSkill:1.0,
        repro:{ threshold:0.93, cooldown:85, minAge:60, litter:1 },
        cap:42, start:16, floor:3, crowd:2
      },
      anaconda:{
        name:'Anaconda', role:'predator', color:'#46806B', mass:70,
        speed:46, sense:98, metab:0.40, lifespan:260,
        prey:['agouti','howler','capybara'], maxPreyMass:80, catchSkill:1.5,
        ambush:true, strikeRange:64,
        repro:{ threshold:0.90, cooldown:110, minAge:80, litter:2 },
        cap:46, start:20, floor:3, crowd:3
      }
    }
  };
})(window.Ludus = window.Ludus || {});
