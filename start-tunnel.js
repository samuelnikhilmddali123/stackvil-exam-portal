const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const frontendEnvPath = path.join(__dirname, 'stackvil-exam', 'frontend', '.env');
const targetLocalPort = 5000;

console.log('=======================================================');
console.log('   Starting Cloudflare Tunnel for Local Backend');
console.log(`   Target Backend: http://localhost:${targetLocalPort}`);
console.log('=======================================================');
console.log('\nRequesting quick tunnel from Cloudflare...\n');

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

const tunnelProcess = spawn(cloudflaredCmd, ['tunnel', '--url', `http://localhost:${targetLocalPort}`], {
  windowsHide: true,
});

let tunnelUrlFound = false;

function handleLog(data) {
  const text = data.toString();
  process.stdout.write(text);

  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !tunnelUrlFound) {
    tunnelUrlFound = true;
    const tunnelUrl = match[0];

    console.log('\n=======================================================');
    console.log('   CLOUDFLARE TUNNEL ESTABLISHED SUCCESSFULLY!');
    console.log(`   Local Backend : http://localhost:${targetLocalPort}`);
    console.log(`   Tunnel Endpoint: ${tunnelUrl}`);
    console.log('=======================================================\n');

    // Update frontend/.env
    const envContent = `VITE_API_URL=${tunnelUrl}\n`;
    fs.writeFileSync(frontendEnvPath, envContent, 'utf8');
    console.log(`[UPDATED] Frontend environment updated: ${frontendEnvPath}`);
    console.log(`          VITE_API_URL set to: ${tunnelUrl}\n`);

    console.log('-------------------------------------------------------');
    console.log('To push this updated backend endpoint to Vercel Production:');
    console.log('Run: deploy.bat (or option [4] in start-portal.bat)');
    console.log('-------------------------------------------------------\n');
  }
}

tunnelProcess.stdout.on('data', handleLog);
tunnelProcess.stderr.on('data', handleLog);

tunnelProcess.on('error', (err) => {
  console.error('\n[ERROR] Failed to start cloudflared:', err.message);
});

tunnelProcess.on('exit', (code) => {
  console.log(`\nCloudflare Tunnel process exited with code ${code}`);
});
