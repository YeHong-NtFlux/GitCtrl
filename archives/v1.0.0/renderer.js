// ================================================================
//  STATE
// ================================================================
let state = {
  repoPath: '',
  currentBranch: '',
  branches: [],
  commits: [],
  files: [],
  selectedFile: null,
  diffViewerOpen: false,
  modal: { resolve: null },
  isLoading: false,
  gitVersion: '',
  isEmptyRepo: false
};

// ================================================================
//  DOM REFS
// ================================================================
const $ = id => document.getElementById(id);
const els = {
  repoPath: $('repoPath'),
  currentBranchName: $('currentBranchName'),
  statusDot: $('statusDot'),
  branchList: $('branchList'),
  branchCount: $('branchCount'),
  branchCountStat: $('branchCountStat'),
  fileList: $('fileList'),
  commitHistory: $('commitHistory'),
  stagedCount: $('stagedCount'),
  unstagedCount: $('unstagedCount'),
  commitCount: $('commitCount'),
  fileStatusHint: $('fileStatusHint'),
  historyHint: $('historyHint'),
  statusMsg: $('statusMsg'),
  repoStatus: $('repoStatus'),
  lastUpdateTime: $('lastUpdateTime'),
  commitMessageInput: $('commitMessageInput'),
  commitActionBtn: $('commitActionBtn'),
  commitBtn: $('commitBtn'),
  pushBtn: $('pushBtn'),
  pullBtn: $('pullBtn'),
  fetchBtn: $('fetchBtn'),
  mergeBtn: $('mergeBtn'),
  stageAllBtn: $('stageAllBtn'),
  unstageAllBtn: $('unstageAllBtn'),
  refreshBtn: $('refreshBtn'),
  sidebarToggle: $('sidebarToggle'),
  sidebar: $('sidebar'),
  diffViewer: $('diffViewer'),
  diffTitle: $('diffTitle'),
  diffBody: $('diffBody'),
  diffCloseBtn: $('diffCloseBtn'),
  modalOverlay: $('modalOverlay'),
  modalTitle: $('modalTitle'),
  modalDesc: $('modalDesc'),
  modalInput: $('modalInput'),
  modalCancelBtn: $('modalCancelBtn'),
  modalConfirmBtn: $('modalConfirmBtn'),
  newBranchBtn: $('newBranchBtn'),
  deleteBranchBtn: $('deleteBranchBtn'),
  loadingOverlay: $('loadingOverlay'),
  loadingText: $('loadingText'),
  gitVersion: $('gitVersion'),
};

// ================================================================
//  LOADING
// ================================================================
function showLoading(text = '加载中...') {
  els.loadingText.textContent = text;
  els.loadingOverlay.classList.add('open');
  state.isLoading = true;
}

function hideLoading() {
  els.loadingOverlay.classList.remove('open');
  state.isLoading = false;
}

// ================================================================
//  STATUS MESSAGE
// ================================================================
function setStatus(msg, isGood = true) {
  els.statusMsg.innerHTML = `● ${msg}`;
  els.statusMsg.style.color = isGood ? 'var(--text-secondary)' : 'var(--accent-orange)';
  setTimeout(() => { els.statusMsg.style.color = ''; }, 4000);
}

// ================================================================
//  DATA LOADING
// ================================================================
async function loadRepoData() {
  if (!state.repoPath) return;
  showLoading('读取仓库状态...');
  try {
    const [statusRes, branchRes, commitRes] = await Promise.all([
      window.electronAPI.gitStatus(),
      window.electronAPI.gitBranches(),
      window.electronAPI.gitCommits(state.currentBranch || 'HEAD', 50)
    ]);

    if (statusRes.success) {
      state.files = statusRes.files || [];
      state.currentBranch = statusRes.currentBranch || state.currentBranch;
    } else {
      setStatus('获取状态失败: ' + statusRes.error, false);
    }

    if (branchRes.success) {
      state.branches = branchRes.branches || [];
    } else {
      setStatus('获取分支失败: ' + branchRes.error, false);
    }

    if (commitRes.success) {
      state.commits = commitRes.commits || [];
      state.isEmptyRepo = state.commits.length === 0 && state.branches.length <= 1;
    } else {
      setStatus('获取提交历史失败: ' + commitRes.error, false);
      state.commits = [];
      state.isEmptyRepo = true;
    }

    renderAll();
    if (state.isEmptyRepo && state.files.length === 0) {
      setStatus('空仓库 · 添加文件后暂存并提交以创建初始提交');
    } else {
      setStatus('数据已刷新');
    }
  } catch (e) {
    setStatus('加载失败: ' + e.message, false);
  } finally {
    hideLoading();
  }
}

async function selectRepo() {
  showLoading('选择仓库...');
  try {
    const res = await window.electronAPI.selectRepo();
    if (res.success) {
      state.repoPath = res.path;
      await loadRepoData();
      setStatus(`已加载仓库: ${res.path}`);
    }
  } catch (e) {
    setStatus('选择仓库失败', false);
  } finally {
    hideLoading();
  }
}

// ================================================================
//  RENDER FUNCTIONS
// ================================================================
function renderBranches() {
  const { branches, currentBranch } = state;
  const localBranches = branches.filter(b => !b.isRemote);

  const html = branches.map(b => {
    const isActive = b.name === currentBranch;
    const isRemote = b.isRemote;
    const marker = isActive ? '●' : '';
    return `
      <div class="branch-item ${isActive ? 'active' : ''}" data-branch="${b.name}">
        <span class="name">${b.name} ${isRemote ? '<span class="remote">(remote)</span>' : ''}</span>
        ${marker ? `<span class="marker">${marker}</span>` : ''}
        <div class="branch-actions">
          ${!isRemote && !isActive && b.name !== 'HEAD' ? `<button class="switch-branch" title="切换" data-name="${b.name}">⇢</button>` : ''}
          ${!isRemote && !isActive && b.name !== 'HEAD' ? `<button class="delete-branch" title="删除" data-name="${b.name}">✕</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  els.branchList.innerHTML = html;
  els.branchCount.textContent = localBranches.length;
  els.branchCountStat.textContent = localBranches.length;
  els.currentBranchName.textContent = currentBranch || 'unknown';

  els.branchList.querySelectorAll('.switch-branch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchBranch(btn.dataset.name);
    });
  });
  els.branchList.querySelectorAll('.delete-branch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBranch(btn.dataset.name);
    });
  });
  els.branchList.querySelectorAll('.branch-item:not(.active)').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.dataset.branch;
      if (!item.classList.contains('active')) switchBranch(name);
    });
  });
}

function renderFiles() {
  const files = state.files;
  const staged = files.filter(f => f.staged);
  const unstaged = files.filter(f => !f.staged);

  els.stagedCount.textContent = staged.length;
  els.unstagedCount.textContent = unstaged.length;
  els.fileStatusHint.textContent = unstaged.length ? `${unstaged.length} 个未暂存` : (staged.length ? '全部已暂存' : '无更改');

  let html = '';
  if (files.length === 0) {
    if (state.isEmptyRepo) {
      html = `<div class="file-empty">空仓库 · 请添加文件后暂存并提交</div>`;
    } else {
      html = `<div class="file-empty">工作区干净，无更改</div>`;
    }
  } else {
    if (unstaged.length) {
      html += unstaged.map(f => fileItemHtml(f, false)).join('');
    }
    if (staged.length) {
      if (unstaged.length) html += `<div style="padding:4px 16px;font-size:10px;color:var(--text-muted);border-top:1px solid var(--border-color);margin-top:4px;padding-top:8px;">已暂存</div>`;
      html += staged.map(f => fileItemHtml(f, true)).join('');
    }
  }
  els.fileList.innerHTML = html;

  els.fileList.querySelectorAll('.file-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.file-actions')) return;
      showDiff(el.dataset.file);
    });
  });
  els.fileList.querySelectorAll('.stage-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      stageFile(btn.dataset.file);
    });
  });
  els.fileList.querySelectorAll('.unstage-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      unstageFile(btn.dataset.file);
    });
  });
}

function fileItemHtml(file, isStaged) {
  const statusMap = { 'modified': 'M', 'untracked': 'U', 'deleted': 'D', 'added': 'A', 'renamed': 'R' };
  const badge = statusMap[file.status] || '?';
  const badgeClass = file.status;
  return `
    <div class="file-item" data-file="${file.name}">
      <span class="status-badge ${badgeClass}">${badge}</span>
      <span class="name">${file.name}</span>
      <div class="file-actions">
        ${isStaged ? `<button class="unstage-btn remove" data-file="${file.name}" title="取消暂存">−</button>` : `<button class="stage-btn add" data-file="${file.name}" title="暂存">+</button>`}
      </div>
    </div>
  `;
}

function renderCommits() {
  const commits = state.commits;
  els.commitCount.textContent = commits.length;
  els.historyHint.textContent = `共 ${commits.length} 次提交`;

  if (commits.length === 0) {
    if (state.isEmptyRepo) {
      els.commitHistory.innerHTML = `<div class="file-empty">空仓库 · 尚无提交记录<br><span style="font-size:11px;color:var(--text-muted);">添加文件并提交后将在此显示历史</span></div>`;
    } else {
      els.commitHistory.innerHTML = `<div class="file-empty">尚无提交</div>`;
    }
    return;
  }

  const show = commits.slice(0, 50);
  const dotColors = {
    'main': 'main', 'master': 'main',
    'dev': 'feature', 'develop': 'feature',
    'feature': 'feature', 'hotfix': 'hotfix'
  };

  let html = '<div class="commit-list">';
  show.forEach((c, idx) => {
    const isCurrent = idx === 0;
    let dotClass = 'main';
    for (const [key, val] of Object.entries(dotColors)) {
      if (c.refs && c.refs.includes(key)) { dotClass = val; break; }
      if (state.currentBranch && state.currentBranch.includes(key)) { dotClass = val; }
    }
    const branchTag = c.refs ? `<span class="branch-tag">${c.refs.replace('HEAD -> ', '').split(',')[0]}</span>` : '';
    html += `
      <div class="commit-item">
        <div class="commit-graph">
          ${idx < show.length - 1 ? '<div class="line"></div>' : ''}
          <div class="dot ${isCurrent ? 'current' : dotClass}"></div>
        </div>
        <div class="commit-info">
          <div class="message">${escapeHtml(c.message)}</div>
          <div class="meta">
            <span class="hash">${c.hash}</span>
            <span class="author">${c.author}</span>
            <span class="time">${c.time}</span>
            ${branchTag}
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  els.commitHistory.innerHTML = html;
}

function renderStatusDot() {
  const files = state.files;
  const dot = els.statusDot;
  const hasChanges = files.some(f => !f.staged);
  const hasStaged = files.some(f => f.staged);
  if (hasChanges) {
    dot.className = 'status-dot dirty';
    els.repoStatus.textContent = 'dirty';
  } else if (hasStaged) {
    dot.className = 'status-dot ahead';
    els.repoStatus.textContent = 'staged';
  } else {
    dot.className = 'status-dot clean';
    els.repoStatus.textContent = state.isEmptyRepo ? 'empty' : 'clean';
  }
}

function renderAll() {
  renderBranches();
  renderFiles();
  renderCommits();
  renderStatusDot();
  els.repoPath.textContent = state.repoPath || '点击选择仓库';
  const now = new Date();
  els.lastUpdateTime.textContent = `更新: ${now.toLocaleTimeString()}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ================================================================
//  ACTIONS
// ================================================================
async function switchBranch(name) {
  if (name === state.currentBranch) return;
  const hasChanges = state.files.some(f => !f.staged);
  if (hasChanges) {
    if (!confirm(`有未暂存的更改，切换分支可能会丢失更改。继续？`)) return;
  }
  showLoading(`切换到 ${name}...`);
  try {
    const res = await window.electronAPI.gitCheckout(name);
    if (res.success) {
      state.currentBranch = name;
      await loadRepoData();
      setStatus(`已切换到分支 ${name}`);
    } else {
      setStatus('切换分支失败: ' + res.error, false);
    }
  } catch (e) {
    setStatus('切换分支失败', false);
  } finally {
    hideLoading();
  }
}

async function deleteBranch(name) {
  if (name === state.currentBranch) {
    setStatus('不能删除当前分支', false);
    return;
  }
  if (!confirm(`确定删除分支 "${name}" 吗？`)) return;
  showLoading('删除分支...');
  try {
    const res = await window.electronAPI.gitBranchDelete(name);
    if (res.success) {
      await loadRepoData();
      setStatus(`已删除分支 ${name}`);
    } else {
      setStatus('删除失败: ' + res.error, false);
    }
  } catch (e) {
    setStatus('删除分支失败', false);
  } finally {
    hideLoading();
  }
}

async function stageFile(name) {
  showLoading('暂存中...');
  try {
    const res = await window.electronAPI.gitStage(name);
    if (res.success) {
      await loadRepoData();
      setStatus(`已暂存 ${name}`);
    } else {
      setStatus('暂存失败: ' + res.error, false);
    }
  } finally { hideLoading(); }
}

async function unstageFile(name) {
  showLoading('取消暂存...');
  try {
    const res = await window.electronAPI.gitUnstage(name);
    if (res.success) {
      await loadRepoData();
      setStatus(`已取消暂存 ${name}`);
    } else {
      setStatus('取消暂存失败: ' + res.error, false);
    }
  } finally { hideLoading(); }
}

async function stageAll() {
  showLoading('暂存全部...');
  try {
    const res = await window.electronAPI.gitStageAll();
    if (res.success) {
      await loadRepoData();
      setStatus('已暂存全部文件');
    } else {
      setStatus('暂存失败: ' + res.error, false);
    }
  } finally { hideLoading(); }
}

async function unstageAll() {
  showLoading('取消全部暂存...');
  try {
    const res = await window.electronAPI.gitUnstageAll();
    if (res.success) {
      await loadRepoData();
      setStatus('已取消全部暂存');
    } else {
      setStatus('取消暂存失败: ' + res.error, false);
    }
  } finally { hideLoading(); }
}

async function commitChanges() {
  const msg = els.commitMessageInput.value.trim();
  if (!msg) {
    setStatus('请输入提交信息', false);
    return;
  }
  const staged = state.files.filter(f => f.staged);
  if (staged.length === 0) {
    setStatus('没有暂存的文件可提交', false);
    return;
  }
  showLoading('提交中...');
  try {
    const res = await window.electronAPI.gitCommit(msg);
    if (res.success) {
      els.commitMessageInput.value = '';
      state.isEmptyRepo = false;
      await loadRepoData();
      setStatus(`提交成功: ${msg}`);
    } else {
      setStatus('提交失败: ' + res.error, false);
    }
  } finally { hideLoading(); }
}

async function pushBranch() {
  const staged = state.files.some(f => f.staged);
  if (staged) {
    setStatus('有暂存文件未提交，请先提交', false);
    return;
  }
  showLoading('推送中...');
  try {
    const res = await window.electronAPI.gitPush(state.currentBranch);
    if (res.success) {
      setStatus(`推送成功: origin/${state.currentBranch}`);
    } else {
      setStatus('推送失败: ' + res.error, false);
    }
  } finally { hideLoading(); }
}

async function pullBranch() {
  showLoading('拉取中...');
  try {
    const res = await window.electronAPI.gitPull();
    if (res.success) {
      await loadRepoData();
      setStatus('拉取成功');
    } else {
      setStatus('拉取失败: ' + res.error, false);
    }
  } finally { hideLoading(); }
}

async function fetchBranch() {
  showLoading('获取远程更新...');
  try {
    const res = await window.electronAPI.gitFetch();
    if (res.success) {
      await loadRepoData();
      setStatus('获取完成');
    } else {
      setStatus('获取失败: ' + res.error, false);
    }
  } finally { hideLoading(); }
}

async function mergeBranch() {
  const branches = state.branches.filter(b => !b.isRemote && b.name !== state.currentBranch);
  if (branches.length === 0) {
    setStatus('没有可合并的分支', false);
    return;
  }
  const name = await openModal('合并分支', `输入要合并到 ${state.currentBranch} 的分支名称`, branches.map(b => b.name).join(', '));
  if (!name || !name.trim()) { closeModal(); return; }
  const target = name.trim();
  if (!state.branches.some(b => b.name === target)) {
    setStatus(`分支 "${target}" 不存在`, false);
    closeModal();
    return;
  }
  showLoading('合并中...');
  try {
    const res = await window.electronAPI.gitMerge(target);
    if (res.success) {
      await loadRepoData();
      setStatus(`合并完成: ${target} -> ${state.currentBranch}`);
    } else {
      setStatus('合并失败: ' + res.error, false);
    }
  } finally { hideLoading(); closeModal(); }
}

async function showDiff(fileName) {
  const file = state.files.find(f => f.name === fileName);
  if (!file) return;
  state.selectedFile = fileName;
  els.diffTitle.textContent = `diff --git a/${file.name} b/${file.name}`;
  els.diffBody.innerHTML = '<span class="text-muted">加载差异...</span>';
  els.diffViewer.classList.add('open');
  state.diffViewerOpen = true;

  try {
    const res = await window.electronAPI.gitDiff(file.name, file.staged);
    if (res.success) {
      // 修复：空字符串也能正确处理
      const diffText = res.diff || '';
      const diffLines = diffText.split('\n').filter(line => line.trim() !== '');

      if (diffLines.length === 0) {
        els.diffBody.innerHTML = '<span class="text-muted">(无差异内容)</span>';
      } else {
        let html = '';
        diffLines.forEach(line => {
          if (line.startsWith('+')) {
            html += `<div class="diff-line add">${escapeHtml(line)}</div>`;
          } else if (line.startsWith('-')) {
            html += `<div class="diff-line del">${escapeHtml(line)}</div>`;
          } else {
            html += `<div>${escapeHtml(line)}</div>`;
          }
        });
        els.diffBody.innerHTML = html;
      }
    } else {
      els.diffBody.innerHTML = `<span style="color:var(--accent-red);">获取差异失败: ${escapeHtml(res.error)}</span>`;
    }
  } catch (e) {
    els.diffBody.innerHTML = `<span style="color:var(--accent-red);">错误: ${escapeHtml(e.message)}</span>`;
  }
}

function closeDiff() {
  els.diffViewer.classList.remove('open');
  state.diffViewerOpen = false;
}

// ================================================================
//  MODAL
// ================================================================
function openModal(title, desc, placeholder = '') {
  return new Promise((resolve) => {
    els.modalTitle.textContent = title;
    els.modalDesc.textContent = desc;
    els.modalInput.value = '';
    els.modalInput.placeholder = placeholder || '输入...';
    els.modalOverlay.classList.add('open');
    setTimeout(() => els.modalInput.focus(), 100);
    state.modal.resolve = resolve;
  });
}

function closeModal() {
  els.modalOverlay.classList.remove('open');
  if (state.modal.resolve) {
    state.modal.resolve(null);
    state.modal.resolve = null;
  }
}

// ================================================================
//  EVENT BINDINGS
// ================================================================
els.commitActionBtn.addEventListener('click', commitChanges);
els.commitBtn.addEventListener('click', commitChanges);
els.commitMessageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault();
    commitChanges();
  }
});

els.pushBtn.addEventListener('click', pushBranch);
els.pullBtn.addEventListener('click', pullBranch);
els.fetchBtn.addEventListener('click', fetchBranch);
els.mergeBtn.addEventListener('click', mergeBranch);

els.stageAllBtn.addEventListener('click', stageAll);
els.unstageAllBtn.addEventListener('click', unstageAll);

els.refreshBtn.addEventListener('click', () => {
  loadRepoData();
  setStatus('已刷新');
});

els.sidebarToggle.addEventListener('click', () => {
  els.sidebar.classList.toggle('open');
});

els.diffCloseBtn.addEventListener('click', closeDiff);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.diffViewerOpen) { closeDiff(); e.preventDefault(); }
    else if (els.modalOverlay.classList.contains('open')) { closeModal(); e.preventDefault(); }
    return;
  }

  if (e.ctrlKey && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    loadRepoData();
    setStatus('已刷新');
    return;
  }

  if (e.ctrlKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    stageAll();
    return;
  }

  if (e.ctrlKey && e.key.toLowerCase() === 'u') {
    e.preventDefault();
    unstageAll();
    return;
  }
});

els.newBranchBtn.addEventListener('click', async () => {
  const name = await openModal('新建分支', '输入新分支名称', 'feature/xxx');
  if (name && name.trim()) {
    const trimmed = name.trim();
    if (state.branches.some(b => b.name === trimmed)) {
      setStatus(`分支 "${trimmed}" 已存在`, false);
      closeModal();
      return;
    }
    showLoading('创建分支...');
    try {
      const res = await window.electronAPI.gitBranchCreate(trimmed);
      if (res.success) {
        await loadRepoData();
        setStatus(`已创建分支 ${trimmed}`);
      } else {
        setStatus('创建失败: ' + res.error, false);
      }
    } finally { hideLoading(); closeModal(); }
  } else {
    closeModal();
  }
});

els.deleteBranchBtn.addEventListener('click', async () => {
  const branches = state.branches.filter(b => !b.isRemote && b.name !== state.currentBranch);
  if (branches.length === 0) {
    setStatus('没有可删除的分支', false);
    return;
  }
  const names = branches.map(b => b.name).join(', ');
  const name = await openModal('删除分支', `输入要删除的分支名称 (可选: ${names})`, '分支名称');
  if (name && name.trim()) {
    const trimmed = name.trim();
    if (trimmed === state.currentBranch) {
      setStatus('不能删除当前分支', false);
      closeModal();
      return;
    }
    await deleteBranch(trimmed);
  }
  closeModal();
});

els.modalConfirmBtn.addEventListener('click', () => {
  const val = els.modalInput.value;
  if (state.modal.resolve) {
    state.modal.resolve(val);
    state.modal.resolve = null;
  }
  els.modalOverlay.classList.remove('open');
});

els.modalCancelBtn.addEventListener('click', closeModal);
els.modalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.modalConfirmBtn.click();
});

els.repoPath.addEventListener('click', selectRepo);

// ================================================================
//  INIT
// ================================================================
async function init() {
  try {
    const verRes = await window.electronAPI.getGitVersion();
    state.gitVersion = verRes || 'unknown';
    els.gitVersion.textContent = `Git ${state.gitVersion}`;
  } catch (e) {
    els.gitVersion.textContent = 'Git unknown';
  }

  setStatus('就绪 · 等待仓库加载');
}

window.electronAPI.onRepoLoaded((data) => {
  state.repoPath = data.path;
  if (data.gitVersion) {
    state.gitVersion = data.gitVersion;
    els.gitVersion.textContent = `Git ${data.gitVersion}`;
  }
  loadRepoData();
  setStatus(`已加载默认仓库: ${data.path}`);
});

window.electronAPI.onRepoError((data) => {
  if (data.gitVersion) {
    state.gitVersion = data.gitVersion;
    els.gitVersion.textContent = `Git ${data.gitVersion}`;
  }
  setStatus(data.error, false);
  setTimeout(() => {
    if (!state.repoPath) {
      setStatus('点击顶部路径选择仓库', false);
    }
  }, 3000);
});

init();
console.log('GitCtrl Renderer 已启动');
