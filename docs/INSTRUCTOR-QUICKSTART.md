# Run your first Vivarium lab in 10 minutes

Vivarium is a browser simulation of a rainforest community whose animals' behaviour has *evolved*, not been scripted. Its **Field** tab is a practice range for behavioural observation methods. Every answer a student gives is scored against what the simulation knows really happened, which no real field site can offer. Use it to teach **how to measure behaviour**, not what real agoutis do: the animals are abstract, and their behaviour is the simulation's own.

## Before class (10 min)
1. **Get the files:** download this repository's branch as a ZIP (GitHub → Code → Download ZIP) and unzip it, or use a hosted copy if one exists. Open `index.html` in Chrome or Edge. It needs an internet connection the first time, for the 3D library. *(Chromium-based browsers are the only ones tested so far.)*
2. **Pick a world:** open the **Field** tab and press **Copy class link** at the bottom. The link looks like `index.html?seed=1234&mode=brains#field`, and every student who opens it gets the **same world**. If you're sharing the ZIP, tell students to add `?seed=1234&mode=brains#field` to the end of the address instead.
3. **Pick a lab** and print its handout (`docs/handouts/`). Each is one page with steps, a record table, questions, and instructor notes with answers:

| lab | teaches | time |
|---|---|---|
| 1 · Focal sampling | observer vs sampling error, Cohen's κ | 30–40 min |
| 2 · Scan sampling | counting vs placement error | 25–35 min |
| 3 · Feeding trays | giving-up densities, the marginal value theorem, replication | 30–45 min |

4. **Try it yourself once** (5 min) so the posture cue makes sense: the dark dot held out in front means head up; tucked onto the body means head down, feeding.

## In class (a 50-minute plan)
- **5 min:** frame it. "This is a practice range. The animals are simulated, so we can check your answers exactly."
- **30 min:** students work through the handout in pairs. Each method ends with a **Download (CSV)** button; have every student save their file.
- **15 min:** pool the results. Collect the CSVs (shared drive, LMS, email), open **`class.html`** (in the same folder as `index.html`) and drop them all in. It shows the class's results, computed in your browser with nothing uploaded:
  - **focal:** class agreement and κ, and the whole-class confusion table (where everyone disagreed with the truth);
  - **scan:** counting vs placement error across students, and why pooling fixes one but not the other;
  - **trays:** the rich − poor difference across all trials, with a class verdict.

  Then discuss with the handout questions.

## Going further
- **Case studies** (`docs/case-studies/`) use real data from Vivarium's research: "Is it vigilance or walking?" (operational definitions) and "Does vigilance pay?" (immortal-time bias). These are good as homework or a second session, and work in a spreadsheet.
- Background on the research the tray lab is built on: `docs/mvt-findings.md`. The full guide: `docs/teaching-field-methods.md`.

## Tell students up front
- The animals are not real species. Their behaviour evolved in the simulation, so it won't match a real agouti's.
- Students share a **world**, but each gets a different focal animal or tray layout, so results differ. That variation is part of the lesson.
- A long tray trial lets many animals empty the trays; keep to 60 sim-s.

## After the trial: feedback that would help most
This hasn't been used with a real class yet. If you run it, these notes are the most useful thing you can send back:
1. Where did students get stuck or confused (the posture cue, the buttons, the handout wording)?
2. How long did each lab actually take?
3. Did any device or browser fail (phones, Safari, Firefox, school laptops)?
4. Did the discussion questions land? Which answers surprised you?
5. Would you use it again, and for what?
