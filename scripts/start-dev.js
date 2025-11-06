#!/usr/bin/env node
// Script to run both the local server and frontend dev server together

const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const serverPath = path.join(projectRoot, 'server', 'local-server.js');

console.log('🚀 Starting Synergy development environment...\n');

let serverProcess = null;
let devProcess = null;

// Cleanup function
const cleanup = () => {
  console.log('\n\n🛑 Shutting down...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  if (devProcess) {
    devProcess.kill('SIGTERM');
  }
  setTimeout(() => {
    process.exit(0);
  }, 1000);
};

// Handle signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the local server
console.log('📡 Starting local API server on https://localhost:3001...');
serverProcess = spawn('node', [serverPath], {
  stdio: 'inherit',
  shell: true,
  cwd: projectRoot
});

serverProcess.on('error', (err) => {
  console.error('❌ Server error:', err);
  cleanup();
});

serverProcess.on('exit', (code) => {
  if (code !== null && code !== 0 && code !== 130) { // 130 is SIGINT
    console.error(`❌ Server exited with code ${code}`);
    cleanup();
  }
});

// Wait a moment for server to start, then start Vite
setTimeout(() => {
  console.log('⚡ Starting Vite dev server...\n');
  devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: projectRoot
  });

  devProcess.on('error', (err) => {
    console.error('❌ Dev server error:', err);
    cleanup();
  });

  devProcess.on('exit', (code) => {
    if (code !== null && code !== 0 && code !== 130) { // 130 is SIGINT
      console.error(`❌ Dev server exited with code ${code}`);
      cleanup();
    }
  });
}, 1500);

