const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let pythonProcess;

// Determine if we're in development or production
const isDev = !app.isPackaged;

// Get the correct paths
const backendPath = isDev
  ? path.join(__dirname, 'backend')
  : path.join(process.resourcesPath, 'backend');

const frontendPath = isDev
  ? path.join(__dirname, 'frontend')
  : path.join(__dirname, 'frontend');

function startPythonBackend() {
  console.log('Starting Python backend...');
  console.log('Backend path:', backendPath);

  // Find the main Python file (adjust this to your actual main file)
  const pythonScript = path.join(backendPath, 'app.py'); // Change 'app.py' to your actual Python entry file

  if (!fs.existsSync(pythonScript)) {
    console.error('Python script not found:', pythonScript);
    return;
  }

  // Start Python process
  pythonProcess = spawn('python3', [pythonScript], {
    cwd: backendPath,
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'hiddenInset',
    title: 'Receipt Manager'
  });

  // Wait a bit for Python backend to start
  setTimeout(() => {
    // Load the frontend HTML
    const indexPath = path.join(frontendPath, 'index.html');
    mainWindow.loadFile(indexPath);
  }, 2000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startPythonBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

