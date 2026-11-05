# Lab 3 · Feeding trays: when do foragers give up?

**Time:** 30–45 min (three short trials) · **Setup:** Vivarium, **Brains** mode works best. Use the class link if your instructor gives one.

## Goal
Run the classic field test of the **marginal value theorem** (Charnov 1976) with **giving-up densities** (GUDs; Brown 1988). A forager should leave a patch when its intake there drops to what it could get elsewhere. So where the surroundings are rich, foragers should quit sooner and leave **more** food behind.

## Steps
1. **Field** tab → Method **Feeding trays**. Choose 20 trays (10 per habitat) and a **60 sim-s** trial.
2. **Predict first:** where will foragers leave more food, in rich-habitat or poor-habitat trays, or will there be no difference? The trial won't start without a prediction.
3. Press **Place trays and start**. Trays appear on the map: **gold** frames are in rich surroundings, **blue dashed** frames in poor ones, and the fill fades as the food is eaten.
4. When the trial ends, record the results and download the data.
5. **Run it two more times.** Tray placement is random, so each trial is a new sample.

## Record
| trial | mean GUD rich | mean GUD poor | rich − poor (95% CI) | trays never visited (rich / poor) | supports your prediction? |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

## Questions
1. Did all three trials agree? What does that tell you about drawing a conclusion from **one** field season?
2. Trays nobody found are left out of the means. Why is that right? When could it still bias the comparison?
3. Try a 120 sim-s trial. What happens to the difference, and why? *(Hint: count the animals per visited tray.)*
4. Rich-habitat trays may also be where more animals are. Is a difference about **food** or about **crowding**? Design a tray layout that separates the two.

## Instructor notes
- **Q1:** In testing, 60 s trials gave a clear difference in one trial (+0.04, CI +0.01 to +0.08) and none in another (+0.01, CI −0.02 to +0.04). The underlying effect is real: across 6 seeds of Vivarium's own research, foragers leave more food in rich habitat in every species. But single trials are noisy, which is the point of replication.
- **Q2:** An unfound tray says nothing about *giving up*. But if one habitat has many more unfound trays, the visited ones may be unusual (e.g. near paths), so report the counts.
- **Q3:** Long trials let 15–35 animals graze each tray almost bare in both habitats, which erases the difference. A real GUD tray records one forager's decision. Here many visit in sequence, so the reading is what the *last* visitor left. Field studies use short trials, tracks in sand, or trays only one species can reach.
- **Q4:** For example, pair trays in rich and poor surroundings at equal animal density, or place trays at fixed distances from groups. Vivarium's research found that evolved foragers really do move on sooner in rich habitat. One input, the quality of food they can see, *can* drive this, but hiding it didn't remove the effect, so they use more than one cue (`docs/mvt-findings.md`).
