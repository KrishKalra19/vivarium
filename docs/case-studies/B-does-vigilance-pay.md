# Case study B · Does vigilance pay? (and the immortal-time trap)

**Skills:** fitness consequences of behaviour, confounding by observation time · **Time:** 40 min · **Data:** `docs/case-studies/data/agouti-lives.csv` (committed, 43,869 rows)

## The story
A field team has followed thousands of agoutis from birth to death. For each animal they know:
- how long it lived;
- whether a predator killed it;
- how many offspring it had;
- how often, across its life, it was seen **feeding** (head down) or **vigilant** (head up, still).

They want to know whether vigilance pays. Does a watchful animal survive predators better? Does it raise more young?

(The "field team" is Vivarium: 2 sim-hours of evolution, one run, evolved-brain agoutis, with feeding fully blind to predators. Only animals that died, and that were seen foraging at least 20 times, are included.)

## The data
| column | meaning |
|---|---|
| `lifespan_s` | how long it lived (sim-seconds) |
| `killed_by_predator` | yes / no |
| `offspring` | lifetime offspring |
| `scans_feeding`, `scans_vigilant` | how many times it was seen feeding / vigilant (one observation per sim-second) |

## Worksheet
1. For each animal, compute **vigilance** = scans_vigilant / (scans_feeding + scans_vigilant). Put each animal in a group: **none** (0), **low** (above 0 and below 2.5%), or **high** (2.5% or more).
2. For each group, compute mean **offspring** and the **predation rate** (predator kills per 1000 s lived = kills / total lifespan × 1000). Which group does best? What would you conclude?
3. Now think about how vigilance was *measured*. An animal that lives longer is observed more often. What does that do to its chance of being seen vigilant at least once, and so to which group it lands in?
4. Redo question 2 **within bands of observation count** (scans_feeding + scans_vigilant): 20–39, 40–79 and 80–159. Does your conclusion change?
5. In the 20–39 band there are no "low" animals at all. Why?
6. Explain the trap in two sentences, as if warning another field team.

## Instructor answers
**Q2 (unstratified):**

| group | n | offspring | predation / 1000 s |
|---|---|---|---|
| none | 34,730 | 1.31 | 5.62 |
| low | 5,011 | **1.56** | **2.62** |
| high | 4,128 | 0.96 | 5.98 |

A little vigilance looks ideal: the most offspring and less than half the predation. A tempting conclusion is stabilizing selection with an optimum near 1%.

**Q3:** This is **immortal-time bias**. Long-lived animals get more observations, so they're more likely to be caught vigilant at least once and to land in "low". Surviving makes the animal look vigilant, not the other way round.

**Q4 (stratified):**

| observations | group | n | offspring | predation / 1000 s |
|---|---|---|---|---|
| 40–79 | none | 9,780 | 1.27 | 11.2 |
| | low | 1,680 | 1.35 | 7.8 |
| | high | 1,586 | 1.09 | 5.9 |
| 80–159 | none | 18,404 | 1.67 | 0.79 |
| | low | 3,331 | 1.66 | 0.60 |
| | high | 1,260 | 1.53 | 0.50 |

Matched for observation time, the low group's advantage in offspring mostly disappears (1.35 vs 1.27; 1.66 vs 1.67). High vigilance does cut predation, but it costs offspring: a head-up animal can't eat. Across whole generations, selection pushed vigilance **down**.

**Q5:** With fewer than 40 observations, a single vigilant scan is already 2.5% or more, so an animal jumps straight from "none" to "high". Category boundaries depend on observation effort, which is another way the measurement shapes the result.

**Q6:** Something like: "When you classify animals by a behaviour you observe over their lifetime, longer-lived animals have more chances to show it, so the behaviour will look protective even if it isn't. Compare animals with similar observation time, or measure the behaviour over a fixed early window."

**A further caveat:** in later analyses, Vivarium found that much of what counts as "vigilant" here is head-up time on bare ground, which is a food effect, not a choice to scan (`docs/many-eyes-findings.md`, cycles 30–31). Bright students may ask what *else* differs between watchful and unwatchful animals. That's the right question.
