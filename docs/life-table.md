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

## Integrity checks (cycle 11, seed 3, 900 sim-s, river + mating + trait costs)
All passed on 14,468 rows: uids unique; dead rows = `Vivarium.deaths()` total; living rows = final census; every `born` row's mother and father exist in the table and share its species; each row's `children` equals the number of rows naming it as a parent; each predator's `kills` equals the number of rows naming it as `killer_uid`; every `predated` death has a killer; `|died − born − age| ≤ 0.04`.

## Caveats
- Recording starts at a reset. In the UI, "Record life table" resets the range (new seed) so founders are included.
- In headless runs the river toggle is applied after reset, so founders show `bank_at_birth = 0`.
- Memory: ~150 bytes per row in the page; a 2-hour run is on the order of 100k rows.
