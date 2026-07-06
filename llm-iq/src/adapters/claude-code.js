import { exec } from './exec.js';

// Runs questions through the full Claude Code product pipeline via
// `claude -p` headless mode. This measures what the user actually gets —
// routing, system prompt, effort settings included — and consumes the
// user's own subscription quota. The actually-used model ID is captured
// from the JSON result so silent model switches are visible.

export function claudeCodeAdapter({ model, effort, env } = {}) {
  return {
    name: 'claude-code',
    probeSupported: true,
    async run(prompt, _q, { timeoutMs = 240000 } = {}) {
      const args = ['-p', '--output-format', 'json', '--max-turns', '3'];
      if (model) args.push('--model', model);
      if (effort) args.push('--effort', effort);
      const t0 = Date.now();
      const { stdout, stderr, code, timedOut } = await exec('claude', args, prompt, timeoutMs, env);
      if (timedOut) throw new Error(`claude timed out after ${Math.round(timeoutMs / 1000)}s`);
      if (code !== 0) throw new Error(`claude exited ${code}: ${(stderr || stdout).slice(0, 300)}`);
      let obj;
      try {
        obj = JSON.parse(stdout);
      } catch {
        throw new Error(`unparseable claude output: ${stdout.slice(0, 200)}`);
      }
      if (obj.is_error) {
        throw new Error(`claude error result: ${String(obj.result ?? obj.error ?? stdout).slice(0, 300)}`);
      }
      // Pick the model that produced the most output tokens.
      let usedModel;
      let best = -1;
      for (const [m, u] of Object.entries(obj.modelUsage || {})) {
        const tokens = (u && (u.outputTokens ?? u.output_tokens)) || 0;
        if (tokens > best) {
          best = tokens;
          usedModel = m;
        }
      }
      return {
        text: String(obj.result ?? ''),
        model: usedModel,
        costUsd: obj.total_cost_usd,
        durationMs: Date.now() - t0,
      };
    },
  };
}
