'use strict';

const { analyzeSession } = require('./analyzer.cjs');

function makePreview(str, max = 140) {
  const s = String(str || '').replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

function buildFleetForConversation(targetConvId, store, allSessionSummaries = null) {
  const allIds = store.listConversationIds();
  const analyzedCache = new Map();

  function getAnalysis(id) {
    if (!id) return null;
    if (analyzedCache.has(id)) return analyzedCache.get(id);
    const res = analyzeSession(id, store, { preferFull: false });
    analyzedCache.set(id, res);
    return res;
  }

  // Build parent -> children adjacency map across known conversations
  const parentOf = new Map();
  const childrenOf = new Map();
  const linkMeta = new Map(); // childId -> { parentId, role, typeName, prompt, time, step, status }

  const scanIds = allIds.includes(targetConvId) ? allIds : [targetConvId, ...allIds];
  for (const cid of scanIds) {
    const a = getAnalysis(cid);
    if (!a || a.empty) continue;
    for (const link of a.subagentLinks || []) {
      if (!link.childConvId) continue;
      parentOf.set(link.childConvId, cid);
      if (!childrenOf.has(cid)) childrenOf.set(cid, []);
      if (!childrenOf.get(cid).includes(link.childConvId)) {
        childrenOf.get(cid).push(link.childConvId);
      }
      linkMeta.set(link.childConvId, { ...link, parentId: cid });
    }
    // Check native swarm members on this conversation
    const swarm = store.readSwarm(cid);
    if (swarm && Array.isArray(swarm.members)) {
      for (const m of swarm.members) {
        const subId = String(m.conversation_id || m.conversationId || '').trim().toLowerCase();
        if (subId && subId !== cid) {
          parentOf.set(subId, cid);
          if (!childrenOf.has(cid)) childrenOf.set(cid, []);
          if (!childrenOf.get(cid).includes(subId)) childrenOf.get(cid).push(subId);
          if (!linkMeta.has(subId)) {
            linkMeta.set(subId, {
              parentId: cid,
              childConvId: subId,
              role: m.name || m.role || 'swarm-worker',
              typeName: m.role || 'swarm',
              prompt: m.brief || '',
              model: m.model || '',
              status: m.state || 'waiting',
              isSwarm: true,
              time: Date.parse(m.created_at || '') || 0,
              step: 0,
            });
          }
        }
      }
    }
  }

  // Walk up to root of this family
  let rootId = targetConvId;
  const guard = new Set([rootId]);
  while (parentOf.has(rootId)) {
    const p = parentOf.get(rootId);
    if (!p || guard.has(p)) break;
    guard.add(p);
    rootId = p;
  }

  // BFS collect entire family starting from rootId
  const familyOrder = [];
  const depthMap = new Map();
  const queue = [{ id: rootId, depth: 0 }];
  const visited = new Set([rootId]);
  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    familyOrder.push(id);
    depthMap.set(id, depth);
    const kids = childrenOf.get(id) || [];
    for (const k of kids) {
      if (!visited.has(k)) {
        visited.add(k);
        queue.push({ id: k, depth: depth + 1 });
      }
    }
  }

  const nowMs = Date.now();
  const agents = [];
  const agentNameById = new Map();
  const edges = [];
  const tasks = [];
  const comms = [];

  let familyBilledTokens = 0;
  let familyCostUsd = 0;
  let runningCount = 0;

  for (const id of familyOrder) {
    const a = getAnalysis(id);
    const meta = linkMeta.get(id);
    const isRoot = id === rootId;
    const isCurrent = id === targetConvId;
    const depth = depthMap.get(id) || 0;

    const lastMs = a?.timing?.lastMs || 0;
    const recentlyActive = lastMs > 0 && nowMs - lastMs < 20000;
    let status = 'done';
    if (meta?.status === 'working' || recentlyActive) status = 'running';
    else if (meta?.status === 'waiting') status = 'waiting';
    else if (meta?.status === 'killed' || meta?.status === 'error') status = 'error';
    if (status === 'running') runningCount++;

    const displayName = isRoot
      ? (a?.title || 'Main Agent')
      : (meta?.role || a?.title || id.slice(0, 8));

    agentNameById.set(id, displayName);

    const billedTotal = a?.billed?.total || 0;
    const costUsd = a?.billed?.costUsd || 0;
    familyBilledTokens += billedTotal;
    familyCostUsd += costUsd;

    agents.push({
      id,
      parentId: isRoot ? null : (parentOf.get(id) || rootId),
      depth,
      isRoot,
      isCurrent,
      name: displayName,
      role: isRoot ? 'Coordinator / Main' : (meta?.role || 'Subagent'),
      typeName: isRoot ? 'main' : (meta?.typeName || 'subagent'),
      source: isRoot ? 'root' : (meta?.isSwarm ? 'swarm' : 'subagent'),
      status,
      model: a?.model || meta?.model || '',
      contextWindow: a?.contextWindow || 200000,
      usagePct: a?.usagePct || 0,
      current: a?.current || { system: 0, tools: 0, user: 0, inject: 0, skill: 0, assistant: 0, tool: 0, total: 0 },
      billed: a?.billed || { total: 0, costUsd: 0, cacheHitRate: null },
      steps: a?.stats?.steps || 0,
      turns: a?.stats?.turns || 0,
      toolCalls: a?.stats?.toolCalls || 0,
      durationMs: a?.timing?.totalMs || 0,
      firstMs: a?.timing?.firstMs || meta?.time || 0,
      lastMs,
      title: a?.title || displayName,
      workspace: a?.workspaceLabel || '',
      hasTranscript: Boolean(a && !a.empty),
    });

    if (!isRoot) {
      const pId = parentOf.get(id) || rootId;
      edges.push({
        from: pId,
        to: id,
        label: meta?.typeName || 'subagent',
        kind: meta?.isSwarm ? 'swarm' : 'subagent',
        active: status === 'running',
      });
    }
  }

  // Also include Swarm members that didn't have a separate conversation_id yet
  const rootSwarm = store.readSwarm(rootId);
  if (rootSwarm && Array.isArray(rootSwarm.members)) {
    for (const m of rootSwarm.members) {
      const subId = String(m.conversation_id || m.conversationId || '').trim().toLowerCase();
      if (subId && visited.has(subId)) continue;
      const synthId = `swarm:${m.name || 'worker'}`;
      if (agentNameById.has(synthId)) continue;
      const state = String(m.state || 'waiting').toLowerCase();
      const status = state === 'working' ? 'running' : (state === 'killed' ? 'error' : (state === 'stopped' ? 'done' : 'waiting'));
      if (status === 'running') runningCount++;
      agentNameById.set(synthId, m.name || 'worker');
      agents.push({
        id: synthId,
        parentId: rootId,
        depth: 1,
        isRoot: false,
        isCurrent: false,
        name: m.name || 'worker',
        role: m.role || 'swarm-worker',
        typeName: 'swarm',
        source: 'swarm',
        status,
        model: m.model || '',
        contextWindow: 200000,
        usagePct: 0,
        current: { system: 0, tools: 0, user: 0, inject: 0, skill: 0, assistant: 0, tool: 0, total: 0 },
        billed: { total: 0, costUsd: 0, cacheHitRate: null },
        steps: 0,
        turns: 0,
        toolCalls: 0,
        durationMs: 0,
        firstMs: Date.parse(m.created_at || '') || 0,
        lastMs: Date.parse(m.updated_at || m.created_at || '') || 0,
        title: m.name || 'worker',
        workspace: m.workspace || '',
        hasTranscript: false,
      });
      edges.push({ from: rootId, to: synthId, label: m.role || 'swarm', kind: 'swarm', active: status === 'running' });
    }
  }

  // Build unified tasks (delegations) & communications stream
  let taskCounter = 0;
  const taskNoByChild = new Map();

  for (const id of familyOrder) {
    const a = getAnalysis(id);
    if (!a || a.empty) continue;
    const fromName = agentNameById.get(id) || id.slice(0, 8);

    // Delegations (invoke_subagent)
    for (const link of a.subagentLinks || []) {
      taskCounter++;
      const childId = link.childConvId || `pending-${id.slice(0, 6)}-${taskCounter}`;
      taskNoByChild.set(childId, taskCounter);
      const childAnalysis = link.childConvId ? getAnalysis(link.childConvId) : null;
      const childAgent = agents.find((ag) => ag.id === link.childConvId);
      const lastAssistNode = childAnalysis?.nodes
        ? [...childAnalysis.nodes].reverse().find((n) => n.category === 'assistant' && n.content)
        : null;

      tasks.push({
        id: `task-${taskCounter}`,
        taskNo: taskCounter,
        fromId: id,
        fromName,
        toId: link.childConvId || '',
        toName: link.role || agentNameById.get(childId) || 'Subagent',
        typeName: link.typeName || 'subagent',
        model: link.model || childAgent?.model || '',
        workspace: link.workspace || 'inherit',
        status: childAgent?.status || (link.status === 'error' ? 'error' : 'done'),
        title: link.role || `Subagent #${taskCounter}`,
        brief: link.prompt || '',
        finalReport: lastAssistNode?.content || '',
        createdAt: link.time || childAnalysis?.timing?.firstMs || 0,
        completedAt: childAnalysis?.timing?.lastMs || 0,
        sourceConvId: id,
        step: link.step,
      });

      comms.push({
        id: `comm-${comms.length + 1}`,
        time: link.time || 0,
        kind: 'delegation',
        fromId: id,
        fromName,
        toId: link.childConvId || '',
        toName: link.role || 'Subagent',
        taskNo: taskCounter,
        summary: `委派任务 #${taskCounter} → ${link.role}`,
        text: link.prompt || '',
        sourceConvId: id,
        step: link.step,
      });
    }

    // Outgoing send_message calls
    for (const m of a.messagesOut || []) {
      const toId = m.recipient ? m.recipient.toLowerCase() : '';
      const toName = agentNameById.get(toId) || (toId ? toId.slice(0, 8) : 'peer');
      comms.push({
        id: `comm-${comms.length + 1}`,
        time: m.time || 0,
        kind: 'message',
        fromId: id,
        fromName,
        toId,
        toName,
        taskNo: taskNoByChild.get(toId) || taskNoByChild.get(id) || null,
        summary: makePreview(m.message, 100),
        text: m.message || '',
        sourceConvId: id,
        step: m.step,
      });
    }

    // Incoming SYSTEM_MESSAGE from subagents or background tasks
    for (const m of a.messagesIn || []) {
      const senderLower = String(m.sender || '').toLowerCase();
      const isFamilySender = visited.has(senderLower);
      const isBgTask = senderLower.includes('/task-');
      if (!isFamilySender && !isBgTask && senderLower === 'system') continue;
      const sName = agentNameById.get(senderLower) || (isBgTask ? `Task ${senderLower.split('/').pop()}` : m.sender);
      comms.push({
        id: `comm-${comms.length + 1}`,
        time: m.time || 0,
        kind: isFamilySender ? 'report' : 'system',
        fromId: isFamilySender ? senderLower : 'system',
        fromName: sName,
        toId: id,
        toName: fromName,
        taskNo: taskNoByChild.get(senderLower) || null,
        summary: makePreview(m.content, 100),
        text: m.content || m.raw || '',
        sourceConvId: id,
        step: m.step,
      });
    }
  }

  // Merge native Swarm board.jsonl posts into comms
  if (rootSwarm && Array.isArray(rootSwarm.board)) {
    const idByMemberName = new Map();
    for (const ag of agents) {
      idByMemberName.set(ag.name.toLowerCase(), ag.id);
    }
    for (let i = 0; i < rootSwarm.board.length; i++) {
      const post = rootSwarm.board[i];
      const author = String(post.author || post.from || post.sender || 'coordinator');
      const text = String(post.text || post.body || post.message || post.content || '');
      const mentions = Array.isArray(post.mentions) ? post.mentions : [];
      const toName = mentions.length > 0 ? mentions.join(', ') : 'all';
      const fromId = author === 'coordinator' ? rootId : (idByMemberName.get(author.toLowerCase()) || `swarm:${author}`);
      const toId = mentions.length === 1 ? (idByMemberName.get(String(mentions[0]).toLowerCase()) || '') : '';
      comms.push({
        id: `swarm-post-${i + 1}`,
        time: Date.parse(post.timestamp || post.created_at || '') || 0,
        kind: 'swarm_post',
        fromId,
        fromName: author,
        toId,
        toName,
        taskNo: null,
        summary: makePreview(text, 100),
        text,
        sourceConvId: rootId,
        step: i + 1,
      });
    }
  }

  comms.sort((a, b) => (a.time || 0) - (b.time || 0));

  // Build swimlane timeline metadata
  const times = [];
  for (const ag of agents) {
    if (ag.firstMs) times.push(ag.firstMs);
    if (ag.lastMs) times.push(ag.lastMs);
  }
  for (const c of comms) {
    if (c.time) times.push(c.time);
  }
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;

  const swimlanes = agents.map((ag) => {
    const laneEvents = comms.filter((c) => c.fromId === ag.id || c.toId === ag.id);
    return {
      agentId: ag.id,
      name: ag.name,
      role: ag.role,
      status: ag.status,
      isRoot: ag.isRoot,
      eventCount: laneEvents.length,
      events: laneEvents.map((c) => ({
        id: c.id,
        time: c.time,
        kind: c.kind,
        direction: c.fromId === ag.id ? 'out' : 'in',
        peerName: c.fromId === ag.id ? c.toName : c.fromName,
        taskNo: c.taskNo,
        summary: c.summary,
      })),
    };
  });

  return {
    ok: true,
    rootId,
    targetId: targetConvId,
    hasSwarm: Boolean(rootSwarm),
    summary: {
      familySize: agents.length,
      runningCount,
      tasksCount: tasks.length,
      messagesCount: comms.length,
      familyBilledTokens,
      familyCostUsd,
    },
    timeRange: { minTime, maxTime },
    agents,
    edges,
    tasks,
    comms,
    swimlanes,
  };
}

module.exports = {
  buildFleetForConversation,
};
