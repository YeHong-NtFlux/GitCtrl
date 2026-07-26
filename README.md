# GitCtrl · 极客控制台

> 基于 Electron + Node.js 的 Git 可视化桌面客户端，保留极客风格 UI，调用真实 Git 命令。

## 环境要求

- Windows 10/11
- [Node.js](https://nodejs.org/) >= 18.x LTS
- [Git](https://git-scm.com/) >= 2.30

## 安装

```bash
git clone https://github.com/YeHong-NtFlux/GitCtrl.git
cd GitCtrl
npm install
```

## 开发运行

```bash
npm start
```

## 打包

```bash
npm run dist
```

打包后的安装包位于 `dist/` 目录下。

## 功能

- 文件状态实时监控（修改 / 新增 / 删除 / 重命名）
- 一键暂存 / 取消暂存（单文件或全部）
- 内置差异查看器（diff）
- 图形化提交历史
- 分支管理（新建 / 切换 / 删除 / 合并）
- 推送 / 拉取 / 获取
- 多仓库切换
- 空仓库友好提示

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + Enter` | 提交 |
| `Ctrl + R` | 刷新 |
| `Ctrl + S` | 暂存全部 |
| `Ctrl + U` | 取消暂存全部 |
| `Esc` | 关闭弹窗 / diff 查看器 |

## 发布命令速查

| 场景 | 命令 |
|------|------|
| 初始化发布 | `cd D:\git-ctrl; .\init-publish.ps1` |
| 日常发布（自动打包 + 发版） | `cd D:\git-ctrl; .\publish.ps1` |
| 只发源码，不打包 | `.\publish.ps1 -SkipBuild` |
| 只推 Git，不发 Release | `.\publish.ps1 -SkipRelease` |
| 指定版本号 | `.\publish.ps1 -Version "1.1.0"` |

## License

MIT
