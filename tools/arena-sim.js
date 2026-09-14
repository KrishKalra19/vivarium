#!/usr/bin/env node
/* Headless arena runner for balance work. Runs thousands of matches without a browser.

     node tools/arena-sim.js tune    [--rounds 20] [--matches 500]   writes js/arena/tuning.js
     node tools/arena-sim.js report  [--matches 400] [--open] [--epic] [--pairs] [--hazard fire|flood] [--seed 9]
     node tools/arena-sim.js duels   [--per-pair 30] [--open] [--seed 9]

   How balance is tuned, and why:
   - The target is full-match win rate. Duel strength turned out not to predict it: in a
     sixteen-way match, hiding, fleeing and being ganged up on matter as much as bite force.
   - Match wins are noisy and winner-take-all, which amplifies small strength differences.
     Fixed-size tuning steps oscillate forever, so `tune` uses stochastic approximation:
     fresh matches every round, steps that shrink each round, zero-win species pulled toward
     a fair share, and the answer averaged over the later rounds.
   - `duels` is a diagnostic: round-robin one-on-one fights measuring raw combat strength. */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const cmd = argv[0] || 'report';
const flag = f => argv.includes('--' + f);
const opt = (f, d) => { const i = argv.indexOf('--' + f); return i >= 0 ? argv[i + 1] : d; };
const TUNING_FILE = path.join(__dirname, '../js/arena/tuning.js');

require(path.join(__dirname, '../js/arena/roster.js'));
if (cmd !== 'tune' && fs.existsSync(TUNING_FILE)) require(TUNING_FILE);
require(path.join(__dirname, '../js/arena/engine.js'));
const L = globalThis.Ludus;
const E = L.ArenaEngine;
const IDS = Object.keys(L.ArenaSpecies);
const tunedLabel = () => (Object.keys(L.ArenaTuning || {}).length ? 'tuned' : 'untuned');

/* ----- full matches ----- */
function randomRoster(rng, size = 16) {
  const pool = [];
  IDS.forEach(id => { for (let k = 0; k < L.ARENA_MAX_PER_SPECIES; k++) pool.push(id); });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, size).map((sid, i) => ({ sid, name: sid + '#' + i }));
}

function runMany(n, settings, baseSeed) {
  const rng = E.rng(baseSeed * 7919);
  const s = { n, ms: 0, durations: [], apps: {}, wins: {}, kills: 0, causes: {} };
  IDS.forEach(id => { s.apps[id] = 0; s.wins[id] = 0; });
  for (let m = 0; m < n; m++) {
    const roster = randomRoster(rng);
    const t0 = process.hrtime.bigint();
    const S = E.create(Object.assign({ roster, seed: (baseSeed * 100003 + m) >>> 0 }, settings)).runToEnd();
    s.ms += Number(process.hrtime.bigint() - t0) / 1e6;
    s.durations.push(S.t);
    S.cs.forEach(c => { s.apps[c.sid]++; });
    S.winners.forEach(id => { s.wins[S.cs[id].sid] += settings.pairs ? 1 : 1 / S.winners.length; });
    S.events.forEach(e => {
      if (e.type === 'kill') { s.kills++; s.causes[e.cause] = (s.causes[e.cause] || 0) + 1; }
    });
  }
  return s;
}

function winIndex(s, pairs, prior) {
  const per = pairs ? 2 : 1, out = {};
  // With a prior, a species with few wins reads as "below fair", not as log(0).
  IDS.forEach(id => {
    out[id] = prior
      ? ((s.wins[id] + prior) / (s.apps[id] + prior * 16 / per)) * 16 / per
      : (s.wins[id] / Math.max(1, s.apps[id])) * 16 / per;
  });
  return out;
}

function percentile(arr, p) {
  const a = arr.slice().sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(p * a.length))];
}

function printReport(label, s, settings) {
  const lo = settings.length === 'epic' ? 480 : 180, hi = settings.length === 'epic' ? 720 : 300;
  const inWindow = s.durations.filter(d => d >= lo && d <= hi).length / s.n;
  console.log(`\n== match: ${label} ==  ${s.n} matches, ${(s.ms / s.n).toFixed(1)} ms/match`);
  console.log(`duration  p10 ${percentile(s.durations, 0.1).toFixed(0)}s  median ${percentile(s.durations, 0.5).toFixed(0)}s  p90 ${percentile(s.durations, 0.9).toFixed(0)}s   ${lo}-${hi}s: ${Math.round(inWindow * 100)}% in window`);
  console.log(`kills     ${(s.kills / s.n).toFixed(1)} per match   causes ${JSON.stringify(s.causes)}`);
  const wi = winIndex(s, settings.pairs);
  console.log('win index (1.0 = fair share)');
  IDS.slice().sort((a, b) => wi[b] - wi[a]).forEach(id => {
    console.log(`  ${id.padEnd(11)} ${wi[id].toFixed(2).padStart(5)}  ${'#'.repeat(Math.round(wi[id] * 10))}`);
  });
  const vals = IDS.map(id => wi[id]);
  console.log(`spread    ${Math.min(...vals).toFixed(2)} to ${Math.max(...vals).toFixed(2)}`);
}

/* ----- duels (diagnostic) ----- */
function duelScores(balanced, perPair, seedBase) {
  const wins = {}, games = {}, vs = {};
  IDS.forEach(id => { wins[id] = 0; games[id] = 0; vs[id] = {}; });
  let total = 0;
  for (let i = 0; i < IDS.length; i++) {
    for (let j = i + 1; j < IDS.length; j++) {
      const a = IDS[i], b = IDS[j];
      let aWins = 0;
      for (let k = 0; k < perPair; k++) {
        const roster = k % 2 ? [{ sid: a }, { sid: b }] : [{ sid: b }, { sid: a }];
        const S = E.create({ roster, seed: (seedBase * 1000003 + i * 977 + j * 131 + k) >>> 0, balanced, duel: true }).runToEnd();
        const winner = S.cs[S.winners[0]].sid;
        wins[winner]++; games[a]++; games[b]++; total++;
        if (winner === a) aWins++;
      }
      vs[a][b] = aWins / perPair;
      vs[b][a] = 1 - aWins / perPair;
    }
  }
  const score = {};
  IDS.forEach(id => { score[id] = wins[id] / games[id]; });
  return { score, vs, total };
}

function printDuels(label, d) {
  console.log(`\n== duels: ${label} ==  ${d.total} duels`);
  IDS.slice().sort((x, y) => d.score[y] - d.score[x]).forEach(id => {
    const worst = IDS.filter(o => o !== id).sort((x, y) => d.vs[id][x] - d.vs[id][y])[0];
    console.log(`  ${id.padEnd(11)} ${String(Math.round(d.score[id] * 100)).padStart(3)}%  ${'#'.repeat(Math.round(d.score[id] * 40))}   worst vs ${worst} ${Math.round(d.vs[id][worst] * 100)}%`);
  });
}

/* ----- tuning ----- */
function writeTuning(t, info) {
  const lines = IDS.map(id => `    ${id}: ${t[id].toFixed(3)}`).join(',\n');
  const out = [
    '/* Balanced-mode strength corrections per species, multiplied into health and damage.',
    `   Generated by "node tools/arena-sim.js tune": ${info}.`,
    '   Regenerate rather than edit by hand. */',
    '(function(root){',
    '  var L = root.Ludus = root.Ludus || {};',
    '  L.ArenaTuning = {',
    lines,
    '  };',
    "})(typeof window !== 'undefined' ? window : globalThis);",
    ''
  ].join('\n');
  fs.writeFileSync(TUNING_FILE, out);
}

if (cmd === 'tune') {
  const rounds = +opt('rounds', 20), n = +opt('matches', 500);
  const settings = { balanced: true, length: 'standard', pairs: false, hazard: 'random' };
  const logk = {}, sum = {};
  IDS.forEach(id => { logk[id] = 0; sum[id] = 0; });
  let averaged = 0;
  for (let r = 1; r <= rounds; r++) {
    IDS.forEach(id => { L.ArenaTuning[id] = Math.exp(logk[id]); });
    const s = runMany(n, settings, 1000 + r);          // fresh matches every round
    const wi = winIndex(s, false, 1);
    const raw = winIndex(s, false);
    const vals = IDS.map(id => raw[id]);
    const gain = 0.6 / Math.pow(r + 2, 0.7);            // shrinking steps
    IDS.forEach(id => {
      const stepLog = Math.max(-0.35, Math.min(0.35, -gain * Math.log(wi[id])));
      logk[id] += stepLog;
    });
    const mean = IDS.reduce((a, id) => a + logk[id], 0) / IDS.length;
    IDS.forEach(id => { logk[id] -= mean; });
    if (r > rounds / 2) { IDS.forEach(id => { sum[id] += logk[id]; }); averaged++; }
    console.log(`round ${String(r).padStart(2)}: win index ${Math.min(...vals).toFixed(2)} to ${Math.max(...vals).toFixed(2)}   step size ${gain.toFixed(3)}`);
  }
  const final = {};
  IDS.forEach(id => { final[id] = Math.exp(sum[id] / averaged); });
  writeTuning(final, `${rounds} rounds of ${n} full matches, stochastic approximation averaged over the last ${averaged}`);
  console.log('\nwrote js/arena/tuning.js');
} else if (cmd === 'sensitivity') {
  // How steeply does a species' win rate respond to its strength? Every row replays the same
  // rosters and seeds, so only the multiplier changes. Slope near 1 is easy to balance; above
  // ~4, small strength edges turn into lopsided win rates.
  const n = +opt('matches', 300);
  const species = opt('species', 'agouti,otter,harpy').split(',');
  const mults = [0.8, 1.0, 1.25];
  const base = Object.assign({}, L.ArenaTuning);
  console.log(`\n== sensitivity ==  ${n} matches per row, identical rosters and seeds`);
  species.forEach(sid => {
    const wi = mults.map(m => {
      L.ArenaTuning = Object.assign({}, base, { [sid]: (base[sid] || 1) * m });
      const s = runMany(n, { balanced: true, length: 'standard' }, 4242);
      return winIndex(s, false, 0.5)[sid];
    });
    const slope = (Math.log(wi[2]) - Math.log(wi[0])) / Math.log(mults[2] / mults[0]);
    console.log(`  ${sid.padEnd(11)} ` + mults.map((m, i) => `x${m.toFixed(2)} ${wi[i].toFixed(2)}`).join('   ') + `   slope ${slope.toFixed(1)}`);
  });
  L.ArenaTuning = base;
} else if (cmd === 'duels') {
  const balanced = !flag('open');
  printDuels(balanced ? `balanced (${tunedLabel()})` : 'open weight', duelScores(balanced, +opt('per-pair', 30), +opt('seed', 9)));
} else {
  const settings = { balanced: !flag('open'), length: flag('epic') ? 'epic' : 'standard', pairs: flag('pairs'), hazard: opt('hazard', 'random') };
  const label = `${settings.balanced ? 'balanced (' + tunedLabel() + ')' : 'open weight'} / ${settings.length}${settings.pairs ? ' / pairs' : ''}`;
  printReport(label, runMany(+opt('matches', 400), settings, +opt('seed', 1)), settings);
}
