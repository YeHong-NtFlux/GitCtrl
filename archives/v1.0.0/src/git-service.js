const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class GitService {
  constructor(repoPath = '') {
    this.repoPath = repoPath;
  }

  setRepoPath(repoPath) {
    this.repoPath = repoPath;
  }

  execGit(args) {
    return new Promise((resolve, reject) => {
      if (!this.repoPath) {
        reject(new Error('未选择仓库目录'));
        return;
      }

      const options = {
        cwd: this.repoPath,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 5,
        env: {
          ...process.env,
          LANG: 'zh_CN.UTF-8',
          LC_ALL: 'zh_CN.UTF-8',
          GIT_TERMINAL_PROMPT: '0'
        }
      };

      exec(`git ${args}`, options, (error, stdout, stderr) => {
        if (error && !stdout) {
          reject(stderr || error.message);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  async isRepo() {
    try {
      await this.execGit('rev-parse --git-dir');
      return true;
    } catch {
      return false;
    }
  }

  async isEmptyRepo() {
    try {
      await this.execGit('rev-parse HEAD');
      return false;
    } catch {
      return true;
    }
  }

  async getStatus() {
    const output = await this.execGit('status --porcelain');
    const files = [];
    if (!output) return files;

    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      if (line.length < 3) continue;
      const status = line.substring(0, 2);
      const fileName = line.substring(3).trim();

      let fileStatus = 'untracked';
      let staged = false;

      const indexStatus = status[0];
      const workTreeStatus = status[1];

      if (indexStatus === 'M' || workTreeStatus === 'M') {
        fileStatus = 'modified';
      } else if (indexStatus === 'A' || workTreeStatus === 'A') {
        fileStatus = 'added';
      } else if (indexStatus === 'D' || workTreeStatus === 'D') {
        fileStatus = 'deleted';
      } else if (indexStatus === 'R') {
        fileStatus = 'renamed';
      } else if (indexStatus === '?' && workTreeStatus === '?') {
        fileStatus = 'untracked';
      }

      staged = indexStatus !== ' ' && indexStatus !== '?';

      files.push({
        name: fileName,
        status: fileStatus,
        staged: staged
      });
    }
    return files;
  }

  async getBranches() {
    const output = await this.execGit('branch -a');
    const branches = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const isCurrent = line.startsWith('*');
      const rawName = line.replace(/^\*\s*/, '').trim();

      // 跳过 HEAD 引用（如 origin/HEAD -> origin/main）
      if (rawName.includes('HEAD') && !isCurrent) continue;

      // 处理 detached HEAD：显示为 HEAD
      let name = rawName;
      if (isCurrent && rawName.startsWith('(')) {
        name = 'HEAD';
      }

      const isRemote = name.startsWith('remotes/');
      const displayName = isRemote ? name.replace('remotes/', '') : name;

      branches.push({
        name: displayName,
        isRemote: isRemote,
        isCurrent: isCurrent
      });
    }
    return branches;
  }

  async getCommits(branch = 'HEAD', count = 50) {
    const isEmpty = await this.isEmptyRepo();
    if (isEmpty) {
      return [];
    }

    const format = '%H|%s|%an|%ad|%D';
    const output = await this.execGit(`log ${branch} --pretty=format:"${format}" --date=format:"%Y-%m-%d %H:%M" -n ${count}`);
    const commits = [];

    if (!output) return commits;

    const lines = output.split('\n').filter(line => line.trim());
    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length >= 4) {
        commits.push({
          hash: parts[0].substring(0, 7),
          fullHash: parts[0],
          message: parts[1],
          author: parts[2],
          time: parts[3],
          refs: parts[4] || ''
        });
      }
    }
    return commits;
  }

  async getDiff(fileName, staged = false) {
    const fullPath = path.join(this.repoPath, fileName);
    const isUntracked = await this.isUntracked(fileName);
    const isNewInIndex = staged && await this.isNewFile(fileName);

    // 对于 untracked 或 staged 的新增文件，直接读内容
    if (isUntracked || isNewInIndex) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        const limited = lines.slice(0, 200);
        const diff = limited.map(l => `+ ${l}`).join('\n');
        if (lines.length > 200) {
          return diff + `\n+ ... (${lines.length - 200} 行省略)`;
        }
        return diff;
      } catch (e) {
        return `+ 新文件: ${fileName}\n+ (无法读取文件内容: ${e.message})`;
      }
    }

    const cmd = staged ? `diff --staged -- "${fileName}"` : `diff -- "${fileName}"`;
    try {
      const diff = await this.execGit(cmd);
      // 如果 diff 为空但文件存在（可能是 Git 某些情况返回空），兜底读文件
      if (!diff && fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        return content.split('\n').map(l => `  ${l}`).join('\n');
      }
      return diff;
    } catch (e) {
      return `+ 差异获取失败: ${e}`;
    }
  }

  async isUntracked(fileName) {
    try {
      const output = await this.execGit(`ls-files --others --exclude-standard -- "${fileName}"`);
      return output.trim() === fileName;
    } catch {
      return false;
    }
  }

  async isNewFile(fileName) {
    // 检查文件是否在 index 中但不在 HEAD 中（即新增并已暂存）
    try {
      await this.execGit(`diff --staged -- "${fileName}"`);
      // 如果 diff 有输出，说明不是全新的（或者已被跟踪过）
      return false;
    } catch {
      // diff 报错通常意味着文件在 index 中是全新的
      return true;
    }
  }

  async stage(fileName) {
    return await this.execGit(`add -- "${fileName}"`);
  }

  async unstage(fileName) {
    return await this.execGit(`reset HEAD -- "${fileName}"`);
  }

  async stageAll() {
    return await this.execGit('add -A');
  }

  async unstageAll() {
    return await this.execGit('reset HEAD');
  }

  async commit(message) {
    const tmpFile = path.join(this.repoPath, '.git', 'COMMIT_EDITMSG_GITCTRL');
    fs.writeFileSync(tmpFile, message, 'utf8');
    try {
      const result = await this.execGit(`commit -F "${tmpFile}"`);
      return result;
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }

  async push(branch) {
    if (branch) {
      return await this.execGit(`push origin "${branch}"`);
    }
    return await this.execGit('push');
  }

  async pull() {
    return await this.execGit('pull');
  }

  async fetch() {
    return await this.execGit('fetch');
  }

  async merge(branch) {
    return await this.execGit(`merge "${branch}"`);
  }

  async createBranch(name) {
    return await this.execGit(`branch "${name}"`);
  }

  async deleteBranch(name) {
    return await this.execGit(`branch -D "${name}"`);
  }

  async checkout(branch) {
    return await this.execGit(`checkout "${branch}"`);
  }

  async getCurrentBranch() {
    try {
      const output = await this.execGit('rev-parse --abbrev-ref HEAD');
      return output.trim();
    } catch {
      return 'main';
    }
  }
}

module.exports = GitService;
