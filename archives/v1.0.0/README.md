# GitCtrl · 极客控制台

> 基于 Electron + Node.js 的 Git 可视化桌面客户端，保留极客风格 UI，调用真实 Git 命令。

## 环境要求

- Windows 11
- [Node.js](https://nodejs.org/) >= 18.x LTS
- [Git](https://git-scm.com/) >= 2.30
- PowerShell 5+ 或 PowerShell Core

## 快速开始（PowerShell）

### 1. 克隆/解压项目到 D 盘

```powershell
# 如果你下载了 zip 包，解压到 D:\git-ctrl
# 确保目录结构如下：
# D:\git-ctrl\
#   ├── package.json
#   ├── main.js
#   ├── preload.js
#   ├── index.html
#   ├── renderer.js
#   ├── src/
#   │   ├── git-service.js
#   │   └── github-auth.js
#   └── assets/
```

### 2. 安装依赖

```powershell
cd D:\git-ctrl
npm install
```

### 3. 开发运行

```powershell
npm start
```

应用会自动尝试加载 `D:\git-ctrl-publish` 作为默认仓库。如果该目录不是 Git 仓库，点击顶部路径栏手动选择。

### 4. 打包为可执行文件

```powershell
npm run dist
```

打包后的安装包位于 `D:\git-ctrl\dist\` 目录下。

## 功能清单

| 功能 | 状态 |
|------|------|
| 查看文件状态（已修改/未跟踪/已暂存） | ✅ |
| 暂存/取消暂存单个文件 | ✅ |
| 暂存全部 / 取消暂存全部 | ✅ |
| 提交（带信息输入） | ✅ |
| 推送 / 拉取 / 获取 | ✅ |
| 分支切换 / 新建 / 删除 | ✅ |
| 合并分支 | ✅ |
| 查看文件差异（diff） | ✅ |
| 提交历史图形化展示 | ✅ |
| 多仓库切换 | ✅ |
| GitHub OAuth 登录（Device Flow） | 🔄 |

## SSH 配置（已就绪）

你的 `~\.ssh\config` 已配置为通过 443 端口连接 GitHub：

```
Host github.com
    Hostname ssh.github.com
    Port 443
    User git
```

确保 SSH 密钥已添加到 GitHub：

```powershell
# 复制公钥到剪贴板
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
# 然后粘贴到 https://github.com/settings/keys
```

测试连接：

```powershell
ssh -T git@github.com
```

## 发布到 GitHub

你的发布目录 `D:\git-ctrl-publish` 已关联远程仓库 `https://github.com/YeHong-NtFlux/GitCtrl.git`。

### 推送源码

```powershell
cd D:\git-ctrl-publish

# 初始化（如未初始化）
git init
git remote add origin https://github.com/YeHong-NtFlux/GitCtrl.git

# 配置用户信息
git config user.name "YeHong-NtFlux"
git config user.email "frankoc415@gmail.com"

# 添加并提交
git add .
git commit -m "feat: init GitCtrl Electron app"

# 推送到 main 分支
git branch -M main
git push -u origin main
```

### 发布 Release（可选）

打包完成后，将 `dist/GitCtrl Setup.exe` 作为 Release 附件上传：

```powershell
cd D:\git-ctrl-publish

# 打标签
git tag -a v1.0.0 -m "GitCtrl v1.0.0 发布"
git push origin v1.0.0
```

然后在 GitHub 网页上创建 Release 并上传安装包。

## 项目结构

```
git-ctrl/
├── package.json          # 项目配置 & Electron Builder
├── main.js               # Electron 主进程（窗口 & IPC）
├── preload.js            # 安全 IPC 桥接
├── index.html            # 前端页面（极客风格 UI）
├── renderer.js           # 前端逻辑（调用 Git 命令）
├── src/
│   ├── git-service.js    # Git 命令封装
│   └── github-auth.js    # GitHub OAuth 授权
└── assets/
    └── icon.ico          # 应用图标（需自行准备）
```

## 常见问题

### Q: 应用启动后显示"未选择仓库"
A: 点击顶部路径栏（`~/projects/my-repo` 位置），选择你的 Git 仓库目录。

### Q: Push/Pull 提示权限错误
A: 确保 SSH 密钥已添加到 GitHub，且 `~\.ssh\config` 配置正确。在 PowerShell 中测试：
```powershell
ssh -T git@github.com
```

### Q: 打包时提示缺少 icon.ico
A: 准备一张 256x256 的 PNG，在线转换为 ICO 格式，放到 `assets/icon.ico`。

### Q: 合并冲突怎么办
A: 当前版本会在合并冲突时显示错误信息。解决冲突后刷新即可。

## License

MIT
