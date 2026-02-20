const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

let flaskProcess = null;
let mainWindow   = null;

// ── Find Python (try venv first, then system) ─────────────────────────────
function findPython() {
  const possiblePaths = [
    // Try venv first (for development)
    path.join(__dirname, 'venv', 'bin', 'python3'),
    path.join(__dirname, 'venv', 'bin', 'python'),
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
  console.error('[Python] Please run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt');
  return 'python3'; // fallback
}

// ── Start the Python/Flask server ──────────────────────────────────────────
function startFlask() {
  const pythonPath = findPython();
  const appPath    = path.join(__dirname, 'app.py');

  console.log('[Flask] Starting with Python:', pythonPath);
  console.log('[Flask] App path:', appPath);
  console.log('[Flask] Working directory:', __dirname);

  flaskProcess = spawn(pythonPath, [appPath], {
    cwd: __dirname,
    env: { ...process.env, FLASK_ENV: 'production', PYTHONUNBUFFERED: '1' }
  });

  flaskProcess.stdout.on('data', d => console.log('[Flask]', d.toString().trim()));
  flaskProcess.stderr.on('data', d => console.error('[Flask]', d.toString().trim()));
  flaskProcess.on('error', err => {
    console.error('[Flask] Failed to start:', err);
    console.error('[Flask] Make sure you have created venv and installed dependencies!');
    console.error('[Flask] Run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt');
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
      console.error('[Electron] Make sure dependencies are installed:');
      console.error('[Electron]   cd', __dirname);
      console.error('[Electron]   python3 -m venv venv');
      console.error('[Electron]   source venv/bin/activate');
      console.error('[Electron]   pip install -r requirements.txt');
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
