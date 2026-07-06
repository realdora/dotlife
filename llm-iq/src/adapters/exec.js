import { spawn } from 'node:child_process';

// Shared subprocess runner for CLI-based adapters: prompt on stdin,
// captured stdout/stderr, hard timeout via SIGKILL.
export function exec(cmd, args, stdin, timeoutMs, env) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env ? { ...process.env, ...env } : process.env,
    });
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
