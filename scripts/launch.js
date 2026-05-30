'use strict';

// Dev launcher for `npm start`.
//
// Some shells/tools export ELECTRON_RUN_AS_NODE=1 in the environment. When that
// var is set, the electron binary runs as plain Node.js instead of as Electron,
// so require('electron') inside main.js returns the *path string* to the binary
// rather than the API object — `app`, `BrowserWindow`, etc. come back undefined
// and the app crashes with "Cannot read properties of undefined (reading
// 'whenReady')". This can't be fixed from inside main.js: by the time it runs,
// Electron has already booted as Node with no GUI runtime.
//
// Fix: spawn the real Electron binary with ELECTRON_RUN_AS_NODE stripped from
// the child's environment. In plain Node, require('electron') resolves to the
// binary path, which is exactly what we want to spawn here.

const { spawn } = require('child_process');
const electronBinary = require('electron'); // path string to electron.exe under Node

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
});

child.on('close', (code) => process.exit(code ?? 0));
