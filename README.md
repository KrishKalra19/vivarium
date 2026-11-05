# 99R's ludus de animalibus

**[▶ Run it in your browser](https://krishkalra19.github.io/vivarium/)**

An ecosystem and arena simulator for animals that runs in the browser. 



No build step, nothing to install — open `index.html` and a rainforest starts running.

It has two modes:

- **Vivarium** — an open-ended Amazon ecosystem. Every animal is an individual with a heritable genome. Nothing is scripted: population cycles, predator–prey oscillation, niche partitioning and local extinctions all emerge from individual foraging, hunting, breeding and dying.
- **Arena** — name sixteen animals and watch them fight it out in a closing arena until one survives, in the spirit of BrantSteele's Hunger Games simulator. Every fight is simulated rather than drawn from a list of events, so upsets are real, and the best moments come back as replays.

## Running it

The [hosted version](https://krishkalra19.github.io/vivarium/) needs nothing at all. To run it locally:

```bash
git clone https://github.com/KrishKalra19/vivarium.git
cd vivarium
```

Open `index.html` in any modern browser. The 3D views load [Three.js](https://threejs.org/) r128 from cdnjs, so they need a connection; the Vivarium Map view works fully offline.

---

## Arena

### A match

1. **Lobby.** Pick sixteen contestants (up to two of each of thirteen species), name them, and set the rules: **Balanced** or **Open weight**, **Standard** (about 4 minutes) or **Epic** (about 10), **Free-for-all** or **Pairs**, and a **wildfire** ring or a rising **flood**.
2. **Read the omens.** Simulate 200 matches of that exact roster (120 for Epic) to get each contestant's chance of winning, then pick who you think will survive. Your record — calls, streak, points, best underdog — is saved in the browser, and an underdog call scores more than a favourite.
3. **The match.** A 3D arena ringed by an amphitheatre, fought by cartoon animals with real faces: a cocky jaguar, a grumpy caiman, a smug harpy eagle, a capybara that stays unbothered through everything. They glare when they lock on, wince when hit, dodge, go dizzy when stunned and fall with X eyes, and each species has its own moves (the caiman's death roll, the anaconda's squeeze, the howler's howl). The director cuts to face level for crits and kills. A director camera finds the hottest fight and frames the attacker with its target; a kill feed, name tags, banners (*First blood*, *Double kill*, *Final three*) and a slow-motion kill cam narrate it. Days turn to nights, feasts pull everyone together, and the hazard closes in. Click any animal to follow it; switch to a free camera any time.
4. **Results.** The victor, then **Play of the Game** plays automatically: every kill and escape is scored for hype — upsets against the pre-match odds, clutch kills on low health, multi-kills, ambushes, long brawls, the final blow — and the best one replays with a cinematic camera and slow motion on the decisive bite. Then a highlight reel, a day-by-day recap in BrantSteele style, awards, placings, and each animal's hidden form revealed.

### The contestants

| Species | Plays like |
| --- | --- |
| Jaguar, Ocelot | Pounce from range for a heavy first bite; see further at night |
| Tapir, White-lipped Peccary | Charge, knocking the target back and stunning it |
| Anaconda | Lies hidden, strikes from ambush, and constricts |
| Black Caiman | Armoured ambusher; its first bite is a death roll |
| Bushmaster | Ambusher whose venom keeps working after the bite |
| Harpy Eagle | Untouchable in the air, but has to land when it tires, and is briefly exposed after a dive |
| Giant Otter | Bites faster the more its target is bleeding |
| Howler Monkey | Its howl throws off the aim of anything nearby |
| Agouti, Spider Monkey | Survive on speed and dodging |
| Capybara | Sturdy, calm, and at home in a flood |

Swimmers handle the flood better, nocturnal hunters get an edge at night, and knocking a rival into the fire counts as your kill.

### How the arena is balanced

Balanced mode is meant to make the lineup a choice of style, not of strength. Getting there took several attempts, and the ones that failed are worth describing.

- **Flatten what a matchup hides.** Speed, dodge, reach, armour and sense range are pulled most of the way to the species average, and health and bite damage are scaled to equal fighting strength. Abilities, size and temperament stay.
- **Measure, then correct.** `tools/arena-sim.js` runs thousands of matches headlessly. Win rate in a sixteen-way, winner-take-all match turned out to be extremely sensitive to strength — a 10% edge roughly triples a species' win rate — so tuning with fixed steps overshot and oscillated, and tuning on one-on-one duels optimised the wrong thing: duel strength did not predict who survives a crowd.
- **Form.** Each contestant gets a hidden good or bad day, about 20% either way. It adds real upsets, and it was the change that let the tuner converge.
- **Tune on real matches, carefully.** The tuner uses stochastic approximation: fresh matches every round, steps that shrink each round, and the answer averaged over the later rounds. It writes `js/arena/tuning.js`.

Measured on matches the tuner never saw, a species' share of wins in Balanced mode sits between roughly **0.6× and 1.8×** of a fair share in free-for-all, and **0.75× to 1.25×** in Pairs. A typical Standard match runs about 4 minutes and an Epic about 10. Open weight is deliberately a food chain: jaguars and black caiman win most of the time.

### The engine

The match engine never touches the page and never calls `Math.random`: a seed, a roster and the settings always replay the identical match. That is what makes the pre-match odds and the replays possible, and it runs unchanged in Node for balance work. The engine records every contestant at 10 frames a second; the live match and every replay are drawn by the same 3D renderer, so a replay looks exactly like the moment did.

```bash
node tools/arena-sim.js report --matches 400          # pacing and win rates; add --pairs, --epic or --open
node tools/arena-sim.js sensitivity --species agouti  # how steeply win rate responds to strength
node tools/arena-sim.js duels                         # round-robin one-on-one combat strength
node tools/arena-sim.js tune                          # regenerate js/arena/tuning.js
```

---

## Vivarium

### The model

The simulation is built around a handful of real ecological mechanisms rather than hand-tuned magic numbers.

**Allometric scaling.** Body mass drives almost everything. Metabolic drain follows Kleiber's law (`mass^0.75`), while energy capacity scales linearly with mass — so a 250 kg tapir can fast roughly three times as long as a 4 kg agouti, without that being written down anywhere. Foraging intake scales the same way.

**Holling type II functional response.** Grazing intake saturates as vegetation thins (`avail / (k + avail)`) instead of continuing at full rate down to the last leaf. This is the negative feedback that makes herbivore populations food-limited rather than runaway.

**Discrete hunts.** A predator in contact range makes one lunge, then enters a recovery window. Success depends on a speed ratio and a strongly non-linear size term, so most hunts fail and an adult tapir is a genuinely risky target for a jaguar. Predators choose targets by expected value — catch odds squared, times prey body energy, over distance.

**Territory pressure.** Breeding stalls where conspecifics are already packed in, so populations settle at a *local* carrying capacity rather than pressing against a global ceiling.

**Nutrient cycling.** Carcasses enrich the soil where they fall, and that soil boosts plant regrowth — so a die-off feeds the next generation of vegetation.

**Dispersal.** A slow trickle of migrants arrives when a species falls near zero. Without it, a random dip to zero is permanent and the range eventually goes silent — a real property of small closed populations, but a dull one to watch.

### Watching it

The ecosystem can be watched as a top-down **Map** or in **3D**, switching at any time. Click any animal and the camera follows it with a caption of what it's doing; **Nature cam** finds a hunt in progress and stays with it until it resolves; the **Log** records kills of large prey, narrow escapes and local extinctions.

### What evolves

Each animal carries a genome of four traits, expressed as multipliers on its species baseline — a "fast agouti" is fast *for an agouti*, not fast for a jaguar:

| Trait | Effect |
| --- | --- |
| `mass` | energy capacity, metabolic drain, catchability, body size on screen |
| `speed` | pursuit and escape velocity |
| `sense` | detection range for food and threats |
| `metab` | metabolic efficiency multiplier |

Offspring inherit the parent's genome with drift proportional to the mutation-rate slider. The Genetics tab plots population trait averages per species, so you can watch selection act.

### The jungle food web

| Species | Mass | Role | Notes |
| --- | --- | --- | --- |
| Agouti | 4 kg | herbivore | fast-breeding fruit specialist, the prey base |
| Howler Monkey | 7 kg | herbivore | troop-living frugivore |
| Capybara | 50 kg | herbivore | herd grazer, large litters |
| Tapir | 250 kg | herbivore | megafaunal browser, slow to replace losses |
| Ocelot | 12 kg | predator | small-prey pursuit hunter |
| Harpy Eagle | 7 kg | predator | huge sense range, costly flight metabolism |
| Jaguar | 90 kg | predator | apex; the only thing that can take an adult tapir |
| Anaconda | 70 kg | predator | ambush specialist; ectotherm metabolism lets it wait |

Two plant layers underpin it: **foliage**, spread everywhere and fast-growing, and **fruit**, which regrows slowly in fixed canopy patches. That split is what separates the niches — frugivores cluster at fruiting trees while the big grazers work the open understory.

### Performance

Neighbour lookups run through a spatial hash, so simulation cost stays roughly linear in population. In 3D, each species is two instanced meshes (one per frame of its walk or wing cycle). Measured with `Vivarium.benchmark()` on the development machine, 3D figures including GPU time:

| View | Animals | Simulation | Render | Frame |
| --- | --- | --- | --- | --- |
| Map | ~1,900 | 9.8 ms | 0.4 ms | 10.2 ms |
| 3D | ~1,900 | 10.2 ms | 3.0 ms | 13.3 ms |
| 3D | ~2,200 | 15.0 ms | 4.3 ms | 19.3 ms |

Past about 2,000 animals a frame no longer fits in 16 ms (60 fps), and it's the simulation, not the rendering, that runs out.

---

### Evolution you can watch

- **Subspecies.** When a group drifts far enough from the rest of its lineage it splits off as a named subspecies, with Latin trinomials for the direction it moved (*Dasyprocta punctata velox* is a swift agouti). **Genetics → Family tree** shows the branching over time, with line width for population and extinct lineages greyed out.
- **River barrier** (Controls → Interventions). Agoutis, howlers and ocelots can't cross except at rare fords, so lineages split by bank (Wallace's riverine-barrier hypothesis).
- **Sexual reproduction** (Controls). Breeders need a nearby mate and prefer similar partners through an evolvable **choosiness** gene; offspring mix both parents' traits and brains.
- **Trait costs** (Controls). Speed, keen senses, a thrifty metabolism and size each carry a price, so traits stop running to their limits.
- **Time-lapse** (under the map). Replay the whole run and colour animals by subspecies to watch a split happen.

## Vivarium as a research instrument

Runs are **bit-for-bit reproducible** from a seed: the simulation has its own seeded generator, separate from anything the page does. `Vivarium.manifest()` records everything needed to repeat a run.

| tool | what it gives you |
|---|---|
| `tools/vivarium-run.js` | one headless run: census, trait means, a final-state fingerprint, charts and map, plus optional life table, ethogram and patch log; `--at` changes params mid-run (transplant designs) |
| **Life table** (Census → Data, or `--lifetable 1`) | one CSV row per animal: parents, birth and death, cause and killer, subspecies, traits, offspring, kills, and time spent in each behaviour. Columns: `docs/life-table.md` |
| **Ethogram** (`Vivarium.ethogram()`) | 1 Hz scan sampling of every animal (feed, vigilant, travel, flee, chase, stalk, lurk, search) with group size and food underfoot |
| **Patch log** (`--patches 1`) | every feeding bout: giving-up density (food left where the animal quit), how the bout ended (fled, quit on food, walked off), speed at quitting, habitat intake rate |
| `tools/experiment.js` | conditions × paired replicates from a JSON spec, run in parallel and resumable, into tidy CSVs. How-to: `docs/experiments.md` |
| `tools/analyze_vigilance.py`, `tools/analyze_choosiness.py`, `tools/analyze_cohorts.py`, `tools/analyze_patches.py` | many-eyes, reinforcement, birth-cohort / selection-differential and giving-up-density analyses, with the replicate run as the unit of analysis |
| `tools/probe-brains.js`, `tools/probe-quit.js` | edit one input of every evolved network at a time and read its decision: what the brains respond to |

Experiment switches: predators on/off, population caps, alarm contagion (instant or graded), hybrid penalty, timed secondary contact, head-down detection, scan-while-chewing, births and immigration on/off, a one-off food-landscape rescale, food-sight range, hiding visible-food quality, a measurement window, and any `Vivarium.params` value through `--set`. Every switch defaults to off, and default runs stay bit-identical (checked by fingerprint after each change).

**What it has been used for so far** (pilots; see the write-ups):
- [`docs/mvt-findings.md`](docs/mvt-findings.md): **do evolved foragers follow the marginal value theorem?** Yes, qualitatively: giving-up densities rise with habitat quality in every species. The response is plastic (a transplant test), partly mechanical and partly evolved (an unevolved policy shows a noisy version; evolution makes it consistent), and an active departure from food that's still there. There is no extra caution under predation risk. The cue is unresolved: one input *can* drive leaving, but hiding it doesn't remove the effect.
- [`docs/many-eyes-findings.md`](docs/many-eyes-findings.md): does evolved vigilance fall with group size? No, robustly, across seven pilots and evolvability and selection tests: these networks never evolve proactive scanning. Along the way, definitions, controls, food covariates and immortal-time bias each overturned a naive reading.
- Reinforcement (`experiments/out/reinforcement-pilot/`): does a hybrid penalty make mate choice evolve to be pickier? Not with these costs: hybrids are too rare and choosiness too expensive.

## Teaching field methods

The **Field** tab is a practice range for behavioural observation, scored against ground truth no real field site can give you:
- **Focal sampling**: follow one animal and record what it's doing at each sample point. Scored with % agreement, Cohen's κ, a confusion table, and observer error separated from sampling error.
- **Scan sampling**: count heads up vs down in a circle. Scored for counting error and for placement error.
- **Feeding trays**: predict, then set out trays of known food in rich and poor habitat and compare giving-up densities (Brown 1988), with confidence intervals and unvisited trays handled properly.
- **Mark–recapture**: estimate population size (Lincoln–Petersen and Chapman) and see how a long gap between sessions breaks the closed-population assumption.

**Teaching a class?** Start with [`docs/INSTRUCTOR-QUICKSTART.md`](docs/INSTRUCTOR-QUICKSTART.md): a class link gives every student the same world, one-page handouts (`docs/handouts/`), CSV downloads, and **`class.html`** to pool the class's results. Case studies on real research data are in `docs/case-studies/`. Full guide and discussion prompts: [`docs/teaching-field-methods.md`](docs/teaching-field-methods.md).

## Project layout

```
index.html              page shell and both modes' markup
css/style.css           shared styles and the Vivarium
css/arena.css           the Arena's look
js/species.js           Vivarium biome and species table
js/bodies.js            low-poly 3D body plans, shared by both modes
js/vivarium.js          ecosystem simulation, charts, Map and 3D views
js/clades.js            subspecies census, Latin names and the family tree
js/timelapse.js         compact recording of a run for the time-lapse scrubber
js/fieldstudy.js        Field tab: focal and scan sampling scored against ground truth
js/app.js               the Vivarium / Arena switch
js/arena/roster.js      arena species and combat stats
js/arena/tuning.js      generated Balanced-mode corrections
js/arena/engine.js      deterministic match engine (browser or Node)
js/arena/rig.js         cartoon rigs: one skinned, toon-shaded, outlined mesh per animal
js/arena/rig-models.js  the shared face kit (eyes, lids, brows, jaw) and the jaguar
js/arena/rig-quads*.js  four-legged body helpers and the other quadrupeds
js/arena/rig-snakes-birds.js  anaconda, bushmaster and harpy eagle
js/arena/rig-anim.js    procedural animation: gait, idle life, expressions, look-at
js/arena/rig-actions.js shared attack, reaction, victory and death clips
js/arena/rig-species-actions.js  signature moves and per-species overrides
js/arena/fx.js          blood-free impact effects and comic callouts
js/arena/stage3d.js     3D arena, shared by live play and replays
js/arena/match.js       live match: director camera, kill feed, banners
js/arena/results.js     victory, Play of the Game, highlights, recap, awards
js/arena/lobby.js       roster, rules, odds and predictions
js/arena/audio.js       sound, synthesised with the Web Audio API
tools/arena-sim.js      headless balance runner
tools/vivarium-run.js   headless Vivarium run (seeded, fingerprinted)
tools/experiment.js     experiment runner: conditions × replicates → tidy CSVs
tools/analyze_*.py      analyses for the experiments (stdlib only)
experiments/            experiment specs, and committed results under out/
docs/                   write-ups, column reference, teaching guide
```

Everything is plain scripts sharing a `Ludus` namespace — still no build step.

## Dev API

Both modes expose hooks for headless tuning and testing from the console:

```js
// Vivarium
Vivarium.setPaused(true);
for (let i = 0; i < 6000; i++) Vivarium.step(0.1);  // 600s of range time
Vivarium.stats();         // { t, total, counts, foliage }
Vivarium.deaths();        // death counts keyed by species:cause
Vivarium.benchmark(240);  // ms per frame, simulation vs render
Vivarium.reset(42);       // reseed the simulation's own generator and rebuild the world
Vivarium.manifest();      // seed, toggles and params: everything needed to reproduce the run

// Arena
Ludus.ArenaEngine.create({ roster, seed, balanced: true }).runToEnd();  // a whole match, no rendering
Ludus.ArenaMatch.advance(30);      // step the live match 30s and draw, even in a background tab
Ludus.ArenaMatch.finishNow();      // jump to the results
Ludus.ArenaResults.debugFrame(0);  // draw a frame of Play of the Game
```

`benchmark()`, `advance()` and `debugFrame()` all run synchronously, so they give real results even in a background tab where the browser pauses animation.

## Roadmap

- [x] 3D view with follow camera, nature cam and field log
- [x] Arena mode with predictions, replays and Play of the Game
- [ ] Share a match as a link (the engine is deterministic, so a seed and roster replay it exactly)
- [x] Cartoon animals with faces, personalities, signature attacks and species voices
- [x] Touch controls and a phone layout for the Arena
- [ ] Touch controls for the Vivarium 3D view
- [ ] Biome switcher (savanna, temperate forest, reef) for both modes
- [ ] Pack hunters (giant otters here; lions or wild dogs on a savanna)
- [x] Sexual reproduction and lineage trees in the Vivarium
- [x] Export run data as CSV (life table, ethogram, experiments) and reproduce any run from its seed

## License

MIT
