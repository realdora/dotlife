---
description: Check the current model for silent degradation (llm-iq quick benchmark)
allowed-tools: Bash(llm-iq:*)
---

## Benchmark output

!`llm-iq --quick 2>&1 | tail -30`

## Your task

The output above is a fresh llm-iq benchmark of this very product
pipeline. Summarize it for me in 2-3 sentences: the weighted score, how
it compares to my recorded baseline, the verdict line, and any category
whose ladder frontier looks lower than usual. If the benchmark failed to
run, tell me the exact error and how to fix it. Do not re-run it
yourself.
