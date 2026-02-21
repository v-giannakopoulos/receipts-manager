const { app, BrowserWindow, shell, dialog } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

let flaskProcess = null;
let mainWindow   = null;
let startupError = null;

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
  const isDev = !app.isPackaged;
  
  if (isDev) {
    return __dirname;
  }
  
  // In production, use app.asar.unpacked for Python files
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
  if (!pythonPath) {
    return false;
  }
  
  const appDir = getAppDir();
  const appPath = path.join(appDir, 'app.py');
  console.log('[Flask] Starting with Python:', pythonPath);
  console.log('[Flask] App directory:', appDir);
  console.log('[Flask] App path:', appPath);
  console.log('[Flask] App.py exists:', fs.existsSync(appPath));
  if (!fs.existsSync(appPath)) {
    console.error('[Flask] ERROR: app.py not found at:', appPath);
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
      if (msg.includes('Error') || msg.includes('Traceback')) {
        startupError = msg;
      }
    });
    
    flaskProcess.on('error', err => {
      console.error('[Flask] Failed to start:', err);
      startupError = `Failed to start Flask: ${err.message}`;
    });
    
    return true;
  } catch (err) {
    console.error('[Flask] Exception starting Flask:', err);
    startupError = `Exception starting Flask: ${err.message}`;
    return false;
  }
}

// ── Wait until Flask is ready, then open the window ───────────────────────
function waitForFlask(url, retries, callback, errorCallback) {
  const req = http.get(url, (res) => {
    res.resume(); // consume body so socket is released properly
    console.log('[Electron] Flask is responding!');
    callback();
  });
  req.setTimeout(1000, () => req.destroy());
  req.on('error', () => {
    // If Flask process already exited, no point waiting
    if (flaskProcess && flaskProcess.exitCode !== null) {
      const error = startupError || `Flask exited with code ${flaskProcess.exitCode}`;
      errorCallback(error);
      return;
    }
    if (retries <= 0) {
      console.error('[Electron] Flask never started after 30 seconds!');
      const error = startupError || 'Flask server failed to start after 30 seconds. Check if Python and dependencies are installed.';
      errorCallback(error);
      return;
    }
    setTimeout(() => waitForFlask(url, retries - 1, callback, errorCallback), 500);
  });
}

// ── Show error in window ───────────────────────────────────────────────────
function showErrorPage(errorMessage) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Startup Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          padding: 40px;
          background: #f5f5f5;
        }
        .error-box {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 600px;
          margin: 0 auto;
        }
        h1 { color: #d32f2f; margin-top: 0; }
        pre {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          overflow-x: auto;
          font-size: 12px;
        }
        .help {
          margin-top: 20px;
          padding: 15px;
          background: #e3f2fd;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="error-box">
        <h1>Startup Error</h1>
        <p>Receipt Manager could not start the Flask server.</p>
        <pre>${errorMessage}</pre>
        <div class="help">
          <strong>Troubleshooting:</strong>
          <ul>
            <li>Make sure Python 3 is installed</li>
            <li>Check if Flask dependencies are installed</li>
            <li>Try running from Terminal to see detailed logs</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;
  
  if (mainWindow) {
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
      contextIsolation: true
    }
  });

  // Show loading page
  const loadingHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Loading...</title>
      <style>
        body {
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .loader {
          text-align: center;
        }
        .spinner {
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h2 { margin: 10px 0; }
        p { opacity: 0.9; }
      </style>
    </head>
    <body>
      <div class="loader">
        <div class="spinner"></div>
        <h2>Receipt Manager</h2>
        <p>Starting Flask server...</p>
      </div>
    </body>
    </html>
  `;
  
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(loadingHtml));

  // Open external links in the real browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Wait for Flask
  console.log('[Electron] Waiting for Flask to start at http://127.0.0.1:5000 ...');
  waitForFlask('http://127.0.0.1:5000', 60,
    () => {
      console.log('[Electron] Loading app window...');
      mainWindow.loadURL('http://127.0.0.1:5000');
    },
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

  // Kill any stale process holding port 5000 from a previous run
  killPortProcess(5000);
  await new Promise(r => setTimeout(r, 300)); // brief wait for OS to release port

  const flaskStarted = startFlask();

  if (!flaskStarted && startupError) {
    // Show error dialog immediately
    dialog.showErrorBox('Startup Error', startupError);
  }

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
