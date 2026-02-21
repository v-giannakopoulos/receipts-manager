const { app, BrowserWindow, shell, dialog, session } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

let flaskProcess = null;
let mainWindow   = null;
let startupError = null;
const FLASK_URL  = 'http://127.0.0.1:5000';
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

// ── Start the Python/Flask server ──────────────────────────────────────────
function startFlask() {
  const pythonPath = findPython();
  if (!pythonPath) return false;

  const appDir = getAppDir();
  const appPath = path.join(appDir, 'app.py');
  console.log('[Flask] Starting with Python:', pythonPath);
  console.log('[Flask] App directory:', appDir);
  console.log('[Flask] App.py exists:', fs.existsSync(appPath));

  if (!fs.existsSync(appPath)) {
    startupError = `Cannot find app.py at: ${appPath}`;
    return false;
  }

  try {
    flaskProcess = spawn(pythonPath, [appPath], {
      cwd: appDir,
      env: { ...process.env, FLASK_ENV: 'production', PYTHONUNBUFFERED: '1' }
    });
    flaskProcess.stdout.on('data', d => console.log('[Flask]', d.toString().trim()));
    flaskProcess.stderr.on('data', d => {
      const msg = d.toString().trim();
      console.error('[Flask]', msg);
      if (msg.includes('Error') || msg.includes('Traceback')) startupError = msg;
    });
    flaskProcess.on('error', err => {
      console.error('[Flask] Failed to start:', err);
      startupError = `Failed to start Flask: ${err.message}`;
    });
    return true;
  } catch (err) {
    startupError = `Exception starting Flask: ${err.message}`;
    return false;
  }
}

// ── Robust Flask readiness: verify it returns actual HTML ───────────────────
function waitForFlask(url, retries, callback, errorCallback) {
  const req = http.get(url, (res) => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
      // Make sure Flask is serving real HTML, not just responding
      if (res.statusCode === 200 && body.includes('<!DOCTYPE html>')) {
        console.log('[Electron] Flask is ready and serving HTML!');
        callback();
      } else {
        console.warn(`[Electron] Flask responded but content not ready (status=${res.statusCode}, bodyLen=${body.length}), retrying...`);
        if (retries <= 0) {
          errorCallback('Flask is responding but not serving the app correctly.');
          return;
        }
        setTimeout(() => waitForFlask(url, retries - 1, callback, errorCallback), 500);
      }
    });
  });
  req.setTimeout(2000, () => req.destroy());
  req.on('error', () => {
    if (flaskProcess && flaskProcess.exitCode !== null) {
      errorCallback(startupError || `Flask exited with code ${flaskProcess.exitCode}`);
      return;
    }
    if (retries <= 0) {
      errorCallback(startupError || 'Flask server failed to start after 30 seconds.');
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

  // If page fails to load, retry
  mainWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Electron] Page failed to load: ${errorCode} ${errorDescription}`);
    if (retriesLeft > 0) {
      console.log('[Electron] Retrying in 1 second...');
      setTimeout(() => loadAppWithRetry(retriesLeft - 1), 1000);
    } else {
      showErrorPage(`Page failed to load after multiple attempts.\nError: ${errorDescription} (${errorCode})`);
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
    <li>Check if Flask dependencies are installed</li>
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
      partition: SESSION_PARTITION  // isolated session, avoids shared handler conflicts
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
    <h2>Receipt Manager</h2><p>Starting Flask server...</p></div></body></html>`;

  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(loadingHtml));

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Open DevTools for debugging (uncomment if needed)
  // mainWindow.webContents.openDevTools();

  // Wait for Flask to be truly ready (checks HTML content, not just connection)
  console.log(`[Electron] Waiting for Flask at ${FLASK_URL}...`);
  waitForFlask(FLASK_URL, 60,
    () => loadAppWithRetry(5),
    (error) => {
      console.error('[Electron] Flask startup failed:', error);
      showErrorPage(error);
    }
  );

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  console.log('[Electron] App is ready, starting Flask...');
  console.log('[Electron] Is packaged:', app.isPackaged);
  console.log('[Electron] __dirname:', __dirname);

  // Remove CSP headers ONCE on the named session (not inside createWindow)
  const ses = session.fromPartition(SESSION_PARTITION);
  ses.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    delete responseHeaders['x-content-security-policy'];
    delete responseHeaders['X-Content-Security-Policy'];
    callback({ responseHeaders });
  });

  // Kill stale port process and wait longer for OS to release port
  killPortProcess(5000);
  await new Promise(r => setTimeout(r, 1500));

  const flaskStarted = startFlask();
  if (!flaskStarted && startupError) {
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
  console.log('[Electron] App is quitting, killing Flask...');
  if (flaskProcess) { flaskProcess.kill('SIGTERM'); flaskProcess = null; }
});
