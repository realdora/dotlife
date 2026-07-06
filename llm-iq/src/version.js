// Version of the question-generation logic. Bump whenever generators or
// profiles change in a way that shifts difficulty — scores are only
// comparable (and baselines only computed) within the same bench version.
//
// v1: initial MVP difficulty (saturated by top models — Sonnet 5 hit 100%)
// v2: recalibrated for top models (Opus / Fable tier): longer chains,
//     denser constraints, distractors in retrieval.
export const BENCH_VERSION = 2;

export const TOOL_VERSION = '0.2.0';
