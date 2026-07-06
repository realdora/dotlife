import { int, pick, sample } from '../rng.js';

// Needle-in-a-haystack: ~24 paragraphs of deterministic filler with three
// planted facts; ask for one of them. Kept short (~1.5k tokens) to bound
// cost; a long-context profile can raise the paragraph count later.

const SUBJECTS = [
  'the logistics team', 'the finance group', 'the design unit',
  'the research crew', 'the operations staff', 'the planning committee',
];
const VERBS = [
  'reviewed', 'filed', 'archived', 'updated', 'discussed',
  'postponed', 'approved', 'drafted',
];
const OBJECTS = [
  'the quarterly report', 'a maintenance request', 'the vendor contract',
  'the travel schedule', 'an inventory summary', 'the training manual',
  'a budget proposal', 'the audit checklist',
];
const TAILS = [
  'on Monday', 'before lunch', 'after the meeting', 'last week',
  'without delay', 'ahead of schedule', 'during the review', 'in the afternoon',
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
  for (let p = 0; p < 24; p++) {
    paras.push([sentence(rng), sentence(rng), sentence(rng)].join(' '));
  }

  const cities = sample(rng, CITIES, 3);
  const codes = [];
  while (codes.length < 3) {
    const c = int(rng, 1000, 9899);
    if (!codes.includes(c)) codes.push(c);
  }
  const slots = sample(rng, Array.from({ length: 20 }, (_, i) => i + 2), 3).sort((a, b) => a - b);
  for (let t = 0; t < 3; t++) {
    paras[slots[t]] += ` The access code for the ${cities[t]} facility is ${codes[t]}.`;
  }

  const target = int(rng, 0, 2);
  const answer = String(codes[target]);

  return {
    id,
    category: 'retrieval',
    prompt:
      `Below is an internal company document. Read it and answer the question at the end.\n\n` +
      `<document>\n${paras.join('\n\n')}\n</document>\n\n` +
      `Question: What is the access code for the ${cities[target]} facility? Reply with just the 4-digit code.`,
    answer,
    check: (v) => String(v).replace(/\D/g, '') === answer,
  };
}
