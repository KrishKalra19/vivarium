# Teaching field methods with Vivarium

The **Field** tab turns Vivarium into a practice range for **instantaneous focal sampling**, one of the standard methods in behavioural observation (Altmann 1974; Martin & Bateson, *Measuring Behaviour*). What no real field site can offer: every answer is scored against the true state the simulation knows.

## How a session works
1. Controls → Behaviour → **Brains** (or Mixed A/B). Only evolved-brain herbivores have the feed-vs-vigilance choice.
2. Field tab → choose a species, the number of samples (10/20/40) and the interval (5/15/30 sim-s) → **Start focal follow**.
3. The map zooms onto the focal (dashed white ring). Field mode hides everything that would give the answer away: the caption, sensor ring, threat line and Specimen card. Instead it draws a **posture cue**: the dark head dot is held out in front when the head is up, and tucked onto the body when the head is down.
4. At each sample point the range pauses: *what is it doing right now?* **1 Feeding · 2 Vigilant · 3 Moving · 4 Fleeing · 0 Lost sight.**
5. If the focal dies, as prey often do, the study switches to a new individual and says so. That's standard practice, and the results note that it biases the sample towards survivors.

For a class, **Copy class link** at the bottom of the Field tab gives a link like `index.html?seed=1234&mode=brains#field` that starts every student on the same world (tested in Chromium, it stays identical at a given sim time until someone runs trays or an intervention), and the focal, scan and tray CSV downloads carry the run id, seed and settings in every row so an instructor can stack the class's files.

## What students get back
- **% agreement** and **Cohen's κ** against the truth, with the Landis & Koch (1977) bands. Observers are usually expected to reach about 0.8 before collecting real data.
- A **confusion table**: which behaviours they mix up (e.g. vigilant vs moving).
- Three time budgets side by side: their samples, the truth at those same instants, and the animal's **true continuous budget**. Column 1 vs 2 is *observer error*; column 2 vs 3 is *sampling error*. Field studies have both but can rarely separate them.
- A CSV of their samples.

## Scan sampling (second method)
Field tab → Method → **Scan sample**. At each sample point the range pauses with a dashed circle around part of a group, and every animal of the target species inside it shows its posture cue. The student counts **head down (feeding)** and **head up**, then presses Record (Enter moves between the boxes), or Lost count. Fleeing animals are left out.

Results: % of scans counted exactly, animals miscounted per scan, a per-scan table, and the share feeding three ways: **your counts / truth in your circles / truth across the whole population** at those instants. Column 1 vs 2 is *counting error*. Column 2 vs 3 is *placement error*: circles are centred on an animal, so they land in groups and miss loners, and the estimate is biased whenever groups and loners behave differently. In testing, circles showed capybaras 90% feeding against 86% for the whole population.

Verified (cycle 23): a scripted perfect counter scores 100% exact with 0 off per scan, and its estimate equals the circle truth; a counter off by one per scan scores 0% exact with 1.0 off per scan; an independent recount of every circle from the raw animal list matched the built-in truth on all 20 scans. No page errors.

## Feeding trays: giving-up densities (third method)
Field tab → Method → **Feeding trays**. This is the experimental method behind the marginal value theorem's classic field test (Brown 1988). The student:
1. picks a number of trays and a trial length, and **commits to a prediction** before anything starts (rich-habitat trays left fuller, poor-habitat trays left fuller, or no difference);
2. presses **Place trays and start**. Half the trays go where the surrounding 100 px of vegetation are richest (gold outline on the map), half where it's poorest (blue, dashed). Each tray is a cell refilled with fresh foliage that **doesn't regrow during the trial**, so whatever is left at the end is what foragers gave up on;
3. lets the range run. The status line counts down and shows how many trays have been found.

**Results:**
- mean GUD per habitat with 95% intervals, and the rich − poor difference with a Welch 95% interval;
- whether the data support the prediction;
- trays never visited, which are **left out of the means**: an unfound tray says nothing about giving up;
- animals per visited tray, and visitors by species.

**What to expect.** The trays aren't scripted: whatever the evolved animals do is what gets measured. In testing (Brains mode, 40 trays):
- 60 s trials gave rich 0.098 vs poor 0.055 (difference +0.04, CI +0.01 to +0.08) in one trial, and rich 0.071 vs poor 0.062 (CI spanning 0) in another;
- 120–240 s trials let 15–35 animals graze each tray almost bare in both habitats, which erases the difference.

So 60 s is the default, and one trial is often not enough. **That variability is a lesson in itself.**

**Discussion prompts:**
- Why does trial length matter so much? A real GUD tray records one forager's decision to leave. Here many animals visit in sequence, so what's measured is what the *last* visitor left. How do field studies deal with this? (Short trials, tracks in sand to count visitors, trays that one species can reach.)
- Run the same trial three times. How often does the conclusion change? What does that say about a single field season?
- Rich-habitat trays may also be where more animals are. Is a difference about food, about crowding, or both? How would you design trays to separate them?
- Vivarium's own research found that the GUD pattern is real and evolved: foragers actively move on sooner in rich habitat. A probe found one input (the quality of visible food) that *can* drive leaving, but hiding it didn't remove the effect (`docs/mvt-findings.md`). What's the difference between showing that a cue *works* and showing that animals *depend* on it? How would you test that in the field?

Verified (cycle 38): placement gives exactly half the trays per habitat; tray cells hold their starting amount until eaten (no regrowth); the prediction is required before starting; the trays are cleared at the end and the default run's fingerprint is unchanged (`7ab26d53`). No page errors. Screenshot: `docs/loop/c38-trays-results.png`.

## Discussion prompts that fall out of it
- Agoutis feed ~85% of the time. Why can κ be low or undefined even when agreement is high? (Chance agreement is high when one category dominates.)
- How does the interval change sampling error? Run 5 s vs 30 s on the same species.
- Why might "vigilant" and "moving" get confused, and how would you write an operational definition that separates them? (This is exactly the mistake the many-eyes pilots made; see `docs/many-eyes-findings.md`.)
- What does switching focal after a predation do to the estimated time budget?
- Scan sampling: why do circles centred on an animal overestimate group behaviour? How would you place scan areas without that bias (e.g. random points, fixed grid)?
- Compare focal and scan estimates of the same species' feeding share. Which is more precise per minute of observation, and why?

## Verified (cycle 18)
Headless tests with scripted observers: an observer answering with the true state scores 100% / κ = 1.00 over 40 samples, and an observer answering at random scores 22.5% (chance 25%) / κ = 0.02. Losing a focal switches to a new one (3–5 focals per 40-sample howler study). No page errors.

## References
- Brown, J. S. (1988). Patch use as an indicator of habitat preference, predation risk, and competition. *Behavioral Ecology and Sociobiology*, 22(1), 37–47.
- Altmann, J. (1974). Observational study of behavior: sampling methods. *Behaviour*, 49(3–4), 227–266.
- Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. *Biometrics*, 33(1), 159–174.
- Martin, P., & Bateson, P. *Measuring Behaviour: An Introductory Guide*. Cambridge University Press.
