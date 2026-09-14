# Vivarium

**[▶ Run it in your browser](https://krishkalra19.github.io/vivarium/)**

An agent-based ecosystem and evolution simulator that runs in the browser. 



No build step, nothing to install — open `index.html` and a rainforest starts running.

Every animal is an individual with a heritable genome. Nothing is scripted: population cycles, predator–prey oscillation, niche partitioning and local extinctions all emerge from individual foraging, hunting, breeding and dying.

## Running it

The [hosted version](https://krishkalra19.github.io/vivarium/) needs nothing at all. To run it locally:

```bash
git clone https://github.com/KrishKalra19/vivarium.git
cd vivarium
```

Open `index.html` in any modern browser. It's a single file. The 3D view loads [Three.js](https://threejs.org/) r128 from cdnjs, so it needs a connection; the Map view works fully offline.

## Watching it

A run can be watched as a top-down **Map** or in **3D**, switching at any time. The simulation itself is unchanged by the view — 3D is a second renderer over the same state, with terrain, canopy trees that ripen as their fruit regrows, and a low-poly body plan for each species (jaguars and ocelots are spotted, harpy eagles fly above the canopy and stoop onto prey, anacondas lie coiled until something comes in reach).

- **Click any animal** and the camera follows it, in either view. A caption says what it's doing — *chasing a capybara (53 kg)*, *lies in wait as an agouti comes closer*, *lunged at a tapir and missed*.
- **Nature cam** finds a hunt for you. It scores every live hunt — bigger predator, bigger prey and a closer strike all rank higher — stays with it until it resolves, then cuts to the next. Filter it to one predator if you only want to watch jaguars.
- The **Field log** records kills of large prey, narrow escapes and local extinctions; each entry jumps the camera to the animal or the spot.

In 3D the canopy thins when you're down among the animals, or you'd see nothing but leaves.

## The model

The simulation is built around a handful of real ecological mechanisms rather than hand-tuned magic numbers.

**Allometric scaling.** Body mass drives almost everything. Metabolic drain follows Kleiber's law (`mass^0.75`), while energy capacity scales linearly with mass — so a 250 kg tapir can fast roughly three times as long as a 4 kg agouti, without that being written down anywhere. Foraging intake scales the same way.

**Holling type II functional response.** Grazing intake saturates as vegetation thins (`avail / (k + avail)`) instead of continuing at full rate down to the last leaf. This is the negative feedback that makes herbivore populations food-limited rather than runaway.

**Discrete hunts.** A predator in contact range makes one lunge, then enters a recovery window. Success depends on a speed ratio and a strongly non-linear size term, so most hunts fail and an adult tapir is a genuinely risky target for a jaguar. Predators choose targets by expected value — catch odds squared, times prey body energy, over distance.

**Territory pressure.** Breeding stalls where conspecifics are already packed in, so populations settle at a *local* carrying capacity rather than pressing against a global ceiling.

**Nutrient cycling.** Carcasses enrich the soil where they fall, and that soil boosts plant regrowth — so a die-off feeds the next generation of vegetation.

**Dispersal.** A slow trickle of migrants arrives when a species falls near zero. Without it, a random dip to zero is permanent and the range eventually goes silent — a real property of small closed populations, but a dull one to watch.

## Performance

Neighbour lookups run through a spatial hash, so simulation cost stays roughly linear in population. In 3D, each species is two instanced meshes (one per frame of its walk or wing cycle), so a couple of thousand animals is about two dozen draw calls.

Measured with `Vivarium.benchmark()` on the development machine, 3D figures including GPU time:

| View | Animals | Simulation | Render | Frame |
| --- | --- | --- | --- | --- |
| Map | ~1,900 | 9.8 ms | 0.4 ms | 10.2 ms |
| 3D | ~1,900 | 10.2 ms | 3.0 ms | 13.3 ms |
| 3D | ~2,200 | 15.0 ms | 4.3 ms | 19.3 ms |

Past about 2,000 animals a frame no longer fits in 16 ms (60 fps), and it's the simulation, not the rendering, that runs out. Run the benchmark on your own machine to compare.

## What evolves

Each animal carries a genome of four traits, expressed as multipliers on its species baseline — a "fast agouti" is fast *for an agouti*, not fast for a jaguar:

| Trait | Effect |
| --- | --- |
| `mass` | energy capacity, metabolic drain, catchability, body size on screen |
| `speed` | pursuit and escape velocity |
| `sense` | detection range for food and threats |
| `metab` | metabolic efficiency multiplier |

Offspring inherit the parent's genome with drift proportional to the mutation-rate slider. The Genetics tab plots population trait averages per species, so you can watch selection act — predation pressure pushing prey speed up, or lean years selecting for lower metabolism.

## The jungle food web

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

Jaguars hunt alone here, as they do in the wild.

Two plant layers underpin it: **foliage**, spread everywhere and fast-growing, and **fruit**, which regrows slowly in fixed canopy patches. That split is what separates the niches — frugivores cluster at fruiting trees while the big grazers work the open understory.

## Controls

- **Map:** drag to pan, scroll to zoom
- **3D:** drag to orbit, right-drag or shift-drag to pan, scroll to zoom
- **Click an animal** to follow it and inspect its genome; **Esc** stops following
- **Nature cam** to watch hunts automatically, with a per-predator filter
- Playback from 0.25× to 8×, and a mutation-rate and plant-growth slider
- Interventions: drought, mast fruiting, wildfire, poaching, disease outbreak, and species reintroduction
- Census, Genetics and Log tabs chart populations and trait drift and record notable events

## Dev API

The simulation is exposed on `window.Vivarium` for headless tuning runs from the console:

```js
Vivarium.setPaused(true);
Vivarium.reset();
for (let i = 0; i < 6000; i++) Vivarium.step(0.1);  // 600s of range time
Vivarium.stats();         // { t, total, counts, foliage }
Vivarium.deaths();        // death counts keyed by species:cause
Vivarium.benchmark(240);  // ms per frame split into simulation and render
Vivarium.view('3d');      // or '2d'
Vivarium.natureCam(true);
Vivarium.follow(uid);     // follow a specific animal
```

`deaths()` is the useful one when balancing — it separates starvation from predation from old age, which is usually the difference between "this species is being over-hunted" and "this species cannot feed itself." `benchmark()` runs frames synchronously, so it gives real numbers even in a background tab where the browser pauses animation.

## Adding a biome

Everything about the ecosystem lives in one config object (`JUNGLE` in `index.html`): world size, plant layers and their regrowth rates, and the species table. A new biome is a second object of the same shape — a savanna or a reef needs no changes to the simulation core. A species without a 3D body plan falls back to a generic quadruped. Biome switching in the UI is the next thing on the list.

## Roadmap

- [x] 3D view with follow camera, nature cam and field log
- [ ] Biome switcher (savanna, temperate forest, reef)
- [ ] Pack hunters (giant otters here; lions or wild dogs on a savanna)
- [ ] Sexual reproduction and lineage trees, so you can trace ancestry
- [ ] Save/load a run, and export population data as CSV
- [ ] Split the single file into modules once it outgrows one screen of scrolling

## License

MIT
