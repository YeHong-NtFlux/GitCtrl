const http = require('http');
const url = require('url');
const { shell } = require('electron');

const CLIENT_ID = 'Ov23ligHlZz6JZWMRyPl';
const REDIRECT_URI = 'http://localhost:34567/callback';
const PORT = 34567;

class GitHubAuth {
  constructor() {
    this.token = null;
    this.server = null;
  }

  startAuthFlow() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close();
        this.server = null;
      }

      this.server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);

        if (parsedUrl.pathname === '/callback') {
          const code = parsedUrl.query.code;
          const error = parsedUrl.query.error;

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

          if (code) {
            res.end(`<!DOCTYPE html>
<html><head><title>GitCtrl 授权</title><style>
body{font-family:'Fira Code',monospace;background:#0a0e14;color:#00ff41;text-align:center;padding-top:120px;}
h1{font-size:32px;margin-bottom:20px;}p{color:#8aa0c8;font-size:14px;}
.code{display:inline-block;background:#161c28;padding:8px 16px;border-radius:4px;margin-top:20px;font-size:12px;color:#58a6ff;border:1px solid #2a3448;}
</style></head>
<body><h1>✓ 授权成功</h1><p>请返回 GitCtrl 应用继续操作</p><div class="code">Code: ${code.substring(0,12)}...</div></body></html>`);
            resolve(code);
          } else {
            res.end(`<!DOCTYPE html>
<html><head><title>GitCtrl 授权失败</title><style>
body{font-family:'Fira Code',monospace;background:#0a0e14;color:#ff4757;text-align:center;padding-top:120px;}
</style></head>
<body><h1>✗ 授权失败</h1><p>${error || '未知错误'}</p></body></html>`);
            reject(new Error(error || '授权被取消'));
          }

          setTimeout(() => {
            if (this.server) { this.server.close(); this.server = null; }
          }, 3000);
        }
      });

      this.server.listen(PORT, () => {
        const state = Math.random().toString(36).substring(2, 15);
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=repo,user&state=${state}`;
        shell.openExternal(authUrl);
      });

      setTimeout(() => {
        if (this.server) { this.server.close(); this.server = null; reject(new Error('授权超时')); }
      }, 300000);
    });
  }
}

module.exports = GitHubAuth;
