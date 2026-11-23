#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawn } = require('node:child_process');
const { readAsarLayout, patchAsarArchive, validateAsarCandidate } = require('./src/asar_patcher.cjs');

const REPO_ROOT = __dirname;
const PLUGIN_ID = 'agy-context';
const SIDECAR_ID = 'context-insight';

const HEADER_BEGIN = '// ===== AGY_CONTEXT_HEADER_BEGIN =====';
const HEADER_END = '// ===== AGY_CONTEXT_HEADER_END =====';

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

function resolveAntigravityResourcesDir(explicitDir) {
  if (explicitDir && fs.existsSync(path.join(explicitDir, 'app.asar'))) return explicitDir;
  const candidates = [];
  if (process.platform === 'win32') {
    const localApp = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    candidates.push(
      path.join(localApp, 'Programs', 'antigravity', 'resources'),
      path.join(localApp, 'Programs', 'Antigravity', 'resources')
    );
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Antigravity.app/Contents/Resources');
  } else {
    candidates.push(
      '/opt/Antigravity/resources',
      '/usr/share/antigravity/resources',
      path.join(os.homedir(), '.local', 'share', 'antigravity', 'resources')
    );
  }
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'app.asar'))) return dir;
  }
  return '';
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

function stripHeaderMarkers(text) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\n?${esc(HEADER_BEGIN)}[\\s\\S]*?${esc(HEADER_END)}\\n?`, 'g');
  return String(text || '').replace(re, '').trimEnd();
}

function isAntigravityRunning() {
  if (process.platform !== 'win32') return false;
  try {
    const out = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-Command', "(Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue).Count"],
      { encoding: 'utf8', timeout: 4000 }
    ).trim();
    return parseInt(out, 10) > 0;
  } catch {
    return false;
  }
}

function killAntigravityWindows() {
  if (process.platform !== 'win32') return;
  try {
    execFileSync('taskkill.exe', ['/f', '/im', 'Antigravity.exe', '/t'], { stdio: 'ignore', timeout: 6000 });
  } catch {}
}

function relaunchAntigravityWindows(resourcesDir) {
  if (process.platform !== 'win32' || !resourcesDir) return;
  const exe = path.join(path.dirname(resourcesDir), 'Antigravity.exe');
  if (!fs.existsSync(exe)) return;
  try {
    const child = spawn(exe, [], { detached: true, stdio: 'ignore', windowsHide: false });
    child.unref();
  } catch {}
}

function buildHeaderAsar(resourcesDir, stripOnly = false) {
  const asarPath = path.join(resourcesDir, 'app.asar');
  const stagedPath = path.join(resourcesDir, 'app.asar.agyctx-staged');
  const bakPath = path.join(resourcesDir, 'app.asar.agyctx.bak');
  const zhBakPath = path.join(resourcesDir, 'app.asar.bak');
  const nekoBakPath = path.join(resourcesDir, 'app.asar.neko.bak');

  if (!fs.existsSync(asarPath)) {
    return { ok: false, error: `app.asar not found in ${resourcesDir}` };
  }

  const mainPatch = fs.readFileSync(path.join(REPO_ROOT, 'hud', 'header_main.cjs'), 'utf8').trim();
  const preloadPatch = fs.readFileSync(path.join(REPO_ROOT, 'hud', 'header_preload.cjs'), 'utf8').trim();

  const buildDir = fs.mkdtempSync(path.join(resourcesDir, '.agyctx-build-'));
  try {
    const sourceCopy = path.join(buildDir, 'source.asar');
    fs.copyFileSync(asarPath, sourceCopy);
    if (!fs.existsSync(bakPath) && !fs.existsSync(zhBakPath) && !fs.existsSync(nekoBakPath)) {
      fs.copyFileSync(asarPath, bakPath);
    }
    const candidatePath = path.join(buildDir, 'candidate.asar');

    const modifierMap = new Map([
      [
        'dist/main.js',
        (orig) => {
          const cleaned = stripHeaderMarkers(orig);
          return stripOnly ? cleaned + '\n' : cleaned + '\n\n' + mainPatch + '\n';
        },
      ],
      [
        'dist/preload.js',
        (orig) => {
          const cleaned = stripHeaderMarkers(orig);
          return stripOnly ? cleaned + '\n' : cleaned + '\n\n' + preloadPatch + '\n';
        },
      ],
    ]);

    const modified = patchAsarArchive(sourceCopy, candidatePath, modifierMap);
    if (!modified.has('dist/main.js') || !modified.has('dist/preload.js')) {
      throw new Error('app.asar is missing dist/main.js or dist/preload.js');
    }

    const requiredMarkers = stripOnly
      ? []
      : [
          { file: 'dist/main.js', marker: HEADER_BEGIN },
          { file: 'dist/preload.js', marker: HEADER_BEGIN },
        ];
    validateAsarCandidate(sourceCopy, candidatePath, ['dist/main.js', 'dist/preload.js'], requiredMarkers);

    for (const [relPath, buf] of modified.entries()) {
      const checkPath = path.join(buildDir, path.basename(relPath));
      fs.writeFileSync(checkPath, buf);
      execFileSync(process.execPath, ['--check', checkPath], { stdio: 'pipe' });
    }

    fs.copyFileSync(candidatePath, stagedPath);
    return { ok: true, asarPath, stagedPath };
  } finally {
    try {
      fs.rmSync(buildDir, { recursive: true, force: true });
    } catch {}
  }
}

function trySwapStagedAsar(asarPath, stagedPath, allowKill) {
  if (!fs.existsSync(stagedPath)) return { applied: false, reason: 'No staged asar' };
  if (allowKill && isAntigravityRunning()) {
    killAntigravityWindows();
  }
  const tmpPrev = `${asarPath}.prev.${Date.now()}`;
  try {
    const fd = fs.openSync(asarPath, 'r+');
    fs.closeSync(fd);
    fs.copyFileSync(asarPath, tmpPrev);
    fs.copyFileSync(stagedPath, asarPath);
    fs.rmSync(stagedPath, { force: true });
    fs.rmSync(tmpPrev, { force: true });
    return { applied: true };
  } catch (err) {
    try {
      if (fs.existsSync(tmpPrev)) {
        fs.copyFileSync(tmpPrev, asarPath);
        fs.rmSync(tmpPrev, { force: true });
      }
    } catch {}
    return { applied: false, reason: err.code || err.message, locked: true };
  }
}

function checkAsarStatus(resourcesDir) {
  const out = {
    resourcesDir: resourcesDir || '',
    asarExists: false,
    headerMainPatched: false,
    headerPreloadPatched: false,
    zhLocalizationIntact: false,
    nekoHudIntact: false,
    stagedReady: false,
  };
  if (!resourcesDir) return out;
  const asarPath = path.join(resourcesDir, 'app.asar');
  const stagedPath = path.join(resourcesDir, 'app.asar.agyctx-staged');
  out.stagedReady = fs.existsSync(stagedPath);
  if (!fs.existsSync(asarPath)) return out;
  out.asarExists = true;
  try {
    const layout = readAsarLayout(asarPath);
    const mainFile = layout.files.get('dist/main.js');
    const preloadFile = layout.files.get('dist/preload.js');
    if (mainFile && mainFile.body) {
      out.headerMainPatched = mainFile.body.includes(Buffer.from(HEADER_BEGIN, 'utf8'));
    }
    if (preloadFile && preloadFile.body) {
      out.headerPreloadPatched = preloadFile.body.includes(Buffer.from(HEADER_BEGIN, 'utf8'));
      out.zhLocalizationIntact = preloadFile.body.includes(Buffer.from('AG_ZH_BEGIN:engine', 'utf8'));
      out.nekoHudIntact = preloadFile.body.includes(Buffer.from('GEMINI_NEKO_HUD_BEGIN', 'utf8'));
    }
  } catch {}
  return out;
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

function installPlugin() {
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

function check(resourcesDir) {
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
  const asarStatus = checkAsarStatus(resourcesDir);

  const report = {
    ok: missing.length === 0,
    pluginDir: PLUGIN_DEST,
    installed: missing.length === 0,
    missing,
    appDataDir: store.appDataDir,
    conversationsDetected: convIds.length,
    asarStatus,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

function patchHeader(resourcesDir, args, stripOnly = false) {
  if (!resourcesDir) {
    console.error('[agy-context] 未找到 Antigravity resources 目录，请使用 --install-dir 指定路径。');
    process.exitCode = 1;
    return;
  }
  const built = buildHeaderAsar(resourcesDir, stripOnly);
  if (!built.ok) {
    console.error('[agy-context] ASAR 构建失败:', built.error);
    process.exitCode = 1;
    return;
  }
  const swap = trySwapStagedAsar(built.asarPath, built.stagedPath, args.includes('--kill'));
  if (swap.applied) {
    console.log(
      stripOnly
        ? '[agy-context] 已安全移除会话顶栏标签补丁（汉化与猫娘补丁完整保留）！'
        : '[agy-context] 会话顶栏标签补丁已通过校验并写入 app.asar（汉化与猫娘补丁完整保留）！'
    );
    if (args.includes('--relaunch')) relaunchAntigravityWindows(resourcesDir);
  } else {
    console.log('[agy-context] Antigravity 正在运行，新版 ASAR 已校验并暂存：', built.stagedPath);
    console.log('[agy-context] 请关闭 Antigravity 后运行 `双击安装会话顶栏标签补丁.bat`（或 `node setup.cjs --patch-header --kill --relaunch`）。');
  }
}

function uninstall(resourcesDir, args) {
  restartRunningSidecar();
  if (fs.existsSync(PLUGIN_DEST)) {
    fs.rmSync(PLUGIN_DEST, { recursive: true, force: true });
    console.log(`[agy-context] 已卸载插件目录：${PLUGIN_DEST}`);
  } else {
    console.log(`[agy-context] 未检测到已安装的插件目录：${PLUGIN_DEST}`);
  }
  if (resourcesDir) {
    const st = checkAsarStatus(resourcesDir);
    if (st.headerMainPatched || st.headerPreloadPatched) {
      patchHeader(resourcesDir, args, true);
    }
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
const dirIdx = args.indexOf('--install-dir');
const explicitDir = dirIdx !== -1 ? args[dirIdx + 1] : '';
const resourcesDir = resolveAntigravityResourcesDir(explicitDir);

if (args.includes('--check')) {
  check(resourcesDir);
} else if (args.includes('--uninstall')) {
  uninstall(resourcesDir, args);
} else if (args.includes('--unpatch-header')) {
  patchHeader(resourcesDir, args, true);
} else if (args.includes('--patch-header')) {
  installPlugin();
  patchHeader(resourcesDir, args, false);
} else if (args.includes('--serve')) {
  serve(args).catch((e) => {
    console.error('[agy-context] 启动失败:', e);
    process.exit(1);
  });
} else {
  installPlugin();
}
