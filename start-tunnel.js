const { spawn, execSync } = require('child_process');
const fs = require('fs');

const targetLocalPort = 5000;
const permanentBackendUrl = 'https://api.stackvil.com';
const tunnelName = 'stackvil-backend';

console.log('=======================================================');
console.log('   Starting Permanent Cloudflare Named Tunnel');
console.log(`   Tunnel Name     : ${tunnelName}`);
console.log(`   Permanent API   : ${permanentBackendUrl}`);
console.log(`   Local Backend   : http://localhost:${targetLocalPort}`);
console.log('=======================================================\n');

// Find cloudflared executable path
let cloudflaredCmd = 'cloudflared';
try {
  execSync('where cloudflared', { stdio: 'ignore' });
} catch (e) {
  if (fs.existsSync('C:\\Program Files (x86)\\cloudflared\\cloudflared.exe')) {
    cloudflaredCmd = 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe';
  } else if (fs.existsSync('C:\\Program Files\\cloudflared\\cloudflared.exe')) {
    cloudflaredCmd = 'C:\\Program Files\\cloudflared\\cloudflared.exe';
  }
}

const tunnelProcess = spawn(cloudflaredCmd, ['tunnel', 'run', tunnelName], {
  windowsHide: true,
});

tunnelProcess.stdout.on('data', (data) => {
  process.stdout.write(data.toString());
});

tunnelProcess.stderr.on('data', (data) => {
  process.stdout.write(data.toString());
});

tunnelProcess.on('error', (err) => {
  console.error('\n[ERROR] Failed to start cloudflared:', err.message);
});

tunnelProcess.on('exit', (code) => {
  console.log(`\nCloudflare Tunnel process exited with code ${code}`);
});
