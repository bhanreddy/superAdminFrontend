const { execFileSync } = require('node:child_process');

if (process.env.WORKERS_CI === '1') {
  console.log('[cloudflare] Building the Expo web bundle before Wrangler deploys static assets.');
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execFileSync(npmCommand, ['run', 'build:web'], { stdio: 'inherit' });
}
