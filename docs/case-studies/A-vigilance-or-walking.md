# Case study A · Is it vigilance, or is it walking?

**Skills:** operational definitions, controls · **Time:** 30–40 min · **Data:** `experiments/out/many-eyes-pilot2/vigilance.csv` (committed)

## The story
The **many-eyes effect** is one of behavioural ecology's most cited patterns: in bigger groups, each animal spends less time vigilant, because more eyes share the job of spotting predators (Pulliam 1973; Elgar 1989). Vivarium's first test of whether *evolved* animals show it scored "vigilant" as **head up**. The result looked like a textbook success: agoutis and howlers scanned less in bigger groups, in 4 of 4 replicate runs. Capybaras even showed the *opposite*, which looked like an interesting exception.

Then someone looked closer at what "head up" included.

## The data
Each row is one run (`condition`, `replicate`), one `species`, and one `group_size` (conspecifics within 60 px, itself included). It gives how many 1 Hz scans found an animal:
- `feed`: head down, eating;
- `vigilant`: head up **and** nearly still;
- `travel`: head up **and** walking.

There are two conditions: `predators` and `no-predators` (the same world with all predators removed).

You can work in a spreadsheet, or run `python3 tools/case_vigilance_definitions.py`, which prints both definitions by group-size bin, with the change per doubling of group size.

## Worksheet
1. Compute vigilance two ways for each species, with predators:
   - **A "head up"** = (vigilant + travel) / (feed + vigilant + travel);
   - **B "scanning"** = vigilant / (feed + vigilant).

   For which species do the two definitions disagree most? What does A count that B doesn't?
2. Look at capybaras under each definition. Is the "exception" still there?
3. Now look at the **no-predators** rows. If vigilance is anti-predator behaviour, what should the group-size pattern look like there? What does it actually look like for agoutis and howlers?
4. Write one sentence a referee would accept about whether these data show a many-eyes effect.
5. Real field studies face the same two problems. Name one way to define vigilance in the field that avoids counting walking, and one control that plays the role of "no predators".

## Instructor answers
Numbers from the committed data (pp = percentage points per doubling of group size):

| | A "head up", predators | B "scanning", predators | B, no predators |
|---|---|---|---|
| agouti | −1.71 | −0.49 | −0.78 |
| howler | −1.14 | −0.51 | −0.84 |
| capybara | **+4.09** | +0.42 | +0.52 |
| tapir | +2.17 | −0.04 | −0.33 |

1. Definition A counts walking. For capybaras, "head up" rises from 7.5% alone to 24.6% in groups of 16–30, while scanning is only 2.1–3.5%. Most of the head-up time is travel.
2. Under B the capybara "exception" mostly disappears (+4.1 → +0.4 pp per doubling). Bigger capybara groups *walk* more, presumably because they deplete food faster.
3. Without predators, vigilance shouldn't depend on group size at all. Instead agoutis and howlers decline **at least as steeply** with no predators as with them. So the decline isn't anti-predator. Food is the likely confound: big groups sit on richer food, where animals feed more (Vivarium's later pilots controlled for it).
4. Something like: "With vigilance defined as head up and still, agoutis and howlers scan less in larger groups, but they do so equally without predators, so these data provide no evidence for an anti-predator many-eyes effect."
5. Definitions: "head up and stationary, eyes not on food", scored from video; or count scans as discrete head-raises. Controls: compare sites or seasons with and without predators, measure food at each group's location, or use predator-exclosure plots.

The full story, including the five pilots that followed, is in `docs/many-eyes-findings.md`.
