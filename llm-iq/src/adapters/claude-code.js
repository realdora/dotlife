import { spawn } from 'node:child_process';

// Runs questions through the full Claude Code product pipeline via
// `claude -p` headless mode. This measures what the user actually gets —
// routing, system prompt, effort settings included — and consumes the
// user's own subscription quota. The actually-used model ID is captured
// from the JSON result so silent model switches are visible.

function exec(cmd, args, stdin, timeoutMs) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      p.kill('SIGKILL');
    }, timeoutMs);
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => {
      clearTimeout(timer);
      resolve({ stdout: out, stderr: String(e), code: -1, timedOut });
    });
    p.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout: out, stderr: err, code, timedOut });
    });
    p.stdin.on('error', () => {});
    p.stdin.write(stdin);
    p.stdin.end();
  });
}

export function claudeCodeAdapter({ model } = {}) {
  return {
    name: 'claude-code',
    async run(prompt, _q, { timeoutMs = 240000 } = {}) {
      const args = ['-p', '--output-format', 'json', '--max-turns', '3'];
      if (model) args.push('--model', model);
      const t0 = Date.now();
      const { stdout, stderr, code, timedOut } = await exec('claude', args, prompt, timeoutMs);
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
