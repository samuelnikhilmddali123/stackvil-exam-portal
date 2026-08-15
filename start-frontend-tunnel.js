const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const targetLocalPort = 5173;
const permanentFrontendUrl = 'https://entrance.stackvil.com';
const tunnelName = 'stackvil-frontend';

console.log('=======================================================');
console.log('   Starting Stackvil Frontend Cloudflare Tunnel');
console.log(`   Target Local Frontend : http://127.0.0.1:${targetLocalPort}`);
console.log('=======================================================\n');

// 1. Locate cloudflared binary
let cloudflaredCmd = null;

try {
  const whereOutput = execSync('where cloudflared', { stdio: 'pipe' }).toString().trim();
  const firstPath = whereOutput.split(/\r?\n/)[0];
  if (firstPath && fs.existsSync(firstPath)) {
    cloudflaredCmd = firstPath;
  }
} catch (e) {
  // Not in PATH
}

if (!cloudflaredCmd) {
  const candidates = [
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
    'C:\\gharsansar_server\\temp_bin\\cloudflared.exe',
    'C:\\cloudflared\\cloudflared.exe',
    'C:\\tools\\cloudflared\\cloudflared.exe',
    path.join(process.env.USERPROFILE || '', 'cloudflared.exe'),
    path.join(process.env.USERPROFILE || '', '.cloudflared', 'cloudflared.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'cloudflared', 'cloudflared.exe'),
    path.join(__dirname, 'cloudflared.exe')
  ];

  for (const candidatePath of candidates) {
    if (candidatePath && fs.existsSync(candidatePath)) {
      cloudflaredCmd = candidatePath;
      break;
    }
  }
}

if (!cloudflaredCmd) {
  cloudflaredCmd = 'cloudflared';
}

console.log(`[INFO] Cloudflare binary located at: ${cloudflaredCmd}`);

function startQuickTunnel() {
  console.log(`\n[INFO] Launching Cloudflare Quick Tunnel for Frontend (http://127.0.0.1:${targetLocalPort})...`);
  const quickTunnelProcess = spawn(cloudflaredCmd, ['tunnel', '--url', `http://127.0.0.1:${targetLocalPort}`], {
    windowsHide: true
  });

  quickTunnelProcess.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);
  });

  quickTunnelProcess.stderr.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);
  });

  quickTunnelProcess.on('error', (err) => {
    console.error('\n[ERROR] Failed to start Quick Tunnel process:', err.message);
  });

  quickTunnelProcess.on('exit', (code) => {
    console.log(`\nCloudflare Quick Tunnel process exited with code ${code}`);
  });
}

function startNamedTunnel() {
  console.log(`[INFO] Attempting Named Tunnel '${tunnelName}'...`);
  let hasFailed = false;
  
  const namedProcess = spawn(cloudflaredCmd, ['tunnel', 'run', tunnelName], {
    windowsHide: true
  });

  namedProcess.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);
  });

  namedProcess.stderr.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);
    if (text.includes('Error locating origin cert') || text.includes('Cannot determine default origin certificate path') || text.includes('credentials file')) {
      hasFailed = true;
    }
  });

  namedProcess.on('error', (err) => {
    console.error('\n[WARNING] Named tunnel error:', err.message);
    hasFailed = true;
  });

  namedProcess.on('exit', (code) => {
    if (code !== 0 || hasFailed) {
      console.log(`\n[NOTICE] Named tunnel '${tunnelName}' credentials not found, starting Quick Tunnel...`);
      startQuickTunnel();
    } else {
      console.log(`\nNamed Tunnel process exited with code ${code}`);
    }
  });
}

startNamedTunnel();
