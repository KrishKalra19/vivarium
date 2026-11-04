# Life table: column reference

One row per animal that lived during a recorded run. Deaths are written as they happen; the living are appended on export (`died` is blank for them). Export from the Census tab → Data, or from `Vivarium.lifeTableCSV()`, or headless with `node tools/vivarium-run.js --lifetable 1` (writes `life.csv` plus `manifest.json` next to it).

Times are sim-seconds. Traits are given twice: the *expressed* value (after species baseline and trait costs) and the *gene* (a multiplier on the species baseline, 1.0 = species norm).

| column | meaning |
|---|---|
| `uid` | unique id within the run |
| `species` | agouti, howler, capybara, tapir, ocelot, harpy, jaguar, anaconda |
| `origin` | `founder` (seeded at t=0), `born` (offspring in the range), `arrival` (immigrant from outside) |
| `mother`, `father` | parent uids; 0 = none. `mother` is the breeder; `father` is her chosen mate (0 under asexual reproduction) |
| `generation` | founders are 0; arrivals take the current max generation |
| `lineage` | `brain` (evolved network) or `instinct` (scripted behaviour) |
| `clade_at_birth`, `clade` | subspecies id at birth and at death/export (ids match `Vivarium.clades()`) |
| `born`, `died`, `age` | sim-seconds; `age` = `died − born` (±1 step) |
| `cause` | `predated`, `starved`, `age`, `other` (fire, disease, poaching) |
| `killer`, `killer_uid` | predator species and uid, for `predated` |
| `bank_at_birth` | −1 west / +1 east of the river; 0 if the river was off at birth |
| `x`, `y` | position at death (or at export for the living) |
| `mass_kg`, `speed`, `sense` | expressed body mass (kg), top speed (px/s), sense range (px) |
| `metab_gene`, `mass_gene`, `speed_gene`, `sense_gene` | heritable multipliers |
| `choosy_gene` | mate-preference tolerance σ (lower = pickier) |
| `litters` | breeding events as the mother |
| `children` | offspring as either parent |
| `kills`, `strikes` | successful and total lunges (predators) |
| `scans` | number of 1 Hz scan samples the animal was alive for (≈ age) |
| `scan_feed` … `scan_travel` | scans spent in each ethogram state (see below); they sum to `scans` |
| `group_mean` | mean group size across its scans: conspecifics within 60 px, itself included |
| `scan_feed_food`, `scan_vigilant_food` | feed and vigilant scans counted only where there was food underfoot (≥ 0.15, the first food bin). Head up on bare ground is "nothing to eat here", not a choice to scan; in cycles 29–30 that was 50–90% of all vigilant scans (code v33+) |

## Ethogram (scan sampling, 1 Hz)
Every sim-second each living animal is scored in exactly one state:
- **feed**: head down eating (evolved-brain herbivores only; they can't watch while eating)
- **vigilant**: head up and nearly still (<25% of top speed), i.e. a scan (brain herbivores). Before cycle 14 this included head-up movement.
- **travel**: head up and moving (brain herbivores)
- **forage**: moving and eating (instinct herbivores, which have no head-down choice)
- **flee**: running from a predator
- **chase**: predator moving at ≥60% of top speed and closing on its target (scored from motion, not intent)
- **stalk**: predator with a target that it isn't chasing
- **lurk**: ambusher waiting, no target
- **search**: predator with no target

Per-species totals and the vigilance-by-group-size table: `Vivarium.ethogram()`, or `ethogram.json` from a headless run.

## Integrity checks (cycle 11, seed 3, 900 sim-s, river + mating + trait costs)
All passed on 14,468 rows: uids unique; dead rows = `Vivarium.deaths()` total; living rows = final census; every `born` row's mother and father exist in the table and share its species; each row's `children` equals the number of rows naming it as a parent; each predator's `kills` equals the number of rows naming it as `killer_uid`; every `predated` death has a killer; `|died − born − age| ≤ 0.04`.

## Caveats
- Recording starts at a reset. In the UI, "Record life table" resets the range (new seed) so founders are included.
- In headless runs the river toggle is applied after reset, so founders show `bank_at_birth = 0`.
- Memory: ~150 bytes per row in the page; a 2-hour run is on the order of 100k rows.
