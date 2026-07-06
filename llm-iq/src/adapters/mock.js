// Simulated model with configurable accuracy. Used for development, tests,
// and for sanity-checking the statistics (a p=0.85 mock should produce
// scores whose spread matches the binomial expectation).

export function mockAdapter({ accuracy = 0.8 } = {}) {
  return {
    name: 'mock',
    async run(_prompt, q) {
      await new Promise((r) => setTimeout(r, 5));
      const ok = Math.random() < accuracy;
      const val = ok ? q.answer : `wrong-${Math.floor(Math.random() * 1e6)}`;
      return {
        text: `(mock reasoning)\n<answer>${val}</answer>`,
        model: 'mock',
        durationMs: 5,
      };
    },
  };
}
