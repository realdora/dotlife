import { int, pick, sample, shuffle } from '../rng.js';
import { parseIntLoose } from '../answer.js';

// Multi-hop needle-in-a-haystack: 40 paragraphs (~2.5k tokens) with five
// planted facility codes plus traps (an "annex" code and a retired former
// code for the queried facilities). The question asks for the SUM of two
// facilities' current codes — retrieval alone isn't enough, both needles
// must be found, the traps rejected, and the numbers combined.

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

function sentence(rng) {
  const s = pick(rng, SUBJECTS);
  return (
    s[0].toUpperCase() + s.slice(1) + ' ' +
    pick(rng, VERBS) + ' ' + pick(rng, OBJECTS) + ' ' + pick(rng, TAILS) + '.'
  );
}

export function retrieval(rng, id) {
  const paras = [];
  for (let p = 0; p < 40; p++) {
    paras.push([sentence(rng), sentence(rng), sentence(rng)].join(' '));
  }

  const cities = sample(rng, CITIES, 5);
  const codes = [];
  while (codes.length < 7) {
    const c = int(rng, 1000, 9899);
    if (!codes.includes(c)) codes.push(c);
  }

  const [t1, t2] = sample(rng, [0, 1, 2, 3, 4], 2);
  const facts = cities.map(
    (city, t) => `The access code for the ${city} facility is ${codes[t]}.`
  );
  // Traps aimed at the two queried facilities.
  facts.push(`The access code for the ${cities[t1]} annex is ${codes[5]}.`);
  facts.push(
    `Note that the former access code for the ${cities[t2]} facility, ${codes[6]}, ` +
      `was retired during the last security rotation.`
  );

  const slots = sample(rng, Array.from({ length: 34 }, (_, i) => i + 3), facts.length);
  shuffle(rng, facts).forEach((fact, i) => {
    paras[slots[i]] += ' ' + fact;
  });

  const sum = codes[t1] + codes[t2];

  return {
    id,
    category: 'retrieval',
    prompt:
      `Below is an internal company document. Read it and answer the question at the end.\n\n` +
      `<document>\n${paras.join('\n\n')}\n</document>\n\n` +
      `Question: What is the sum of the current access codes for the ${cities[t1]} facility ` +
      `and the ${cities[t2]} facility? Answer with just the number.`,
    answer: String(sum),
    check: (v) => parseIntLoose(v) === sum,
  };
}
