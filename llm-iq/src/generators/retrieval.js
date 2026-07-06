import { int, pick, sample, shuffle } from '../rng.js';
import { parseIntLoose } from '../answer.js';

// Needle-in-a-haystack across the ladder: document length, hop count and
// trap count all scale. L0 is a 3-paragraph single lookup; L5 is a
// ~90-paragraph document where three codes must be found (rejecting
// "annex" and retired-code traps) and summed.

const SUBJECTS = [
  'the logistics team', 'the finance group', 'the design unit',
  'the research crew', 'the operations staff', 'the planning committee',
  'the facilities office', 'the security desk',
];
const VERBS = [
  'reviewed', 'filed', 'archived', 'updated', 'discussed',
  'postponed', 'approved', 'drafted', 'circulated', 'audited',
];
const OBJECTS = [
  'the quarterly report', 'a maintenance request', 'the vendor contract',
  'the travel schedule', 'an inventory summary', 'the training manual',
  'a budget proposal', 'the audit checklist', 'the onboarding packet',
  'a compliance memo',
];
const TAILS = [
  'on Monday', 'before lunch', 'after the meeting', 'last week',
  'without delay', 'ahead of schedule', 'during the review',
  'in the afternoon', 'per standing policy', 'at the branch office',
];
const CITIES = [
  'Oslo', 'Lima', 'Perth', 'Quito', 'Turin', 'Osaka',
  'Denver', 'Malmo', 'Leeds', 'Nadi', 'Bergen', 'Adelaide',
];

// [paragraphs, hops, traps, facilities]
const LEVELS = [
  [3, 1, 0, 2],
  [10, 1, 1, 4],
  [25, 2, 2, 5],
  [40, 2, 2, 5],
  [60, 2, 4, 6],
  [90, 3, 4, 6],
];

function sentence(rng) {
  const s = pick(rng, SUBJECTS);
  return (
    s[0].toUpperCase() + s.slice(1) + ' ' +
    pick(rng, VERBS) + ' ' + pick(rng, OBJECTS) + ' ' + pick(rng, TAILS) + '.'
  );
}

export function retrieval(rng, id, level = 3) {
  const [nParas, hops, nTraps, nFacilities] = LEVELS[level];

  const paras = [];
  for (let p = 0; p < nParas; p++) {
    paras.push([sentence(rng), sentence(rng), sentence(rng)].join(' '));
  }

  const cities = sample(rng, CITIES, nFacilities);
  const codes = [];
  while (codes.length < nFacilities + nTraps) {
    const c = int(rng, 1000, 9899);
    if (!codes.includes(c)) codes.push(c);
  }

  const targets = sample(rng, Array.from({ length: nFacilities }, (_, i) => i), hops);
  const facts = cities.map(
    (city, t) => `The access code for the ${city} facility is ${codes[t]}.`
  );
  // Traps alternate between same-city "annex" codes and retired former
  // codes, aimed at the queried facilities.
  for (let t = 0; t < nTraps; t++) {
    const target = targets[t % targets.length];
    const trapCode = codes[nFacilities + t];
    if (t % 2 === 0) {
      facts.push(`The access code for the ${cities[target]} annex is ${trapCode}.`);
    } else {
      facts.push(
        `Note that the former access code for the ${cities[target]} facility, ${trapCode}, ` +
          `was retired during the last security rotation.`
      );
    }
  }

  const slots = sample(rng, Array.from({ length: nParas }, (_, i) => i), facts.length);
  shuffle(rng, facts).forEach((fact, i) => {
    paras[slots[i]] += ' ' + fact;
  });

  let question;
  let answer;
  if (hops === 1) {
    question =
      `What is the current access code for the ${cities[targets[0]]} facility? ` +
      `Reply with just the 4-digit code.`;
    answer = String(codes[targets[0]]);
  } else {
    const names = targets.map((t) => `the ${cities[t]} facility`);
    const list = names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    question =
      `What is the sum of the current access codes for ${list}? ` +
      `Answer with just the number.`;
    answer = String(targets.reduce((a, t) => a + codes[t], 0));
  }

  return {
    id,
    category: 'retrieval',
    prompt:
      `Below is an internal company document. Read it and answer the question at the end.\n\n` +
      `<document>\n${paras.join('\n\n')}\n</document>\n\n` +
      `Question: ${question}`,
    answer,
    check: (v) => parseIntLoose(v) === Number(answer),
  };
}
