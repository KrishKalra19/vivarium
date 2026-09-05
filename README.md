# Vivarium

**[▶ Run it in your browser](https://krishkalra19.github.io/vivarium/)**

An agent-based ecosystem and evolution simulator that runs in the browser. 



No build step, no dependencies — open `index.html` and a rainforest starts running.

Every animal is an individual with a heritable genome. Nothing is scripted: population cycles, predator–prey oscillation, niche partitioning and local extinctions all emerge from individual foraging, hunting, breeding and dying.

## Running it

The [hosted version](https://krishkalra19.github.io/vivarium/) needs nothing at all. To run it locally:

```bash
git clone https://github.com/KrishKalra19/vivarium.git
cd vivarium
```

Open `index.html` in any modern browser. That's it — it's a single self-contained file.

## The model

The simulation is built around a handful of real ecological mechanisms rather than hand-tuned magic numbers.

**Allometric scaling.** Body mass drives almost everything. Metabolic drain follows Kleiber's law (`mass^0.75`), while energy capacity scales linearly with mass — so a 250 kg tapir can fast roughly three times as long as a 4 kg agouti, without that being written down anywhere. Foraging intake scales the same way.

**Holling type II functional response.** Grazing intake saturates as vegetation thins (`avail / (k + avail)`) instead of continuing at full rate down to the last leaf. This is the negative feedback that makes herbivore populations food-limited rather than runaway.

**Discrete hunts.** A predator in contact range makes one lunge, then enters a recovery window. Success depends on a speed ratio and a strongly non-linear size term, so most hunts fail and an adult tapir is a genuinely risky target for a jaguar. Predators choose targets by expected value — catch odds squared, times prey body energy, over distance — which is why jaguars mostly take capybara and leave adult tapir alone.

**Territory pressure.** Breeding stalls where conspecifics are already packed in, so populations settle at a *local* carrying capacity rather than pressing against a global ceiling.

**Nutrient cycling.** Carcasses enrich the soil where they fall, and that soil boosts plant regrowth — so a die-off feeds the next generation of vegetation.

**Dispersal.** A slow trickle of migrants arrives when a species falls near zero. Without it, a random dip to zero is permanent and the range eventually goes silent — a real property of small closed populations, but a dull one to watch.

Neighbour lookups run through a spatial hash, so the cost stays roughly linear in population; ~2,500 animals runs comfortably at 60 fps.

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

Two plant layers underpin it: **foliage**, spread everywhere and fast-growing, and **fruit**, which regrows slowly in fixed canopy patches. That split is what separates the niches — frugivores cluster at fruiting trees while the big grazers work the open understory.

## Controls

- **Drag** to pan, **scroll** to zoom, **click an animal** to inspect its genome
- Playback speed up to 8×, and a mutation-rate and plant-growth slider
- Interventions: drought, mast fruiting, wildfire, poaching, disease outbreak, and species reintroduction
- Census and Genetics tabs chart populations and trait drift over the last few minutes

## Dev API

The simulation is exposed on `window.Vivarium` for headless tuning runs from the console:

```js
Vivarium.setPaused(true);
Vivarium.reset();
for (let i = 0; i < 6000; i++) Vivarium.step(0.1);  // 600s of range time
Vivarium.stats();   // { t, total, counts, foliage }
Vivarium.deaths();  // death counts keyed by species:cause
```

`deaths()` is the useful one when balancing — it separates starvation from predation from old age, which is usually the difference between "this species is being over-hunted" and "this species cannot feed itself."

## Adding a biome

Everything about the ecosystem lives in one config object (`JUNGLE` in `index.html`): world size, plant layers and their regrowth rates, and the species table. A new biome is a second object of the same shape — a savanna or a reef needs no changes to the simulation core. Biome switching in the UI is the next thing on the list.

## Roadmap

- [ ] Biome switcher (savanna, temperate forest, reef)
- [ ] Sexual reproduction and lineage trees, so you can trace ancestry
- [ ] Save/load a run, and export population data as CSV
- [ ] Split the single file into modules once it outgrows one screen of scrolling

## License

MIT
