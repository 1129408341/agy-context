'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const { TranscriptStore, estimateTokens, cleanArg, extractCommandProgram } = require('../sidecars/context-insight/engine/parser.cjs');
const { analyzeSession } = require('../sidecars/context-insight/engine/analyzer.cjs');
const { buildFleetForConversation } = require('../sidecars/context-insight/engine/fleet.cjs');
const { buildOverview } = require('../sidecars/context-insight/engine/overview.cjs');
const { AgyContextServer } = require('../sidecars/context-insight/server.cjs');

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
}

function createFixtureAppData() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-context-test-'));
  const rootId = '11111111-1111-4111-8111-111111111111';
  const childId = '22222222-2222-4222-8222-222222222222';
  const now = Date.now();
  const iso = (offsetSec) => new Date(now - offsetSec * 1000).toISOString();

  // Annotation for root
  fs.mkdirSync(path.join(tmpRoot, 'annotations'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpRoot, 'annotations', `${rootId}.pbtxt`),
    `title:"Multi-Agent Context Demo" last_user_view_time:{seconds:${Math.floor(now / 1000)}}`,
    'utf8'
  );

  // Root transcript with skill read, edit, command, model switch, compaction drop, invoke_subagent, send_message, incoming report
  writeJsonl(path.join(tmpRoot, 'brain', rootId, '.system_generated', 'logs', 'transcript.jsonl'), [
    {
      step_index: 0,
      source: 'USER_EXPLICIT',
      type: 'USER_INPUT',
      status: 'DONE',
      created_at: iso(120),
      content: '<USER_REQUEST>\n帮我分析项目并派生研究员子 Agent\n</USER_REQUEST>\n<ADDITIONAL_METADATA>\nOS: windows\n</ADDITIONAL_METADATA>',
    },
    {
      step_index: 1,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: iso(115),
      model: 'gemini-4-neon-high',
      input_tokens: 12000,
      cache_read_tokens: 0,
      output_tokens: 450,
      thinking: 'Need to read plugin SKILL.md and spawn a research subagent.',
      content: '好的，我先读取技能文档并启动研究子 Agent。',
      tool_calls: [
        { name: 'read_file', args: { Path: '"C:\\\\Users\\\\demo\\\\.gemini\\\\antigravity\\\\builtin\\\\skills\\\\plugin\\\\SKILL.md"' } },
        { name: 'invoke_subagent', args: { TypeName: '"research"', Role: '"Codebase Researcher"', Prompt: '"Inspect architecture and return findings"' } },
      ],
    },
    {
      step_index: 2,
      source: 'MODEL',
      type: 'GENERIC',
      status: 'DONE',
      created_at: iso(110),
      content: `Created At: ${iso(114)}\nCompleted At: ${iso(112)}\n# Plugin Skill\nDetailed instructions for plugins...`,
    },
    {
      step_index: 3,
      source: 'MODEL',
      type: 'GENERIC',
      status: 'DONE',
      created_at: iso(109),
      content: `Created At: ${iso(113)}\nCompleted At: ${iso(111)}\nSubagent launched with conversationId: ${childId}`,
    },
    {
      step_index: 4,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: iso(100),
      model: 'claude-sonnet-4-5',
      input_tokens: 4500,
      cache_read_tokens: 12000,
      output_tokens: 320,
      thinking: 'Editing config and running tests.',
      tool_calls: [
        { name: 'edit_file', args: { Path: '"D:\\\\work\\\\demo\\\\index.js"', Target: '"const a = 1;"', Replacement: '"const a = 1;\nconst b = 2;\nconst c = 3;"' } },
        { name: 'run_command', args: { CommandLine: '"git status && npm test"', toolSummary: '"Run git and tests"' } },
        { name: 'send_message', args: { Recipient: `"${childId}"`, Message: '"Please double-check edge cases"' } },
      ],
    },
    {
      step_index: 5,
      source: 'MODEL',
      type: 'GENERIC',
      status: 'DONE',
      created_at: iso(95),
      content: `Created At: ${iso(99)}\nCompleted At: ${iso(98)}\nEdited file successfully.`,
    },
    {
      step_index: 6,
      source: 'MODEL',
      type: 'GENERIC',
      status: 'ERROR',
      error: 'Test failed',
      created_at: iso(94),
      content: `Created At: ${iso(98)}\nCompleted At: ${iso(94)}\nCommand exited with code 1.\nAssertionError`,
    },
    {
      step_index: 7,
      source: 'MODEL',
      type: 'GENERIC',
      status: 'DONE',
      created_at: iso(93),
      content: 'Message delivered.',
    },
    {
      step_index: 8,
      source: 'SYSTEM',
      type: 'USER_INPUT',
      status: 'DONE',
      created_at: iso(80),
      content: `The following is a <SYSTEM_MESSAGE>\n<SYSTEM_MESSAGE>\n[Message] timestamp=${iso(80)} sender=${childId} priority=HIGH content=Architecture review complete: all modules look clean.\n</SYSTEM_MESSAGE>`,
    },
    {
      step_index: 9,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: iso(70),
      model: 'claude-sonnet-4-5',
      input_tokens: 2000,
      cache_read_tokens: 4000, // dropped from 16500 -> 6000 => compaction event!
      output_tokens: 210,
      content: '综合子 Agent 的汇报，全部检查已完成！',
    },
  ]);

  // Child subagent transcript
  writeJsonl(path.join(tmpRoot, 'brain', childId, '.system_generated', 'logs', 'transcript.jsonl'), [
    {
      step_index: 0,
      source: 'USER_EXPLICIT',
      type: 'USER_INPUT',
      status: 'DONE',
      created_at: iso(108),
      content: '<USER_REQUEST>\nInspect architecture and return findings\n</USER_REQUEST>',
    },
    {
      step_index: 1,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: iso(90),
      model: 'gemini-3-flash',
      input_tokens: 5000,
      cache_read_tokens: 0,
      output_tokens: 300,
      content: 'Architecture review complete: all modules look clean.',
    },
  ]);

  // Native Swarm state on root
  const swarmDir = path.join(tmpRoot, 'brain', rootId, '.system_generated', 'swarm');
  fs.mkdirSync(swarmDir, { recursive: true });
  fs.writeFileSync(
    path.join(swarmDir, 'members.json'),
    JSON.stringify([{ name: 'verifier', role: 'worker', model: 'gemini-4-neon-high', state: 'waiting', created_at: iso(60) }]),
    'utf8'
  );
  writeJsonl(path.join(swarmDir, 'board.jsonl'), [
    { author: 'coordinator', mentions: ['verifier'], text: '@verifier please check build artifacts', timestamp: iso(55) },
    { author: 'verifier', mentions: ['coordinator'], text: '@coordinator build looks green', timestamp: iso(50) },
  ]);

  return { tmpRoot, rootId, childId };
}

function httpRequest(port, reqPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method: opts.method || 'GET',
        headers: opts.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode, text, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

test('parser utilities handle quoted args, CJK tokens, and programs', () => {
  assert.equal(cleanArg('"C:\\\\Users\\\\a\\\\test.md"'), 'C:\\Users\\a\\test.md');
  assert.ok(estimateTokens('你好世界 hello world') > 5);
  assert.equal(extractCommandProgram('git status && npm test'), 'git');
  assert.equal(extractCommandProgram('C:\\Program Files\\nodejs\\node.exe setup.cjs'), 'node');
});

test('analyzer accurately extracts 7-category breakdown, skills, compactions, files, and commands', () => {
  const { tmpRoot, rootId } = createFixtureAppData();
  try {
    const store = new TranscriptStore({ appDataDir: tmpRoot });
    const res = analyzeSession(rootId, store);

    assert.equal(res.ok, true);
    assert.equal(res.title, 'Multi-Agent Context Demo');
    assert.equal(res.stats.steps, 3);
    assert.equal(res.stats.skillsLoaded, 1);
    assert.equal(res.skillTally.plugin, 1);
    assert.equal(res.stats.compactions, 1);
    assert.equal(res.stats.subagentsSpawned, 1);
    assert.equal(res.commands.length, 1);
    assert.equal(res.commands[0].program, 'git');
    assert.equal(res.commands[0].status, 'error');
    assert.equal(res.commands[0].exitCode, 1);

    const edited = res.fileActivity.find((f) => f.path.endsWith('index.js'));
    assert.ok(edited);
    assert.equal(edited.writes, 1);
    assert.equal(edited.addedLines, 3);
    assert.equal(edited.removedLines, 1);

    assert.ok(res.events.some((e) => e.kind === 'skill'));
    assert.ok(res.events.some((e) => e.kind === 'model_switch'));
    assert.ok(res.events.some((e) => e.kind === 'compaction'));
    assert.ok(res.events.some((e) => e.kind === 'subagent'));
    assert.ok(res.events.some((e) => e.kind === 'agent_msg'));
    assert.ok(res.billed.cacheHitRate > 0);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('fleet engine builds full agent family, tasks, swarm members, and comms from either root or child', () => {
  const { tmpRoot, rootId, childId } = createFixtureAppData();
  try {
    const store = new TranscriptStore({ appDataDir: tmpRoot });
    const fleetFromChild = buildFleetForConversation(childId, store);

    assert.equal(fleetFromChild.ok, true);
    assert.equal(fleetFromChild.rootId, rootId);
    assert.equal(fleetFromChild.hasSwarm, true);
    assert.equal(fleetFromChild.summary.familySize, 3); // root + child + swarm verifier
    assert.equal(fleetFromChild.tasks.length, 1);
    assert.equal(fleetFromChild.tasks[0].toId, childId);
    assert.ok(fleetFromChild.tasks[0].finalReport.includes('Architecture review complete'));
    assert.ok(fleetFromChild.comms.some((c) => c.kind === 'delegation'));
    assert.ok(fleetFromChild.comms.some((c) => c.kind === 'message'));
    assert.ok(fleetFromChild.comms.some((c) => c.kind === 'report'));
    assert.ok(fleetFromChild.comms.some((c) => c.kind === 'swarm_post'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('overview engine aggregates KPIs, 7d chart, 8w heatmap, tallies, and filters', () => {
  const { tmpRoot } = createFixtureAppData();
  try {
    const store = new TranscriptStore({ appDataDir: tmpRoot });
    const ov = buildOverview(store, { range: '30d' });
    assert.equal(ov.ok, true);
    assert.equal(ov.kpi.sessionsCount, 2);
    assert.equal(ov.daily7d.length, 7);
    assert.equal(ov.heatmap56d.length, 56);
    assert.equal(ov.topSkills[0].name, 'plugin');
    assert.equal(ov.topCommands[0].name, 'git');

    const filteredBySkill = buildOverview(store, { range: '30d', skill: 'plugin' });
    assert.equal(filteredBySkill.sessions.length, 1);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('AgyContextServer serves UI, assets, auth-protected APIs, and persistent settings', async () => {
  const { tmpRoot, rootId } = createFixtureAppData();
  const dataDir = path.join(tmpRoot, 'sidecar_data');
  const srv = new AgyContextServer({ appDataDir: tmpRoot, dataDir, port: 0, token: 'secret-tok' });
  await srv.start();
  try {
    const uiRes = await httpRequest(srv.port, '/ui.html?token=secret-tok');
    assert.equal(uiRes.status, 200);
    assert.ok(uiRes.text.includes('window.__SIDECAR_BOOT__'));

    const unauth = await httpRequest(srv.port, '/api/health');
    assert.equal(unauth.status, 401);

    const authHeaders = { 'X-Sidecar-Token': 'secret-tok' };
    const health = JSON.parse((await httpRequest(srv.port, '/api/health', { headers: authHeaders })).text);
    assert.equal(health.ok, true);
    assert.equal(health.conversationsCount, 2);

    const sess = JSON.parse((await httpRequest(srv.port, `/api/session?id=${rootId}`, { headers: authHeaders })).text);
    assert.equal(sess.ok, true);
    assert.equal(sess.id, rootId);

    const fleet = JSON.parse((await httpRequest(srv.port, `/api/fleet?id=${rootId}`, { headers: authHeaders })).text);
    assert.equal(fleet.summary.familySize, 3);

    const saveRes = JSON.parse(
      (
        await httpRequest(srv.port, '/api/settings', {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ currency: 'cny', lang: 'en' }),
        })
      ).text
    );
    assert.equal(saveRes.settings.currency, 'cny');
    assert.equal(saveRes.settings.lang, 'en');
  } finally {
    await srv.stop();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('analyzer calibrates gemini-4 to 512K, merges overlapping tool intervals, and applies serverMeta', () => {
  const { tmpRoot, rootId } = createFixtureAppData();
  try {
    const store = new TranscriptStore({ appDataDir: tmpRoot });
    const withServer = analyzeSession(rootId, store, {
      serverMeta: { maxContextTokens: 512000, ttftMs: 1400, tokPerSec: 120 },
    });
    assert.equal(withServer.contextWindow, 512000);
    assert.equal(withServer.contextWindowSource, 'server');
    assert.equal(withServer.liveTelemetry.tokPerSec, 120);
    // Overlapping intervals [t-114..t-112] and [t-113..t-111] merge to 3s (not 4s), plus [t-99..t-98] (1s) and [t-98..t-94] (4s) => 8s total
    assert.equal(withServer.timing.toolMs, 8000);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('real local Antigravity transcripts parse cleanly without errors', () => {
  const store = new TranscriptStore();
  const ids = store.listConversationIds();
  assert.ok(Array.isArray(ids));
  if (ids.length > 0) {
    const ov = buildOverview(store, { range: 'all' });
    assert.equal(ov.ok, true);
    assert.ok(ov.sessions.length > 0);
    const first = analyzeSession(ov.sessions[0].id, store);
    assert.equal(first.ok, true);
    assert.ok(first.stats.steps >= 0);
    const fl = buildFleetForConversation(ov.sessions[0].id, store);
    assert.equal(fl.ok, true);
    assert.ok(fl.agents.length >= 1);
  }
});
