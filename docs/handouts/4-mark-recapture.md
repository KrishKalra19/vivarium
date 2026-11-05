# Lab 4 · Mark–recapture: how many are there?

**Time:** 30–40 min · **Setup:** Vivarium, any behaviour mode. Use the class link if your instructor gives one.

## Goal
Estimate a population's size the way field ecologists do when they can't count every animal: **catch, mark, release, catch again** (the Lincoln–Petersen method). Then check your estimate against the true number, and see what happens when the method's two assumptions break:
- **closed population:** no births, deaths or movement in or out between sessions;
- **equal catchability:** every animal is equally likely to be caught.

## Steps
1. **Field** tab → Method **Mark–recapture**. Choose capybara or howler, **40 traps**, a **20 sim-s** gap, and **random** trap placement.
2. Press **Set traps: session 1**. Traps catch every animal of your species inside them, and those animals are marked (**M**).
3. After the gap, session 2 catches again: **C** animals, of which **R** are already marked.
4. Work out **N ≈ M × C ÷ R**, type it in, and press **Check my estimate**. Record the true population and the births and deaths between sessions. Download your data.
5. Repeat with a **120 sim-s** gap, and then with traps placed **where animals are**.

## Record
| run | gap (s) | placement | M | C | R | your N̂ | true N | marked animals that died |
|---|---|---|---|---|---|---|---|---|
| 1 | 20 | random | | | | | | |
| 2 | 120 | random | | | | | | |
| 3 | 20 | where animals are | | | | | | |

## Questions
1. Why does M × C ÷ R estimate N? *(Hint: what share of the population is marked, and what share of your second catch is marked?)*
2. With the 120 s gap, was your estimate too high or too low? Which assumption broke, and how does it push the estimate that way?
3. Compare estimates across the class for the same setting. Are they right on average? Why do single estimates vary so much?
4. What happens when R = 0? Look up the **Chapman** estimator, (M+1)(C+1)/(R+1) − 1. Why is it preferred for small samples?
5. Real animals can be trap-happy (they return for the bait) or trap-shy. How would each bias the estimate?

## Instructor notes
- **Q1:** If marking doesn't change anything, the marked share of the second catch (R/C) estimates the marked share of the population (M/N). Rearranging gives N ≈ M·C/R.
- **Q2:** **Too high.** In testing, about 70% of marked capybaras died within 120 sim-s, while new animals were born. Few marked animals were left to recapture, so R was small and N̂ was large: Chapman estimates averaged **2.4× the truth** (6 trials, range 1.3–4.4). Closure is broken. Real studies keep the gap short relative to lifespan, or use open-population models (Jolly–Seber).
- **Q3:** With a 20 s gap and random traps, the estimate was right on average (capybara 1.03× the truth, howler 0.96×; 6 trials each) but single estimates ranged from about 0.4× to 2.2×, because R was only 1–12. Precision comes from more recaptures: more traps, or bigger catches. Traps placed where animals are caught 2–3 times as many and gave steadier estimates.
- **Q4:** M·C/R is undefined at R = 0, and biased upward when R is small. Chapman's version is nearly unbiased when M + C ≥ N, and is defined at R = 0.
- **Q5:** Trap-happy animals are recaptured too often, so R is high and N̂ too **low**. Trap-shy animals are recaptured too rarely, so N̂ is too **high**. In Vivarium, traps catch whatever is inside them, so behavioural trap response isn't modelled. That's a good point to raise about where a simulation is simpler than the field.
