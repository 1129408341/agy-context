'use strict';

const { analyzeSession } = require('./analyzer.cjs');

function toLocalDayKey(ms) {
  if (!ms || !Number.isFinite(ms)) return '';
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getRecentDays(count, nowMs = Date.now()) {
  const days = [];
  const base = new Date(nowMs);
  base.setHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 86400000);
    const key = toLocalDayKey(d.getTime());
    days.push({
      day: key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: d.getDay(),
    });
  }
  return days;
}

function buildOverview(store, query = {}) {
  const range = query.range || '30d'; // today | 7d | 30d | all
  const dayFilter = String(query.day || '').trim();
  const workspaceFilter = String(query.workspace || '').trim();
  const skillFilter = String(query.skill || '').trim();
  const toolFilter = String(query.tool || '').trim();
  const cmdFilter = String(query.cmd || '').trim();
  const search = String(query.search || '').trim().toLowerCase();
  const sortBy = query.sort || 'recent'; // recent | tokens | context | cost

  const nowMs = Date.now();
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);

  let rangeStartMs = 0;
  if (range === 'today') rangeStartMs = startOfToday.getTime();
  else if (range === '7d') rangeStartMs = startOfToday.getTime() - 6 * 86400000;
  else if (range === '30d') rangeStartMs = startOfToday.getTime() - 29 * 86400000;

  const ids = store.listConversationIds();
  const allAnalyzed = [];
  const subagentRoleById = new Map();
  for (const id of ids) {
    const a = analyzeSession(id, store, { preferFull: false });
    if (a && !a.empty) {
      allAnalyzed.push(a);
      for (const link of a.subagentLinks || []) {
        if (link.childConvId && link.role) {
          subagentRoleById.set(link.childConvId, { role: link.role, typeName: link.typeName || 'subagent', parentId: id });
        }
      }
    }
  }
  for (const a of allAnalyzed) {
    const subInfo = subagentRoleById.get(a.id);
    if (subInfo) {
      a.isSubagent = true;
      a.subagentRole = subInfo.role;
      a.parentConvId = subInfo.parentId;
      if (!a.title || a.title === a.id.slice(0, 8)) {
        a.title = subInfo.role;
      }
    }
  }

  // Heatmap (last 56 days / 8 weeks) across all sessions
  const heatmapDays = getRecentDays(56, nowMs);
  const heatmapBucket = new Map(heatmapDays.map((d) => [d.day, { ...d, tokens: 0, costUsd: 0, requests: 0, sessions: new Set() }]));

  // 7-day chart across all sessions (request-level attribution)
  const days7 = getRecentDays(7, nowMs);
  const daily7Bucket = new Map(days7.map((d) => [d.day, { ...d, tokens: 0, costUsd: 0, requests: 0 }]));

  // Compute day attribution for each session
  const sessionDaysMap = new Map();
  for (const s of allAnalyzed) {
    const activeDays = new Set();
    for (const r of s.requests) {
      const dk = toLocalDayKey(r.time || s.timing.lastMs);
      if (!dk) continue;
      activeDays.add(dk);
      const tok = (r.uncachedInput || 0) + (r.cacheRead || 0) + (r.outputTokens || 0);
      if (heatmapBucket.has(dk)) {
        const b = heatmapBucket.get(dk);
        b.tokens += tok;
        b.costUsd += r.costUsd || 0;
        b.requests++;
        b.sessions.add(s.id);
      }
      if (daily7Bucket.has(dk)) {
        const b = daily7Bucket.get(dk);
        b.tokens += tok;
        b.costUsd += r.costUsd || 0;
        b.requests++;
      }
    }
    sessionDaysMap.set(s.id, activeDays);
  }

  // Normalize heatmap levels 0..4
  let maxHeatTokens = 0;
  for (const b of heatmapBucket.values()) {
    if (b.tokens > maxHeatTokens) maxHeatTokens = b.tokens;
  }
  const heatmap56d = Array.from(heatmapBucket.values()).map((b) => {
    let level = 0;
    if (b.tokens > 0 && maxHeatTokens > 0) {
      const ratio = b.tokens / maxHeatTokens;
      level = ratio > 0.75 ? 4 : (ratio > 0.45 ? 3 : (ratio > 0.18 ? 2 : 1));
    }
    return {
      day: b.day,
      label: b.label,
      weekday: b.weekday,
      tokens: b.tokens,
      costUsd: b.costUsd,
      requests: b.requests,
      sessionsCount: b.sessions.size,
      level,
    };
  });

  const daily7d = Array.from(daily7Bucket.values());

  // Collect workspaces list for filter dropdown
  const workspaces = Array.from(new Set(allAnalyzed.map((s) => s.workspaceLabel).filter(Boolean))).sort();

  // Filter sessions by range / day
  const inRangeSessions = allAnalyzed.filter((s) => {
    if (dayFilter) {
      const ds = sessionDaysMap.get(s.id);
      return ds && ds.has(dayFilter);
    }
    if (rangeStartMs > 0) {
      const last = s.timing.lastMs || 0;
      return last >= rangeStartMs;
    }
    return true;
  });

  // Aggregate tallies & KPI over inRangeSessions
  let kpiUncached = 0;
  let kpiCacheRead = 0;
  let kpiOutput = 0;
  let kpiCostUsd = 0;
  let kpiTurns = 0;
  let kpiSteps = 0;
  let kpiToolCalls = 0;
  let kpiActiveMs = 0;

  const compTotals = {
    system: 0,
    tools: 0,
    user: 0,
    inject: 0,
    skill: 0,
    toolCalls: 0,
    thinking: 0,
    answers: 0,
  };

  const skillAgg = new Map();
  const toolAgg = new Map();
  const cmdAgg = new Map();

  for (const s of inRangeSessions) {
    if (dayFilter) {
      // Day-scoped request attribution for KPI
      for (const r of s.requests) {
        if (toLocalDayKey(r.time || s.timing.lastMs) === dayFilter) {
          kpiUncached += r.uncachedInput || 0;
          kpiCacheRead += r.cacheRead || 0;
          kpiOutput += r.outputTokens || 0;
          kpiCostUsd += r.costUsd || 0;
          kpiSteps++;
        }
      }
      kpiTurns += s.stats.turns;
    } else {
      kpiUncached += s.billed.uncachedInput;
      kpiCacheRead += s.billed.cacheRead;
      kpiOutput += s.billed.output;
      kpiCostUsd += s.billed.costUsd;
      kpiTurns += s.stats.turns;
      kpiSteps += s.stats.steps;
    }
    kpiToolCalls += s.stats.toolCalls;
    kpiActiveMs += s.timing.totalMs;

    for (const part of s.billed.breakdown || []) {
      if (part.key in compTotals) {
        compTotals[part.key] += part.value || 0;
      }
    }

    for (const [k, n] of Object.entries(s.skillTally || {})) {
      const cur = skillAgg.get(k) || { name: k, count: 0, last: 0, sessions: 0 };
      cur.count += n;
      cur.sessions++;
      cur.last = Math.max(cur.last, s.timing.lastMs || 0);
      skillAgg.set(k, cur);
    }
    for (const [k, n] of Object.entries(s.toolTally || {})) {
      const cur = toolAgg.get(k) || { name: k, count: 0, last: 0, sessions: 0 };
      cur.count += n;
      cur.sessions++;
      cur.last = Math.max(cur.last, s.timing.lastMs || 0);
      toolAgg.set(k, cur);
    }
    for (const [k, n] of Object.entries(s.programTally || {})) {
      const cur = cmdAgg.get(k) || { name: k, count: 0, last: 0, sessions: 0 };
      cur.count += n;
      cur.sessions++;
      cur.last = Math.max(cur.last, s.timing.lastMs || 0);
      cmdAgg.set(k, cur);
    }
  }

  const kpiInput = kpiUncached + kpiCacheRead;
  const kpi = {
    sessionsCount: inRangeSessions.length,
    totalSessionsAllTime: allAnalyzed.length,
    billedTokens: kpiInput + kpiOutput,
    uncachedInput: kpiUncached,
    cacheRead: kpiCacheRead,
    output: kpiOutput,
    costUsd: kpiCostUsd,
    cacheHitRate: kpiInput > 0 ? Math.round((kpiCacheRead / kpiInput) * 1000) / 10 : null,
    turns: kpiTurns,
    steps: kpiSteps,
    toolCalls: kpiToolCalls,
    activeMs: kpiActiveMs,
  };

  const composition = Object.entries(compTotals).map(([key, value]) => ({ key, value }));
  const topSkills = Array.from(skillAgg.values()).sort((a, b) => b.count - a.count || b.last - a.last);
  const topTools = Array.from(toolAgg.values()).sort((a, b) => b.count - a.count || b.last - a.last);
  const topCommands = Array.from(cmdAgg.values()).sort((a, b) => b.count - a.count || b.last - a.last);

  // Secondary filters for session cards
  let filteredSessions = inRangeSessions.filter((s) => {
    if (workspaceFilter && s.workspaceLabel !== workspaceFilter) return false;
    if (skillFilter && !(s.skillTally && s.skillTally[skillFilter])) return false;
    if (toolFilter && !(s.toolTally && s.toolTally[toolFilter])) return false;
    if (cmdFilter && !(s.programTally && s.programTally[cmdFilter])) return false;
    if (search) {
      const hay = `${s.title} ${s.id} ${s.workspace} ${s.model} ${s.firstPrompt}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  if (sortBy === 'tokens') {
    filteredSessions.sort((a, b) => b.billed.total - a.billed.total);
  } else if (sortBy === 'context') {
    filteredSessions.sort((a, b) => b.current.total - a.current.total);
  } else if (sortBy === 'cost') {
    filteredSessions.sort((a, b) => b.billed.costUsd - a.billed.costUsd);
  } else {
    filteredSessions.sort((a, b) => (b.timing.lastMs || 0) - (a.timing.lastMs || 0));
  }

  const sessions = filteredSessions.map((s) => ({
    id: s.id,
    title: s.title,
    workspace: s.workspace,
    workspaceLabel: s.workspaceLabel,
    model: s.model,
    usagePct: s.usagePct,
    contextWindow: s.contextWindow,
    currentTotal: s.current.total,
    current: s.current,
    billedTotal: s.billed.total,
    costUsd: s.billed.costUsd,
    cacheHitRate: s.billed.cacheHitRate,
    turns: s.stats.turns,
    steps: s.stats.steps,
    toolCalls: s.stats.toolCalls,
    compactions: s.stats.compactions,
    subagentsSpawned: s.stats.subagentsSpawned,
    isSubagent: Boolean(s.isSubagent),
    subagentRole: s.subagentRole || '',
    skillsLoaded: s.stats.skillsLoaded,
    lastActiveMs: s.timing.lastMs,
    durationMs: s.timing.totalMs,
  }));

  return {
    ok: true,
    range,
    dayFilter,
    kpi,
    daily7d,
    heatmap56d,
    composition,
    topSkills,
    topTools,
    topCommands,
    workspaces,
    sessions,
  };
}

module.exports = {
  buildOverview,
};
