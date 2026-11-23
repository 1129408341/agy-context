'use strict';

const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { TranscriptStore, resolveAppDataDir, isFile } = require('./engine/parser.cjs');
const { analyzeSession } = require('./engine/analyzer.cjs');
const { buildFleetForConversation } = require('./engine/fleet.cjs');
const { buildOverview } = require('./engine/overview.cjs');

const BIND_HOST = '127.0.0.1';
const DEFAULT_PORT = 8095;
const PLUGIN_ID = 'agy-context';
const SIDECAR_ID = 'context-insight';

const DEFAULT_SETTINGS = {
  lang: 'zh',
  defaultRange: '30d',
  defaultGranularity: 'step',
  defaultTimelineMode: 'total',
  currency: 'usd',
  showDurationCurve: true,
  autoRefreshSec: 8,
  theme: 'auto',
};

const FALLBACK_PRELOAD_JS = `(function() {
  const params = new URLSearchParams(window.location.search);
  const boot = window.__SIDECAR_BOOT__ || {};
  const token = params.get('token') || boot.token || '';
  const conversationId = params.get('conversationId') || boot.conversationId || '';
  const themeListeners = new Set();
  const wsListeners = new Set();
  let lastThemeVars = null;
  let lastWorkspaceUris = [];

  window.addEventListener('message', (event) => {
    const d = event.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'theme-change') {
      const vars = (d.payload && d.payload.cssVariables) || {};
      lastThemeVars = vars;
      for (const [k, v] of Object.entries(vars)) {
        document.documentElement.style.setProperty(k, v);
      }
      for (const fn of themeListeners) { try { fn(vars); } catch {} }
    } else if (d.type === 'workspace-change') {
      const uris = (d.payload && Array.isArray(d.payload.workspaceUris)) ? d.payload.workspaceUris : [];
      lastWorkspaceUris = uris;
      for (const fn of wsListeners) { try { fn(uris); } catch {} }
    }
  });

  function secureFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token) headers.set('X-Sidecar-Token', token);
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, { ...options, headers });
  }

  window.sidecar = window.sidecar || {
    conversationId,
    token,
    fetch: secureFetch,
    onThemeChange(fn) {
      themeListeners.add(fn);
      if (lastThemeVars) queueMicrotask(() => fn(lastThemeVars));
      return () => themeListeners.delete(fn);
    },
    onWorkspaceChange(fn) {
      wsListeners.add(fn);
      if (lastWorkspaceUris.length) queueMicrotask(() => fn(lastWorkspaceUris));
      return () => wsListeners.delete(fn);
    },
    ui: {
      toggleConversation(convId) {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'toggle-conversation', payload: { conversationId: convId } }, '*');
        }
      },
      toggleAuxPane(req) {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'toggle-aux-pane', payload: req }, '*');
        }
      }
    }
  };
})();`;

function resolveDataDir(appDataDir) {
  const envDir = process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR?.trim();
  if (envDir) {
    try {
      fs.mkdirSync(envDir, { recursive: true });
      return envDir;
    } catch {}
  }
  const primary = path.join(appDataDir, 'sidecar_data', PLUGIN_ID, SIDECAR_ID, 'data');
  try {
    fs.mkdirSync(primary, { recursive: true });
    return primary;
  } catch {
    const fallback = path.join(os.tmpdir(), 'agy-context-data');
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

function parseDurationMs(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val !== 'string') return 0;
  const m = /^([\d.]+)s$/i.exec(val.trim());
  if (!m) return 0;
  const sec = parseFloat(m[1]);
  return Number.isFinite(sec) && sec > 0 ? Math.round(sec * 1000) : 0;
}

function callLanguageServerRpc(method, payload = {}, timeoutMs = 2000) {
  const rawAddr = (process.env.ANTIGRAVITY_LS_ADDRESS || '').trim();
  const csrf = (process.env.ANTIGRAVITY_CSRF_TOKEN || '').trim();
  if (!rawAddr || !csrf) return Promise.resolve(null);
  const [host, portStr] = rawAddr.split(':');
  const port = parseInt(portStr || '5387', 10);
  if (!host || !Number.isFinite(port)) return Promise.resolve(null);

  return new Promise((resolve) => {
    const body = JSON.stringify(payload || {});
    const req = http.request(
      {
        hostname: host,
        port,
        path: `/exa.language_server_pb.LanguageServerService/${method}`,
        method: 'POST',
        timeout: timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'x-codeium-csrf-token': csrf,
        },
      },
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
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function rewriteHtml(html, token, conversationId) {
  const boot = `<script>window.__SIDECAR_BOOT__=${JSON.stringify({
    token: token || '',
    conversationId: conversationId || '',
  })};</script>`;
  let out = html.includes('</head>') ? html.replace('</head>', `${boot}</head>`) : boot + html;
  if (!token && !conversationId) return out;
  const qp = [];
  if (token) qp.push(`token=${encodeURIComponent(token)}`);
  if (conversationId) qp.push(`conversationId=${encodeURIComponent(conversationId)}`);
  const qs = qp.join('&');
  return out.replace(/\b(href|src)=(["'])(\/[^"'\s>]*)\2/g, (m, attr, quote, urlPath) => {
    if (urlPath.startsWith('//')) return m;
    const sep = urlPath.includes('?') ? '&' : '?';
    return `${attr}=${quote}${urlPath}${sep}${qs}${quote}`;
  });
}

class AgyContextServer {
  constructor(options = {}) {
    this.appDataDir = resolveAppDataDir(options.appDataDir);
    this.dataDir = options.dataDir || resolveDataDir(this.appDataDir);
    this.store = options.store || new TranscriptStore({ appDataDir: this.appDataDir });
    this.baseDir = __dirname;
    this.publicDir = path.join(this.baseDir, 'public');
    this.uiHtmlPath = path.join(this.baseDir, 'ui.html');
    this.settingsPath = path.join(this.dataDir, 'settings.json');
    this.serverInfoPath = path.join(this.dataDir, 'server_info.json');

    const envPort = parseInt(process.env.ANTIGRAVITY_SIDECAR_WEB_PORT || '', 10);
    this.port = options.port !== undefined
      ? options.port
      : (Number.isFinite(envPort) ? envPort : DEFAULT_PORT);

    this.token =
      options.token ??
      process.env.ANTIGRAVITY_SIDECAR_UI_TOKEN ??
      process.env.ANTIGRAVITY_SIDECAR_AUTH_TOKEN ??
      process.env.ANTIGRAVITY_SIDECAR_WEB_TOKEN ??
      '';

    this.server = null;
    this.settings = this.loadSettings();
    this.lsMetaCache = new Map();
  }

  async fetchLsGeneratorMeta(convId) {
    if (!convId || !process.env.ANTIGRAVITY_LS_ADDRESS || !process.env.ANTIGRAVITY_CSRF_TOKEN) {
      return null;
    }
    const cached = this.lsMetaCache.get(convId);
    if (cached && Date.now() - cached.at < 10000) {
      return cached.value;
    }
    const res = await callLanguageServerRpc('GetCascadeTrajectoryGeneratorMetadata', {
      cascadeId: convId,
      generatorMetadataOffset: 0,
      includeMessages: false,
    });
    const list = Array.isArray(res?.generatorMetadata)
      ? res.generatorMetadata
      : (Array.isArray(res?.data?.generatorMetadata) ? res.data.generatorMetadata : []);
    let maxContextTokens = 0;
    let ttftMs = 0;
    let tokPerSec = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      const cm = list[i]?.chatModel;
      if (!cm) continue;
      const cwm = cm.chatStartMetadata?.contextWindowMetadata;
      if (!maxContextTokens && Number(cwm?.maxContextTokens) > 0) {
        maxContextTokens = Number(cwm.maxContextTokens);
      }
      if (!ttftMs) {
        const t = parseDurationMs(cm.timeToFirstToken);
        if (t > 0) ttftMs = t;
      }
      if (!tokPerSec) {
        const streamMs = parseDurationMs(cm.streamingDuration);
        const outTok = Number(cm.usage?.responseOutputTokens || cm.usage?.outputTokens) || 0;
        if (streamMs >= 80 && outTok > 0) {
          tokPerSec = Math.round(outTok / (streamMs / 1000));
        }
      }
      if (maxContextTokens && ttftMs && tokPerSec) break;
    }
    const value = (maxContextTokens || ttftMs || tokPerSec)
      ? { maxContextTokens, ttftMs, tokPerSec }
      : null;
    this.lsMetaCache.set(convId, { at: Date.now(), value });
    return value;
  }

  loadSettings() {
    try {
      if (isFile(this.settingsPath)) {
        const raw = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
        return { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
      }
    } catch {}
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings(patch) {
    const allowed = {};
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      if (patch && patch[k] !== undefined) allowed[k] = patch[k];
    }
    this.settings = { ...this.settings, ...allowed };
    try {
      writeJsonAtomic(this.settingsPath, this.settings);
    } catch {}
    return this.settings;
  }

  validateToken(req, urlObj) {
    if (!this.token) return true;
    const hTok = req.headers['x-sidecar-token'];
    const qTok = urlObj.searchParams.get('token');
    return hTok === this.token || qTok === this.token;
  }

  readJsonBody(req) {
    return new Promise((resolve) => {
      const chunks = [];
      let total = 0;
      req.on('data', (c) => {
        total += c.length;
        if (total <= 1024 * 1024) chunks.push(c);
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });
  }

  pickDefaultConversationId(requestedId) {
    if (requestedId && this.store.getTranscriptPath(requestedId)) {
      return requestedId;
    }
    const envId = (process.env.ANTIGRAVITY_CONVERSATION_ID || '').trim();
    if (envId && this.store.getTranscriptPath(envId)) {
      return envId;
    }
    const ids = this.store.listConversationIds();
    let bestId = '';
    let bestMtime = 0;
    for (const id of ids) {
      const p = this.store.getTranscriptPath(id);
      if (!p) continue;
      try {
        const st = fs.statSync(p);
        if (st.mtimeMs > bestMtime) {
          bestMtime = st.mtimeMs;
          bestId = id;
        }
      } catch {}
    }
    return bestId;
  }

  async handleRequest(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sidecar-Token');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const urlObj = new URL(req.url || '/', `http://${BIND_HOST}:${this.port || DEFAULT_PORT}`);
    const pathname = urlObj.pathname;

    // Static assets & HTML entry
    if (req.method === 'GET' && (pathname === '/' || pathname === '/ui.html')) {
      const html = fs.readFileSync(this.uiHtmlPath, 'utf8');
      const reqTok = urlObj.searchParams.get('token') || this.token;
      const reqConv = urlObj.searchParams.get('conversationId') || process.env.ANTIGRAVITY_CONVERSATION_ID || '';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(rewriteHtml(html, reqTok, reqConv));
      return;
    }

    if (req.method === 'GET' && pathname === '/preload.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(FALLBACK_PRELOAD_JS);
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/public/')) {
      const rel = path.basename(pathname);
      const target = path.join(this.publicDir, rel);
      if (isFile(target)) {
        const ext = path.extname(rel).toLowerCase();
        const mime = ext === '.css'
          ? 'text/css; charset=utf-8'
          : (ext === '.js' ? 'application/javascript; charset=utf-8' : 'application/octet-stream');
        res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
        res.end(fs.readFileSync(target));
        return;
      }
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    if (req.method === 'GET' && pathname === '/assets/logo.svg') {
      const candidates = [
        path.join(this.baseDir, '..', '..', 'assets', 'logo.svg'),
        path.join(this.publicDir, 'logo.svg'),
      ];
      for (const c of candidates) {
        if (isFile(c)) {
          res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
          res.end(fs.readFileSync(c));
          return;
        }
      }
      res.writeHead(404);
      res.end();
      return;
    }

    if (!this.validateToken(req, urlObj)) {
      sendJson(res, 401, { error: 'unauthorized' });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/health') {
      const ids = this.store.listConversationIds();
      sendJson(res, 200, {
        ok: true,
        plugin: PLUGIN_ID,
        version: '1.0.0',
        appDataDir: this.appDataDir,
        conversationsCount: ids.length,
        activeConversationId: this.pickDefaultConversationId(urlObj.searchParams.get('conversationId') || ''),
        port: this.port,
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/overview') {
      const q = {
        range: urlObj.searchParams.get('range') || this.settings.defaultRange || '30d',
        day: urlObj.searchParams.get('day') || '',
        workspace: urlObj.searchParams.get('workspace') || '',
        skill: urlObj.searchParams.get('skill') || '',
        tool: urlObj.searchParams.get('tool') || '',
        cmd: urlObj.searchParams.get('cmd') || '',
        search: urlObj.searchParams.get('search') || '',
        sort: urlObj.searchParams.get('sort') || 'recent',
      };
      sendJson(res, 200, buildOverview(this.store, q));
      return;
    }

    if (req.method === 'GET' && pathname === '/api/session') {
      const convId = this.pickDefaultConversationId(urlObj.searchParams.get('id') || '');
      if (!convId) {
        sendJson(res, 200, { ok: true, empty: true, id: '', message: 'No conversations found yet.' });
        return;
      }
      const full = urlObj.searchParams.get('full') !== '0';
      const serverMeta = await this.fetchLsGeneratorMeta(convId).catch(() => null);
      const data = analyzeSession(convId, this.store, { preferFull: full, serverMeta });
      sendJson(res, 200, data);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/fleet') {
      const convId = this.pickDefaultConversationId(urlObj.searchParams.get('id') || '');
      if (!convId) {
        sendJson(res, 200, { ok: true, empty: true, agents: [], edges: [], tasks: [], comms: [], swimlanes: [], summary: { familySize: 0, runningCount: 0, tasksCount: 0, messagesCount: 0, familyBilledTokens: 0, familyCostUsd: 0 } });
        return;
      }
      const data = buildFleetForConversation(convId, this.store);
      sendJson(res, 200, data);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/settings') {
      sendJson(res, 200, { ok: true, settings: this.settings });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/settings') {
      const body = await this.readJsonBody(req);
      const updated = this.saveSettings(body);
      sendJson(res, 200, { ok: true, settings: updated });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/file') {
      const filePath = urlObj.searchParams.get('path') || '';
      if (!filePath || !isFile(filePath)) {
        sendJson(res, 404, { ok: false, error: 'File not found' });
        return;
      }
      try {
        const st = fs.statSync(filePath);
        const maxBytes = 256 * 1024;
        const buf = Buffer.alloc(Math.min(st.size, maxBytes));
        const fd = fs.openSync(filePath, 'r');
        try {
          fs.readSync(fd, buf, 0, buf.length, 0);
        } finally {
          fs.closeSync(fd);
        }
        sendJson(res, 200, {
          ok: true,
          path: filePath,
          size: st.size,
          truncated: st.size > maxBytes,
          content: buf.toString('utf8'),
        });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
      }
      return;
    }

    sendJson(res, 404, { error: 'Not Found' });
  }

  start() {
    if (this.server) return Promise.resolve(this.server);
    return new Promise((resolve, reject) => {
      const srv = http.createServer((req, res) => {
        this.handleRequest(req, res).catch((err) => {
          if (!res.headersSent) {
            sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
          }
        });
      });
      srv.on('error', reject);
      srv.listen(this.port, BIND_HOST, () => {
        this.server = srv;
        const addr = srv.address();
        if (addr && typeof addr === 'object') this.port = addr.port;
        try {
          writeJsonAtomic(this.serverInfoPath, {
            host: BIND_HOST,
            port: this.port,
            token: this.token || '',
            pid: process.pid,
            startedAt: new Date().toISOString(),
          });
        } catch {}
        resolve(srv);
      });
    });
  }

  async stop() {
    try {
      if (isFile(this.serverInfoPath)) {
        const info = JSON.parse(fs.readFileSync(this.serverInfoPath, 'utf8'));
        if (info && info.pid === process.pid) fs.rmSync(this.serverInfoPath, { force: true });
      }
    } catch {}
    if (!this.server) return;
    const srv = this.server;
    this.server = null;
    srv.closeAllConnections?.();
    await new Promise((resolve) => srv.close(() => resolve()));
  }
}

if (require.main === module) {
  const srv = new AgyContextServer();
  srv.start()
    .then(() => {
      console.log(`[agy-context] Sidecar listening on http://${BIND_HOST}:${srv.port}/ui.html`);
    })
    .catch((err) => {
      console.error('[agy-context] Failed to start:', err);
      process.exit(1);
    });

  const shutdown = () => srv.stop().finally(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

module.exports = {
  AgyContextServer,
  DEFAULT_SETTINGS,
};
