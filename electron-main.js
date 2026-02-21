const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

let flaskProcess = null;
let mainWindow   = null;

// ── Get the correct base directory ────────────────────────────────────────
function getAppDir() {
  // In production (packaged app), unpacked files are in app.asar.unpacked
  // In development, they're in the current directory
  const isDev = !app.isPackaged;
  
  if (isDev) {
    return __dirname;
  }
  
  // In production, check if app.asar.unpacked exists
  const unpackedPath = __dirname.replace('app.asar', 'app.asar.unpacked');
  if (fs.existsSync(unpackedPath)) {
    console.log('[App] Using unpacked path:', unpackedPath);
    return unpackedPath;
  }
  
  console.log('[App] Using default path:', __dirname);
  return __dirname;
}

// ── Find Python (try venv first, then system) ─────────────────────────────
function findPython() {
  const appDir = getAppDir();
  
  const possiblePaths = [
    // Try venv first (for development)
    path.join(appDir, 'venv', 'bin', 'python3'),
    path.join(appDir, 'venv', 'bin', 'python'),
    // Then system Python locations
    '/usr/local/bin/python3',
    '/opt/homebrew/bin/python3',
    '/usr/bin/python3',
    'python3'
  ];
  
  for (const pyPath of possiblePaths) {
    if (pyPath === 'python3' || fs.existsSync(pyPath)) {
      console.log('[Python] Found at:', pyPath);
      return pyPath;
    }
  }
  
  console.error('[Python] Could not find Python3!');
  console.error('[Python] Searched paths:', possiblePaths);
  return 'python3'; // fallback
}

// ── Start the Python/Flask server ──────────────────────────────────────────
function startFlask() {
  const pythonPath = findPython();
  const appDir = getAppDir();
  const appPath = path.join(appDir, 'app.py');

  console.log('[Flask] Starting with Python:', pythonPath);
  console.log('[Flask] App directory:', appDir);
  console.log('[Flask] App path:', appPath);
  console.log('[Flask] App.py exists:', fs.existsSync(appPath));

  if (!fs.existsSync(appPath)) {
    console.error('[Flask] ERROR: app.py not found at:', appPath);
    console.error('[Flask] Directory contents:', fs.readdirSync(appDir).slice(0, 20));
    return;
  }

  flaskProcess = spawn(pythonPath, [appPath], {
    cwd: appDir,
    env: { ...process.env, FLASK_ENV: 'production', PYTHONUNBUFFERED: '1' }
  });

  flaskProcess.stdout.on('data', d => console.log('[Flask]', d.toString().trim()));
  flaskProcess.stderr.on('data', d => console.error('[Flask]', d.toString().trim()));
  flaskProcess.on('error', err => {
    console.error('[Flask] Failed to start:', err);
    console.error('[Flask] Python path:', pythonPath);
    console.error('[Flask] App path:', appPath);
  });
}

// ── Wait until Flask is ready, then open the window ───────────────────────
function waitForFlask(url, retries, callback) {
  http.get(url, () => {
    console.log('[Electron] Flask is responding!');
    callback();
  })
  .on('error', () => {
    if (retries <= 0) { 
      console.error('[Electron] Flask never started after 30 seconds!');
      console.error('[Electron] Check the console above for Flask errors.');
      return; 
    }
    setTimeout(() => waitForFlask(url, retries - 1, callback), 500);
  });
}

// ── Create the main app window ─────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1400,
    height: 900,
    title:  'Receipt & Warranty Manager',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true
    }
  });

  // Open external links in the real browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Wait up to 30 seconds for Flask, then load
  console.log('[Electron] Waiting for Flask to start at http://127.0.0.1:5000 ...');
  waitForFlask('http://127.0.0.1:5000', 60, () => {
    console.log('[Electron] Loading app window...');
    mainWindow.loadURL('http://127.0.0.1:5000');
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  console.log('[Electron] App is ready, starting Flask...');
  console.log('[Electron] Is packaged:', app.isPackaged);
  console.log('[Electron] __dirname:', __dirname);
  startFlask();
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('[Electron] All windows closed, quitting...');
  if (flaskProcess) flaskProcess.kill();
  app.quit();
});

app.on('before-quit', () => {
  console.log('[Electron] App is quitting, killing Flask...');
  if (flaskProcess) flaskProcess.kill();
});
