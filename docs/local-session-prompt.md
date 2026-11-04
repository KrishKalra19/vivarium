You're joining an ongoing Vivarium project as the **local** Claude Code session. A **cloud** Claude session is working on the same branch at the same time. Work autonomously: don't ask me questions. Only stop for a tool permission you genuinely need. If a choice is subjective, make a reasonable call and log it.

**Setup**
1. Fetch, check out `claude/sweet-planck-lhh90j`, and pull:
   `git fetch origin claude/sweet-planck-lhh90j && git checkout claude/sweet-planck-lhh90j && git pull origin claude/sweet-planck-lhh90j`
2. Read `CLAUDE.md`, then the "Phase 5" section and the **Phase 5 ownership** table at the end of `LOOP_PLAN.md`, then the TL;DR and the last few entries of `LOOP_LOG.md`. Also read `docs/teaching-field-methods.md`, `js/fieldstudy.js` and the Field tab markup in `index.html`.

**Your items** (owner = local in the table). Only touch the files listed for them:
1. **Class seed link.** Opening `index.html?seed=1234&mode=brains#field` (or similar) must open the same world for every student:
   - `seed` → `Vivarium.reset(seed)`;
   - `mode` → `instinct` / `mixed` / `brains` (`Vivarium.brainMode`);
   - `#field` opens the Field tab.

   Keep `#arena` working. Add a small "Copy class link" control in the Field tab that builds the link for the current world (`Vivarium.seed()`). Without URL parameters, behaviour must be unchanged.
2. **CSV export for scan sampling and feeding trays**, matching the existing focal-sampling download in `js/fieldstudy.js`:
   - scan sampling: one row per scan (student counts, truth in circle, truth in population);
   - trays: one row per tray (zone, position, start amount, food left, visitors by species, first visit time).
   - Include the seed and the method's settings in each row or in a header comment, so an instructor can pool a class's files.

   Add one sentence about the link and the exports to `docs/teaching-field-methods.md`.
3. **Real-browser QA** of the Field tab: focal, scan and trays, on desktop and at phone width (DevTools device mode). Fix small problems in your files. Write anything bigger as a note in `LOOP_LOG.md` rather than fixing it outside your files.

**Rules**
- Don't touch `docs/handouts/`, `docs/case-studies/` or the summary page: the cloud session owns them. Don't edit simulation logic in `js/vivarium.js` beyond URL handling.
- Default simulation runs must stay bit-identical. If Node and Playwright are available, run
  `node tools/vivarium-run.js --secs 600 --seed 1000 --mode brains --costs 1 --set '{"capScale":1.6,"headDownSense":0}' --out runs/reg`
  and confirm the fingerprint is `7ab26d53`. It needs `runs/.cache/three.min.js`; if that's missing, run `npm pack three@0.128.0` and copy `build/three.min.js` there. If you can't run it, say so in the log.
- Never merge to `main` or touch GitHub Pages. Don't break the Arena.
- **Pull before you start each item and before every push** (`git pull --rebase origin claude/sweet-planck-lhh90j`). If `LOOP_LOG.md` conflicts, keep both sides' entries.
- Commit and push after each item, with clear commit messages.
- Append to `LOOP_LOG.md` after each item: an entry headed `### <date> <time> UTC — [local] <item>`, covering what you built, how you verified it, and what's still unverified. In `LOOP_PLAN.md`, tick only your own items.

When all three items are done and pushed, write a final `[local]` log entry summarising what you did. Then send me the files I'd want to read (the updated `LOOP_LOG.md` and `docs/teaching-field-methods.md`) in the chat, and stop.
