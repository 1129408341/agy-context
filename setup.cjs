#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const REPO_ROOT = __dirname;
const PLUGIN_ID = 'agy-context';
const SIDECAR_ID = 'context-insight';

const GEMINI_CONFIG_DIR = process.env.ANTIGRAVITY_CONFIG_DIR
  ? path.resolve(process.env.ANTIGRAVITY_CONFIG_DIR)
  : path.join(os.homedir(), '.gemini', 'config');

const PLUGIN_DEST = path.join(GEMINI_CONFIG_DIR, 'plugins', PLUGIN_ID);

function resolveNodeBin() {
  const p = process.execPath;
  if (p && /^node(\.exe)?$/i.test(path.basename(p)) && fs.existsSync(p)) {
    return p.replace(/\\/g, '/');
  }
  return 'node';
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

function restartRunningSidecar() {
  const { resolveAppDataDir } = require('./sidecars/context-insight/engine/parser.cjs');
  const appDataDir = resolveAppDataDir();
  const infoPath = path.join(appDataDir, 'sidecar_data', PLUGIN_ID, SIDECAR_ID, 'data', 'server_info.json');
  try {
    if (!fs.existsSync(infoPath)) return;
    const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    const pid = Number(info && info.pid);
    if (pid > 0 && pid !== process.pid) {
      process.kill(pid, 'SIGTERM');
      console.log(`[agy-context] 已平滑重启旧 Sidecar 进程 (PID ${pid})，新版本即时生效。`);
    }
  } catch {}
}

function install() {
  const nodeBin = resolveNodeBin();
  fs.mkdirSync(PLUGIN_DEST, { recursive: true });

  for (const f of ['plugin.json', 'README.md', 'LICENSE']) {
    const src = path.join(REPO_ROOT, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(PLUGIN_DEST, f));
  }

  copyDirRecursive(path.join(REPO_ROOT, 'assets'), path.join(PLUGIN_DEST, 'assets'));
  copyDirRecursive(path.join(REPO_ROOT, 'skills'), path.join(PLUGIN_DEST, 'skills'));
  copyDirRecursive(path.join(REPO_ROOT, 'sidecars'), path.join(PLUGIN_DEST, 'sidecars'));

  const sidecarJsonPath = path.join(PLUGIN_DEST, 'sidecars', SIDECAR_ID, 'sidecar.json');
  const manifest = JSON.parse(fs.readFileSync(sidecarJsonPath, 'utf8'));
  manifest.command = nodeBin;
  fs.writeFileSync(sidecarJsonPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  restartRunningSidecar();

  console.log(`[agy-context] 安装成功！插件目录：${PLUGIN_DEST}`);
  console.log(`[agy-context] Node 可执行文件：${nodeBin}`);
  console.log(`[agy-context] 侧栏入口胶囊：[上下文洞察](sidecar://${PLUGIN_ID}/${SIDECAR_ID}/ui.html)`);
  console.log(`[agy-context] 插件管理页：[AGY Context](customization://${PLUGIN_ID})`);
}

function check() {
  const required = [
    path.join(PLUGIN_DEST, 'plugin.json'),
    path.join(PLUGIN_DEST, 'assets', 'logo.svg'),
    path.join(PLUGIN_DEST, 'skills', PLUGIN_ID, 'SKILL.md'),
    path.join(PLUGIN_DEST, 'sidecars', SIDECAR_ID, 'sidecar.json'),
    path.join(PLUGIN_DEST, 'sidecars', SIDECAR_ID, 'server.cjs'),
    path.join(PLUGIN_DEST, 'sidecars', SIDECAR_ID, 'ui.html'),
    path.join(PLUGIN_DEST, 'sidecars', SIDECAR_ID, 'public', 'app.js'),
    path.join(PLUGIN_DEST, 'sidecars', SIDECAR_ID, 'public', 'styles.css'),
    path.join(PLUGIN_DEST, 'sidecars', SIDECAR_ID, 'engine', 'parser.cjs'),
    path.join(PLUGIN_DEST, 'sidecars', SIDECAR_ID, 'engine', 'analyzer.cjs'),
    path.join(PLUGIN_DEST, 'sidecars', SIDECAR_ID, 'engine', 'fleet.cjs'),
    path.join(PLUGIN_DEST, 'sidecars', SIDECAR_ID, 'engine', 'overview.cjs'),
  ];
  const missing = required.filter((p) => !fs.existsSync(p));
  const { TranscriptStore } = require('./sidecars/context-insight/engine/parser.cjs');
  const store = new TranscriptStore();
  const convIds = store.listConversationIds();

  const report = {
    ok: missing.length === 0,
    pluginDir: PLUGIN_DEST,
    installed: missing.length === 0,
    missing,
    appDataDir: store.appDataDir,
    conversationsDetected: convIds.length,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

function uninstall() {
  if (fs.existsSync(PLUGIN_DEST)) {
    fs.rmSync(PLUGIN_DEST, { recursive: true, force: true });
    console.log(`[agy-context] 已卸载并清理：${PLUGIN_DEST}`);
  } else {
    console.log(`[agy-context] 未检测到已安装的插件目录：${PLUGIN_DEST}`);
  }
}

async function serve(args) {
  const portIdx = args.indexOf('--port');
  const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 8095;
  const { AgyContextServer } = require('./sidecars/context-insight/server.cjs');
  const srv = new AgyContextServer({ port: Number.isFinite(port) ? port : 8095, token: '' });
  await srv.start();
  console.log(`[agy-context] 独立浏览器预览已启动：http://127.0.0.1:${srv.port}/ui.html`);
  console.log('[agy-context] 按 Ctrl+C 停止服务。');
  const shutdown = () => srv.stop().finally(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

const args = process.argv.slice(2);
if (args.includes('--check')) {
  check();
} else if (args.includes('--uninstall')) {
  uninstall();
} else if (args.includes('--serve')) {
  serve(args).catch((e) => {
    console.error('[agy-context] 启动失败:', e);
    process.exit(1);
  });
} else {
  install();
}
