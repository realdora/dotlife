import { buildSuite, PROFILES } from '../src/suite.js';
import { extractAnswer, parseIntLoose } from '../src/answer.js';
import { mockAdapter } from '../src/adapters/mock.js';
import { wilson, assessAgainstBaseline } from '../src/stats.js';

let fails = 0;
const assert = (cond, msg) => {
  if (cond) console.log(`ok: ${msg}`);
  else { fails++; console.error(`FAIL: ${msg}`); }
};

// determinism
{
  const a = buildSuite('2026-07-06', 'standard').map((q) => q.prompt);
  const b = buildSuite('2026-07-06', 'standard').map((q) => q.prompt);
  const c = buildSuite('2026-07-07', 'standard').map((q) => q.prompt);
  assert(JSON.stringify(a) === JSON.stringify(b), 'same seed → identical suite');
  assert(JSON.stringify(a) !== JSON.stringify(c), 'different seed → different suite');
}

// profiles are ladders with sane shape
{
  for (const [name, spec] of Object.entries(PROFILES)) {
    const suite = buildSuite('shape', name);
    assert(suite.length === spec.length, `profile ${name} builds ${spec.length} questions`);
    assert(suite.every((q) => q.level >= 0 && q.level <= 5 && q.weight === q.level + 1),
      `profile ${name} levels/weights sane`);
  }
  const sanities = buildSuite('shape', 'standard').filter((q) => q.category === 'sanity');
  assert(sanities.length === 2 && sanities[0].prompt !== sanities[1].prompt,
    'the two sanity questions are distinct');
}

// canonical answers pass their own checkers; garbage is rejected
{
  const seeds = ['2026-01-01', '2026-07-06', 'alpha', 'beta', 'gamma', 'delta', 'x1', 'x2'];
  let bad = 0;
  let badReject = 0;
  let total = 0;
  for (const seed of seeds) {
    for (const q of buildSuite(seed, 'standard')) {
      total++;
      if (!q.check(q.answer)) {
        bad++;
        console.error(`  canonical answer fails checker: seed=${seed} ${q.id} answer=${JSON.stringify(q.answer)}`);
      }
      if (q.check('zzz not an answer 999x')) {
        badReject++;
        console.error(`  checker accepts garbage: seed=${seed} ${q.id}`);
      }
    }
  }
  assert(bad === 0, `canonical answers pass their checkers (${total} questions, ${seeds.length} seeds)`);
  assert(badReject === 0, 'checkers reject garbage answers');
}

// answer extraction
{
  assert(extractAnswer('thinking...\n<answer> 42 </answer>').value === '42', 'extracts tagged answer');
  assert(extractAnswer('<answer>1</answer> no wait <answer>2</answer>').value === '2', 'last tag wins');
  assert(extractAnswer('<answer>x</answer>').ok === true, 'tagged → formatOk');
  const fb = extractAnswer('bla\nAnswer: 7');
  assert(fb.ok === false && fb.value === '7', 'labeled fallback works, flagged as format failure');
  assert(parseIntLoose('1,234.') === 1234, 'loose int parse');
  assert(Number.isNaN(parseIntLoose('12 apples')), 'loose int parse rejects prose');
}

// mock adapter end-to-end scoring
{
  const suite = buildSuite('mock-seed', 'standard');
  const perfect = mockAdapter({ accuracy: 1 });
  const broken = mockAdapter({ accuracy: 0 });
  let pOk = 0;
  let bOk = 0;
  for (const q of suite) {
    const r1 = await perfect.run(q.prompt, q);
    if (q.check(extractAnswer(r1.text).value)) pOk++;
    const r0 = await broken.run(q.prompt, q);
    if (q.check(extractAnswer(r0.text).value)) bOk++;
  }
  assert(pOk === suite.length, `perfect mock scores 100% (${pOk}/${suite.length})`);
  assert(bOk === 0, `broken mock scores 0% (${bOk}/${suite.length})`);
}

// stats
{
  const [lo, hi] = wilson(24, 29);
  assert(lo > 0.6 && hi < 0.95, `wilson(24/29) sane: ${lo.toFixed(2)}-${hi.toFixed(2)}`);
  assert(assessAgainstBaseline(80, [82, 84, 83]).status === 'insufficient', 'needs 5+ runs for a verdict');
  assert(assessAgainstBaseline(60, [83, 84, 82, 85, 83, 84]).status === 'degraded', 'big drop → degraded');
  assert(assessAgainstBaseline(83, [83, 84, 82, 85, 83, 84]).status === 'ok', 'normal run → ok');
}

console.log(fails ? `\n${fails} failure(s)` : '\nall tests passed');
process.exit(fails ? 1 : 0);
