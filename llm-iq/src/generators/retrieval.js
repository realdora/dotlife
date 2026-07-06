import { int, pick, sample, shuffle } from '../rng.js';

// Needle-in-a-haystack with active distractors: 40 paragraphs (~2.5k
// tokens) with five planted facility codes, plus two traps near the
// target — an "annex" code for the same city and a rotated former code
// for the same facility. Sloppy retrieval picks up the wrong number.

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

  const target = int(rng, 0, 4);
  const facts = cities.map(
    (city, t) => `The access code for the ${city} facility is ${codes[t]}.`
  );
  // Traps: same-city annex code, and a rotated former code for the target.
  facts.push(`The access code for the ${cities[target]} annex is ${codes[5]}.`);
  facts.push(
    `Note that the former access code for the ${cities[target]} facility, ${codes[6]}, ` +
      `was retired during the last security rotation.`
  );

  const slots = sample(rng, Array.from({ length: 34 }, (_, i) => i + 3), facts.length);
  shuffle(rng, facts).forEach((fact, i) => {
    paras[slots[i]] += ' ' + fact;
  });

  const answer = String(codes[target]);

  return {
    id,
    category: 'retrieval',
    prompt:
      `Below is an internal company document. Read it and answer the question at the end.\n\n` +
      `<document>\n${paras.join('\n\n')}\n</document>\n\n` +
      `Question: What is the current access code for the ${cities[target]} facility? ` +
      `Reply with just the 4-digit code.`,
    answer,
    check: (v) => String(v).replace(/\D/g, '') === answer,
  };
}
