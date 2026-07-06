Run this shell command exactly once and wait for it to finish (it takes
a few minutes):

    llm-iq --quick --adapter codex 2>&1 | tail -30

Then summarize the result in 2-3 sentences: the weighted score, how it
compares to the recorded baseline, the verdict line, and any category
whose ladder frontier looks lower than usual. If the command failed,
report the exact error and how to fix it. Do not run it more than once.
