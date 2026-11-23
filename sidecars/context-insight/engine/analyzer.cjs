'use strict';

const {
  CONV_ID_RE,
  EXIT_CODE_RE,
  BG_TASK_RE,
  lookupModelMeta,
  calcCostUsd,
  cleanArg,
  estimateTokens,
  extractUserParts,
  parseToolResultTiming,
  extractCommandProgram,
  extractFilePathFromArgs,
  extractSkillInfo,
  inferWorkspaceFromPaths,
} = require('./parser.cjs');

const READ_TOOLS = new Set([
  'read_file',
  'view_file',
  'view_file_outline',
  'view_code_item',
]);

const WRITE_TOOLS = new Set([
  'write_file',
  'edit_file',
  'replace_file_content',
  'multi_replace_file_content',
  'delete_file',
]);

const SEARCH_TOOLS = new Set([
  'grep_search',
  'find_by_name',
  'list_dir',
  'search_web',
  'search_marketplace',
]);

const CMD_TOOLS = new Set([
  'run_command',
  'manage_task',
  'schedule',
  'run_workflow',
]);

function mergeIntervalsMs(intervals) {
  if (!Array.isArray(intervals) || intervals.length === 0) return 0;
  const sorted = intervals
    .filter((iv) => iv && Number.isFinite(iv[0]) && Number.isFinite(iv[1]) && iv[1] > iv[0])
    .sort((a, b) => a[0] - b[0]);
  if (sorted.length === 0) return 0;
  let total = 0;
  let curS = sorted[0][0];
  let curE = sorted[0][1];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    if (s <= curE) {
      if (e > curE) curE = e;
    } else {
      total += curE - curS;
      curS = s;
      curE = e;
    }
  }
  total += curE - curS;
  return total;
}

function countLines(str) {
  if (!str || typeof str !== 'string') return 0;
  return str.split(/\r?\n/).length;
}

function estimateEditLineDelta(toolName, args) {
  if (!args || typeof args !== 'object') return { added: 0, removed: 0 };
  if (toolName === 'write_file') {
    const content = cleanArg(args.Content ?? args.CodeContent ?? '');
    return { added: countLines(content), removed: 0 };
  }
  if (toolName === 'edit_file' || toolName === 'replace_file_content') {
    const target = cleanArg(args.Target ?? args.TargetContent ?? '');
    const repl = cleanArg(args.Replacement ?? args.ReplacementContent ?? '');
    const tLines = target ? countLines(target) : 0;
    const rLines = repl ? countLines(repl) : 0;
    return {
      added: Math.max(0, rLines),
      removed: Math.max(0, tLines),
    };
  }
  if (toolName === 'delete_file') {
    return { added: 0, removed: 1 };
  }
  return { added: 0, removed: 0 };
}

function classifyToolSource(toolName, args) {
  if (!toolName) return 'builtin';
  if (toolName === 'call_mcp_tool' || toolName.startsWith('mcp_')) {
    const srv = cleanArg(args?.ServerName || args?.server || '');
    return srv ? `mcp:${srv}` : 'mcp';
  }
  if (toolName === 'invoke_subagent' || toolName === 'define_subagent' || toolName === 'manage_subagents' || toolName === 'send_message' || toolName === 'swarm') {
    return 'multi-agent';
  }
  if (toolName.includes('browser')) return 'browser';
  if (READ_TOOLS.has(toolName) || WRITE_TOOLS.has(toolName) || SEARCH_TOOLS.has(toolName)) return 'fs';
  if (CMD_TOOLS.has(toolName)) return 'shell';
  return 'builtin';
}

function makePreview(str, max = 140) {
  const s = String(str || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function analyzeSession(convId, store, options = {}) {
  const preferFull = options.preferFull !== false;
  const { steps, mtimeMs, size } = store.readSteps(convId, preferFull);
  const annotation = store.readAnnotation(convId);

  if (!steps || steps.length === 0) {
    return {
      ok: true,
      id: convId,
      title: annotation?.title || convId.slice(0, 8),
      empty: true,
      model: '',
      contextWindow: 200000,
      maxOutputTokens: 32768,
      current: { system: 0, tools: 0, user: 0, inject: 0, skill: 0, assistant: 0, tool: 0, total: 0 },
      billed: { uncachedInput: 0, cacheRead: 0, output: 0, total: 0, cacheHitRate: null, costUsd: 0, breakdown: [] },
      stats: { turns: 0, steps: 0, userInputs: 0, answers: 0, toolCalls: 0, filesRead: 0, filesWritten: 0, filesSearched: 0, images: 0, compactions: 0, skillsLoaded: 0, subagentsSpawned: 0 },
      timing: { totalMs: 0, modelMs: 0, toolMs: 0, overheadMs: 0, firstMs: 0, lastMs: mtimeMs || 0 },
      requests: [],
      events: [],
      fileActivity: [],
      commands: [],
      programTally: {},
      toolTally: {},
      skillTally: {},
      nodes: [],
      toolsSeen: [],
      workspace: '',
      subagentLinks: [],
      messagesOut: [],
      messagesIn: [],
    };
  }

  // Pair GENERIC tool result steps with preceding PLANNER_RESPONSE tool_calls
  let pendingToolCalls = [];
  let turnIndex = 0;
  let reqSeq = 0;
  let lastModel = '';
  let baselineSystem = 0;
  let baselineTools = 0;
  let baselineDerived = false;

  const nodes = [];
  const requests = [];
  const events = [];
  const commands = [];
  const fileMap = new Map();
  const toolTally = {};
  const toolSources = {};
  const toolTokensEst = {};
  const programTally = {};
  const skillTally = {};
  const seenPaths = [];
  const subagentLinks = [];
  const messagesOut = [];
  const messagesIn = [];

  let currentTurnUserPreview = '';
  let lastUserText = '';
  let firstUserText = '';

  let totalUncachedInput = 0;
  let totalCacheRead = 0;
  let totalOutput = 0;
  let totalCostUsd = 0;

  let genReasoningTokens = 0;
  let genAnswerTokens = 0;
  let genCallTokens = 0;

  let modelMsTotal = 0;
  let toolMsTotal = 0;
  const toolIntervals = [];
  let firstMs = 0;
  let lastMs = 0;

  let userInputs = 0;
  let answers = 0;
  let totalToolCalls = 0;
  let imageCount = 0;
  let compactionCount = 0;

  // Running live context buckets (reset partially on detected compaction)
  let liveUser = 0;
  let liveInject = 0;
  let liveSkill = 0;
  let liveAssistant = 0;
  let liveAssistantReasoning = 0;
  let liveAssistantAnswer = 0;
  let liveAssistantCalls = 0;
  let liveTool = 0;

  let prevActualPrompt = 0;
  let pendingIncomingForBrief = [];

  function ensureFileRow(filePath) {
    if (!fileMap.has(filePath)) {
      fileMap.set(filePath, {
        path: filePath,
        name: filePath.split('/').pop() || filePath,
        reads: 0,
        writes: 0,
        searches: 0,
        images: 0,
        addedLines: 0,
        removedLines: 0,
        lastStep: 0,
        lastTime: 0,
        ops: [],
      });
    }
    return fileMap.get(filePath);
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepIdx = typeof step.step_index === 'number' ? step.step_index : i;
    const stepMs = Date.parse(step.created_at || '') || 0;
    if (stepMs > 0) {
      if (!firstMs || stepMs < firstMs) firstMs = stepMs;
      if (stepMs > lastMs) lastMs = stepMs;
    }

    const type = String(step.type || '');
    const source = String(step.source || '');

    if (Array.isArray(step.media) && step.media.length > 0) {
      imageCount += step.media.length;
      for (const m of step.media) {
        const uri = m.uri || m.path || 'attachment';
        const row = ensureFileRow(String(uri));
        row.images++;
        row.lastStep = stepIdx;
        row.lastTime = stepMs;
        row.ops.push({ kind: 'image', tool: 'attachment', step: stepIdx, reqSeq: reqSeq + 1, time: stepMs, detail: m.mime_type || 'media' });
      }
    }

    if (type === 'USER_INPUT' || source === 'USER_EXPLICIT') {
      const { userText, injectedText, systemMessages } = extractUserParts(step.content || '');
      const isCompactionStep =
        /^#\s*Resuming from a compaction/i.test(String(step.content || '').trim()) ||
        (injectedText && /<summary>[\s\S]*<\/summary>/i.test(injectedText));

      if (isCompactionStep) {
        compactionCount++;
        const tok = estimateTokens(step.content || '');
        liveUser = 0;
        liveInject = tok;
        liveSkill = 0;
        liveAssistant = 0;
        liveAssistantReasoning = 0;
        liveAssistantAnswer = 0;
        liveAssistantCalls = 0;
        liveTool = 0;
        events.push({
          id: `ev-${events.length + 1}`,
          kind: 'compaction',
          step: stepIdx,
          reqSeq: reqSeq + 1,
          turn: turnIndex,
          time: stepMs,
          title: '上下文压缩检查点',
          source: 'compaction',
          deltaTokens: prevActualPrompt > 0 ? tok - prevActualPrompt : 0,
          detail: makePreview(injectedText || step.content, 160),
        });
        nodes.push({
          id: `node-${nodes.length + 1}`,
          category: 'inject',
          kind: 'compaction',
          step: stepIdx,
          reqSeq: reqSeq + 1,
          turn: turnIndex,
          time: stepMs,
          tokens: tok,
          label: '压缩摘要检查点',
          preview: makePreview(injectedText || step.content, 160),
          content: String(step.content || ''),
        });
        continue;
      }

      if (userText) {
        turnIndex++;
        userInputs++;
        if (!firstUserText) firstUserText = userText;
        lastUserText = userText;
        currentTurnUserPreview = makePreview(userText, 120);
        const uTok = estimateTokens(userText);
        liveUser += uTok;
        nodes.push({
          id: `node-${nodes.length + 1}`,
          category: 'user',
          kind: 'user_request',
          step: stepIdx,
          reqSeq: reqSeq + 1,
          turn: turnIndex,
          time: stepMs,
          tokens: uTok,
          label: `用户消息 #${userInputs}`,
          preview: makePreview(userText, 140),
          content: userText,
          media: step.media || [],
        });
        pendingIncomingForBrief.push({ kind: 'user', label: makePreview(userText, 90), tokens: uTok });
      }

      if (injectedText) {
        const injTok = estimateTokens(injectedText);
        liveInject += injTok;
        const isSysMsg = systemMessages.length > 0;
        nodes.push({
          id: `node-${nodes.length + 1}`,
          category: 'inject',
          kind: isSysMsg ? 'system_message' : 'metadata',
          step: stepIdx,
          reqSeq: reqSeq + 1,
          turn: turnIndex,
          time: stepMs,
          tokens: injTok,
          label: isSysMsg ? `系统/代理消息 (${systemMessages[0].sender})` : '附加元数据 / 环境注入',
          preview: makePreview(isSysMsg ? systemMessages[0].content : injectedText, 140),
          content: injectedText,
        });
        if (isSysMsg) {
          for (const sm of systemMessages) {
            messagesIn.push({
              step: stepIdx,
              reqSeq: reqSeq + 1,
              time: stepMs,
              sender: sm.sender,
              content: sm.content,
              raw: sm.raw,
            });
            if (sm.sender && sm.sender !== 'system') {
              events.push({
                id: `ev-${events.length + 1}`,
                kind: 'agent_msg',
                step: stepIdx,
                reqSeq: reqSeq + 1,
                turn: turnIndex,
                time: stepMs,
                title: `收到消息 · ${sm.sender.slice(0, 12)}`,
                source: sm.sender,
                deltaTokens: injTok,
                detail: makePreview(sm.content, 160),
              });
            }
            pendingIncomingForBrief.push({ kind: 'inject', label: `${sm.sender.slice(0, 12)}: ${makePreview(sm.content, 70)}`, tokens: injTok });
          }
        }
      }
      continue;
    }

    if (type === 'PLANNER_RESPONSE') {
      reqSeq++;
      const model = String(step.model || lastModel || '');
      const meta = lookupModelMeta(model);
      if (lastModel && model && model !== lastModel) {
        events.push({
          id: `ev-${events.length + 1}`,
          kind: 'model_switch',
          step: stepIdx,
          reqSeq,
          turn: turnIndex,
          time: stepMs,
          title: `切换模型：${lastModel} → ${model}`,
          source: model,
          deltaTokens: 0,
          detail: `${lastModel} → ${model}`,
        });
      }
      if (model) lastModel = model;

      const inTok = Math.max(0, Number(step.input_tokens) || 0);
      const cacheTok = Math.max(0, Number(step.cache_read_tokens) || 0);
      const outTok = Math.max(0, Number(step.output_tokens) || 0);
      const actualPrompt = inTok + cacheTok;

      totalUncachedInput += inTok;
      totalCacheRead += cacheTok;
      totalOutput += outTok;
      const stepCostUsd = calcCostUsd(model, inTok, cacheTok, outTok);
      totalCostUsd += stepCostUsd;

      // Derive baseline system + tools on first prompt with actual token counts
      if (!baselineDerived && actualPrompt > 0) {
        const dynamicEst = liveUser + liveInject + liveSkill + liveAssistant + liveTool;
        const baseOverhead = Math.max(2000, actualPrompt - dynamicEst);
        baselineSystem = Math.round(baseOverhead * 0.44);
        baselineTools = Math.max(0, baseOverhead - baselineSystem);
        baselineDerived = true;
      }

      // Detect implicit compaction when prompt drops substantially
      if (prevActualPrompt > 0 && actualPrompt > 0 && prevActualPrompt - actualPrompt > Math.max(8000, prevActualPrompt * 0.22)) {
        const reclaimed = prevActualPrompt - actualPrompt;
        compactionCount++;
        events.push({
          id: `ev-${events.length + 1}`,
          kind: 'compaction',
          step: stepIdx,
          reqSeq,
          turn: turnIndex,
          time: stepMs,
          title: `自动压缩回收 ${reclaimed.toLocaleString()} tok`,
          source: 'auto-compact',
          deltaTokens: -reclaimed,
          detail: `${prevActualPrompt.toLocaleString()} → ${actualPrompt.toLocaleString()} tokens`,
        });
        // Rescale live message buckets proportionally to fit new actualPrompt
        const targetMsg = Math.max(0, actualPrompt - baselineSystem - baselineTools);
        const curMsg = liveUser + liveInject + liveSkill + liveAssistant + liveTool;
        if (curMsg > 0) {
          const ratio = targetMsg / curMsg;
          liveUser = Math.round(liveUser * ratio);
          liveInject = Math.round(liveInject * ratio);
          liveSkill = Math.round(liveSkill * ratio);
          liveAssistant = Math.round(liveAssistant * ratio);
          liveTool = Math.round(liveTool * ratio);
        }
      }

      // Compute anchored composition for this request BEFORE this assistant output is added
      const rawEst = {
        system: baselineSystem,
        tools: baselineTools,
        user: liveUser,
        inject: liveInject,
        skill: liveSkill,
        assistant: liveAssistant,
        tool: liveTool,
      };
      const rawSum = Object.values(rawEst).reduce((a, b) => a + b, 0);
      let reqComp = { ...rawEst };
      if (actualPrompt > 0 && rawSum > 0) {
        const dynSum = rawEst.user + rawEst.inject + rawEst.skill + rawEst.assistant + rawEst.tool;
        if (actualPrompt > baselineSystem + baselineTools && dynSum > 0) {
          const scale = (actualPrompt - baselineSystem - baselineTools) / dynSum;
          reqComp = {
            system: baselineSystem,
            tools: baselineTools,
            user: Math.round(rawEst.user * scale),
            inject: Math.round(rawEst.inject * scale),
            skill: Math.round(rawEst.skill * scale),
            assistant: Math.round(rawEst.assistant * scale),
            tool: Math.round(rawEst.tool * scale),
          };
        } else {
          const scale = actualPrompt / rawSum;
          for (const k of Object.keys(reqComp)) {
            reqComp[k] = Math.round(rawEst[k] * scale);
          }
        }
      }
      const reqTotal = actualPrompt > 0
        ? actualPrompt
        : Object.values(reqComp).reduce((a, b) => a + b, 0);

      // Process assistant output (thinking, answer text, tool calls)
      const thinkingText = String(step.thinking || '');
      const answerText = String(step.content || '');
      const calls = Array.isArray(step.tool_calls) ? step.tool_calls : [];

      // Accurate model generation time: only measure gap to immediate GENERIC tool step (never human idle time)
      let modelDurationMs = 0;
      const nextStep = steps[i + 1];
      if (calls.length > 0 && nextStep && nextStep.type === 'GENERIC' && stepMs > 0) {
        const nextMs = Date.parse(nextStep.created_at || '') || 0;
        if (nextMs > stepMs && nextMs - stepMs <= 90000) {
          modelDurationMs = nextMs - stepMs;
        }
      }
      if (modelDurationMs === 0 && outTok > 0) {
        modelDurationMs = Math.min(45000, Math.max(400, Math.round((outTok / 65) * 1000)));
      }
      modelMsTotal += modelDurationMs;

      const thinkTok = estimateTokens(thinkingText);
      const ansTok = estimateTokens(answerText);
      let callArgTok = 0;
      const callNames = [];

      pendingToolCalls = [];
      for (const tc of calls) {
        const tName = String(tc.name || 'tool');
        const tArgs = tc.args && typeof tc.args === 'object' ? tc.args : {};
        callNames.push(tName);
        totalToolCalls++;
        toolTally[tName] = (toolTally[tName] || 0) + 1;
        toolSources[tName] = classifyToolSource(tName, tArgs);
        const argStr = JSON.stringify(tArgs);
        const argTok = Math.max(8, estimateTokens(tName + ' ' + argStr));
        callArgTok += argTok;
        toolTokensEst[tName] = Math.max(toolTokensEst[tName] || 0, Math.round(140 + Object.keys(tArgs).length * 45));

        pendingToolCalls.push({
          name: tName,
          args: tArgs,
          reqSeq,
          stepIdx,
          turnIndex,
          time: stepMs,
        });

        // Track file activity from tool calls
        const fp = extractFilePathFromArgs(tArgs);
        if (fp) {
          seenPaths.push(fp);
          if (READ_TOOLS.has(tName)) {
            const row = ensureFileRow(fp);
            row.reads++;
            row.lastStep = stepIdx;
            row.lastTime = stepMs;
            row.ops.push({ kind: 'read', tool: tName, step: stepIdx, reqSeq, time: stepMs, detail: tArgs.StartLine ? `L${cleanArg(tArgs.StartLine)}-${cleanArg(tArgs.EndLine || '')}` : 'full' });
          } else if (WRITE_TOOLS.has(tName)) {
            const row = ensureFileRow(fp);
            row.writes++;
            const delta = estimateEditLineDelta(tName, tArgs);
            row.addedLines += delta.added;
            row.removedLines += delta.removed;
            row.lastStep = stepIdx;
            row.lastTime = stepMs;
            row.ops.push({ kind: 'write', tool: tName, step: stepIdx, reqSeq, time: stepMs, added: delta.added, removed: delta.removed, detail: `+${delta.added} / -${delta.removed}` });
          } else if (SEARCH_TOOLS.has(tName)) {
            const row = ensureFileRow(fp);
            row.searches++;
            row.lastStep = stepIdx;
            row.lastTime = stepMs;
            const q = cleanArg(tArgs.Query ?? tArgs.Pattern ?? '');
            row.ops.push({ kind: 'search', tool: tName, step: stepIdx, reqSeq, time: stepMs, detail: q || tName });
          }
        } else if (tName === 'search_web' || tName === 'search_marketplace') {
          const targetKey = `web://${tName}`;
          const row = ensureFileRow(targetKey);
          row.searches++;
          row.lastStep = stepIdx;
          row.lastTime = stepMs;
          const q = cleanArg(tArgs.query ?? tArgs.queries ?? '');
          row.ops.push({ kind: 'search', tool: tName, step: stepIdx, reqSeq, time: stepMs, detail: q || tName });
        }

        // Track subagent / send_message / swarm invocations
        if (tName === 'invoke_subagent') {
          const role = cleanArg(tArgs.Role || tArgs.TypeName || 'Subagent');
          const typeName = cleanArg(tArgs.TypeName || 'self');
          const prompt = cleanArg(tArgs.Prompt || '');
          const subModel = cleanArg(tArgs.Model || 'inherit');
          subagentLinks.push({
            step: stepIdx,
            reqSeq,
            time: stepMs,
            role,
            typeName,
            prompt,
            model: subModel,
            workspace: cleanArg(tArgs.Workspace || 'inherit'),
            childConvId: '',
            status: 'pending',
          });
          events.push({
            id: `ev-${events.length + 1}`,
            kind: 'subagent',
            step: stepIdx,
            reqSeq,
            turn: turnIndex,
            time: stepMs,
            title: `派生子 Agent · ${role}`,
            source: typeName,
            deltaTokens: argTok,
            detail: makePreview(prompt, 160),
          });
        } else if (tName === 'send_message') {
          const recipient = cleanArg(tArgs.Recipient || '');
          const msgText = cleanArg(tArgs.Message || '');
          messagesOut.push({
            step: stepIdx,
            reqSeq,
            time: stepMs,
            recipient,
            message: msgText,
          });
          events.push({
            id: `ev-${events.length + 1}`,
            kind: 'agent_msg',
            step: stepIdx,
            reqSeq,
            turn: turnIndex,
            time: stepMs,
            title: `发送消息 → ${recipient.slice(0, 12)}`,
            source: recipient,
            deltaTokens: argTok,
            detail: makePreview(msgText, 160),
          });
        } else if (tName === 'swarm') {
          const action = cleanArg(tArgs.action || '');
          const name = cleanArg(tArgs.name || '');
          const brief = cleanArg(tArgs.brief || '');
          events.push({
            id: `ev-${events.length + 1}`,
            kind: 'subagent',
            step: stepIdx,
            reqSeq,
            turn: turnIndex,
            time: stepMs,
            title: `Swarm · ${action}${name ? ' ' + name : ''}`,
            source: 'swarm',
            deltaTokens: argTok,
            detail: makePreview(brief || JSON.stringify(tArgs), 160),
          });
        }
      }

      if (answerText) answers++;

      const estOutSum = thinkTok + ansTok + callArgTok;
      const effectiveOut = outTok > 0 ? outTok : estOutSum;
      if (estOutSum > 0) {
        genReasoningTokens += Math.round(effectiveOut * (thinkTok / estOutSum));
        genAnswerTokens += Math.round(effectiveOut * (ansTok / estOutSum));
        genCallTokens += Math.max(0, effectiveOut - Math.round(effectiveOut * (thinkTok / estOutSum)) - Math.round(effectiveOut * (ansTok / estOutSum)));
      } else {
        genAnswerTokens += effectiveOut;
      }

      liveAssistant += effectiveOut;
      liveAssistantReasoning += thinkTok;
      liveAssistantAnswer += ansTok;
      liveAssistantCalls += callArgTok;

      // Build assistant surface node
      const hasThinking = Boolean(thinkingText.trim());
      const hasTools = calls.length > 0;
      const hasAnswer = Boolean(answerText.trim());
      nodes.push({
        id: `node-${nodes.length + 1}`,
        category: 'assistant',
        kind: hasTools ? (hasAnswer ? 'answer+tools' : 'tools') : 'answer',
        hasThinking,
        hasTools,
        hasAnswer,
        step: stepIdx,
        reqSeq,
        turn: turnIndex,
        time: stepMs,
        tokens: effectiveOut,
        label: hasTools
          ? `助手响应 · ${callNames.slice(0, 3).join(', ')}${callNames.length > 3 ? ` +${callNames.length - 3}` : ''}`
          : `助手回复 #${answers}`,
        preview: makePreview(answerText || thinkingText || callNames.join(', '), 140),
        content: answerText,
        thinking: thinkingText,
        toolCalls: calls.map((c) => ({
          name: c.name,
          args: c.args && typeof c.args === 'object'
            ? Object.fromEntries(Object.entries(c.args).map(([k, v]) => [k, cleanArg(v)]))
            : {},
        })),
      });

      const respBrief = hasTools
        ? (hasAnswer ? `${makePreview(answerText, 60)} · 调用 ${callNames.join(', ')}` : `调用 ${callNames.join(', ')}`)
        : makePreview(answerText || thinkingText || '(empty)', 100);

      const deltaFromPrev = prevActualPrompt > 0 ? reqTotal - prevActualPrompt : reqTotal;
      requests.push({
        seq: reqSeq,
        step: stepIdx,
        turn: turnIndex,
        time: stepMs,
        model,
        contextWindow: meta.ctx,
        maxOutputTokens: meta.maxOut,
        ...reqComp,
        total: reqTotal,
        delta: deltaFromPrev,
        actualPrompt,
        uncachedInput: inTok,
        cacheRead: cacheTok,
        outputTokens: outTok,
        cacheHitRate: actualPrompt > 0 ? Math.round((cacheTok / actualPrompt) * 1000) / 10 : null,
        costUsd: stepCostUsd,
        durationMs: modelDurationMs,
        brief: {
          user: currentTurnUserPreview || makePreview(firstUserText, 90),
          incoming: pendingIncomingForBrief.slice(-4),
          response: respBrief,
          toolNames: callNames,
        },
        milestones: [],
      });

      pendingIncomingForBrief = [];
      prevActualPrompt = reqTotal;
      continue;
    }

    if (type === 'GENERIC') {
      const matchedCall = pendingToolCalls.length > 0 ? pendingToolCalls.shift() : null;
      const toolName = matchedCall ? matchedCall.name : 'tool_result';
      const toolArgs = matchedCall ? matchedCall.args : {};
      const rawText = String(step.content || step.error || '');
      const isError = step.status === 'ERROR' || Boolean(step.error);
      const timing = parseToolResultTiming(rawText);
      if (timing.startMs > 0 && timing.endMs > timing.startMs) {
        const isPermDenied = /permission check failed/i.test(rawText);
        const cappedEnd = isPermDenied
          ? timing.startMs + Math.min(timing.durationMs, 1000)
          : timing.startMs + Math.min(timing.durationMs, 45000);
        toolIntervals.push([timing.startMs, cappedEnd]);
      }

      const tok = estimateTokens(rawText);
      const fp = extractFilePathFromArgs(toolArgs);
      const skillInfo = (toolName === 'read_file' || toolName === 'view_file') ? extractSkillInfo(fp) : null;

      let category = 'tool';
      if (skillInfo) {
        category = 'skill';
        liveSkill += tok;
        skillTally[skillInfo.name] = (skillTally[skillInfo.name] || 0) + 1;
        events.push({
          id: `ev-${events.length + 1}`,
          kind: 'skill',
          step: stepIdx,
          reqSeq,
          turn: turnIndex,
          time: stepMs,
          title: `加载技能 · ${skillInfo.name}`,
          source: skillInfo.path,
          deltaTokens: tok,
          detail: `${skillInfo.name}/${skillInfo.file} (~${tok.toLocaleString()} tok)`,
        });
      } else {
        liveTool += tok;
      }

      // Resolve child conversationId from invoke_subagent result
      if (toolName === 'invoke_subagent') {
        const m = CONV_ID_RE.exec(rawText);
        if (m && subagentLinks.length > 0) {
          for (let k = subagentLinks.length - 1; k >= 0; k--) {
            if (!subagentLinks[k].childConvId) {
              subagentLinks[k].childConvId = m[1].toLowerCase();
              subagentLinks[k].status = isError ? 'error' : 'spawned';
              break;
            }
          }
        }
      }

      // Record command execution details
      if (CMD_TOOLS.has(toolName)) {
        const cmdLine = cleanArg(toolArgs.CommandLine || toolArgs.command || toolArgs.Action || toolArgs.Description || toolName);
        const summary = cleanArg(toolArgs.toolSummary || '');
        const program = toolName === 'run_command' ? extractCommandProgram(cmdLine) : toolName;
        programTally[program] = (programTally[program] || 0) + 1;

        const exitMatch = EXIT_CODE_RE.exec(rawText);
        const bgMatch = BG_TASK_RE.exec(rawText);
        let status = 'ok';
        let exitCode = exitMatch ? parseInt(exitMatch[1], 10) : 0;
        if (isError || (exitMatch && exitCode !== 0)) {
          status = 'error';
          if (!exitMatch) exitCode = 1;
        } else if (bgMatch) {
          status = 'background';
          exitCode = null;
        }

        commands.push({
          id: `cmd-${commands.length + 1}`,
          step: stepIdx,
          reqSeq,
          turn: turnIndex,
          time: stepMs,
          tool: toolName,
          program,
          command: cmdLine,
          summary,
          status,
          exitCode,
          durationMs: timing.durationMs,
          outputPreview: makePreview(rawText, 240),
          output: rawText,
          error: step.error || '',
        });
      }

      if (isError) {
        events.push({
          id: `ev-${events.length + 1}`,
          kind: 'error',
          step: stepIdx,
          reqSeq,
          turn: turnIndex,
          time: stepMs,
          title: `工具失败 · ${toolName}`,
          source: toolName,
          deltaTokens: tok,
          detail: makePreview(step.error || rawText, 160),
        });
      }

      const cleanedArgs = Object.fromEntries(
        Object.entries(toolArgs || {}).map(([k, v]) => [k, cleanArg(v)])
      );
      nodes.push({
        id: `node-${nodes.length + 1}`,
        category,
        kind: skillInfo ? 'skill_read' : 'tool_result',
        toolName,
        source: classifyToolSource(toolName, toolArgs),
        status: isError ? 'error' : 'ok',
        step: stepIdx,
        reqSeq,
        turn: turnIndex,
        time: stepMs,
        durationMs: timing.durationMs,
        tokens: tok,
        lines: countLines(rawText),
        label: skillInfo
          ? `技能注入 · ${skillInfo.name}/${skillInfo.file}`
          : `${toolName}${fp ? ' · ' + fp.split('/').pop() : ''}`,
        preview: makePreview(rawText, 140),
        args: cleanedArgs,
        content: rawText,
      });

      pendingIncomingForBrief.push({
        kind: category,
        label: skillInfo ? `Skill: ${skillInfo.name}` : `${toolName} (${isError ? 'err' : 'ok'})`,
        tokens: tok,
      });
    }
  }

  // Attach milestones to requests (events + heaviest delta + slowest step)
  const reqBySeq = new Map(requests.map((r) => [r.seq, r]));
  for (const ev of events) {
    const r = reqBySeq.get(ev.reqSeq) || requests[requests.length - 1];
    if (r) {
      r.milestones.push({ kind: ev.kind, title: ev.title, deltaTokens: ev.deltaTokens });
    }
  }
  if (requests.length > 2) {
    let maxDeltaReq = null;
    let maxDurReq = null;
    for (const r of requests) {
      if (r.seq > 1 && (!maxDeltaReq || r.delta > maxDeltaReq.delta)) maxDeltaReq = r;
      if (!maxDurReq || r.durationMs > maxDurReq.durationMs) maxDurReq = r;
    }
    if (maxDeltaReq && maxDeltaReq.delta > 3000) {
      maxDeltaReq.milestones.push({ kind: 'peak_delta', title: `最大单步增长 +${maxDeltaReq.delta.toLocaleString()} tok` });
    }
    if (maxDurReq && maxDurReq.durationMs > 3000) {
      maxDurReq.milestones.push({ kind: 'slowest', title: `最慢请求 ${(maxDurReq.durationMs / 1000).toFixed(1)}s` });
    }
  }

  // Build tool definition inventory for Context Browser
  const toolsSeen = Object.keys(toolTally)
    .map((name) => ({
      name,
      count: toolTally[name],
      source: toolSources[name] || 'builtin',
      estTokens: toolTokensEst[name] || 180,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // Final current context snapshot
  const lastReq = requests[requests.length - 1];
  const modelMeta = lookupModelMeta(lastModel);
  const current = lastReq
    ? {
        system: lastReq.system,
        tools: lastReq.tools,
        user: lastReq.user,
        inject: lastReq.inject,
        skill: lastReq.skill,
        assistant: lastReq.assistant,
        tool: lastReq.tool,
        total: lastReq.total,
      }
    : {
        system: baselineSystem,
        tools: baselineTools,
        user: liveUser,
        inject: liveInject,
        skill: liveSkill,
        assistant: liveAssistant,
        tool: liveTool,
        total: baselineSystem + baselineTools + liveUser + liveInject + liveSkill + liveAssistant + liveTool,
      };

  // Billed token 8-part breakdown (faithful to dsh-context RING_ORDER)
  const totalInput = totalUncachedInput + totalCacheRead;
  const totalBilled = totalInput + totalOutput;
  const cacheHitRate = totalInput > 0 ? Math.round((totalCacheRead / totalInput) * 1000) / 10 : null;

  const curSum = Math.max(1, current.total);
  const scaleIn = totalInput / curSum;
  const liveAssistSum = Math.max(1, liveAssistantReasoning + liveAssistantAnswer + liveAssistantCalls);
  const promptAssist = current.assistant * scaleIn;
  const promptThinking = Math.round(promptAssist * (liveAssistantReasoning / liveAssistSum));
  const promptAnswers = Math.round(promptAssist * (liveAssistantAnswer / liveAssistSum));
  const promptCalls = Math.max(0, Math.round(promptAssist) - promptThinking - promptAnswers);

  const billedBreakdown = [
    { key: 'system', value: Math.round(current.system * scaleIn) },
    { key: 'tools', value: Math.round(current.tools * scaleIn) },
    { key: 'user', value: Math.round(current.user * scaleIn) },
    { key: 'inject', value: Math.round(current.inject * scaleIn) },
    { key: 'skill', value: Math.round(current.skill * scaleIn) },
    { key: 'toolCalls', value: Math.round(current.tool * scaleIn) + promptCalls + genCallTokens },
    { key: 'thinking', value: promptThinking + genReasoningTokens },
    { key: 'answers', value: promptAnswers + genAnswerTokens },
  ];

  // File activity summary
  const fileActivity = Array.from(fileMap.values()).sort((a, b) => (b.reads + b.writes + b.searches + b.images) - (a.reads + a.writes + a.searches + a.images));
  let filesRead = 0;
  let filesWritten = 0;
  let filesSearched = 0;
  for (const f of fileActivity) {
    if (f.reads > 0) filesRead++;
    if (f.writes > 0) filesWritten++;
    if (f.searches > 0) filesSearched++;
  }

  toolMsTotal = mergeIntervalsMs(toolIntervals);
  const activeMs = modelMsTotal + toolMsTotal;
  const spanMs = firstMs && lastMs && lastMs > firstMs ? lastMs - firstMs : activeMs;
  const overheadMs = Math.max(0, Math.min(spanMs - activeMs, Math.round(activeMs * 0.18)));

  const serverMeta = options.serverMeta || null;
  const effectiveContextWindow = (serverMeta && serverMeta.maxContextTokens > 0)
    ? serverMeta.maxContextTokens
    : modelMeta.ctx;

  const workspace = inferWorkspaceFromPaths(seenPaths);
  const title = annotation?.title || makePreview(firstUserText, 64) || convId.slice(0, 8);

  return {
    ok: true,
    id: convId,
    title,
    empty: false,
    workspace,
    workspaceLabel: workspace ? workspace.split('/').pop() : 'General',
    model: lastModel || modelMeta.label,
    modelMeta,
    contextWindow: effectiveContextWindow,
    contextWindowSource: (serverMeta && serverMeta.maxContextTokens > 0) ? 'server' : 'catalog',
    maxOutputTokens: modelMeta.maxOut,
    usagePct: effectiveContextWindow > 0 ? Math.round((current.total / effectiveContextWindow) * 1000) / 10 : 0,
    liveTelemetry: serverMeta,
    current,
    billed: {
      uncachedInput: totalUncachedInput,
      cacheRead: totalCacheRead,
      output: totalOutput,
      total: totalBilled,
      cacheHitRate,
      costUsd: totalCostUsd,
      breakdown: billedBreakdown,
    },
    stats: {
      turns: turnIndex,
      steps: requests.length,
      rawSteps: steps.length,
      userInputs,
      answers,
      toolCalls: totalToolCalls,
      filesRead,
      filesWritten,
      filesSearched,
      images: imageCount,
      compactions: compactionCount,
      skillsLoaded: Object.values(skillTally).reduce((a, b) => a + b, 0),
      subagentsSpawned: subagentLinks.length,
      commandsRun: commands.length,
    },
    timing: {
      totalMs: Math.round(activeMs + overheadMs),
      modelMs: Math.round(modelMsTotal),
      toolMs: Math.round(toolMsTotal),
      overheadMs: Math.round(overheadMs),
      firstMs,
      lastMs: lastMs || mtimeMs || 0,
      spanMs,
    },
    firstPrompt: firstUserText,
    lastPrompt: lastUserText,
    requests,
    events,
    fileActivity,
    commands,
    programTally,
    toolTally,
    skillTally,
    toolsSeen,
    nodes,
    subagentLinks,
    messagesOut,
    messagesIn,
    fileSize: size,
  };
}

module.exports = {
  analyzeSession,
};
