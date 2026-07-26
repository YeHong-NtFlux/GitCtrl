const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 应用
  selectRepo: () => ipcRenderer.invoke('app:select-repo'),
  getGitVersion: () => ipcRenderer.invoke('app:get-git-version'),
  onRepoLoaded: (callback) => ipcRenderer.on('repo:loaded', (event, data) => callback(data)),
  onRepoError: (callback) => ipcRenderer.on('repo:error', (event, data) => callback(data)),

  // Git 操作
  gitStatus: () => ipcRenderer.invoke('git:status'),
  gitBranches: () => ipcRenderer.invoke('git:branches'),
  gitCommits: (branch, count) => ipcRenderer.invoke('git:commits', branch, count),
  gitDiff: (fileName, staged) => ipcRenderer.invoke('git:diff', fileName, staged),
  gitStage: (fileName) => ipcRenderer.invoke('git:stage', fileName),
  gitUnstage: (fileName) => ipcRenderer.invoke('git:unstage', fileName),
  gitStageAll: () => ipcRenderer.invoke('git:stage-all'),
  gitUnstageAll: () => ipcRenderer.invoke('git:unstage-all'),
  gitCommit: (message) => ipcRenderer.invoke('git:commit', message),
  gitPush: (branch) => ipcRenderer.invoke('git:push', branch),
  gitPull: () => ipcRenderer.invoke('git:pull'),
  gitFetch: () => ipcRenderer.invoke('git:fetch'),
  gitMerge: (branch) => ipcRenderer.invoke('git:merge', branch),
  gitBranchCreate: (name) => ipcRenderer.invoke('git:branch-create', name),
  gitBranchDelete: (name) => ipcRenderer.invoke('git:branch-delete', name),
  gitCheckout: (name) => ipcRenderer.invoke('git:checkout', name),

  // GitHub
  githubAuth: () => ipcRenderer.invoke('github:auth'),
  githubSaveToken: (token) => ipcRenderer.invoke('github:save-token', token),
  githubGetToken: () => ipcRenderer.invoke('github:get-token'),

  // 系统
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url)
});
