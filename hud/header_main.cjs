// ===== AGY_CONTEXT_HEADER_BEGIN =====
(function () {
  try {
    const electron = require('electron');
    const ipcMain = electron && electron.ipcMain;
    const shell = electron && electron.shell;
    if (!ipcMain || globalThis.__AGY_CONTEXT_HEADER_MAIN__) return;
    globalThis.__AGY_CONTEXT_HEADER_MAIN__ = true;

    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const http = require('http');
    const crypto = require('crypto');

    const PLUGIN_DIR = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'agy-context');
    const SERVER_MODULE = path.join(PLUGIN_DIR, 'sidecars', 'context-insight', 'server.cjs');
    const SIDECAR_INFO = path.join(
      os.homedir(),
      '.gemini',
      'antigravity',
      'sidecar_data',
      'agy-context',
      'context-insight',
      'data',
      'server_info.json'
    );

    let fallbackSrv = null;
    let fallbackStarting = null;

    function readJsonSafe(fp) {
      try {
        if (!fs.existsSync(fp)) return null;
        return JSON.parse(fs.readFileSync(fp, 'utf8'));
      } catch {
        return null;
      }
    }

    function httpGetJson(port, reqPath, token, timeoutMs = 1500) {
      return new Promise((resolve) => {
        const headers = {};
        if (token) headers['X-Sidecar-Token'] = token;
        const req = http.request(
          { hostname: '127.0.0.1', port, path: reqPath, method: 'GET', timeout: timeoutMs, headers },
          (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
              if (res.statusCode !== 200) {
                resolve(null);
                return;
              }
              try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
              } catch {
                resolve(null);
              }
            });
          }
        );
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
        req.on('error', () => resolve(null));
        req.end();
      });
    }

    async function ensureServer() {
      // 1. Prefer the Antigravity-managed Sidecar server if alive
      const info = readJsonSafe(SIDECAR_INFO);
      if (info && Number(info.port) > 0) {
        const health = await httpGetJson(Number(info.port), '/api/health', info.token || '');
        if (health && health.ok) {
          return { ok: true, host: '127.0.0.1', port: Number(info.port), token: info.token || '', managed: true };
        }
      }

      // 2. Reuse fallback in-process server if already running
      if (fallbackSrv && fallbackSrv.port > 0) {
        const health = await httpGetJson(fallbackSrv.port, '/api/health', fallbackSrv.token || '');
        if (health && health.ok) {
          return { ok: true, host: '127.0.0.1', port: fallbackSrv.port, token: fallbackSrv.token || '', managed: false };
        }
        fallbackSrv = null;
      }

      // 3. Start lightweight fallback server inside main process (reads local transcripts directly)
      if (!fs.existsSync(SERVER_MODULE)) {
        return { ok: false, error: 'agy-context plugin not installed' };
      }
      if (!fallbackStarting) {
        fallbackStarting = (async () => {
          const { AgyContextServer } = require(SERVER_MODULE);
          const tok = crypto.randomBytes(16).toString('hex');
          const srv = new AgyContextServer({ port: 0, token: tok });
          await srv.start();
          fallbackSrv = srv;
          return { ok: true, host: '127.0.0.1', port: srv.port, token: tok, managed: false };
        })().finally(() => {
          fallbackStarting = null;
        });
      }
      return fallbackStarting;
    }

    ipcMain.handle('agy-context-header:ensure-server', async () => {
      try {
        return await ensureServer();
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    });

    ipcMain.handle('agy-context-header:summary', async (_ev, convId) => {
      try {
        const srv = await ensureServer();
        if (!srv || !srv.ok) return { ok: false };
        const qId = convId ? encodeURIComponent(String(convId)) : '';
        const [sess, fleet] = await Promise.all([
          httpGetJson(srv.port, `/api/session?id=${qId}&full=0`, srv.token, 1800),
          httpGetJson(srv.port, `/api/fleet?id=${qId}`, srv.token, 1800),
        ]);
        return {
          ok: true,
          port: srv.port,
          token: srv.token,
          usagePct: sess && typeof sess.usagePct === 'number' ? sess.usagePct : null,
          currentTotal: sess && sess.current ? sess.current.total : 0,
          contextWindow: sess ? sess.contextWindow : 0,
          familySize: fleet && fleet.summary ? fleet.summary.familySize : 1,
          runningCount: fleet && fleet.summary ? fleet.summary.runningCount : 0,
        };
      } catch {
        return { ok: false };
      }
    });

    ipcMain.handle('agy-context-header:open-external', async (_ev, url) => {
      try {
        if (shell && typeof url === 'string' && /^https?:\/\/127\.0\.0\.1:\d+\//.test(url)) {
          await shell.openExternal(url);
          return { ok: true };
        }
      } catch {}
      return { ok: false };
    });
  } catch {}
})();
// ===== AGY_CONTEXT_HEADER_END =====
