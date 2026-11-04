# Lab 1 · Focal sampling: what is one animal doing?

**Time:** 30–40 min · **Setup:** Vivarium in a browser, Brains or Mixed A/B mode (Controls → Behaviour). If your instructor gives you a class link, open it so everyone watches the same world.

## Goal
Practise **instantaneous focal sampling** (Altmann 1974): following one animal and recording its behaviour at fixed sample points. Then measure two kinds of error that every field study has but can rarely check:
- **observer error:** did you score the behaviour correctly?
- **sampling error:** do a few instants represent the animal's whole time budget?

## Steps
1. Open the **Field** tab. Set Method to **Focal animal**, pick a species, and choose 20 samples every 15 sim-s.
2. Press **Start focal follow**. The map zooms onto your focal animal (it has a marker). Watch its head: the dark dot held out in front means **head up**; tucked onto the body means **head down, feeding**.
3. At each sample point the range pauses. Score what the animal is doing *at that instant*:
   - **1** Feeding (head down, eating)
   - **2** Vigilant (head up, standing still)
   - **3** Moving (head up, walking)
   - **4** Fleeing
   - **0** if you lost sight of it
4. When it finishes, read your results, and press the download button to save your data.

## Record
| | value |
|---|---|
| species / samples / interval | |
| % agreement with truth | |
| Cohen's κ | |
| your estimate of time feeding vs the true budget | |
| the two categories you confused most (from the confusion table) | |

## Questions
1. Your % agreement can be high while κ is low. Why? *(Hint: what share of the time is the animal feeding?)*
2. Which two categories did you confuse most? Write an **operational definition** that would separate them for the next observer.
3. Repeat with 5 s instead of 30 s between samples. Which error changes, observer error or sampling error, and why?
4. Your focal animal may die or be lost, and the study then switches to a new one. How could that bias the time budget?

## Instructor notes
- **Q1:** κ corrects for chance agreement. When one category dominates (agoutis feed ~85% of the time), guessing "feeding" every time gives high agreement and κ ≈ 0. In testing, a perfect scripted observer scores κ = 1.00 and a random one κ ≈ 0.02.
- **Q2:** Vigilant vs moving is the classic confusion. "Head up **and** below a quarter of top speed" is the operational line the simulation uses. This exact confusion produced a false result in Vivarium's own research (`docs/many-eyes-findings.md`, pilot 1).
- **Q3:** Shorter intervals reduce **sampling** error (more samples per minute). Observer error usually doesn't fall, and may rise with less time to judge.
- **Q4:** Animals that die are often the ones that were fleeing or feeding in risky places, so switching focal animals can under-represent risky behaviour.
