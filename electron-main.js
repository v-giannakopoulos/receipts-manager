const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let flaskProcess = null;
let mainWindow   = null;

// ── Start the Python/Flask server ──────────────────────────────────────────
function startFlask() {
  const pythonPath = path.join(__dirname, 'venv', 'bin', 'python3');
  const appPath    = path.join(__dirname, 'app.py');

  flaskProcess = spawn(pythonPath, [appPath], {
    cwd: __dirname,
    env: { ...process.env, FLASK_ENV: 'production', PYTHONUNBUFFERED: '1' }
  });

  flaskProcess.stdout.on('data', d => console.log('[Flask]', d.toString().trim()));
  flaskProcess.stderr.on('data', d => console.error('[Flask]', d.toString().trim()));
  flaskProcess.on('error', err => console.error('[Flask] Failed to start:', err));
}

// ── Wait until Flask is ready, then open the window ───────────────────────
function waitForFlask(url, retries, callback) {
  http.get(url, () => callback())
      .on('error', () => {
        if (retries <= 0) { console.error('Flask never started!'); return; }
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
  waitForFlask('http://127.0.0.1:5000', 60, () => {
    mainWindow.loadURL('http://127.0.0.1:5000');
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startFlask();
  createWindow();
});

app.on('window-all-closed', () => {
  if (flaskProcess) flaskProcess.kill();
  app.quit();
});

app.on('before-quit', () => {
  if (flaskProcess) flaskProcess.kill();
});
