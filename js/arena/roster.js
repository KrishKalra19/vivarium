/* Arena combatants: the jungle's eight species plus five that only fight here.

   Stats are open-weight baselines. Health and bite damage scale with body mass
   (health with mass^0.6, damage with mass^0.5 times a per-species bite factor), so a
   jaguar really does out-muscle an agouti. Balanced mode rescales each species to
   equal fighting strength, then applies the corrections in ArenaTuning, which come
   from tools/calibrate.js running thousands of matches.

   speed/sense/reach are in arena units (the arena is 1040 across). cd is seconds
   between bites. dodge is the chance a bite misses outright. aggression (0..1) is how
   readily the AI picks a fight it isn't sure of. */
(function(root){
  "use strict";
  var L = root.Ludus = root.Ludus || {};

  L.ArenaSpecies = {
    agouti:     { name:'Agouti',              color:'#D9A05B', mass:4,   speed:150, sense:190, reach:9,  bite:0.9,  cd:0.55, armor:0,    dodge:0.35, aggression:0.2,  abilities:['nimble'],             swim:false, nocturnal:false,
                  blurb:'Tiny, twitchy, very hard to pin down.' },
    howler:     { name:'Howler Monkey',       color:'#B5502E', mass:7,   speed:120, sense:210, reach:10, bite:1.0,  cd:0.7,  armor:0,    dodge:0.25, aggression:0.3,  abilities:['howl','climber'],     swim:false, nocturnal:false,
                  blurb:'Its howl rattles anything close enough to bite it.' },
    capybara:   { name:'Capybara',            color:'#8A6038', mass:50,  speed:105, sense:170, reach:14, bite:1.1,  cd:0.9,  armor:0.05, dodge:0.08, aggression:0.3,  abilities:[],                     swim:true,  nocturnal:false,
                  blurb:'Unbothered, sturdy, and completely at home in a flood.' },
    tapir:      { name:'Tapir',               color:'#6A6A78', mass:250, speed:90,  sense:150, reach:18, bite:0.55, cd:1.1,  armor:0.18, dodge:0.02, aggression:0.35, abilities:['charge'],             swim:true,  nocturnal:false,
                  blurb:'A quarter-tonne of thick hide that charges.' },
    ocelot:     { name:'Ocelot',              color:'#E2913C', mass:12,  speed:160, sense:200, reach:11, bite:1.8,  cd:0.6,  armor:0,    dodge:0.2,  aggression:0.7,  abilities:['pounce'],             swim:false, nocturnal:true,
                  blurb:'A small cat that pounces from further than you think.' },
    harpy:      { name:'Harpy Eagle',         color:'#CBD5DA', mass:7,   speed:190, sense:320, reach:12, bite:2.0,  cd:0.9,  armor:0,    dodge:0.3,  aggression:0.65, abilities:['flight','dive'],      swim:false, nocturnal:false,
                  blurb:'Untouchable in the air. Has to come down eventually.' },
    jaguar:     { name:'Jaguar',              color:'#EFB13C', mass:90,  speed:135, sense:220, reach:15, bite:2.2,  cd:0.85, armor:0.05, dodge:0.1,  aggression:0.8,  abilities:['pounce'],             swim:true,  nocturnal:true,
                  blurb:'The strongest bite of any big cat for its size.' },
    anaconda:   { name:'Anaconda',            color:'#46806B', mass:70,  speed:70,  sense:140, reach:16, bite:1.6,  cd:1.2,  armor:0.1,  dodge:0.02, aggression:0.55, abilities:['ambush','constrict'], swim:true,  nocturnal:false,
                  blurb:'Waits. Strikes. Does not let go.' },
    otter:      { name:'Giant Otter',         color:'#6B4A33', mass:30,  speed:140, sense:190, reach:12, bite:1.5,  cd:0.5,  armor:0.03, dodge:0.18, aggression:0.85, abilities:['frenzy'],             swim:true,  nocturnal:false,
                  blurb:'The river wolf. Bites faster the more you bleed.' },
    caiman:     { name:'Black Caiman',        color:'#4A5A3A', mass:150, speed:75,  sense:150, reach:18, bite:1.9,  cd:1.5,  armor:0.2,  dodge:0,    aggression:0.6,  abilities:['ambush','deathroll'], swim:true,  nocturnal:true,
                  blurb:'Armoured, patient, and its first bite is a death roll.' },
    peccary:    { name:'White-lipped Peccary', color:'#5E5650', mass:35, speed:125, sense:170, reach:12, bite:1.2,  cd:0.7,  armor:0.1,  dodge:0.1,  aggression:0.75, abilities:['charge'],             swim:false, nocturnal:false,
                  blurb:'Tusks, a bad temper and a running start.' },
    spider:     { name:'Spider Monkey',       color:'#2F2A27', mass:9,   speed:170, sense:210, reach:10, bite:0.8,  cd:0.6,  armor:0,    dodge:0.45, aggression:0.2,  abilities:['nimble','climber'],   swim:false, nocturnal:false,
                  blurb:'Five limbs, no patience for being caught.' },
    bushmaster: { name:'Bushmaster',          color:'#B98B4E', mass:3,   speed:80,  sense:130, reach:14, bite:1.0,  cd:1.4,  armor:0,    dodge:0.1,  aggression:0.5,  abilities:['ambush','venom'],     swim:false, nocturnal:true,
                  blurb:'Three kilos of patience and a venom that keeps working.' }
  };

  // Balanced-mode corrections per species, multiplied into health and damage.
  // 1 means "the equal-strength formula was already fair". Set by tools/calibrate.js.
  L.ArenaTuning = L.ArenaTuning || {};

  L.ARENA_MAX_PER_SPECIES = 2;
  L.ARENA_ROSTER_SIZE = 16;
})(typeof window !== 'undefined' ? window : globalThis);
