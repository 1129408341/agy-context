'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { fileURLToPath } = require('node:url');

const APP_CANDIDATES = ['antigravity', 'antigravity-ide', 'antigravity-cli'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRUNCATED_BYTES_RE = /<truncated\s+(\d+)\s+bytes>/gi;
const SKILL_PATH_RE = /(?:^|[\\/])skills[\\/]([^\\/]+)[\\/](.+)$/i;
const CREATED_COMPLETED_RE = /Created At:\s*([^\n]+)\nCompleted At:\s*([^\n]+)/i;
const EXIT_CODE_RE = /Command exited with code\s+(-?\d+)/i;
const BG_TASK_RE = /Tool is running as a background task with task id:\s*([^\s\n]+)/i;
const SENDER_RE = /\bsender=([0-9a-f-]{8,}|[^\s\]]+)/i;
const CONV_ID_RE = /\bconversation(?:Id|_id)?["'\s:=]+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i;

const USD_PER_CNY = 0.15;

// Per-1M token pricing in USD: { miss: uncached input, hit: cache read, out: output, ctx: context window, maxOut: reserved output }
const MODEL_CATALOG = [
  { match: /gemini[-_ ]?4/i, label: 'Gemini 4', ctx: 512000, maxOut: 65536, miss: 2.5, hit: 0.25, out: 15.0 },
  { match: /gemini[-_ ]?3[-_ .]?1[-_ ]?pro|gemini[-_ ]?3[-_ ]?pro/i, label: 'Gemini 3 Pro', ctx: 1000000, maxOut: 65536, miss: 2.0, hit: 0.2, out: 12.0 },
  { match: /gemini[-_ ]?3[-_ ]?flash/i, label: 'Gemini 3 Flash', ctx: 1000000, maxOut: 65536, miss: 0.5, hit: 0.05, out: 3.0 },
  { match: /gemini[-_ ]?2\.5[-_ ]?pro/i, label: 'Gemini 2.5 Pro', ctx: 1000000, maxOut: 65536, miss: 1.25, hit: 0.31, out: 10.0 },
  { match: /gemini[-_ ]?2\.5[-_ ]?flash/i, label: 'Gemini 2.5 Flash', ctx: 1000000, maxOut: 65536, miss: 0.3, hit: 0.075, out: 2.5 },
  { match: /gemini/i, label: 'Gemini', ctx: 512000, maxOut: 65536, miss: 1.25, hit: 0.31, out: 10.0 },
  { match: /claude[-_ ]?(?:opus|4[-_ .]?[56]?[-_ ]?opus)/i, label: 'Claude Opus', ctx: 200000, maxOut: 32000, miss: 15.0, hit: 1.5, out: 75.0 },
  { match: /claude[-_ ]?(?:sonnet|4[-_ .]?[56]?[-_ ]?sonnet|3\.7|3\.5)/i, label: 'Claude Sonnet', ctx: 200000, maxOut: 64000, miss: 3.0, hit: 0.3, out: 15.0 },
  { match: /claude[-_ ]?haiku/i, label: 'Claude Haiku', ctx: 200000, maxOut: 16000, miss: 0.8, hit: 0.08, out: 4.0 },
  { match: /claude/i, label: 'Claude', ctx: 200000, maxOut: 32000, miss: 3.0, hit: 0.3, out: 15.0 },
  { match: /gpt[-_ ]?5/i, label: 'GPT-5', ctx: 400000, maxOut: 64000, miss: 1.25, hit: 0.125, out: 10.0 },
  { match: /gpt[-_ ]?4\.1/i, label: 'GPT-4.1', ctx: 1000000, maxOut: 32768, miss: 2.0, hit: 0.5, out: 8.0 },
  { match: /o3|o4/i, label: 'OpenAI o-series', ctx: 200000, maxOut: 100000, miss: 2.0, hit: 0.5, out: 8.0 },
  { match: /deepseek[-_ ]?r1|deepseek[-_ ]?reasoner/i, label: 'DeepSeek Reasoner', ctx: 128000, maxOut: 32768, miss: 0.55, hit: 0.14, out: 2.19 },
  { match: /deepseek/i, label: 'DeepSeek', ctx: 128000, maxOut: 8192, miss: 0.27, hit: 0.07, out: 1.1 },
];

function lookupModelMeta(modelName) {
  const raw = String(modelName || '').trim();
  for (const entry of MODEL_CATALOG) {
    if (entry.match.test(raw)) {
      return { ...entry, model: raw || entry.label };
    }
  }
  return {
    model: raw || 'unknown',
    label: raw || 'Unknown Model',
    ctx: 200000,
    maxOut: 32768,
    miss: 2.0,
    hit: 0.2,
    out: 10.0,
  };
}

function calcCostUsd(modelName, uncachedInput, cacheRead, outputTokens) {
  const meta = lookupModelMeta(modelName);
  const miss = Math.max(0, Number(uncachedInput) || 0);
  const hit = Math.max(0, Number(cacheRead) || 0);
  const out = Math.max(0, Number(outputTokens) || 0);
  return (miss * meta.miss + hit * meta.hit + out * meta.out) / 1_000_000;
}

function isDir(p) {
  try {
    return fs.statSync(p, { throwIfNoEntry: false })?.isDirectory() ?? false;
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p, { throwIfNoEntry: false })?.isFile() ?? false;
  } catch {
    return false;
  }
}

function resolveAppDataDir(explicitDir) {
  if (explicitDir && isDir(explicitDir)) return explicitDir;
  const envDir = process.env.ANTIGRAVITY_APP_DATA_DIR?.trim();
  if (envDir && isDir(envDir)) return envDir;
  const execDir = process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR?.trim();
  if (execDir) {
    for (let d = execDir; d !== path.dirname(d); d = path.dirname(d)) {
      if (path.basename(d) === 'sidecar_data') {
        const appData = path.dirname(d);
        if (isDir(path.join(appData, 'brain'))) return appData;
      }
    }
  }
  const geminiRoot = path.join(os.homedir(), '.gemini');
  for (const appName of APP_CANDIDATES) {
    const candidate = path.join(geminiRoot, appName);
    if (isDir(path.join(candidate, 'brain'))) return candidate;
  }
  return path.join(geminiRoot, 'antigravity');
}

function resolveConfigDir() {
  const envDir = process.env.ANTIGRAVITY_CONFIG_DIR?.trim();
  if (envDir) return envDir;
  return path.join(os.homedir(), '.gemini', 'config');
}

function normalizePathStr(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let p = raw.trim().replace(/^["']+|["']+$/g, '').trim();
  if (!p) return '';
  if (p.startsWith('file://')) {
    try {
      p = fileURLToPath(p);
    } catch {
      p = decodeURIComponent(p.replace(/^file:\/\/\/?/, ''));
    }
  }
  p = p.replace(/\\\\/g, '/').replace(/\\/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.replace(/\/+$/, '');
  return p;
}

function cleanArg(val) {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'string') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  let s = val.trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    try {
      const parsed = JSON.parse(s);
      if (typeof parsed === 'string') return parsed;
    } catch {}
  }
  if (s.startsWith('{') || s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s);
      if (typeof parsed === 'string') return parsed;
      return JSON.stringify(parsed, null, 2);
    } catch {}
  }
  return s
    .replace(/^"|"$/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t');
}

function estimateTokens(str) {
  if (!str || typeof str !== 'string') return 0;
  let extraBytes = 0;
  if (str.includes('<truncated ')) {
    TRUNCATED_BYTES_RE.lastIndex = 0;
    let m;
    while ((m = TRUNCATED_BYTES_RE.exec(str)) !== null) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0) extraBytes += n;
    }
  }
  let cjk = 0;
  let other = 0;
  const len = Math.min(str.length, 200000);
  for (let i = 0; i < len; i++) {
    const code = str.charCodeAt(i);
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjk++;
    } else {
      other++;
    }
  }
  let scale = 1;
  if (str.length > len && len > 0) scale = str.length / len;
  const baseTokens = (cjk / 1.45 + other / 3.85) * scale;
  const truncTokens = extraBytes / 3.8;
  return Math.max(0, Math.round(baseTokens + truncTokens));
}

function parseAnnotation(pbtxtPath) {
  if (!isFile(pbtxtPath)) return null;
  try {
    const text = fs.readFileSync(pbtxtPath, 'utf8');
    let title = '';
    const titleMatch = /title:\s*"((?:\\.|[^"\\])*)"/.exec(text);
    if (titleMatch) {
      try {
        title = JSON.parse(`"${titleMatch[1]}"`);
      } catch {
        title = titleMatch[1];
      }
    }
    let lastViewMs = 0;
    const secMatch = /last_user_view_time:\s*\{\s*seconds:\s*(\d+)/.exec(text);
    if (secMatch) lastViewMs = parseInt(secMatch[1], 10) * 1000;
    const presetMatch = /permission_preset:\s*([A-Z0-9_]+)/.exec(text);
    return {
      title,
      lastViewMs,
      permissionPreset: presetMatch ? presetMatch[1] : '',
    };
  } catch {
    return null;
  }
}

function extractUserParts(rawContent) {
  const text = String(rawContent || '');
  let userText = '';
  let injectedText = '';
  const systemMessages = [];

  const reqMatch = /<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/i.exec(text);
  if (reqMatch) {
    userText = reqMatch[1].trim();
    const rest = text.replace(reqMatch[0], '').trim();
    if (rest) injectedText += rest;
  }

  const sysRe = /<SYSTEM_MESSAGE[^>]*>([\s\S]*?)<\/SYSTEM_MESSAGE>/gi;
  let sm;
  while ((sm = sysRe.exec(text)) !== null) {
    const body = sm[1].trim();
    const senderMatch = SENDER_RE.exec(body);
    const tsMatch = /timestamp=([^\s]+)/i.exec(body);
    const contentMatch = /content=([\s\S]+)$/i.exec(body);
    systemMessages.push({
      raw: body,
      sender: senderMatch ? senderMatch[1] : 'system',
      timestamp: tsMatch ? tsMatch[1] : '',
      content: contentMatch ? contentMatch[1].trim() : body,
    });
  }

  if (!reqMatch) {
    if (systemMessages.length > 0 || /^The following is a <SYSTEM_MESSAGE>/i.test(text.trim())) {
      injectedText = text.trim();
    } else if (/^#\s*Resuming from a compaction/i.test(text.trim()) || /<summary>[\s\S]*<\/summary>/i.test(text)) {
      injectedText = text.trim();
    } else {
      userText = text
        .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, (m) => {
          injectedText += (injectedText ? '\n' : '') + m;
          return '';
        })
        .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/gi, (m) => {
          injectedText += (injectedText ? '\n' : '') + m;
          return '';
        })
        .replace(/<EPHEMERAL_MESSAGE>[\s\S]*?<\/EPHEMERAL_MESSAGE>/gi, (m) => {
          injectedText += (injectedText ? '\n' : '') + m;
          return '';
        })
        .trim();
    }
  }

  return { userText, injectedText, systemMessages };
}

function parseToolResultTiming(content) {
  const m = CREATED_COMPLETED_RE.exec(String(content || ''));
  if (!m) return { startMs: 0, endMs: 0, durationMs: 0 };
  const s = Date.parse(m[1].trim());
  const e = Date.parse(m[2].trim());
  if (!Number.isFinite(s) || !Number.isFinite(e)) return { startMs: 0, endMs: 0, durationMs: 0 };
  return { startMs: s, endMs: e, durationMs: Math.max(0, e - s) };
}

function extractCommandProgram(cmdLine) {
  const cleaned = String(cmdLine || '').trim();
  if (!cleaned) return 'shell';
  const firstSegment = cleaned.split(/[;&|\n]/)[0].trim();
  const winExeMatch = /^(?:["']?([A-Za-z]:[\\/][^"'\n]*?\.(?:exe|cmd|bat|ps1))["']?)(?:\s|$)/i.exec(firstSegment);
  if (winExeMatch) {
    const base = winExeMatch[1].split(/[\\/]/).pop() || winExeMatch[1];
    return base.replace(/\.(exe|cmd|bat|ps1)$/i, '');
  }
  const tokens = firstSegment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  let skipAssignmentVal = false;
  for (let tok of tokens) {
    tok = tok.replace(/^["']|["']$/g, '');
    if (!tok) continue;
    if (skipAssignmentVal) { skipAssignmentVal = false; continue; }
    if (tok === '=' || tok === '+=' || tok === '-eq') { skipAssignmentVal = true; continue; }
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tok) || tok.startsWith('$') || /^[@({[\]}]/.test(tok)) continue;
    const base = tok.split(/[\\/]/).pop() || tok;
    const norm = base.replace(/\.(exe|cmd|bat|ps1)$/i, '');
    if (!norm || /^[=<>|&;:()[\]{}]+$/.test(norm)) continue;
    if (norm.toLowerCase() === 'npx' || norm.toLowerCase() === 'pnpm' || norm.toLowerCase() === 'npm') {
      return norm.toLowerCase();
    }
    return norm;
  }
  return 'powershell';
}

function extractFilePathFromArgs(args) {
  if (!args || typeof args !== 'object') return '';
  const raw =
    args.Path ??
    args.AbsolutePath ??
    args.TargetFile ??
    args.DirectoryPath ??
    args.SearchPath ??
    args.SearchDirectory ??
    args.ScriptPath ??
    args.path ??
    '';
  return normalizePathStr(cleanArg(raw));
}

function extractSkillInfo(filePath) {
  if (!filePath) return null;
  const m = SKILL_PATH_RE.exec(filePath);
  if (!m) return null;
  return { name: m[1], file: m[2], path: filePath };
}

function inferWorkspaceFromPaths(paths) {
  const counts = new Map();
  for (const p of paths) {
    if (!p) continue;
    const lower = p.toLowerCase();
    if (lower.includes('/.gemini/') || lower.includes('/node_modules/') || lower.includes('/appdata/')) continue;
    const parts = p.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const candidate = /^[a-z]:$/i.test(parts[0])
        ? `${parts[0]}/${parts[1]}${parts[2] ? '/' + parts[2] : ''}`
        : `/${parts[0]}/${parts[1]}`;
      // Walk up for .git if possible
      let root = candidate;
      let curr = p;
      for (let i = 0; i < 8; i++) {
        const dir = path.dirname(curr);
        if (!dir || dir === curr) break;
        if (isDir(path.join(dir, '.git'))) {
          root = normalizePathStr(dir);
          break;
        }
        curr = dir;
      }
      counts.set(root, (counts.get(root) || 0) + 1);
    }
  }
  let best = '';
  let max = 0;
  for (const [k, v] of counts.entries()) {
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best;
}

function readJsonlFile(filePath) {
  if (!isFile(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed));
    } catch {}
  }
  return rows;
}

function readSwarmState(brainConvDir) {
  const swarmDir = path.join(brainConvDir, '.system_generated', 'swarm');
  if (!isDir(swarmDir)) return null;
  let members = [];
  let board = [];
  const membersPath = path.join(swarmDir, 'members.json');
  const boardPath = path.join(swarmDir, 'board.jsonl');
  if (isFile(membersPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(membersPath, 'utf8'));
      if (Array.isArray(raw)) members = raw;
      else if (raw && typeof raw === 'object') {
        members = Object.entries(raw).map(([name, m]) => ({ name, ...(typeof m === 'object' ? m : {}) }));
      }
    } catch {}
  }
  if (isFile(boardPath)) {
    board = readJsonlFile(boardPath);
  }
  if (members.length === 0 && board.length === 0) return null;
  return { members, board };
}

class TranscriptStore {
  constructor(options = {}) {
    this.appDataDir = resolveAppDataDir(options.appDataDir);
    this.configDir = options.configDir || resolveConfigDir();
    this.brainDir = options.brainDir || path.join(this.appDataDir, 'brain');
    this.annotationsDir = options.annotationsDir || path.join(this.appDataDir, 'annotations');
    this.fileCache = new Map();
  }

  listConversationIds() {
    if (!isDir(this.brainDir)) return [];
    const entries = fs.readdirSync(this.brainDir, { withFileTypes: true });
    const ids = [];
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      if (!UUID_RE.test(ent.name)) continue;
      const tPath = path.join(this.brainDir, ent.name, '.system_generated', 'logs', 'transcript.jsonl');
      const fPath = path.join(this.brainDir, ent.name, '.system_generated', 'logs', 'transcript_full.jsonl');
      if (isFile(tPath) || isFile(fPath)) {
        ids.push(ent.name);
      }
    }
    return ids;
  }

  getTranscriptPath(convId, preferFull = false) {
    const base = path.join(this.brainDir, convId, '.system_generated', 'logs');
    const fullPath = path.join(base, 'transcript_full.jsonl');
    const compactPath = path.join(base, 'transcript.jsonl');
    if (preferFull && isFile(fullPath)) return fullPath;
    if (isFile(compactPath)) return compactPath;
    if (isFile(fullPath)) return fullPath;
    return '';
  }

  readSteps(convId, preferFull = false) {
    const filePath = this.getTranscriptPath(convId, preferFull);
    if (!filePath) return { steps: [], filePath: '', mtimeMs: 0, size: 0 };
    try {
      const st = fs.statSync(filePath);
      const cacheKey = `${filePath}|${st.mtimeMs}|${st.size}`;
      const cached = this.fileCache.get(filePath);
      if (cached && cached.cacheKey === cacheKey) {
        return cached.value;
      }
      const steps = readJsonlFile(filePath);
      const value = { steps, filePath, mtimeMs: st.mtimeMs, size: st.size };
      if (this.fileCache.size > 200) {
        const firstKey = this.fileCache.keys().next().value;
        this.fileCache.delete(firstKey);
      }
      this.fileCache.set(filePath, { cacheKey, value });
      return value;
    } catch {
      return { steps: [], filePath: '', mtimeMs: 0, size: 0 };
    }
  }

  readAnnotation(convId) {
    return parseAnnotation(path.join(this.annotationsDir, `${convId}.pbtxt`));
  }

  readSwarm(convId) {
    return readSwarmState(path.join(this.brainDir, convId));
  }
}

module.exports = {
  UUID_RE,
  CONV_ID_RE,
  EXIT_CODE_RE,
  BG_TASK_RE,
  USD_PER_CNY,
  lookupModelMeta,
  calcCostUsd,
  resolveAppDataDir,
  resolveConfigDir,
  normalizePathStr,
  cleanArg,
  estimateTokens,
  extractUserParts,
  parseToolResultTiming,
  extractCommandProgram,
  extractFilePathFromArgs,
  extractSkillInfo,
  inferWorkspaceFromPaths,
  readSwarmState,
  TranscriptStore,
  isDir,
  isFile,
};
