const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const GitService = require('./src/git-service');
const GitHubAuth = require('./src/github-auth');

let mainWindow;
let gitService = new GitService();
let githubAuth = new GitHubAuth();
let gitVersion = 'unknown';

function getGitVersion() {
  return new Promise((resolve) => {
    exec('git --version', { encoding: 'utf8' }, (err, stdout) => {
      if (!err && stdout) {
        const match = stdout.match(/git version\s+([\d.]+)/i);
        gitVersion = match ? match[1] : stdout.trim();
      }
      resolve(gitVersion);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'GitCtrl · 极客控制台',
    icon: path.join(__dirname, 'assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#0a0e14',
    show: false,
    titleBarStyle: 'hiddenInset'
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    loadDefaultRepo();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function loadDefaultRepo() {
  const defaultPath = 'D:\\git-ctrl-publish';
  const fs = require('fs');

  if (fs.existsSync(defaultPath)) {
    gitService.setRepoPath(defaultPath);
    const isRepo = await gitService.isRepo();
    if (isRepo) {
      mainWindow.webContents.send('repo:loaded', { path: defaultPath, gitVersion });
    } else {
      mainWindow.webContents.send('repo:error', { 
        error: `D:\\git-ctrl-publish 不是 Git 仓库。点击顶部路径栏选择仓库。`,
        gitVersion 
      });
    }
  } else {
    mainWindow.webContents.send('repo:error', { 
      error: '默认仓库 D:\\git-ctrl-publish 不存在。点击顶部路径栏选择仓库。',
      gitVersion 
    });
  }
}

app.whenReady().then(async () => {
  await getGitVersion();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// ==================== IPC 处理器 ====================

ipcMain.handle('app:get-git-version', () => gitVersion);

ipcMain.handle('app:select-repo', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: 'D:\\'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const repoPath = result.filePaths[0];
    gitService.setRepoPath(repoPath);
    const isRepo = await gitService.isRepo();
    if (!isRepo) {
      return { success: false, error: '选择的目录不是有效的 Git 仓库' };
    }
    return { success: true, path: repoPath };
  }
  return { success: false };
});

ipcMain.handle('git:status', async () => {
  try {
    const files = await gitService.getStatus();
    const currentBranch = await gitService.getCurrentBranch();
    return { success: true, files, currentBranch };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:branches', async () => {
  try {
    const branches = await gitService.getBranches();
    return { success: true, branches };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:commits', async (event, branch, count = 50) => {
  try {
    const commits = await gitService.getCommits(branch, count);
    return { success: true, commits };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:diff', async (event, fileName, staged = false) => {
  try {
    const diff = await gitService.getDiff(fileName, staged);
    return { success: true, diff };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:stage', async (event, fileName) => {
  try {
    await gitService.stage(fileName);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:unstage', async (event, fileName) => {
  try {
    await gitService.unstage(fileName);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:stage-all', async () => {
  try {
    await gitService.stageAll();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:unstage-all', async () => {
  try {
    await gitService.unstageAll();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:commit', async (event, message) => {
  try {
    const result = await gitService.commit(message);
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:push', async (event, branch) => {
  try {
    const result = await gitService.push(branch);
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:pull', async () => {
  try {
    const result = await gitService.pull();
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:fetch', async () => {
  try {
    const result = await gitService.fetch();
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:merge', async (event, branch) => {
  try {
    const result = await gitService.merge(branch);
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:branch-create', async (event, name) => {
  try {
    await gitService.createBranch(name);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:branch-delete', async (event, name) => {
  try {
    await gitService.deleteBranch(name);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('git:checkout', async (event, name) => {
  try {
    await gitService.checkout(name);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('github:auth', async () => {
  try {
    const result = await githubAuth.startAuthFlow();
    return { success: true, code: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
});

ipcMain.handle('github:save-token', async (event, token) => {
  githubAuth.token = token;
  return { success: true };
});

ipcMain.handle('github:get-token', async () => {
  return { token: githubAuth.token };
});

ipcMain.handle('shell:open-external', async (event, url) => {
  await shell.openExternal(url);
});
