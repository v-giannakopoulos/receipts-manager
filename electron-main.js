const { app, BrowserWindow, shell, dialog, session } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

let flaskProcess = null;
let mainWindow   = null;
let startupError = null;
const PORT       = 8765;  // Matches app.py - avoids macOS AirPlay on port 5000
const FLASK_URL  = `http://127.0.0.1:${PORT}`;
const SESSION_PARTITION = 'persist:receiptmanager';

// ── Kill any process holding the given port ────────────────────────────────
function killPortProcess(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    if (pids) {
      pids.split('\n').forEach(pid => {
        try { process.kill(parseInt(pid), 'SIGKILL'); } catch (e) {}
      });
      console.log(`[Electron] Killed stale process(es) on port ${port}:`, pids);
    }
  } catch (e) { /* no process on that port, fine */ }
}

// ── Get the correct base directory ────────────────────────────────────────
function getAppDir() {
  if (!app.isPackaged) return __dirname;

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
    path.join(appDir, 'venv', 'bin', 'python3'),
    path.join(appDir, 'venv', 'bin', 'python'),
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
  startupError = 'Python 3 not found. Please install Python 3 from python.org';
  return null;
}

// ── Start the Python/HTTP server ──────────────────────────────────────────
function startFlask() {
  const pythonPath = findPython();
  if (!pythonPath) return false;

  const appDir = getAppDir();
  const appPath = path.join(appDir, 'app.py');
  console.log('[Server] Starting with Python:', pythonPath);
  console.log('[Server] App directory:', appDir);
  console.log('[Server] App.py exists:', fs.existsSync(appPath));

  if (!fs.existsSync(appPath)) {
    startupError = `Cannot find app.py at: ${appPath}`;
    return false;
  }

  try {
    flaskProcess = spawn(pythonPath, [appPath], {
      cwd: appDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });
    flaskProcess.stdout.on('data', d => console.log('[Server]', d.toString().trim()));
    flaskProcess.stderr.on('data', d => {
      const msg = d.toString().trim();
      console.error('[Server]', msg);
      if (msg.includes('Error') || msg.includes('Traceback')) startupError = msg;
    });
    flaskProcess.on('error', err => {
      console.error('[Server] Failed to start:', err);
      startupError = `Failed to start server: ${err.message}`;
    });
    return true;
  } catch (err) {
    startupError = `Exception starting server: ${err.message}`;
    return false;
  }
}

// ── Wait until server is ready (accept any non-5xx HTTP response) ────────────────
function waitForFlask(url, retries, callback, errorCallback) {
  const req = http.get(url, (res) => {
    res.resume();
    const status = res.statusCode;
    console.log(`[Electron] Server responded with status: ${status}`);
    if (status < 500) {
      console.log('[Electron] Server is ready!');
      callback();
    } else {
      if (retries <= 0) { errorCallback(`Server returned error status: ${status}`); return; }
      setTimeout(() => waitForFlask(url, retries - 1, callback, errorCallback), 500);
    }
  });
  req.setTimeout(2000, () => req.destroy());
  req.on('error', () => {
    if (flaskProcess && flaskProcess.exitCode !== null) {
      errorCallback(startupError || `Server exited with code ${flaskProcess.exitCode}`);
      return;
    }
    if (retries <= 0) {
      errorCallback(startupError || 'Server failed to start after 30 seconds.');
      return;
    }
    setTimeout(() => waitForFlask(url, retries - 1, callback, errorCallback), 500);
  });
}

// ── Load URL with retry on failure ──────────────────────────────────────────────
function loadAppWithRetry(retriesLeft) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  console.log(`[Electron] Loading ${FLASK_URL} (attempts left: ${retriesLeft})...`);
  mainWindow.loadURL(FLASK_URL);

  mainWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Electron] Page failed to load: ${errorCode} ${errorDescription}`);
    if (retriesLeft > 0) {
      console.log('[Electron] Retrying in 1 second...');
      setTimeout(() => loadAppWithRetry(retriesLeft - 1), 1000);
    } else {
      showErrorPage(`Page failed to load.\nError: ${errorDescription} (${errorCode})`);
    }
  });

  mainWindow.webContents.once('did-finish-load', () => {
    console.log('[Electron] Page loaded successfully!');
  });
}

// ── Show error in window ───────────────────────────────────────────────────
function showErrorPage(errorMessage) {
  const html = `<!DOCTYPE html><html><head><title>Startup Error</title>
    <style>body{font-family:-apple-system,sans-serif;padding:40px;background:#f5f5f5}
    .box{background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.1);max-width:600px;margin:0 auto}
    h1{color:#d32f2f;margin-top:0}pre{background:#f5f5f5;padding:15px;border-radius:5px;overflow-x:auto;font-size:12px}
    .help{margin-top:20px;padding:15px;background:#e3f2fd;border-radius:5px}</style></head>
    <body><div class="box"><h1>Startup Error</h1>
    <p>Receipt Manager could not load.</p><pre>${errorMessage}</pre>
    <div class="help"><strong>Troubleshooting:</strong><ul>
    <li>Make sure Python 3 is installed</li>
    <li>Try running from Terminal to see detailed logs</li>
    </ul></div></div></body></html>`;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  }
}

// ── Create the main app window ─────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Receipt & Warranty Manager',
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      partition: SESSION_PARTITION
    }
  });

  // Show loading page immediately
  const loadingHtml = `<!DOCTYPE html><html><head><title>Loading...</title>
    <style>body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;
    font-family:-apple-system,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);color:white}
    .loader{text-align:center}
    .spinner{border:4px solid rgba(255,255,255,.3);border-top:4px solid white;border-radius:50%;
    width:50px;height:50px;animation:spin 1s linear infinite;margin:0 auto 20px}
    @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    h2{margin:10px 0}p{opacity:.9}</style></head>
    <body><div class="loader"><div class="spinner"></div>
    <h2>Receipt Manager</h2><p>Starting server...</p></div></body></html>`;

  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(loadingHtml));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Uncomment to debug in DevTools:
  // mainWindow.webContents.openDevTools();

  console.log(`[Electron] Waiting for server at ${FLASK_URL}...`);
  waitForFlask(FLASK_URL, 60,
    () => loadAppWithRetry(5),
    (error) => {
      console.error('[Electron] Server startup failed:', error);
      showErrorPage(error);
    }
  );

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  console.log('[Electron] App is ready, starting server...');
  console.log('[Electron] Is packaged:', app.isPackaged);
  console.log('[Electron] __dirname:', __dirname);

  // Register CSP header removal ONCE on the named session
  const ses = session.fromPartition(SESSION_PARTITION);
  ses.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    delete responseHeaders['x-content-security-policy'];
    delete responseHeaders['X-Content-Security-Policy'];
    callback({ responseHeaders });
  });

  // Kill stale process on our port and wait for OS to release it
  killPortProcess(PORT);
  await new Promise(r => setTimeout(r, 1500));

  const serverStarted = startFlask();
  if (!serverStarted && startupError) {
    dialog.showErrorBox('Startup Error', startupError);
  }

  createWindow();
}).catch(err => {
  console.error('[Electron] Error in app.whenReady():', err);
  dialog.showErrorBox('Startup Error', err.message);
});

app.on('window-all-closed', () => {
  console.log('[Electron] All windows closed, quitting...');
  if (flaskProcess) { flaskProcess.kill('SIGTERM'); flaskProcess = null; }
  app.quit();
});

app.on('before-quit', () => {
  console.log('[Electron] App is quitting, killing server...');
  if (flaskProcess) { flaskProcess.kill('SIGTERM'); flaskProcess = null; }
});
