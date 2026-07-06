import vm from 'node:vm';
import { int, pick, sample } from '../rng.js';
import { parseIntLoose } from '../answer.js';

// Predict-the-output questions. The snippet is generated from templates and
// executed locally in a sandboxed vm to derive ground truth, so the checker
// is exact by construction.

function runJs(code) {
  const out = [];
  vm.runInNewContext(
    code,
    { console: { log: (...a) => out.push(a.map(String).join(' ')) } },
    { timeout: 1000 }
  );
  return out.join('\n');
}

const WORDS = [
  'ember', 'stone', 'violet', 'oak', 'harbor', 'lily', 'granite', 'fox',
  'meadow', 'pine', 'cobalt', 'fig', 'walnut', 'iris', 'thunder', 'elm',
];

function loopTemplate(rng) {
  const A = int(rng, 1, 5);
  const B = A + int(rng, 13, 19);
  const M = int(rng, 3, 5);
  const R = int(rng, 0, M - 1);
  const K = int(rng, 2, 4);
  const D = int(rng, 1, 6);
  const INIT = int(rng, 0, 20);
  return [
    `let acc = ${INIT};`,
    `for (let i = ${A}; i <= ${B}; i++) {`,
    `  if (i % ${M} === ${R}) {`,
    `    acc += i * ${K};`,
    `  } else {`,
    `    acc -= ${D};`,
    `  }`,
    `}`,
    `console.log(acc);`,
  ].join('\n');
}

function pipelineTemplate(rng) {
  const xs = Array.from({ length: int(rng, 8, 10) }, () => int(rng, 1, 30));
  const M = int(rng, 2, 4);
  const R = int(rng, 0, M - 1);
  const K = int(rng, 2, 3);
  const C = int(rng, 1, 9);
  const INIT = int(rng, 0, 10);
  return [
    `const xs = [${xs.join(', ')}];`,
    `const r = xs`,
    `  .filter(x => x % ${M} !== ${R})`,
    `  .map(x => x * ${K} + ${C})`,
    `  .reduce((a, b) => a + b, ${INIT});`,
    `console.log(r);`,
  ].join('\n');
}

function stringTemplate(rng) {
  const words = sample(rng, WORDS, 6);
  return [
    `const words = [${words.map((w) => `'${w}'`).join(', ')}];`,
    `let out = '';`,
    `for (const w of words) {`,
    `  if (w.length % 2 === 0) {`,
    `    out += w[0].toUpperCase();`,
    `  } else {`,
    `    out += w[w.length - 1];`,
    `  }`,
    `}`,
    `console.log(out);`,
  ].join('\n');
}

export function code(rng, id) {
  const template = pick(rng, [loopTemplate, pipelineTemplate, stringTemplate]);
  const snippet = template(rng);
  const expected = runJs(snippet);
  const numeric = /^-?\d+$/.test(expected);

  return {
    id,
    category: 'code',
    prompt:
      `What is the exact output of this JavaScript program?\n\n` +
      '```js\n' + snippet + '\n```\n\n' +
      `Give only the printed output.`,
    answer: expected,
    check: (v) =>
      numeric ? parseIntLoose(v) === Number(expected) : String(v).trim() === expected,
  };
}
