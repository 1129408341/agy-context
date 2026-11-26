(function () {
  'use strict';

  const CATS = [
    { key: 'system', color: '#6366f1' },
    { key: 'tools', color: '#f59e0b' },
    { key: 'user', color: '#22c55e' },
    { key: 'inject', color: '#a855f7' },
    { key: 'skill', color: '#f97316' },
    { key: 'assistant', color: '#3b82f6' },
    { key: 'tool', color: '#14b8a6' },
  ];

  const RING_CATS = [
    { key: 'system', color: '#6366f1' },
    { key: 'tools', color: '#f59e0b' },
    { key: 'user', color: '#22c55e' },
    { key: 'inject', color: '#a855f7' },
    { key: 'skill', color: '#f97316' },
    { key: 'toolCalls', color: '#14b8a6' },
    { key: 'thinking', color: '#8b5cf6' },
    { key: 'answers', color: '#ec4899' },
  ];

  const COLOR_OF = Object.fromEntries([...CATS, ...RING_CATS].map((c) => [c.key, c.color]));

  const I18N = {
    zh: {
      brand: 'AGY Context',
      tabContext: '上下文',
      tabFleet: '编队',
      tabInsights: '上下文洞察',
      tabSettings: '设置',
      refresh: '刷新',
      openInAgy: '在反重力中打开',
      noSessions: '暂未发现 Antigravity 会话记录。',
      cat_system: '系统提示词',
      cat_tools: '工具定义',
      cat_user: '用户消息',
      cat_inject: '注入上下文',
      cat_skill: '技能注入',
      cat_assistant: '助手回复',
      cat_tool: '工具结果',
      cat_toolCalls: '工具调用',
      cat_thinking: '推理思考',
      cat_answers: '助手回答',
      contextStats: '上下文统计',
      tokenStats: 'Token 统计',
      timingStats: '耗时统计',
      currentContext: '当前上下文',
      contextTimeline: '上下文演进时间线',
      contextBrowser: '上下文浏览器',
      contextEvents: '上下文事件',
      fileActivity: '文件活动',
      commandExecs: '命令执行',
      turns: '轮次',
      steps: '请求步数',
      inputs: '用户输入',
      toolCalls: '工具调用',
      estCost: '预估成本',
      cacheHit: '缓存命中率',
      agentFamily: 'Agent 编队',
      billedTotal: '计费总量',
      uncached: '未命中输入',
      cacheRead: '缓存读取',
      output: '输出生成',
      modelTime: '模型思考',
      toolTime: '工具执行',
      overheadTime: '调度间隙',
      totalActive: '总活跃时长',
      reservedOut: '预留输出窗口',
      granStep: 'Step',
      granTurn: 'Turn',
      modeTotal: '累计',
      modeDelta: '增量 Delta',
      modeOverview: '总览带',
      modeDna: 'DNA 模式',
      durCurve: '耗时曲线',
      stepBrief: '步骤摘要',
      pinnedStep: '已固定步骤',
      currentView: '当前最新',
      viewCat: '分类视图',
      viewDna: 'DNA 平铺',
      searchPlaceholder: '搜索关键词…',
      all: '全部',
      read: '读取',
      write: '写入',
      search: '搜索',
      images: '媒体',
      ok: '成功',
      error: '失败',
      background: '后台',
      fleetSummary: '编队总览',
      fleetGraph: 'Agent 网络（家族全景）',
      fleetSwimlanes: '跨 Agent 协作时间线',
      fleetTasks: '协作任务与委派',
      fleetComms: '事件与通讯检查',
      agents: 'Agent 数',
      running: '运行中',
      tasks: '委派任务',
      messages: '跨 Agent 消息',
      familyTokens: '家族总 Token',
      hideQuiet: '隐藏安静泳道',
      earliest: '最早优先',
      latest: '最新优先',
      selectAgentAll: '查看全部成员',
      noFleetExtra: '当前会话尚未派生子 Agent 或启用 Swarm。一旦使用 invoke_subagent / swarm，多 Agent 网络与通讯泳道会自动在此呈现。',
      rangeToday: '今天',
      range7d: '近 7 天',
      range30d: '近 30 天',
      rangeAll: '全部',
      chart7d: '最近 7 天用量与成本',
      heatmap8w: '最近 8 周活动热力图',
      aggComp: '汇总上下文构成',
      topSkills: '技能加载排行',
      topTools: '工具调用排行',
      topCmds: '命令程序排行',
      sessionCards: '会话列表',
      sortRecent: '最近活跃',
      sortTokens: '计费 Token',
      sortContext: '当前上下文',
      sortCost: '预估成本',
      settingsTitle: '偏好设置',
      setLang: '界面语言',
      setCurrency: '成本计价货币',
      setTheme: '外观主题',
      setRange: '洞察默认时间范围',
      setGran: '时间线默认粒度',
      setMode: '时间线默认模式',
      setAutoOverview: '自动总览带步数阈值',
      setDur: '默认显示耗时曲线',
      setAutoRefresh: '自动刷新间隔（秒，0 为关闭）',
      themeAuto: '跟随客户端',
      themeDark: '深色',
      themeLight: '浅色',
      saved: '已保存',
      filePreview: '文件预览',
      close: '关闭',
      programs: '程序分布',
      notableCmds: '值得关注',
      expandAll: '点击展开详情',
      evSkill: '技能',
      evCompact: '压缩',
      evAgent: '多 Agent',
      evModel: '切模型',
      evError: '报错',
      clearFilters: '清除筛选',
      rawMode: '原文',
      prettyMode: '摘要',
    },
    en: {
      brand: 'AGY Context',
      tabContext: 'Context',
      tabFleet: 'Fleet',
      tabInsights: 'Insights',
      tabSettings: 'Settings',
      refresh: 'Refresh',
      openInAgy: 'Open in Antigravity',
      noSessions: 'No Antigravity sessions found yet.',
      cat_system: 'System Prompt',
      cat_tools: 'Tool Schemas',
      cat_user: 'User Messages',
      cat_inject: 'Injected Context',
      cat_skill: 'Skill Injections',
      cat_assistant: 'Assistant',
      cat_tool: 'Tool Results',
      cat_toolCalls: 'Tool Calls',
      cat_thinking: 'Reasoning',
      cat_answers: 'Answers',
      contextStats: 'Context Stats',
      tokenStats: 'Token Stats',
      timingStats: 'Timing Stats',
      currentContext: 'Current Context',
      contextTimeline: 'Context Timeline',
      contextBrowser: 'Context Browser',
      contextEvents: 'Context Events',
      fileActivity: 'File Activity',
      commandExecs: 'Command Executions',
      turns: 'Turns',
      steps: 'Steps',
      inputs: 'User Inputs',
      toolCalls: 'Tool Calls',
      estCost: 'Est. Cost',
      cacheHit: 'Cache Hit',
      agentFamily: 'Agent Network',
      billedTotal: 'Billed Total',
      uncached: 'Uncached In',
      cacheRead: 'Cache Read',
      output: 'Output',
      modelTime: 'Model',
      toolTime: 'Tools',
      overheadTime: 'Overhead',
      totalActive: 'Active Time',
      reservedOut: 'Reserved Output',
      granStep: 'Step',
      granTurn: 'Turn',
      modeTotal: 'Total',
      modeDelta: 'Delta',
      modeOverview: 'Overview',
      modeDna: 'DNA',
      durCurve: 'Duration',
      stepBrief: 'Step Brief',
      pinnedStep: 'Pinned Step',
      currentView: 'Latest',
      viewCat: 'Categories',
      viewDna: 'DNA Flat',
      searchPlaceholder: 'Filter…',
      all: 'All',
      read: 'Read',
      write: 'Written',
      search: 'Searched',
      images: 'Media',
      ok: 'OK',
      error: 'Error',
      background: 'BG',
      fleetSummary: 'Fleet Summary',
      fleetGraph: 'Agent Network',
      fleetSwimlanes: 'Cross-Agent Collaboration',
      fleetTasks: 'Delegations & Tasks',
      fleetComms: 'Event & Comms Inspector',
      agents: 'Agents',
      running: 'Running',
      tasks: 'Tasks',
      messages: 'Messages',
      familyTokens: 'Family Tokens',
      hideQuiet: 'Hide quiet lanes',
      earliest: 'Earliest',
      latest: 'Latest',
      selectAgentAll: 'All Members',
      noFleetExtra: 'No subagents or Swarm workers spawned in this session yet. Once invoke_subagent or swarm is used, the live family graph and swimlanes appear here.',
      rangeToday: 'Today',
      range7d: '7 Days',
      range30d: '30 Days',
      rangeAll: 'All',
      chart7d: '7-Day Tokens & Cost',
      heatmap8w: '8-Week Activity Heatmap',
      aggComp: 'Aggregated Composition',
      topSkills: 'Top Skills',
      topTools: 'Top Tools',
      topCmds: 'Top Programs',
      sessionCards: 'Sessions',
      sortRecent: 'Recent',
      sortTokens: 'Tokens',
      sortContext: 'Context',
      sortCost: 'Cost',
      settingsTitle: 'Preferences',
      setLang: 'Language',
      setCurrency: 'Currency',
      setTheme: 'Theme',
      setRange: 'Default Insights Range',
      setGran: 'Default Timeline Granularity',
      setMode: 'Default Timeline Mode',
      setAutoOverview: 'Auto-Overview Step Threshold',
      setDur: 'Show Duration Curve',
      setAutoRefresh: 'Auto-Refresh Interval (sec, 0=off)',
      themeAuto: 'Auto (Follow IDE)',
      themeDark: 'Dark',
      themeLight: 'Light',
      saved: 'Saved',
      filePreview: 'File Preview',
      close: 'Close',
      programs: 'Programs',
      notableCmds: 'Notable',
      expandAll: 'Click to expand',
      evSkill: 'Skills',
      evCompact: 'Compact',
      evAgent: 'Agents',
      evModel: 'Model',
      evError: 'Errors',
      clearFilters: 'Clear Filters',
      rawMode: 'Raw',
      prettyMode: 'Summary',
    },
  };

  const state = {
    tab: 'context', // context | fleet | insights | settings
    embedMode: false,
    settings: {
      lang: 'zh',
      defaultRange: '30d',
      defaultGranularity: 'step',
      defaultTimelineMode: 'total',
      overviewAutoSteps: 150,
      currency: 'usd',
      showDurationCurve: true,
      autoRefreshSec: 8,
      theme: 'auto',
    },
    currentConvId: '',
    overview: null,
    session: null,
    fleet: null,
    // Context tab UI state
    granularity: 'step',
    tlMode: 'total', // total | delta | overview | dna
    tlManualMode: false,
    focusedCat: '',
    tlAnimSeq: 0,
    showDur: true,
    pinnedSeq: null,
    browserMode: 'cat', // cat | dna
    browserSearch: '',
    assistKind: 'all', // all | thinking | tools | answer
    expandedCats: new Set(['user', 'skill', 'assistant', 'tool']),
    expandedNodes: new Set(),
    eventFilter: 'all',
    fileFilter: 'all',
    fileSearch: '',
    fileSort: 'count',
    expandedFiles: new Set(),
    cmdStatus: 'all',
    cmdProg: '',
    cmdSearch: '',
    expandedCmds: new Set(),
    // Fleet tab UI state
    selectedAgentId: '',
    hideQuietLanes: false,
    fleetOrder: 'earliest',
    fleetSearch: '',
    taskStatus: 'all',
    expandedTasks: new Set(),
    commKind: 'all',
    selectedCommId: '',
    // Insights tab UI state
    ovRange: '30d',
    ovDay: '',
    ovWorkspace: '',
    ovSkill: '',
    ovTool: '',
    ovCmd: '',
    ovSearch: '',
    ovSort: 'recent',
    refreshTimer: null,
    loading: true,
    settingsToast: '',
  };

  function t(key) {
    const dict = I18N[state.settings.lang] || I18N.zh;
    return dict[key] || I18N.en[key] || key;
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtTok(n) {
    const v = Number(n) || 0;
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 10_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(2)}K`;
    return `${sign}${Math.round(abs)}`;
  }

  function fmtCost(usd) {
    const v = Math.max(0, Number(usd) || 0);
    if (state.settings.currency === 'cny') {
      const cny = v / 0.15;
      return `¥${cny >= 10 ? cny.toFixed(2) : cny.toFixed(3)}`;
    }
    return `$${v >= 10 ? v.toFixed(2) : v.toFixed(4)}`;
  }

  function fmtMs(ms) {
    const v = Math.max(0, Number(ms) || 0);
    if (v < 1000) return `${Math.round(v)}ms`;
    if (v < 60000) return `${(v / 1000).toFixed(1)}s`;
    const m = Math.floor(v / 60000);
    const s = Math.round((v % 60000) / 1000);
    return `${m}m ${s}s`;
  }

  function fmtTime(ms) {
    if (!ms) return '-';
    const d = new Date(ms);
    const pad = (x) => String(x).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function apiFetch(url, opts = {}) {
    const fn = window.sidecar && window.sidecar.fetch ? window.sidecar.fetch : fetch;
    return fn(url, opts).then((r) => r.json());
  }

  function applyTheme(vars) {
    const pref = state.settings.theme || 'auto';
    if (pref === 'light') {
      document.body.classList.add('theme-light');
      return;
    }
    if (pref === 'dark') {
      document.body.classList.remove('theme-light');
      return;
    }
    // Auto detect from IDE cssVariables or prefers-color-scheme
    let isLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const bg = (vars && (vars['--vscode-editor-background'] || vars['--vscode-sideBar-background'])) ||
      getComputedStyle(document.documentElement).getPropertyValue('--vscode-editor-background').trim();
    if (bg && bg.startsWith('#') && bg.length >= 7) {
      const r = parseInt(bg.slice(1, 3), 16);
      const g = parseInt(bg.slice(3, 5), 16);
      const b = parseInt(bg.slice(5, 7), 16);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      isLight = lum > 0.55;
    }
    document.body.classList.toggle('theme-light', isLight);
  }

  async function loadAll(silent = false) {
    if (!silent) {
      state.loading = true;
      render();
    }
    try {
      const ovQs = new URLSearchParams({
        range: state.ovRange,
        day: state.ovDay,
        workspace: state.ovWorkspace,
        skill: state.ovSkill,
        tool: state.ovTool,
        cmd: state.ovCmd,
        search: state.ovSearch,
        sort: state.ovSort,
      });
      const [ov, sess, fl] = await Promise.all([
        apiFetch(`/api/overview?${ovQs}`),
        apiFetch(`/api/session?id=${encodeURIComponent(state.currentConvId || '')}&full=1`),
        apiFetch(`/api/fleet?id=${encodeURIComponent(state.currentConvId || '')}`),
      ]);
      state.overview = ov;
      state.session = sess;
      state.fleet = fl;
      if (!state.currentConvId && sess && sess.id) {
        state.currentConvId = sess.id;
      }
      const autoThr = Number(state.settings.overviewAutoSteps) || 0;
      if (!state.tlManualMode && autoThr > 0 && sess && sess.stats && sess.stats.steps >= autoThr) {
        state.tlMode = 'overview';
      }
    } catch (err) {
      console.error('[agy-context] Load error:', err);
    } finally {
      state.loading = false;
      render();
    }
  }

  async function loadOverviewOnly() {
    const ovQs = new URLSearchParams({
      range: state.ovRange,
      day: state.ovDay,
      workspace: state.ovWorkspace,
      skill: state.ovSkill,
      tool: state.ovTool,
      cmd: state.ovCmd,
      search: state.ovSearch,
      sort: state.ovSort,
    });
    state.overview = await apiFetch(`/api/overview?${ovQs}`);
    render();
  }

  async function selectSession(convId, switchTab = null) {
    state.currentConvId = convId;
    state.pinnedSeq = null;
    state.selectedAgentId = '';
    state.selectedCommId = '';
    state.focusedCat = '';
    state.tlManualMode = false;
    if (switchTab) state.tab = switchTab;
    const [sess, fl] = await Promise.all([
      apiFetch(`/api/session?id=${encodeURIComponent(convId)}&full=1`),
      apiFetch(`/api/fleet?id=${encodeURIComponent(convId)}`),
    ]);
    state.session = sess;
    state.fleet = fl;
    const autoThr = Number(state.settings.overviewAutoSteps) || 0;
    if (autoThr > 0 && sess && sess.stats && sess.stats.steps >= autoThr) {
      state.tlMode = 'overview';
    } else {
      state.tlMode = state.settings.defaultTimelineMode || 'total';
    }
    state.tlAnimSeq++;
    render();
  }

  function scheduleAutoRefresh() {
    if (state.refreshTimer) clearInterval(state.refreshTimer);
    const sec = Number(state.settings.autoRefreshSec) || 0;
    if (sec > 0) {
      state.refreshTimer = setInterval(() => {
        const ae = document.activeElement;
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
        void loadAll(true);
      }, Math.max(3, sec) * 1000);
    }
  }

  // ---------- SVG Helpers ----------
  function renderDonutSvg(parts, centerTop, centerBottom) {
    const total = parts.reduce((a, p) => a + (p.value || 0), 0);
    const r = 40;
    const cx = 54;
    const cy = 54;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    let segs = '';
    if (total > 0) {
      for (const p of parts) {
        if (!p.value || p.value <= 0) continue;
        const len = (p.value / total) * circ;
        segs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLOR_OF[p.key] || '#64748b'}" stroke-width="14" stroke-dasharray="${len.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" data-tip="${esc(t('cat_' + p.key))}: ${fmtTok(p.value)} (${((p.value / total) * 100).toFixed(1)}%)"/>`;
        offset += len;
      }
    } else {
      segs = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border-l1)" stroke-width="14"/>`;
    }
    return `<svg class="agy-donut-svg" viewBox="0 0 108 108">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg-sub)" stroke-width="14"/>
      ${segs}
      <text x="${cx}" y="${cy - 2}" text-anchor="middle" fill="var(--text-primary)" font-size="13" font-weight="700">${esc(centerTop)}</text>
      <text x="${cx}" y="${cy + 13}" text-anchor="middle" fill="var(--text-secondary)" font-size="9.5">${esc(centerBottom)}</text>
    </svg>`;
  }

  function renderMiniStackBar(comp, maxVal, height = 8) {
    const total = Math.max(1, maxVal || comp.total || 1);
    const segs = CATS.map((c) => {
      const v = comp[c.key] || 0;
      if (v <= 0) return '';
      const pct = Math.min(100, (v / total) * 100);
      return `<div style="width:${pct.toFixed(2)}%;background:${c.color};height:100%" title="${esc(t('cat_' + c.key))}: ${fmtTok(v)}"></div>`;
    }).join('');
    return `<div style="display:flex;height:${height}px;width:100%;background:var(--bg-canvas);border-radius:4px;overflow:hidden;border:1px solid var(--border-l2)">${segs}</div>`;
  }

  // ---------- Header ----------
  function renderHeader() {
    const sessions = (state.overview && state.overview.sessions) || [];
    const curId = state.currentConvId || (state.session && state.session.id) || '';
    const familySize = (state.fleet && state.fleet.summary && state.fleet.summary.familySize) || 1;
    const opts = sessions.map((s) => {
      const sel = s.id === curId ? 'selected' : '';
      return `<option value="${esc(s.id)}" ${sel}>${esc(s.title)} · ${fmtTok(s.currentTotal)} (${s.usagePct}%)</option>`;
    }).join('');
    const hasCurInOpts = sessions.some((s) => s.id === curId);
    const extraOpt = (!hasCurInOpts && state.session && state.session.id)
      ? `<option value="${esc(state.session.id)}" selected>${esc(state.session.title)}</option>`
      : '';

    const navHtml = state.embedMode
      ? ''
      : `<nav class="agy-tabs">
        <button class="agy-tab ${state.tab === 'context' ? 'active' : ''}" data-tab="context">📊 ${esc(t('tabContext'))}</button>
        <button class="agy-tab ${state.tab === 'fleet' ? 'active' : ''}" data-tab="fleet">🚢 ${esc(t('tabFleet'))} <span class="agy-badge">${familySize}</span></button>
        <button class="agy-tab ${state.tab === 'insights' ? 'active' : ''}" data-tab="insights">🗂️ ${esc(t('tabInsights'))} <span class="agy-badge">${(state.overview && state.overview.kpi && state.overview.kpi.totalSessionsAllTime) || 0}</span></button>
        <button class="agy-tab ${state.tab === 'settings' ? 'active' : ''}" data-tab="settings">⚙️ ${esc(t('tabSettings'))}</button>
      </nav>`;

    return `<header class="agy-header">
      <div class="agy-header-top">
        <div class="agy-brand">
          <img src="/assets/logo.svg" alt="AGY Context" />
          <span>${esc(t('brand'))}</span>
        </div>
        <select class="agy-session-pick" id="session-picker" aria-label="Session">
          ${extraOpt}${opts || `<option value="">${esc(t('noSessions'))}</option>`}
        </select>
        <div class="agy-header-actions">
          ${curId && window.parent !== window && !state.embedMode ? `<button class="agy-icon-btn" data-action="open-agy" data-id="${esc(curId)}" title="${esc(t('openInAgy'))}">↗</button>` : ''}
          <button class="agy-icon-btn" data-action="refresh">↻ ${esc(t('refresh'))}</button>
        </div>
      </div>
      ${navHtml}
    </header>`;
  }

  // ---------- Context Tab ----------
  function aggregateRequests(requests, gran) {
    if (gran !== 'turn') return requests;
    const byTurn = new Map();
    for (const r of requests) {
      const k = r.turn || 1;
      byTurn.set(k, r); // last step in turn represents end-of-turn context
    }
    return Array.from(byTurn.values());
  }

  function renderTimelineCard(s) {
    const items = aggregateRequests(s.requests || [], state.granularity);
    if (items.length === 0) {
      return `<section class="agy-card"><div class="agy-card-head"><span class="agy-card-title">📈 ${esc(t('contextTimeline'))}</span></div><div class="agy-empty">暂无请求数据</div></section>`;
    }

    const activeReq = (state.pinnedSeq ? s.requests.find((r) => r.seq === state.pinnedSeq) : null) || items[items.length - 1];
    const mode = state.tlMode;

    const svgH = 178;
    const padTop = 26;
    const padBot = 24;
    const plotH = svgH - padTop - padBot;

    let chartHtml = '';
    if (mode === 'overview') {
      // Continuous stacked area band fitted to pane width
      const w = 640;
      const focus = state.focusedCat;
      const catsToDraw = focus ? CATS.filter((c) => c.key === focus) : CATS;
      const maxTotal = Math.max(1, ...items.map((r) => (focus ? (r[focus] || 0) : r.total)));
      const n = items.length;
      const xOf = (idx) => (n <= 1 ? w / 2 : 16 + (idx / (n - 1)) * (w - 32));
      const yOf = (val) => padTop + plotH - (val / maxTotal) * plotH;

      let polys = '';
      const cumPrev = new Array(n).fill(0);
      for (const c of catsToDraw) {
        const topPts = [];
        const botPts = [];
        for (let i = 0; i < n; i++) {
          const base = cumPrev[i];
          const next = base + (items[i][c.key] || 0);
          cumPrev[i] = next;
          topPts.push(`${xOf(i).toFixed(1)},${yOf(next).toFixed(1)}`);
          botPts.unshift(`${xOf(i).toFixed(1)},${yOf(base).toFixed(1)}`);
        }
        polys += `<polygon class="agy-tl-rise" data-anim="${state.tlAnimSeq}" points="${topPts.concat(botPts).join(' ')}" fill="${c.color}" fill-opacity="0.86" data-tip="${esc(t('cat_' + c.key))}"/>`;
      }
      // Interactive hit columns + milestone pins
      const colW = n > 1 ? (w - 32) / n : 40;
      let overlays = '';
      for (let i = 0; i < n; i++) {
        const r = items[i];
        const cx = xOf(i);
        const isPinned = state.pinnedSeq === r.seq;
        const hasMs = r.milestones && r.milestones.length > 0;
        if (hasMs) {
          overlays += `<line x1="${cx.toFixed(1)}" y1="${padTop - 8}" x2="${cx.toFixed(1)}" y2="${padTop + plotH}" stroke="var(--text-dim)" stroke-dasharray="2 2" stroke-width="1"/>`;
          overlays += `<circle cx="${cx.toFixed(1)}" cy="${padTop - 10}" r="4.5" fill="var(--c-skill)" data-tip="${esc(r.milestones.map((m) => m.title).join(' | '))}"/>`;
        }
        overlays += `<rect x="${(cx - colW / 2).toFixed(1)}" y="${padTop}" width="${Math.max(6, colW).toFixed(1)}" height="${plotH}" fill="${isPinned ? 'rgba(99,102,241,0.18)' : 'transparent'}" class="agy-tl-bar-group" data-pin-seq="${r.seq}" data-tip="Step #${r.seq} · ${fmtTok(r.total)} (${r.delta >= 0 ? '+' : ''}${fmtTok(r.delta)})"/>`;
      }
      chartHtml = `<svg class="agy-tl-svg" viewBox="0 0 ${w} ${svgH}" style="width:100%;height:${svgH}px">
        <line x1="12" y1="${padTop + plotH}" x2="${w - 12}" y2="${padTop + plotH}" stroke="var(--border-l1)" stroke-width="1"/>
        ${polys}${overlays}
        <text x="16" y="${svgH - 6}" fill="var(--text-dim)" font-size="10">#${items[0].seq}</text>
        <text x="${w - 16}" y="${svgH - 6}" text-anchor="end" fill="var(--text-dim)" font-size="10">#${items[n - 1].seq} · max ${fmtTok(maxTotal)}</text>
      </svg>`;
    } else if (mode === 'delta') {
      const barW = 24;
      const gap = 8;
      const w = Math.max(420, items.length * (barW + gap) + 32);
      const maxAbs = Math.max(1000, ...items.map((r) => Math.abs(r.delta || 0)));
      const midY = padTop + plotH * 0.56;
      const upH = plotH * 0.52;
      const dnH = plotH * 0.4;

      let bars = `<line x1="10" y1="${midY}" x2="${w - 10}" y2="${midY}" stroke="var(--border-l1)" stroke-width="1"/>`;
      for (let i = 0; i < items.length; i++) {
        const r = items[i];
        const x = 16 + i * (barW + gap);
        const d = r.delta || 0;
        const isPos = d >= 0;
        const h = Math.max(3, (Math.abs(d) / maxAbs) * (isPos ? upH : dnH));
        const y = isPos ? midY - h : midY;
        const fill = isPos ? '#3b82f6' : '#10b981';
        const isPinned = state.pinnedSeq === r.seq;
        bars += `<g class="agy-tl-bar-group ${isPinned ? 'pinned' : ''}" data-pin-seq="${r.seq}" data-tip="Step #${r.seq} (Turn ${r.turn}) · Δ ${d >= 0 ? '+' : ''}${fmtTok(d)} · Total ${fmtTok(r.total)}">
          <rect class="agy-tl-bg" x="${x - 3}" y="${padTop}" width="${barW + 6}" height="${plotH}" fill="transparent" rx="4"/>
          <rect class="agy-tl-hl" x="${x}" y="${y.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" fill="${fill}" rx="3"/>
          <text x="${x + barW / 2}" y="${svgH - 6}" text-anchor="middle" fill="var(--text-dim)" font-size="9.5">${state.granularity === 'turn' ? 'T' + r.turn : '#' + r.seq}</text>
        </g>`;
      }
      chartHtml = `<div class="agy-tl-scroll"><svg class="agy-tl-svg" width="${w}" height="${svgH}" viewBox="0 0 ${w} ${svgH}">${bars}</svg></div>`;
    } else {
      // Total (or DNA-colored) stacked columns + optional Duration Curve + Milestones
      const focus = state.focusedCat;
      const catsToDraw = focus ? CATS.filter((c) => c.key === focus) : CATS;
      const barW = 24;
      const gap = 8;
      const w = Math.max(420, items.length * (barW + gap) + 32);
      const maxTotal = Math.max(1, ...items.map((r) => (focus ? (r[focus] || 0) : r.total)));
      const maxDur = Math.max(1, ...items.map((r) => r.durationMs || 0));

      let bars = `<line x1="10" y1="${padTop + plotH}" x2="${w - 10}" y2="${padTop + plotH}" stroke="var(--border-l1)" stroke-width="1"/>`;
      const durPts = [];

      for (let i = 0; i < items.length; i++) {
        const r = items[i];
        const x = 16 + i * (barW + gap);
        const isPinned = state.pinnedSeq === r.seq;
        let curY = padTop + plotH;
        let segs = '';
        for (const c of catsToDraw) {
          const val = r[c.key] || 0;
          if (val <= 0) continue;
          const h = (val / maxTotal) * plotH;
          curY -= h;
          segs += `<rect class="agy-tl-rise" data-anim="${state.tlAnimSeq}" x="${x}" y="${curY.toFixed(1)}" width="${barW}" height="${Math.max(1.2, h).toFixed(1)}" fill="${c.color}"/>`;
        }
        const barVal = focus ? (r[focus] || 0) : r.total;
        const totH = Math.max(2, (barVal / maxTotal) * plotH);
        const topY = padTop + plotH - totH;

        let msSvg = '';
        if (r.milestones && r.milestones.length > 0) {
          const firstMs = r.milestones[0];
          const icon = firstMs.kind === 'compaction' ? '🗜' : (firstMs.kind === 'skill' ? '⚡' : (firstMs.kind === 'subagent' ? '🤖' : (firstMs.kind === 'error' ? '!' : '★')));
          const mColor = firstMs.kind === 'compaction' ? '#a855f7' : (firstMs.kind === 'error' ? '#ef4444' : '#f97316');
          msSvg = `<line x1="${x + barW / 2}" y1="16" x2="${x + barW / 2}" y2="${topY.toFixed(1)}" stroke="${mColor}" stroke-dasharray="2 2" stroke-width="1" opacity="0.7"/>
            <circle cx="${x + barW / 2}" cy="11" r="7" fill="${mColor}" data-tip="${esc(r.milestones.map((m) => m.title).join(' | '))}"/>
            <text x="${x + barW / 2}" y="14" text-anchor="middle" fill="#fff" font-size="8.5" font-weight="700" pointer-events="none">${icon}</text>`;
        }

        if (r.durationMs > 0) {
          const dy = padTop + plotH - (r.durationMs / maxDur) * (plotH * 0.85);
          durPts.push(`${(x + barW / 2).toFixed(1)},${dy.toFixed(1)}`);
        }

        const tip = `Step #${r.seq} (Turn ${r.turn}) · ${fmtTok(r.total)} tok · Δ ${r.delta >= 0 ? '+' : ''}${fmtTok(r.delta)} · Cache ${r.cacheHitRate ?? '-'}% · ${fmtMs(r.durationMs)}`;
        bars += `<g class="agy-tl-bar-group ${isPinned ? 'pinned' : ''}" data-pin-seq="${r.seq}" data-tip="${esc(tip)}">
          <rect class="agy-tl-bg" x="${x - 3}" y="${padTop}" width="${barW + 6}" height="${plotH}" fill="${isPinned ? 'rgba(99,102,241,0.16)' : 'transparent'}" rx="4"/>
          ${segs}
          ${isPinned ? `<rect class="agy-tl-hl" x="${x}" y="${topY.toFixed(1)}" width="${barW}" height="${totH.toFixed(1)}" fill="none" rx="2"/>` : ''}
          ${msSvg}
          <text x="${x + barW / 2}" y="${svgH - 6}" text-anchor="middle" fill="${isPinned ? 'var(--accent)' : 'var(--text-dim)'}" font-size="9.5" font-weight="${isPinned ? '700' : '400'}">${state.granularity === 'turn' ? 'T' + r.turn : '#' + r.seq}</text>
        </g>`;
      }

      let durSvg = '';
      if (state.showDur && durPts.length > 1) {
        durSvg = `<polyline points="${durPts.join(' ')}" fill="none" stroke="#f59e0b" stroke-width="1.6" stroke-dasharray="4 2" opacity="0.85" pointer-events="none"/>`;
      }
      chartHtml = `<div class="agy-tl-scroll"><svg class="agy-tl-svg" width="${w}" height="${svgH}" viewBox="0 0 ${w} ${svgH}">${bars}${durSvg}</svg></div>`;
    }

    const incText = (activeReq.brief && activeReq.brief.incoming && activeReq.brief.incoming.length > 0)
      ? activeReq.brief.incoming.map((x) => `${x.label} (${fmtTok(x.tokens)})`).join(' · ')
      : '-';

    const focusBar = state.tlMode !== 'delta'
      ? `<div class="agy-focus-bar">${CATS.map((c) => {
          const isF = state.focusedCat === c.key;
          const isD = state.focusedCat && !isF;
          return `<button class="agy-focus-pill ${isF ? 'is-focused' : ''} ${isD ? 'is-dim' : ''}" data-focus-cat="${c.key}"><span class="agy-dot" style="background:${c.color}"></span>${esc(t('cat_' + c.key))}</button>`;
        }).join('')}</div>`
      : '';

    return `<section class="agy-card" id="sec-timeline">
      <div class="agy-card-head">
        <span class="agy-card-title">📈 ${esc(t('contextTimeline'))}</span>
        <span class="agy-card-sub">${state.pinnedSeq ? `${esc(t('pinnedStep'))} #${state.pinnedSeq}` : `${items.length} ${state.granularity === 'turn' ? t('granTurn') : t('granStep')}`}</span>
        <div class="agy-ctl-group">
          <div class="agy-seg">
            <button class="agy-seg-btn ${state.granularity === 'step' ? 'active' : ''}" data-gran="step">${esc(t('granStep'))}</button>
            <button class="agy-seg-btn ${state.granularity === 'turn' ? 'active' : ''}" data-gran="turn">${esc(t('granTurn'))}</button>
          </div>
          <div class="agy-seg">
            <button class="agy-seg-btn ${state.tlMode === 'total' ? 'active' : ''}" data-tlmode="total">${esc(t('modeTotal'))}</button>
            <button class="agy-seg-btn ${state.tlMode === 'delta' ? 'active' : ''}" data-tlmode="delta">${esc(t('modeDelta'))}</button>
            <button class="agy-seg-btn ${state.tlMode === 'overview' ? 'active' : ''}" data-tlmode="overview">${esc(t('modeOverview'))}</button>
          </div>
          ${state.tlMode === 'total' ? `<button class="agy-chip ${state.showDur ? 'active' : ''}" data-action="toggle-dur">⏱ ${esc(t('durCurve'))}</button>` : ''}
          ${state.pinnedSeq ? `<button class="agy-chip" data-action="unpin">✕ ${esc(t('currentView'))}</button>` : ''}
        </div>
      </div>
      ${focusBar}
      ${chartHtml}
      <div class="agy-brief-box">
        <div class="agy-brief-meta">
          <span><b>Step #${activeReq.seq}</b> (Turn ${activeReq.turn})</span>
          <span>Actual Prompt: <b>${fmtTok(activeReq.actualPrompt || activeReq.total)}</b></span>
          <span>Cache: <b>${fmtTok(activeReq.cacheRead)}</b> (${activeReq.cacheHitRate ?? '-'}%)</span>
          <span>Output: <b>${fmtTok(activeReq.outputTokens)}</b></span>
          <span>Cost: <b>${fmtCost(activeReq.costUsd)}</b></span>
          <span>${fmtTime(activeReq.time)}</span>
        </div>
        <div class="agy-brief-line"><span class="agy-brief-tag user">User</span><span>${esc(activeReq.brief?.user || '-')}</span></div>
        <div class="agy-brief-line"><span class="agy-brief-tag in">In</span><span>${esc(incText)}</span></div>
        <div class="agy-brief-line"><span class="agy-brief-tag resp">Resp</span><span>${esc(activeReq.brief?.response || '-')}</span></div>
      </div>
    </section>`;
  }

  function renderBrowserCard(s) {
    const pinnedReq = state.pinnedSeq ? s.requests.find((r) => r.seq === state.pinnedSeq) : null;
    const maxSeq = pinnedReq ? pinnedReq.seq : Infinity;
    const comp = pinnedReq || s.current;
    const prevReq = pinnedReq && pinnedReq.seq > 1
      ? s.requests.find((r) => r.seq === pinnedReq.seq - 1)
      : (s.requests.length > 1 ? s.requests[s.requests.length - 2] : null);

    const visibleNodes = (s.nodes || []).filter((n) => n.reqSeq <= maxSeq);
    const q = state.browserSearch.trim().toLowerCase();
    const matchesSearch = (n) => {
      if (!q) return true;
      const hay = `${n.label} ${n.preview} ${n.toolName || ''} ${n.content || ''} ${n.thinking || ''}`.toLowerCase();
      return hay.includes(q);
    };

    let bodyHtml = '';
    if (state.browserMode === 'dna') {
      const dnaNodes = visibleNodes.filter(matchesSearch);
      const totalDnaTok = Math.max(1, dnaNodes.reduce((a, n) => a + (n.tokens || 1), 0));
      const ribbon = dnaNodes.map((n) => {
        const w = Math.max(0.4, ((n.tokens || 1) / totalDnaTok) * 100);
        return `<div class="agy-dna-seg" style="width:${w.toFixed(2)}%;background:${COLOR_OF[n.category] || '#64748b'}" data-tip="${esc(n.label)} · ${fmtTok(n.tokens)}"></div>`;
      }).join('');

      const rows = [...dnaNodes].reverse().map((n, revIdx) => {
        const pos = dnaNodes.length - revIdx;
        const expanded = state.expandedNodes.has(n.id);
        return `<div class="agy-br-item">
          <div class="agy-br-row" data-toggle-node="${esc(n.id)}">
            <span class="agy-pill agy-mono">#${pos}</span>
            <span class="agy-dot" style="background:${COLOR_OF[n.category] || '#64748b'}"></span>
            <span class="agy-br-label">${esc(n.label)}</span>
            <span class="agy-br-preview">${esc(n.preview)}</span>
            <span class="agy-pill">S#${n.reqSeq}</span>
            <span class="agy-leg-val">${fmtTok(n.tokens)}</span>
          </div>
          ${expanded ? renderNodeExpanded(n) : ''}
        </div>`;
      }).join('');

      bodyHtml = `<div class="agy-dna-ribbon">${ribbon}</div>
        <div class="agy-br-cat"><div class="agy-br-cat-body" style="max-height:420px;border-top:0">${rows || `<div class="agy-empty">无匹配项</div>`}</div></div>`;
    } else {
      // 7-category collapsible browser
      const grouped = new Map(CATS.map((c) => [c.key, []]));
      for (const n of visibleNodes) {
        if (grouped.has(n.category)) grouped.get(n.category).push(n);
      }

      bodyHtml = CATS.map((c) => {
        const open = state.expandedCats.has(c.key);
        const catTok = comp[c.key] || 0;
        const prevTok = prevReq ? (prevReq[c.key] || 0) : null;
        const diff = prevTok !== null ? catTok - prevTok : 0;
        const diffBadge = (prevTok !== null && diff !== 0)
          ? `<span class="agy-pill ${diff > 0 ? 'warn' : 'ok'}">${diff > 0 ? '+' : ''}${fmtTok(diff)}</span>`
          : '';

        let itemsHtml = '';
        let countLabel = '';

        if (c.key === 'system') {
          countLabel = '1';
          if (open) {
            itemsHtml = `<div class="agy-br-detail">
              <div class="agy-small agy-muted">Antigravity 系统提示词、工作区指令与运行时上下文基线估算（根据首步真实 Prompt Token 减去用户输入精确反推）。</div>
              <div class="agy-pre">Model: ${esc(s.model)}\nContext Window: ${fmtTok(s.contextWindow)}\nEstimated System Prompt Baseline: ~${fmtTok(comp.system)} tokens</div>
            </div>`;
          }
        } else if (c.key === 'tools') {
          const tools = (s.toolsSeen || []).filter((tl) => !q || tl.name.toLowerCase().includes(q) || tl.source.toLowerCase().includes(q));
          countLabel = `${tools.length}`;
          if (open) {
            itemsHtml = tools.map((tl) => `<div class="agy-br-item"><div class="agy-br-row">
              <span class="agy-mono" style="font-weight:600">${esc(tl.name)}</span>
              <span class="agy-pill accent">${esc(tl.source)}</span>
              <span class="agy-br-preview">调用 ${tl.count} 次</span>
              <span class="agy-leg-val">~${fmtTok(tl.estTokens)}</span>
            </div></div>`).join('') || `<div class="agy-empty">暂无工具调用</div>`;
          }
        } else {
          let list = (grouped.get(c.key) || []).filter(matchesSearch);
          let kindBar = '';
          if (c.key === 'assistant') {
            const cThink = list.filter((n) => n.hasThinking).length;
            const cTools = list.filter((n) => n.hasTools).length;
            const cAns = list.filter((n) => n.hasAnswer).length;
            kindBar = `<div style="padding:6px 10px;border-bottom:1px solid var(--border-l2);display:flex;gap:5px;flex-wrap:wrap">
              <button class="agy-chip ${state.assistKind === 'all' ? 'active' : ''}" data-akind="all">${esc(t('all'))} (${list.length})</button>
              <button class="agy-chip ${state.assistKind === 'thinking' ? 'active' : ''}" data-akind="thinking">Thinking (${cThink})</button>
              <button class="agy-chip ${state.assistKind === 'tools' ? 'active' : ''}" data-akind="tools">Tools (${cTools})</button>
              <button class="agy-chip ${state.assistKind === 'answer' ? 'active' : ''}" data-akind="answer">Answer (${cAns})</button>
            </div>`;
            if (state.assistKind === 'thinking') list = list.filter((n) => n.hasThinking);
            else if (state.assistKind === 'tools') list = list.filter((n) => n.hasTools);
            else if (state.assistKind === 'answer') list = list.filter((n) => n.hasAnswer);
          }
          countLabel = `${list.length}`;
          if (open) {
            const rows = list.map((n) => {
              const expanded = state.expandedNodes.has(n.id);
              const statusPill = n.category === 'tool'
                ? `<span class="agy-pill ${n.status === 'error' ? 'err' : 'ok'}">${n.status === 'error' ? 'ERR' : 'OK'}</span>`
                : '';
              const srcPill = n.source ? `<span class="agy-pill">${esc(n.source)}</span>` : '';
              return `<div class="agy-br-item">
                <div class="agy-br-row" data-toggle-node="${esc(n.id)}">
                  <span>${expanded ? '▾' : '▸'}</span>
                  <span class="agy-br-label">${esc(n.label)}</span>
                  ${statusPill}${srcPill}
                  <span class="agy-br-preview">${esc(n.preview)}</span>
                  <span class="agy-pill">S#${n.reqSeq}</span>
                  <span class="agy-leg-val">${fmtTok(n.tokens)}</span>
                </div>
                ${expanded ? renderNodeExpanded(n) : ''}
              </div>`;
            }).join('');
            itemsHtml = kindBar + (rows || `<div class="agy-empty">暂无记录</div>`);
          }
        }

        return `<div class="agy-br-cat">
          <div class="agy-br-cat-head" data-toggle-cat="${c.key}">
            <span>${open ? '▾' : '▸'}</span>
            <span class="agy-dot" style="background:${c.color}"></span>
            <span style="font-weight:600">${esc(t('cat_' + c.key))}</span>
            <span class="agy-badge">${countLabel}</span>
            ${diffBadge}
            <span class="agy-leg-val">${fmtTok(catTok)}</span>
          </div>
          ${open ? `<div class="agy-br-cat-body">${itemsHtml}</div>` : ''}
        </div>`;
      }).join('');
    }

    const stepOpts = (s.requests || []).map((r) => `<option value="${r.seq}" ${state.pinnedSeq === r.seq ? 'selected' : ''}>Step #${r.seq} (T${r.turn} · ${fmtTok(r.total)})</option>`).join('');

    return `<section class="agy-card" id="sec-browser">
      <div class="agy-card-head">
        <span class="agy-card-title">🧭 ${esc(t('contextBrowser'))}</span>
        <span class="agy-card-sub">${pinnedReq ? `Step #${pinnedReq.seq}` : esc(t('currentView'))} · ${fmtTok(comp.total)}</span>
        <div class="agy-ctl-group">
          <select class="agy-select" id="browser-step-pick" style="max-width:140px">
            <option value="" ${!state.pinnedSeq ? 'selected' : ''}>${esc(t('currentView'))}</option>
            ${stepOpts}
          </select>
          <input class="agy-input" id="browser-search" type="search" placeholder="${esc(t('searchPlaceholder'))}" value="${esc(state.browserSearch)}" style="width:120px"/>
          <div class="agy-seg">
            <button class="agy-seg-btn ${state.browserMode === 'cat' ? 'active' : ''}" data-brmode="cat">${esc(t('viewCat'))}</button>
            <button class="agy-seg-btn ${state.browserMode === 'dna' ? 'active' : ''}" data-brmode="dna">${esc(t('viewDna'))}</button>
          </div>
        </div>
      </div>
      ${bodyHtml}
    </section>`;
  }

  function renderNodeExpanded(n) {
    let blocks = '';
    if (n.thinking) {
      blocks += `<div class="agy-small agy-muted" style="margin-bottom:2px">💭 Thinking</div><pre class="agy-pre">${esc(n.thinking.slice(0, 6000))}</pre>`;
    }
    if (n.toolCalls && n.toolCalls.length > 0) {
      blocks += `<div class="agy-small agy-muted" style="margin:6px 0 2px">🔧 Tool Calls</div><pre class="agy-pre">${esc(JSON.stringify(n.toolCalls, null, 2).slice(0, 6000))}</pre>`;
    }
    if (n.args && Object.keys(n.args).length > 0) {
      blocks += `<div class="agy-small agy-muted" style="margin:6px 0 2px">📥 Arguments</div><pre class="agy-pre">${esc(JSON.stringify(n.args, null, 2).slice(0, 4000))}</pre>`;
    }
    if (n.content) {
      blocks += `<div class="agy-small agy-muted" style="margin:6px 0 2px">📄 Content (${n.lines || 0} lines · ${fmtTok(n.tokens)} tok)</div><pre class="agy-pre">${esc(n.content.slice(0, 12000))}${n.content.length > 12000 ? '\n…[truncated in UI preview]' : ''}</pre>`;
    }
    return `<div class="agy-br-detail">${blocks || '<span class="agy-muted">(empty)</span>'}</div>`;
  }

  function renderEventsCard(s) {
    const evs = s.events || [];
    const counts = { all: evs.length, skill: 0, compaction: 0, subagent: 0, agent_msg: 0, model_switch: 0, error: 0 };
    for (const e of evs) {
      if (e.kind in counts) counts[e.kind]++;
    }
    const filtered = evs.filter((e) => {
      if (state.eventFilter === 'all') return true;
      if (state.eventFilter === 'agent') return e.kind === 'subagent' || e.kind === 'agent_msg';
      return e.kind === state.eventFilter;
    });

    const rows = filtered.map((e) => {
      const badgeCls = e.kind === 'error' ? 'err' : (e.kind === 'compaction' ? 'accent' : (e.kind === 'skill' ? 'warn' : 'ok'));
      return `<div class="agy-list-row" data-pin-seq="${e.reqSeq}" data-scroll="sec-timeline">
        <span class="agy-pill ${badgeCls}">${esc(e.kind)}</span>
        <span style="font-weight:600;white-space:nowrap">${esc(e.title)}</span>
        <span class="agy-br-preview">${esc(e.detail)}</span>
        ${e.deltaTokens ? `<span class="agy-pill">${e.deltaTokens > 0 ? '+' : ''}${fmtTok(e.deltaTokens)}</span>` : ''}
        <span class="agy-muted agy-small">S#${e.reqSeq}</span>
      </div>`;
    }).join('');

    return `<section class="agy-card" id="sec-events">
      <div class="agy-card-head">
        <span class="agy-card-title">⚡ ${esc(t('contextEvents'))}</span>
        <div class="agy-ctl-group">
          <div class="agy-seg">
            <button class="agy-seg-btn ${state.eventFilter === 'all' ? 'active' : ''}" data-evf="all">${esc(t('all'))} ${counts.all}</button>
            <button class="agy-seg-btn ${state.eventFilter === 'skill' ? 'active' : ''}" data-evf="skill">${esc(t('evSkill'))} ${counts.skill}</button>
            <button class="agy-seg-btn ${state.eventFilter === 'compaction' ? 'active' : ''}" data-evf="compaction">${esc(t('evCompact'))} ${counts.compaction}</button>
            <button class="agy-seg-btn ${state.eventFilter === 'agent' ? 'active' : ''}" data-evf="agent">${esc(t('evAgent'))} ${counts.subagent + counts.agent_msg}</button>
            <button class="agy-seg-btn ${state.eventFilter === 'model_switch' ? 'active' : ''}" data-evf="model_switch">${esc(t('evModel'))} ${counts.model_switch}</button>
            <button class="agy-seg-btn ${state.eventFilter === 'error' ? 'active' : ''}" data-evf="error">${esc(t('evError'))} ${counts.error}</button>
          </div>
        </div>
      </div>
      <div class="agy-scroll-list">${rows || `<div class="agy-empty">暂无事件记录</div>`}</div>
    </section>`;
  }

  function renderFileActivityCard(s) {
    const allFiles = s.fileActivity || [];
    const q = state.fileSearch.trim().toLowerCase();
    let list = allFiles.filter((f) => {
      if (state.fileFilter === 'read' && !f.reads) return false;
      if (state.fileFilter === 'write' && !f.writes) return false;
      if (state.fileFilter === 'search' && !f.searches) return false;
      if (state.fileFilter === 'images' && !f.images) return false;
      if (q && !f.path.toLowerCase().includes(q)) return false;
      return true;
    });
    if (state.fileSort === 'lines') list.sort((a, b) => (b.addedLines + b.removedLines) - (a.addedLines + a.removedLines));
    else if (state.fileSort === 'latest') list.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
    else if (state.fileSort === 'path') list.sort((a, b) => a.path.localeCompare(b.path));
    else list.sort((a, b) => (b.reads + b.writes + b.searches + b.images) - (a.reads + a.writes + a.searches + a.images));

    const rows = list.map((f) => {
      const open = state.expandedFiles.has(f.path);
      const opsHtml = open ? `<div style="padding:6px 8px 6px 24px;display:flex;flex-direction:column;gap:4px">
        ${f.ops.map((o) => `<div class="agy-row-between agy-small" style="padding:3px 6px;background:var(--bg-canvas);border-radius:4px">
          <span><span class="agy-pill">${esc(o.kind)}</span> <b>${esc(o.tool)}</b> · ${esc(o.detail)}</span>
          <button class="agy-chip" data-pin-seq="${o.reqSeq}" data-scroll="sec-browser">S#${o.reqSeq}</button>
        </div>`).join('')}
      </div>` : '';
      const isVirtual = f.path.startsWith('web://');
      return `<div style="border:1px solid var(--border-l2);border-radius:7px;background:var(--bg-sub)">
        <div class="agy-br-row" data-toggle-file="${esc(f.path)}">
          <span>${open ? '▾' : '▸'}</span>
          ${isVirtual
            ? `<span class="agy-pill accent">🌐 ${esc(f.name)}</span>`
            : `<button class="agy-chip" data-preview-file="${esc(f.path)}" title="预览文件">📄 ${esc(f.name)}</button>`}
          <span class="agy-br-preview agy-mono">${esc(f.path)}</span>
          ${f.reads ? `<span class="agy-pill">R:${f.reads}</span>` : ''}
          ${f.writes ? `<span class="agy-pill accent">W:${f.writes}</span>` : ''}
          ${f.searches ? `<span class="agy-pill">S:${f.searches}</span>` : ''}
          ${f.addedLines || f.removedLines ? `<span class="agy-delta-add">+${f.addedLines}</span><span class="agy-delta-del">-${f.removedLines}</span>` : ''}
        </div>
        ${opsHtml}
      </div>`;
    }).join('');

    return `<section class="agy-card" id="sec-files">
      <div class="agy-card-head">
        <span class="agy-card-title">📁 ${esc(t('fileActivity'))}</span>
        <span class="agy-badge">${list.length}</span>
        <div class="agy-ctl-group">
          <input class="agy-input" id="file-search" type="search" placeholder="${esc(t('searchPlaceholder'))}" value="${esc(state.fileSearch)}" style="width:120px"/>
          <select class="agy-select" id="file-sort">
            <option value="count" ${state.fileSort === 'count' ? 'selected' : ''}>操作数</option>
            <option value="lines" ${state.fileSort === 'lines' ? 'selected' : ''}>行数变化</option>
            <option value="latest" ${state.fileSort === 'latest' ? 'selected' : ''}>最近操作</option>
            <option value="path" ${state.fileSort === 'path' ? 'selected' : ''}>路径</option>
          </select>
          <div class="agy-seg">
            <button class="agy-seg-btn ${state.fileFilter === 'all' ? 'active' : ''}" data-ff="all">${esc(t('all'))}</button>
            <button class="agy-seg-btn ${state.fileFilter === 'read' ? 'active' : ''}" data-ff="read">${esc(t('read'))}</button>
            <button class="agy-seg-btn ${state.fileFilter === 'write' ? 'active' : ''}" data-ff="write">${esc(t('write'))}</button>
            <button class="agy-seg-btn ${state.fileFilter === 'search' ? 'active' : ''}" data-ff="search">${esc(t('search'))}</button>
            <button class="agy-seg-btn ${state.fileFilter === 'images' ? 'active' : ''}" data-ff="images">${esc(t('images'))}</button>
          </div>
        </div>
      </div>
      <div class="agy-scroll-list">${rows || `<div class="agy-empty">暂无文件活动</div>`}</div>
    </section>`;
  }

  function renderCommandsCard(s) {
    const cmds = s.commands || [];
    const progs = Object.entries(s.programTally || {}).sort((a, b) => b[1] - a[1]);
    const maxProg = progs.length ? progs[0][1] : 1;
    const q = state.cmdSearch.trim().toLowerCase();

    const filtered = cmds.filter((c) => {
      if (state.cmdStatus !== 'all' && c.status !== state.cmdStatus) return false;
      if (state.cmdProg && c.program !== state.cmdProg) return false;
      if (q && !`${c.command} ${c.summary} ${c.program}`.toLowerCase().includes(q)) return false;
      return true;
    });

    const progBars = progs.slice(0, 10).map(([p, n]) => `
      <div class="agy-prog-bar ${state.cmdProg === p ? 'active' : ''}" data-cmdprog="${esc(p)}">
        <span class="agy-mono" style="width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p)}</span>
        <div class="agy-bar-fill-track"><div class="agy-bar-fill" style="width:${((n / maxProg) * 100).toFixed(1)}%"></div></div>
        <span class="agy-small agy-muted">${n}</span>
      </div>`).join('');

    const cmdRows = filtered.map((c) => {
      const open = state.expandedCmds.has(c.id);
      const pillCls = c.status === 'error' ? 'err' : (c.status === 'background' ? 'warn' : 'ok');
      const statusLabel = c.status === 'error' ? `ERR ${c.exitCode ?? ''}` : (c.status === 'background' ? 'BG' : 'OK');
      return `<div style="border:1px solid var(--border-l2);border-radius:7px;background:var(--bg-sub)">
        <div class="agy-br-row" data-toggle-cmd="${esc(c.id)}">
          <span class="agy-pill ${pillCls}">${statusLabel}</span>
          <span class="agy-mono" style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${esc(c.command)}</span>
          <span class="agy-small agy-muted">${fmtMs(c.durationMs)}</span>
          <button class="agy-chip" data-pin-seq="${c.reqSeq}" data-scroll="sec-timeline">S#${c.reqSeq}</button>
        </div>
        ${open ? `<div class="agy-br-detail"><pre class="agy-pre">${esc((c.output || c.error || '').slice(0, 8000))}</pre></div>` : ''}
      </div>`;
    }).join('');

    return `<section class="agy-card" id="sec-commands">
      <div class="agy-card-head">
        <span class="agy-card-title">🖥️ ${esc(t('commandExecs'))}</span>
        <span class="agy-badge">${cmds.length}</span>
        <div class="agy-ctl-group">
          <input class="agy-input" id="cmd-search" type="search" placeholder="${esc(t('searchPlaceholder'))}" value="${esc(state.cmdSearch)}" style="width:130px"/>
          <div class="agy-seg">
            <button class="agy-seg-btn ${state.cmdStatus === 'all' ? 'active' : ''}" data-cmdst="all">${esc(t('all'))}</button>
            <button class="agy-seg-btn ${state.cmdStatus === 'ok' ? 'active' : ''}" data-cmdst="ok">${esc(t('ok'))}</button>
            <button class="agy-seg-btn ${state.cmdStatus === 'error' ? 'active' : ''}" data-cmdst="error">${esc(t('error'))}</button>
            <button class="agy-seg-btn ${state.cmdStatus === 'background' ? 'active' : ''}" data-cmdst="background">${esc(t('background'))}</button>
          </div>
        </div>
      </div>
      <div class="agy-cmd-split">
        <div style="background:var(--bg-sub);border:1px solid var(--border-l2);border-radius:8px;padding:8px">
          <div class="agy-small agy-muted" style="font-weight:600;margin-bottom:6px">${esc(t('programs'))}</div>
          ${progBars || `<div class="agy-empty" style="padding:10px">无程序记录</div>`}
        </div>
        <div class="agy-scroll-list">${cmdRows || `<div class="agy-empty">暂无命令执行</div>`}</div>
      </div>
    </section>`;
  }

  function renderContextTab() {
    const s = state.session;
    if (!s || s.empty) {
      return `<div class="agy-card"><div class="agy-empty">${esc(t('noSessions'))}</div></div>`;
    }

    const familySize = (state.fleet && state.fleet.summary && state.fleet.summary.familySize) || 1;
    const familyTokens = (state.fleet && state.fleet.summary && state.fleet.summary.familyBilledTokens) || s.billed.total;

    // 1. Context Stats Card
    const statsCard = `<section class="agy-card">
      <div class="agy-card-head">
        <span class="agy-card-title">📊 ${esc(t('contextStats'))}</span>
        <span class="agy-pill accent">${esc(s.model)}</span>
      </div>
      <div class="agy-stat-tiles">
        <div class="agy-tile"><div class="agy-tile-k">${esc(t('turns'))} / ${esc(t('steps'))}</div><div class="agy-tile-v">${s.stats.turns} / ${s.stats.steps}</div></div>
        <div class="agy-tile"><div class="agy-tile-k">${esc(t('toolCalls'))}</div><div class="agy-tile-v">${s.stats.toolCalls}</div></div>
        <div class="agy-tile"><div class="agy-tile-k">${esc(t('estCost'))}</div><div class="agy-tile-v">${fmtCost(s.billed.costUsd)}</div></div>
        <div class="agy-tile" style="cursor:pointer" data-tab="fleet"><div class="agy-tile-k">🚢 ${esc(t('agentFamily'))}</div><div class="agy-tile-v">${familySize} · ${fmtTok(familyTokens)}</div></div>
      </div>
      <div class="agy-chips">
        <button class="agy-chip" data-jump-file="read">📖 ${esc(t('read'))} ${s.stats.filesRead}</button>
        <button class="agy-chip" data-jump-file="write">✏️ ${esc(t('write'))} ${s.stats.filesWritten}</button>
        <button class="agy-chip" data-jump-file="search">🔍 ${esc(t('search'))} ${s.stats.filesSearched}</button>
        <button class="agy-chip" data-jump-file="images">🖼️ ${esc(t('images'))} ${s.stats.images}</button>
        <button class="agy-chip" data-scroll="sec-events">🗜 压缩 ${s.stats.compactions}</button>
        <button class="agy-chip" data-scroll="sec-commands">🖥️ 命令 ${s.stats.commandsRun}</button>
      </div>
    </section>`;

    // 2. Token Stats Card
    const ringParts = s.billed.breakdown || [];
    const ringLegend = RING_CATS.map((c) => {
      const item = ringParts.find((p) => p.key === c.key);
      const val = item ? item.value : 0;
      return `<div class="agy-leg-row"><span class="agy-dot" style="background:${c.color}"></span><span class="agy-leg-name">${esc(t('cat_' + c.key))}</span><span class="agy-leg-val">${fmtTok(val)}</span></div>`;
    }).join('');

    const tokenCard = `<section class="agy-card">
      <div class="agy-card-head">
        <span class="agy-card-title">🪙 ${esc(t('tokenStats'))}</span>
        <span class="agy-pill ok">${esc(t('cacheHit'))} ${s.billed.cacheHitRate !== null ? s.billed.cacheHitRate + '%' : '-'}</span>
      </div>
      <div class="agy-donut-wrap">
        ${renderDonutSvg(ringParts, fmtTok(s.billed.total), t('billedTotal'))}
        <div class="agy-legend">${ringLegend}</div>
      </div>
      <div class="agy-token-strip">
        <span>${esc(t('uncached'))}: <b>${fmtTok(s.billed.uncachedInput)}</b></span>
        <span>${esc(t('cacheRead'))}: <b>${fmtTok(s.billed.cacheRead)}</b></span>
        <span>${esc(t('output'))}: <b>${fmtTok(s.billed.output)}</b></span>
      </div>
    </section>`;

    // 3. Timing Stats Card
    const tTot = Math.max(1, s.timing.totalMs);
    const pMod = (s.timing.modelMs / tTot) * 100;
    const pTool = (s.timing.toolMs / tTot) * 100;
    const pOv = Math.max(0, 100 - pMod - pTool);
    const liveTel = s.liveTelemetry || null;
    const timingCard = `<section class="agy-card">
      <div class="agy-card-head">
        <span class="agy-card-title">⏱️ ${esc(t('timingStats'))}</span>
        <span class="agy-card-sub">${fmtMs(s.timing.totalMs)}</span>
        ${liveTel && liveTel.tokPerSec ? `<span class="agy-pill accent">${liveTel.tokPerSec} tok/s</span>` : ''}
        ${liveTel && liveTel.ttftMs ? `<span class="agy-pill">TTFT ${fmtMs(liveTel.ttftMs)}</span>` : ''}
      </div>
      <div class="agy-stack-track" style="height:16px;margin-bottom:10px">
        <div class="agy-stack-seg" style="width:${pMod.toFixed(1)}%;background:#3b82f6" data-tip="${esc(t('modelTime'))}: ${fmtMs(s.timing.modelMs)}"></div>
        <div class="agy-stack-seg" style="width:${pTool.toFixed(1)}%;background:#14b8a6" data-tip="${esc(t('toolTime'))}: ${fmtMs(s.timing.toolMs)}"></div>
        <div class="agy-stack-seg" style="width:${pOv.toFixed(1)}%;background:#64748b" data-tip="${esc(t('overheadTime'))}: ${fmtMs(s.timing.overheadMs)}"></div>
      </div>
      <div class="agy-stat-tiles">
        <div class="agy-tile"><div class="agy-tile-k">🔵 ${esc(t('modelTime'))}</div><div class="agy-tile-v">${fmtMs(s.timing.modelMs)}</div></div>
        <div class="agy-tile"><div class="agy-tile-k">🟢 ${esc(t('toolTime'))}</div><div class="agy-tile-v">${fmtMs(s.timing.toolMs)}</div></div>
        <div class="agy-tile"><div class="agy-tile-k">⚪ ${esc(t('overheadTime'))}</div><div class="agy-tile-v">${fmtMs(s.timing.overheadMs)}</div></div>
      </div>
    </section>`;

    // 4. Current Context Card
    const ctxWin = Math.max(1, s.contextWindow || 512000);
    const reservePct = Math.min(20, ((s.maxOutputTokens || 32768) / ctxWin) * 100);
    const curSegs = CATS.map((c) => {
      const val = s.current[c.key] || 0;
      if (val <= 0) return '';
      const pct = Math.min(100, (val / ctxWin) * 100);
      return `<div class="agy-stack-seg" style="width:${pct.toFixed(2)}%;background:${c.color}" data-jump-cat="${c.key}" data-tip="${esc(t('cat_' + c.key))}: ${fmtTok(val)} (${((val / ctxWin) * 100).toFixed(1)}%)"></div>`;
    }).join('');
    const curLeg = CATS.map((c) => {
      const val = s.current[c.key] || 0;
      const pct = s.current.total > 0 ? ((val / s.current.total) * 100).toFixed(1) : '0.0';
      return `<div class="agy-leg-row" style="cursor:pointer" data-jump-cat="${c.key}">
        <span class="agy-dot" style="background:${c.color}"></span>
        <span class="agy-leg-name">${esc(t('cat_' + c.key))}</span>
        <span class="agy-leg-val">${fmtTok(val)} <span class="agy-muted agy-small">(${pct}%)</span></span>
      </div>`;
    }).join('');

    const currentCard = `<section class="agy-card">
      <div class="agy-card-head">
        <span class="agy-card-title">🧱 ${esc(t('currentContext'))}</span>
        <span class="agy-pill ${s.usagePct >= 80 ? 'err' : (s.usagePct >= 55 ? 'warn' : 'ok')}" data-tip="Window source: ${esc(s.contextWindowSource || 'catalog')}">${fmtTok(s.current.total)} / ${fmtTok(ctxWin)} (${s.usagePct}%)</span>
      </div>
      <div class="agy-stack-track" style="margin-bottom:10px">
        ${curSegs}
        <div class="agy-stack-reserve" style="width:${reservePct.toFixed(1)}%" data-tip="${esc(t('reservedOut'))}: ${fmtTok(s.maxOutputTokens)}"></div>
      </div>
      <div class="agy-legend-wide">${curLeg}</div>
    </section>`;

    return `
      <div class="agy-grid-3">${statsCard}${tokenCard}${timingCard}</div>
      ${currentCard}
      ${renderTimelineCard(s)}
      ${renderBrowserCard(s)}
      <div class="agy-grid-2">
        ${renderEventsCard(s)}
        ${renderFileActivityCard(s)}
      </div>
      ${renderCommandsCard(s)}
    `;
  }

  // ---------- Fleet Tab ----------
  function renderFleetTab() {
    const f = state.fleet;
    if (!f || !f.agents || f.agents.length === 0) {
      return `<div class="agy-card"><div class="agy-empty">${esc(t('noSessions'))}</div></div>`;
    }
    const selId = state.selectedAgentId;
    const sum = f.summary;

    // Group agents by depth for clean hierarchy rows
    const byDepth = new Map();
    for (const a of f.agents) {
      if (!byDepth.has(a.depth)) byDepth.set(a.depth, []);
      byDepth.get(a.depth).push(a);
    }
    const levelsHtml = Array.from(byDepth.entries()).sort((a, b) => a[0] - b[0]).map(([depth, list]) => {
      const cards = list.map((a) => `<div class="agy-agent-card ${selId === a.id ? 'selected' : ''}" data-select-agent="${esc(a.id)}">
        <div class="agy-row-between" style="margin-bottom:5px">
          <div class="agy-flex-wrap">
            <span class="agy-status-dot ${esc(a.status)}"></span>
            <b style="font-size:12.5px">${esc(a.name)}</b>
            ${a.isRoot ? `<span class="agy-pill accent">ROOT</span>` : `<span class="agy-pill">${esc(a.typeName)}</span>`}
          </div>
          ${a.hasTranscript && a.id !== state.currentConvId ? `<button class="agy-chip" data-open-sess="${esc(a.id)}">🔍</button>` : ''}
        </div>
        <div class="agy-small agy-muted" style="margin-bottom:6px">${esc(a.model || '-')} · ${a.steps} steps · ${fmtMs(a.durationMs)}</div>
        ${renderMiniStackBar(a.current, a.contextWindow, 7)}
        <div class="agy-row-between agy-small agy-muted" style="margin-top:4px">
          <span>${fmtTok(a.current.total)} (${a.usagePct}%)</span>
          <span>${fmtTok(a.billed.total)} · ${fmtCost(a.billed.costUsd)}</span>
        </div>
      </div>`).join('');
      return `<div>
        ${depth > 0 ? `<div class="agy-small agy-muted" style="margin:0 0 4px 4px">↳ Level ${depth}</div>` : ''}
        <div class="agy-fleet-level">${cards}</div>
      </div>`;
    }).join('');

    // Swimlanes
    const minT = f.timeRange.minTime || 0;
    const maxT = f.timeRange.maxTime || minT + 1;
    const span = Math.max(1, maxT - minT);
    const fq = state.fleetSearch.trim().toLowerCase();

    const lanes = (f.swimlanes || []).filter((l) => {
      if (selId && l.agentId !== selId) return false;
      if (state.hideQuietLanes && l.eventCount === 0) return false;
      return true;
    }).map((l) => {
      const evs = l.events.filter((e) => !fq || e.summary.toLowerCase().includes(fq) || e.peerName.toLowerCase().includes(fq));
      const nodes = evs.map((e, idx) => {
        const pct = e.time && span > 1 ? 4 + ((e.time - minT) / span) * 92 : (10 + (idx / Math.max(1, evs.length)) * 80);
        const pos = state.fleetOrder === 'latest' ? (100 - pct) : pct;
        return `<div class="agy-swim-node ${esc(e.kind)}" style="left:${pos.toFixed(1)}%" data-select-comm="${esc(e.id)}" data-tip="${esc(e.direction === 'out' ? '→ ' + e.peerName : '← ' + e.peerName)} · ${esc(e.summary)}">${e.taskNo ? '#' + e.taskNo : (e.direction === 'out' ? '→' : '←')}</div>`;
      }).join('');
      return `<div class="agy-swimlane">
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;font-size:11.5px" title="${esc(l.name)}">${esc(l.name)}</div>
        <div class="agy-swim-track">${nodes}</div>
      </div>`;
    }).join('');

    // Tasks
    const tasks = (f.tasks || []).filter((tk) => {
      if (selId && tk.fromId !== selId && tk.toId !== selId) return false;
      if (state.taskStatus !== 'all' && tk.status !== state.taskStatus) return false;
      if (fq && !`${tk.title} ${tk.brief} ${tk.toName}`.toLowerCase().includes(fq)) return false;
      return true;
    });
    const tasksHtml = tasks.map((tk) => {
      const open = state.expandedTasks.has(tk.id);
      return `<div style="border:1px solid var(--border-l2);border-radius:8px;background:var(--bg-sub)">
        <div class="agy-br-row" data-toggle-task="${esc(tk.id)}">
          <span class="agy-pill accent">#${tk.taskNo}</span>
          <span class="agy-status-dot ${esc(tk.status)}"></span>
          <b style="white-space:nowrap">${esc(tk.toName)}</b>
          <span class="agy-pill">${esc(tk.typeName)}</span>
          <span class="agy-br-preview">${esc(tk.brief)}</span>
          <span class="agy-small agy-muted">${fmtTime(tk.createdAt)}</span>
        </div>
        ${open ? `<div class="agy-br-detail">
          <div class="agy-small agy-muted"><b>Brief</b> (${esc(tk.fromName)} → ${esc(tk.toName)} · ${esc(tk.workspace)})</div>
          <pre class="agy-pre">${esc(tk.brief || '(empty)')}</pre>
          ${tk.finalReport ? `<div class="agy-small agy-muted" style="margin-top:6px"><b>Final Report</b></div><pre class="agy-pre">${esc(tk.finalReport.slice(0, 5000))}</pre>` : ''}
        </div>` : ''}
      </div>`;
    }).join('');

    // Comms Inspector
    let comms = (f.comms || []).filter((c) => {
      if (selId && c.fromId !== selId && c.toId !== selId) return false;
      if (state.commKind !== 'all' && c.kind !== state.commKind) return false;
      if (fq && !`${c.fromName} ${c.toName} ${c.text}`.toLowerCase().includes(fq)) return false;
      return true;
    });
    if (state.fleetOrder === 'latest') comms = [...comms].reverse();
    const selComm = comms.find((c) => c.id === state.selectedCommId) || comms[0] || null;

    const commsRows = comms.map((c) => `<div class="agy-list-row ${selComm && selComm.id === c.id ? 'selected' : ''}" style="${selComm && selComm.id === c.id ? 'border-color:var(--accent);background:var(--accent-soft)' : ''}" data-select-comm="${esc(c.id)}">
      <span class="agy-pill">${esc(c.kind)}</span>
      <span style="font-weight:600;white-space:nowrap">${esc(c.fromName)} → ${esc(c.toName)}</span>
      <span class="agy-br-preview">${esc(c.summary)}</span>
      <span class="agy-small agy-muted">${fmtTime(c.time)}</span>
    </div>`).join('');

    return `
      <div class="agy-kpi-grid">
        <div class="agy-tile"><div class="agy-tile-k">🤖 ${esc(t('agents'))}</div><div class="agy-tile-v">${sum.familySize}</div></div>
        <div class="agy-tile"><div class="agy-tile-k">🟢 ${esc(t('running'))}</div><div class="agy-tile-v">${sum.runningCount}</div></div>
        <div class="agy-tile"><div class="agy-tile-k">✅ ${esc(t('tasks'))} / 💬 ${esc(t('messages'))}</div><div class="agy-tile-v">${sum.tasksCount} / ${sum.messagesCount}</div></div>
        <div class="agy-tile"><div class="agy-tile-k">🪙 ${esc(t('familyTokens'))}</div><div class="agy-tile-v">${fmtTok(sum.familyBilledTokens)} <span class="agy-small agy-muted">${fmtCost(sum.familyCostUsd)}</span></div></div>
      </div>

      <section class="agy-card">
        <div class="agy-card-head">
          <span class="agy-card-title">🕸 ${esc(t('fleetGraph'))}</span>
          ${f.hasSwarm ? `<span class="agy-pill warn">Swarm Active</span>` : ''}
          ${selId ? `<button class="agy-chip active" data-select-agent="">✕ ${esc(t('selectAgentAll'))}</button>` : ''}
        </div>
        <div class="agy-fleet-tree">${levelsHtml}</div>
        ${f.agents.length <= 1 ? `<div class="agy-small agy-muted" style="margin-top:8px">${esc(t('noFleetExtra'))}</div>` : ''}
      </section>

      <section class="agy-card">
        <div class="agy-card-head">
          <span class="agy-card-title">🛰 ${esc(t('fleetSwimlanes'))}</span>
          <div class="agy-ctl-group">
            <input class="agy-input" id="fleet-search" type="search" placeholder="${esc(t('searchPlaceholder'))}" value="${esc(state.fleetSearch)}" style="width:130px"/>
            <button class="agy-chip ${state.hideQuietLanes ? 'active' : ''}" data-action="toggle-quiet">${esc(t('hideQuiet'))}</button>
            <div class="agy-seg">
              <button class="agy-seg-btn ${state.fleetOrder === 'earliest' ? 'active' : ''}" data-forder="earliest">${esc(t('earliest'))}</button>
              <button class="agy-seg-btn ${state.fleetOrder === 'latest' ? 'active' : ''}" data-forder="latest">${esc(t('latest'))}</button>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px">${lanes || `<div class="agy-empty">暂无跨 Agent 时间线记录</div>`}</div>
      </section>

      <div class="agy-grid-2">
        <section class="agy-card">
          <div class="agy-card-head">
            <span class="agy-card-title">✅ ${esc(t('fleetTasks'))}</span>
            <span class="agy-badge">${tasks.length}</span>
            <div class="agy-ctl-group">
              <div class="agy-seg">
                <button class="agy-seg-btn ${state.taskStatus === 'all' ? 'active' : ''}" data-tst="all">${esc(t('all'))}</button>
                <button class="agy-seg-btn ${state.taskStatus === 'running' ? 'active' : ''}" data-tst="running">${esc(t('running'))}</button>
                <button class="agy-seg-btn ${state.taskStatus === 'done' ? 'active' : ''}" data-tst="done">${esc(t('ok'))}</button>
              </div>
            </div>
          </div>
          <div class="agy-scroll-list">${tasksHtml || `<div class="agy-empty">暂无委派任务</div>`}</div>
        </section>

        <section class="agy-card">
          <div class="agy-card-head">
            <span class="agy-card-title">📡 ${esc(t('fleetComms'))}</span>
            <div class="agy-ctl-group">
              <div class="agy-seg">
                <button class="agy-seg-btn ${state.commKind === 'all' ? 'active' : ''}" data-ckind="all">${esc(t('all'))}</button>
                <button class="agy-seg-btn ${state.commKind === 'delegation' ? 'active' : ''}" data-ckind="delegation">委派</button>
                <button class="agy-seg-btn ${state.commKind === 'message' ? 'active' : ''}" data-ckind="message">消息</button>
                <button class="agy-seg-btn ${state.commKind === 'report' ? 'active' : ''}" data-ckind="report">回报</button>
              </div>
            </div>
          </div>
          <div class="agy-scroll-list" style="max-height:190px;margin-bottom:8px">${commsRows || `<div class="agy-empty">暂无通讯事件</div>`}</div>
          ${selComm ? `<div style="background:var(--bg-sub);border:1px solid var(--border-l2);border-radius:8px;padding:8px">
            <div class="agy-row-between agy-small agy-muted" style="margin-bottom:4px">
              <span><b>${esc(selComm.fromName)}</b> → <b>${esc(selComm.toName)}</b> (${esc(selComm.kind)})</span>
              <span>Conv ${esc((selComm.sourceConvId || '').slice(0, 8))} · Step #${selComm.step}</span>
            </div>
            <pre class="agy-pre" style="max-height:180px">${esc(selComm.text)}</pre>
          </div>` : ''}
        </section>
      </div>
    `;
  }

  // ---------- Insights Tab ----------
  function renderInsightsTab() {
    const ov = state.overview;
    if (!ov) return `<div class="agy-card"><div class="agy-empty">${esc(t('noSessions'))}</div></div>`;
    const kpi = ov.kpi;

    // 7-day bar chart SVG
    const d7 = ov.daily7d || [];
    const maxD7Tok = Math.max(1, ...d7.map((d) => d.tokens));
    const maxD7Cost = Math.max(0.0001, ...d7.map((d) => d.costUsd));
    const chartW = 360;
    const chartH = 136;
    const colW = (chartW - 24) / Math.max(1, d7.length);
    const d7Bars = d7.map((d, i) => {
      const x = 12 + i * colW;
      const hTok = Math.max(2, (d.tokens / maxD7Tok) * 92);
      const hCost = Math.max(2, (d.costUsd / maxD7Cost) * 92);
      return `<g data-tip="${esc(d.day)} · ${fmtTok(d.tokens)} tok · ${fmtCost(d.costUsd)} · ${d.requests} reqs">
        <rect x="${(x + 4).toFixed(1)}" y="${(110 - hTok).toFixed(1)}" width="${Math.max(6, colW * 0.36).toFixed(1)}" height="${hTok.toFixed(1)}" fill="#6366f1" rx="2"/>
        <rect x="${(x + 4 + colW * 0.4).toFixed(1)}" y="${(110 - hCost).toFixed(1)}" width="${Math.max(6, colW * 0.36).toFixed(1)}" height="${hCost.toFixed(1)}" fill="#f59e0b" rx="2"/>
        <text x="${(x + colW / 2).toFixed(1)}" y="128" text-anchor="middle" fill="var(--text-dim)" font-size="9.5">${esc(d.label)}</text>
      </g>`;
    }).join('');

    // 8-week heatmap
    const heatCells = (ov.heatmap56d || []).map((d) => `<div class="agy-heat-cell l${d.level} ${state.ovDay === d.day ? 'selected' : ''}" data-ovday="${esc(d.day)}" data-tip="${esc(d.day)} · ${fmtTok(d.tokens)} tok · ${d.sessionsCount} sessions"></div>`).join('');

    // Tally helper
    const renderTally = (title, icon, list, activeVal, attr) => {
      const maxC = list.length ? list[0].count : 1;
      const rows = list.slice(0, 8).map((item) => `<div class="agy-prog-bar ${activeVal === item.name ? 'active' : ''}" ${attr}="${esc(item.name)}">
        <span class="agy-mono" style="width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(item.name)}">${esc(item.name)}</span>
        <div class="agy-bar-fill-track"><div class="agy-bar-fill" style="width:${((item.count / maxC) * 100).toFixed(1)}%"></div></div>
        <span class="agy-small agy-muted">${item.count}</span>
      </div>`).join('');
      return `<section class="agy-card"><div class="agy-card-head"><span class="agy-card-title">${icon} ${esc(title)}</span></div>${rows || `<div class="agy-empty" style="padding:12px">暂无数据</div>`}</section>`;
    };

    const ringLegend = RING_CATS.map((c) => {
      const p = (ov.composition || []).find((x) => x.key === c.key);
      return `<div class="agy-leg-row"><span class="agy-dot" style="background:${c.color}"></span><span class="agy-leg-name">${esc(t('cat_' + c.key))}</span><span class="agy-leg-val">${fmtTok(p ? p.value : 0)}</span></div>`;
    }).join('');

    const activeChips = [];
    if (state.ovDay) activeChips.push(`<button class="agy-chip active" data-clear="ovDay">📅 ${esc(state.ovDay)} ✕</button>`);
    if (state.ovSkill) activeChips.push(`<button class="agy-chip active" data-clear="ovSkill">⚡ ${esc(state.ovSkill)} ✕</button>`);
    if (state.ovTool) activeChips.push(`<button class="agy-chip active" data-clear="ovTool">🔧 ${esc(state.ovTool)} ✕</button>`);
    if (state.ovCmd) activeChips.push(`<button class="agy-chip active" data-clear="ovCmd">🖥️ ${esc(state.ovCmd)} ✕</button>`);

    const sessCards = (ov.sessions || []).map((s) => `<div class="agy-sess-card" data-open-sess="${esc(s.id)}">
      <div class="agy-row-between">
        <b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.isSubagent ? '🤖 ' : ''}${esc(s.title)}</b>
        <div class="agy-flex-wrap" style="flex:none">
          ${s.isSubagent ? `<span class="agy-pill accent">Subagent</span>` : ''}
          <span class="agy-pill">${esc(s.workspaceLabel)}</span>
        </div>
      </div>
      ${renderMiniStackBar(s.current, s.contextWindow, 7)}
      <div class="agy-flex-wrap agy-small agy-muted">
        <span>🪙 ${fmtTok(s.billedTotal)}</span>
        <span>💰 ${fmtCost(s.costUsd)}</span>
        <span>🧱 ${fmtTok(s.currentTotal)} (${s.usagePct}%)</span>
        <span>🔄 ${s.turns}T / ${s.steps}S</span>
        ${s.subagentsSpawned ? `<span class="agy-pill accent">🤖 ${s.subagentsSpawned}</span>` : ''}
        <span style="margin-left:auto">${fmtTime(s.lastActiveMs)}</span>
      </div>
    </div>`).join('');

    return `
      <div class="agy-row-between agy-flex-wrap">
        <div class="agy-seg">
          <button class="agy-seg-btn ${state.ovRange === 'today' ? 'active' : ''}" data-ovrange="today">${esc(t('rangeToday'))}</button>
          <button class="agy-seg-btn ${state.ovRange === '7d' ? 'active' : ''}" data-ovrange="7d">${esc(t('range7d'))}</button>
          <button class="agy-seg-btn ${state.ovRange === '30d' ? 'active' : ''}" data-ovrange="30d">${esc(t('range30d'))}</button>
          <button class="agy-seg-btn ${state.ovRange === 'all' ? 'active' : ''}" data-ovrange="all">${esc(t('rangeAll'))}</button>
        </div>
        <div class="agy-flex-wrap">${activeChips.join('')}</div>
      </div>

      <div class="agy-kpi-grid">
        <div class="agy-tile"><div class="agy-tile-k">🪙 ${esc(t('billedTotal'))}</div><div class="agy-tile-v">${fmtTok(kpi.billedTokens)}</div><div class="agy-tile-sub">${kpi.sessionsCount} sessions</div></div>
        <div class="agy-tile"><div class="agy-tile-k">💰 ${esc(t('estCost'))}</div><div class="agy-tile-v">${fmtCost(kpi.costUsd)}</div><div class="agy-tile-sub">Out: ${fmtTok(kpi.output)}</div></div>
        <div class="agy-tile"><div class="agy-tile-k">⚡ ${esc(t('cacheHit'))}</div><div class="agy-tile-v">${kpi.cacheHitRate !== null ? kpi.cacheHitRate + '%' : '-'}</div><div class="agy-tile-sub">Read: ${fmtTok(kpi.cacheRead)}</div></div>
        <div class="agy-tile"><div class="agy-tile-k">🔧 ${esc(t('toolCalls'))} / ⏱️</div><div class="agy-tile-v">${kpi.toolCalls} · ${fmtMs(kpi.activeMs)}</div><div class="agy-tile-sub">${kpi.turns} turns · ${kpi.steps} steps</div></div>
      </div>

      <div class="agy-grid-2">
        <section class="agy-card">
          <div class="agy-card-head"><span class="agy-card-title">📊 ${esc(t('chart7d'))}</span><span class="agy-small agy-muted">🟦 Token · 🟨 Cost</span></div>
          <svg viewBox="0 0 ${chartW} ${chartH}" style="width:100%;height:136px">
            <line x1="10" y1="110" x2="${chartW - 10}" y2="110" stroke="var(--border-l1)"/>
            ${d7Bars}
          </svg>
        </section>
        <section class="agy-card">
          <div class="agy-card-head"><span class="agy-card-title">🔥 ${esc(t('heatmap8w'))}</span><span class="agy-small agy-muted">点击日期筛选</span></div>
          <div class="agy-heatmap-grid">${heatCells}</div>
        </section>
      </div>

      <div class="agy-grid-2">
        <section class="agy-card">
          <div class="agy-card-head"><span class="agy-card-title">🍩 ${esc(t('aggComp'))}</span></div>
          <div class="agy-donut-wrap">
            ${renderDonutSvg(ov.composition || [], fmtTok(kpi.billedTokens), state.ovRange)}
            <div class="agy-legend">${ringLegend}</div>
          </div>
        </section>
        ${renderTally(t('topTools'), '🔧', ov.topTools || [], state.ovTool, 'data-ovtool')}
      </div>

      <div class="agy-grid-2">
        ${renderTally(t('topSkills'), '⚡', ov.topSkills || [], state.ovSkill, 'data-ovskill')}
        ${renderTally(t('topCmds'), '🖥️', ov.topCommands || [], state.ovCmd, 'data-ovcmd')}
      </div>

      <section class="agy-card">
        <div class="agy-card-head">
          <span class="agy-card-title">🗂️ ${esc(t('sessionCards'))}</span>
          <span class="agy-badge">${(ov.sessions || []).length}</span>
          <div class="agy-ctl-group">
            <input class="agy-input" id="ov-search" type="search" placeholder="${esc(t('searchPlaceholder'))}" value="${esc(state.ovSearch)}" style="width:130px"/>
            <select class="agy-select" id="ov-ws">
              <option value="">全部工作区</option>
              ${(ov.workspaces || []).map((w) => `<option value="${esc(w)}" ${state.ovWorkspace === w ? 'selected' : ''}>${esc(w)}</option>`).join('')}
            </select>
            <select class="agy-select" id="ov-sort">
              <option value="recent" ${state.ovSort === 'recent' ? 'selected' : ''}>${esc(t('sortRecent'))}</option>
              <option value="tokens" ${state.ovSort === 'tokens' ? 'selected' : ''}>${esc(t('sortTokens'))}</option>
              <option value="context" ${state.ovSort === 'context' ? 'selected' : ''}>${esc(t('sortContext'))}</option>
              <option value="cost" ${state.ovSort === 'cost' ? 'selected' : ''}>${esc(t('sortCost'))}</option>
            </select>
          </div>
        </div>
        <div class="agy-session-grid">${sessCards || `<div class="agy-empty">没有符合筛选条件的会话</div>`}</div>
      </section>
    `;
  }

  // ---------- Settings Tab ----------
  function renderSettingsTab() {
    const st = state.settings;
    return `<section class="agy-card">
      <div class="agy-card-head">
        <span class="agy-card-title">⚙️ ${esc(t('settingsTitle'))}</span>
        ${state.settingsToast ? `<span class="agy-pill ok">${esc(state.settingsToast)}</span>` : ''}
      </div>
      <div class="agy-settings-list">
        <div class="agy-setting-row">
          <span>${esc(t('setLang'))}</span>
          <select class="agy-select" data-set="lang">
            <option value="zh" ${st.lang === 'zh' ? 'selected' : ''}>简体中文</option>
            <option value="en" ${st.lang === 'en' ? 'selected' : ''}>English</option>
          </select>
        </div>
        <div class="agy-setting-row">
          <span>${esc(t('setCurrency'))}</span>
          <select class="agy-select" data-set="currency">
            <option value="usd" ${st.currency === 'usd' ? 'selected' : ''}>USD ($)</option>
            <option value="cny" ${st.currency === 'cny' ? 'selected' : ''}>CNY (¥)</option>
          </select>
        </div>
        <div class="agy-setting-row">
          <span>${esc(t('setTheme'))}</span>
          <select class="agy-select" data-set="theme">
            <option value="auto" ${st.theme === 'auto' ? 'selected' : ''}>${esc(t('themeAuto'))}</option>
            <option value="dark" ${st.theme === 'dark' ? 'selected' : ''}>${esc(t('themeDark'))}</option>
            <option value="light" ${st.theme === 'light' ? 'selected' : ''}>${esc(t('themeLight'))}</option>
          </select>
        </div>
        <div class="agy-setting-row">
          <span>${esc(t('setRange'))}</span>
          <select class="agy-select" data-set="defaultRange">
            <option value="today" ${st.defaultRange === 'today' ? 'selected' : ''}>${esc(t('rangeToday'))}</option>
            <option value="7d" ${st.defaultRange === '7d' ? 'selected' : ''}>${esc(t('range7d'))}</option>
            <option value="30d" ${st.defaultRange === '30d' ? 'selected' : ''}>${esc(t('range30d'))}</option>
            <option value="all" ${st.defaultRange === 'all' ? 'selected' : ''}>${esc(t('rangeAll'))}</option>
          </select>
        </div>
        <div class="agy-setting-row">
          <span>${esc(t('setGran'))}</span>
          <select class="agy-select" data-set="defaultGranularity">
            <option value="step" ${st.defaultGranularity === 'step' ? 'selected' : ''}>Step</option>
            <option value="turn" ${st.defaultGranularity === 'turn' ? 'selected' : ''}>Turn</option>
          </select>
        </div>
        <div class="agy-setting-row">
          <span>${esc(t('setMode'))}</span>
          <select class="agy-select" data-set="defaultTimelineMode">
            <option value="total" ${st.defaultTimelineMode === 'total' ? 'selected' : ''}>${esc(t('modeTotal'))}</option>
            <option value="delta" ${st.defaultTimelineMode === 'delta' ? 'selected' : ''}>${esc(t('modeDelta'))}</option>
            <option value="overview" ${st.defaultTimelineMode === 'overview' ? 'selected' : ''}>${esc(t('modeOverview'))}</option>
          </select>
        </div>
        <div class="agy-setting-row">
          <span>${esc(t('setAutoOverview'))}</span>
          <select class="agy-select" data-set-num="overviewAutoSteps">
            <option value="0" ${Number(st.overviewAutoSteps) === 0 ? 'selected' : ''}>Off</option>
            <option value="100" ${Number(st.overviewAutoSteps) === 100 ? 'selected' : ''}>100</option>
            <option value="150" ${Number(st.overviewAutoSteps) === 150 ? 'selected' : ''}>150</option>
            <option value="200" ${Number(st.overviewAutoSteps) === 200 ? 'selected' : ''}>200</option>
            <option value="300" ${Number(st.overviewAutoSteps) === 300 ? 'selected' : ''}>300</option>
          </select>
        </div>
        <div class="agy-setting-row">
          <span>${esc(t('setDur'))}</span>
          <input type="checkbox" data-set-bool="showDurationCurve" ${st.showDurationCurve ? 'checked' : ''}/>
        </div>
        <div class="agy-setting-row">
          <span>${esc(t('setAutoRefresh'))}</span>
          <input class="agy-input" type="number" min="0" max="120" step="1" data-set-num="autoRefreshSec" value="${st.autoRefreshSec}" style="width:80px"/>
        </div>
      </div>
      <div class="agy-small agy-muted" style="margin-top:12px">
        AGY Context v1.1.0 · Ported for Google Antigravity from <b>bowenliang123/dsh-context</b> (Apache-2.0)
      </div>
    </section>`;
  }

  // ---------- File Preview Drawer ----------
  async function openFileDrawer(filePath) {
    const drawer = document.getElementById('file-drawer');
    drawer.classList.remove('hidden');
    drawer.innerHTML = `<div class="agy-drawer-panel"><div class="agy-row-between"><b>${esc(t('filePreview'))}</b><button class="agy-icon-btn" id="close-drawer">${esc(t('close'))}</button></div><div class="agy-loading"><div class="agy-spinner"></div></div></div>`;
    try {
      const res = await apiFetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) throw new Error(res.error || 'Unable to read file');
      drawer.innerHTML = `<div class="agy-drawer-panel">
        <div class="agy-row-between">
          <div style="min-width:0"><b class="agy-mono" style="word-break:break-all">${esc(filePath)}</b><div class="agy-small agy-muted">${res.size.toLocaleString()} bytes ${res.truncated ? '(truncated to 256KB)' : ''}</div></div>
          <button class="agy-icon-btn" id="close-drawer">✕ ${esc(t('close'))}</button>
        </div>
        <pre class="agy-pre" style="flex:1;max-height:none">${esc(res.content)}</pre>
      </div>`;
    } catch (err) {
      drawer.innerHTML = `<div class="agy-drawer-panel">
        <div class="agy-row-between"><b>${esc(t('filePreview'))}</b><button class="agy-icon-btn" id="close-drawer">✕</button></div>
        <div class="agy-empty">${esc(err.message)}</div>
      </div>`;
    }
  }

  // ---------- Main Render ----------
  function render() {
    const root = document.getElementById('app');
    if (!root) return;
    if (state.loading && !state.session && !state.overview) {
      root.innerHTML = `<div class="agy-loading"><div class="agy-spinner"></div><span>Loading AGY Context…</span></div>`;
      return;
    }

    let mainHtml = '';
    if (state.tab === 'context') mainHtml = renderContextTab();
    else if (state.tab === 'fleet') mainHtml = renderFleetTab();
    else if (state.tab === 'insights') mainHtml = renderInsightsTab();
    else mainHtml = renderSettingsTab();

    root.innerHTML = `${renderHeader()}<main class="agy-main">${mainHtml}</main>`;
    bindInputs();
    if (state.tab === 'context' && !state.pinnedSeq) {
      const tlScroll = root.querySelector('.agy-tl-scroll');
      if (tlScroll) tlScroll.scrollLeft = tlScroll.scrollWidth;
    }
  }

  function bindInputs() {
    const pick = document.getElementById('session-picker');
    if (pick) pick.onchange = (e) => void selectSession(e.target.value);

    const stepPick = document.getElementById('browser-step-pick');
    if (stepPick) stepPick.onchange = (e) => {
      const v = parseInt(e.target.value, 10);
      state.pinnedSeq = Number.isFinite(v) ? v : null;
      render();
    };

    const brSearch = document.getElementById('browser-search');
    if (brSearch) brSearch.oninput = (e) => { state.browserSearch = e.target.value; render(); restoreFocus('browser-search'); };

    const fSearch = document.getElementById('file-search');
    if (fSearch) fSearch.oninput = (e) => { state.fileSearch = e.target.value; render(); restoreFocus('file-search'); };

    const fSort = document.getElementById('file-sort');
    if (fSort) fSort.onchange = (e) => { state.fileSort = e.target.value; render(); };

    const cSearch = document.getElementById('cmd-search');
    if (cSearch) cSearch.oninput = (e) => { state.cmdSearch = e.target.value; render(); restoreFocus('cmd-search'); };

    const flSearch = document.getElementById('fleet-search');
    if (flSearch) flSearch.oninput = (e) => { state.fleetSearch = e.target.value; render(); restoreFocus('fleet-search'); };

    const ovSearch = document.getElementById('ov-search');
    if (ovSearch) ovSearch.oninput = (e) => { state.ovSearch = e.target.value; void loadOverviewOnly().then(() => restoreFocus('ov-search')); };

    const ovWs = document.getElementById('ov-ws');
    if (ovWs) ovWs.onchange = (e) => { state.ovWorkspace = e.target.value; void loadOverviewOnly(); };

    const ovSort = document.getElementById('ov-sort');
    if (ovSort) ovSort.onchange = (e) => { state.ovSort = e.target.value; void loadOverviewOnly(); };
  }

  function restoreFocus(id) {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      if (typeof el.setSelectionRange === 'function') {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  }

  // ---------- Event Delegation ----------
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.id === 'close-drawer' || target.id === 'file-drawer') {
      document.getElementById('file-drawer').classList.add('hidden');
      return;
    }

    const previewBtn = target.closest('[data-preview-file]');
    if (previewBtn) {
      e.stopPropagation();
      void openFileDrawer(previewBtn.getAttribute('data-preview-file'));
      return;
    }

    const openAgy = target.closest('[data-action="open-agy"]');
    if (openAgy) {
      const id = openAgy.getAttribute('data-id');
      if (window.sidecar && window.sidecar.ui && window.sidecar.ui.toggleConversation) {
        window.sidecar.ui.toggleConversation(id);
      }
      return;
    }

    const openSess = target.closest('[data-open-sess]');
    if (openSess) {
      e.stopPropagation();
      void selectSession(openSess.getAttribute('data-open-sess'), 'context');
      return;
    }

    const tabBtn = target.closest('[data-tab]');
    if (tabBtn) {
      state.tab = tabBtn.getAttribute('data-tab');
      render();
      return;
    }

    const actBtn = target.closest('[data-action]');
    if (actBtn) {
      const act = actBtn.getAttribute('data-action');
      if (act === 'refresh') void loadAll(false);
      else if (act === 'toggle-dur') { state.showDur = !state.showDur; render(); }
      else if (act === 'unpin') { state.pinnedSeq = null; render(); }
      else if (act === 'toggle-quiet') { state.hideQuietLanes = !state.hideQuietLanes; render(); }
      return;
    }

    const pinEl = target.closest('[data-pin-seq]');
    if (pinEl) {
      const seq = parseInt(pinEl.getAttribute('data-pin-seq'), 10);
      if (Number.isFinite(seq)) {
        state.pinnedSeq = state.pinnedSeq === seq ? null : seq;
        render();
        const sc = pinEl.getAttribute('data-scroll');
        if (sc) document.getElementById(sc)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const scrollEl = target.closest('[data-scroll]');
    if (scrollEl) {
      document.getElementById(scrollEl.getAttribute('data-scroll'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const jumpFile = target.closest('[data-jump-file]');
    if (jumpFile) {
      state.fileFilter = jumpFile.getAttribute('data-jump-file');
      render();
      document.getElementById('sec-files')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const jumpCat = target.closest('[data-jump-cat]');
    if (jumpCat) {
      const cat = jumpCat.getAttribute('data-jump-cat');
      state.browserMode = 'cat';
      state.expandedCats.add(cat);
      render();
      document.getElementById('sec-browser')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const granBtn = target.closest('[data-gran]');
    if (granBtn) { state.granularity = granBtn.getAttribute('data-gran'); state.tlAnimSeq++; render(); return; }

    const tlBtn = target.closest('[data-tlmode]');
    if (tlBtn) { state.tlMode = tlBtn.getAttribute('data-tlmode'); state.tlManualMode = true; state.tlAnimSeq++; render(); return; }

    const focusBtn = target.closest('[data-focus-cat]');
    if (focusBtn) {
      const k = focusBtn.getAttribute('data-focus-cat');
      state.focusedCat = state.focusedCat === k ? '' : k;
      state.tlAnimSeq++;
      render();
      return;
    }

    const brBtn = target.closest('[data-brmode]');
    if (brBtn) { state.browserMode = brBtn.getAttribute('data-brmode'); render(); return; }

    const akBtn = target.closest('[data-akind]');
    if (akBtn) { state.assistKind = akBtn.getAttribute('data-akind'); render(); return; }

    const catHead = target.closest('[data-toggle-cat]');
    if (catHead) {
      const k = catHead.getAttribute('data-toggle-cat');
      if (state.expandedCats.has(k)) state.expandedCats.delete(k); else state.expandedCats.add(k);
      render();
      return;
    }

    const nodeRow = target.closest('[data-toggle-node]');
    if (nodeRow) {
      const id = nodeRow.getAttribute('data-toggle-node');
      if (state.expandedNodes.has(id)) state.expandedNodes.delete(id); else state.expandedNodes.add(id);
      render();
      return;
    }

    const evfBtn = target.closest('[data-evf]');
    if (evfBtn) { state.eventFilter = evfBtn.getAttribute('data-evf'); render(); return; }

    const ffBtn = target.closest('[data-ff]');
    if (ffBtn) { state.fileFilter = ffBtn.getAttribute('data-ff'); render(); return; }

    const fileRow = target.closest('[data-toggle-file]');
    if (fileRow) {
      const p = fileRow.getAttribute('data-toggle-file');
      if (state.expandedFiles.has(p)) state.expandedFiles.delete(p); else state.expandedFiles.add(p);
      render();
      return;
    }

    const cmdSt = target.closest('[data-cmdst]');
    if (cmdSt) { state.cmdStatus = cmdSt.getAttribute('data-cmdst'); render(); return; }

    const cmdProg = target.closest('[data-cmdprog]');
    if (cmdProg) {
      const p = cmdProg.getAttribute('data-cmdprog');
      state.cmdProg = state.cmdProg === p ? '' : p;
      render();
      return;
    }

    const cmdRow = target.closest('[data-toggle-cmd]');
    if (cmdRow) {
      const id = cmdRow.getAttribute('data-toggle-cmd');
      if (state.expandedCmds.has(id)) state.expandedCmds.delete(id); else state.expandedCmds.add(id);
      render();
      return;
    }

    // Fleet interactions
    const agBtn = target.closest('[data-select-agent]');
    if (agBtn) {
      const id = agBtn.getAttribute('data-select-agent');
      state.selectedAgentId = state.selectedAgentId === id ? '' : id;
      render();
      return;
    }

    const foBtn = target.closest('[data-forder]');
    if (foBtn) { state.fleetOrder = foBtn.getAttribute('data-forder'); render(); return; }

    const tstBtn = target.closest('[data-tst]');
    if (tstBtn) { state.taskStatus = tstBtn.getAttribute('data-tst'); render(); return; }

    const taskRow = target.closest('[data-toggle-task]');
    if (taskRow) {
      const id = taskRow.getAttribute('data-toggle-task');
      if (state.expandedTasks.has(id)) state.expandedTasks.delete(id); else state.expandedTasks.add(id);
      render();
      return;
    }

    const ckBtn = target.closest('[data-ckind]');
    if (ckBtn) { state.commKind = ckBtn.getAttribute('data-ckind'); render(); return; }

    const commRow = target.closest('[data-select-comm]');
    if (commRow) { state.selectedCommId = commRow.getAttribute('data-select-comm'); render(); return; }

    // Insights interactions
    const ovr = target.closest('[data-ovrange]');
    if (ovr) {
      state.ovRange = ovr.getAttribute('data-ovrange');
      state.ovDay = '';
      void apiFetch('/api/settings', { method: 'POST', body: JSON.stringify({ defaultRange: state.ovRange }) });
      void loadOverviewOnly();
      return;
    }

    const ovd = target.closest('[data-ovday]');
    if (ovd) {
      const d = ovd.getAttribute('data-ovday');
      state.ovDay = state.ovDay === d ? '' : d;
      void loadOverviewOnly();
      return;
    }

    const ovs = target.closest('[data-ovskill]');
    if (ovs) { const v = ovs.getAttribute('data-ovskill'); state.ovSkill = state.ovSkill === v ? '' : v; void loadOverviewOnly(); return; }

    const ovt = target.closest('[data-ovtool]');
    if (ovt) { const v = ovt.getAttribute('data-ovtool'); state.ovTool = state.ovTool === v ? '' : v; void loadOverviewOnly(); return; }

    const ovc = target.closest('[data-ovcmd]');
    if (ovc) { const v = ovc.getAttribute('data-ovcmd'); state.ovCmd = state.ovCmd === v ? '' : v; void loadOverviewOnly(); return; }

    const clr = target.closest('[data-clear]');
    if (clr) { state[clr.getAttribute('data-clear')] = ''; void loadOverviewOnly(); return; }
  });

  // Settings change delegation
  document.addEventListener('change', async (e) => {
    const el = e.target;
    const patch = {};
    if (el.hasAttribute('data-set')) patch[el.getAttribute('data-set')] = el.value;
    else if (el.hasAttribute('data-set-bool')) patch[el.getAttribute('data-set-bool')] = Boolean(el.checked);
    else if (el.hasAttribute('data-set-num')) patch[el.getAttribute('data-set-num')] = Math.max(0, parseInt(el.value, 10) || 0);
    else return;

    const res = await apiFetch('/api/settings', { method: 'POST', body: JSON.stringify(patch) });
    if (res && res.settings) {
      state.settings = res.settings;
      if (patch.defaultGranularity) state.granularity = patch.defaultGranularity;
      if (patch.defaultTimelineMode) state.tlMode = patch.defaultTimelineMode;
      if (patch.showDurationCurve !== undefined) state.showDur = patch.showDurationCurve;
      if (patch.defaultRange) state.ovRange = patch.defaultRange;
      applyTheme();
      scheduleAutoRefresh();
      state.settingsToast = t('saved');
      render();
      setTimeout(() => { state.settingsToast = ''; if (state.tab === 'settings') render(); }, 1800);
    }
  });

  // Hover Tooltip
  const tipEl = document.getElementById('hover-tip');
  document.addEventListener('mousemove', (e) => {
    const el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (!el) {
      tipEl.classList.remove('show');
      return;
    }
    tipEl.textContent = el.getAttribute('data-tip');
    tipEl.classList.add('show');
    const pad = 12;
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    if (x + 280 > window.innerWidth) x = Math.max(8, e.clientX - 280);
    if (y + 60 > window.innerHeight) y = Math.max(8, e.clientY - 52);
    tipEl.style.left = `${x}px`;
    tipEl.style.top = `${y}px`;
  });

  // Boot
  async function boot() {
    const bootData = window.__SIDECAR_BOOT__ || {};
    const params = new URLSearchParams(window.location.search);
    state.currentConvId = params.get('conversationId') || bootData.conversationId || (window.sidecar && window.sidecar.conversationId) || '';
    state.embedMode = params.get('embed') === '1';
    const initTab = params.get('tab');
    if (initTab && ['context', 'fleet', 'insights', 'settings'].includes(initTab)) {
      state.tab = initTab;
    }

    window.addEventListener('message', (event) => {
      const d = event.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'agy-switch-tab' && d.payload) {
        const nextTab = d.payload.tab;
        const nextConv = d.payload.conversationId;
        if (nextTab && ['context', 'fleet', 'insights', 'settings'].includes(nextTab)) {
          state.tab = nextTab;
        }
        if (nextConv && nextConv !== state.currentConvId) {
          void selectSession(nextConv, state.tab);
        } else {
          render();
        }
      }
    });

    if (window.sidecar && window.sidecar.onThemeChange) {
      window.sidecar.onThemeChange((vars) => applyTheme(vars));
    }

    try {
      const sRes = await apiFetch('/api/settings');
      if (sRes && sRes.settings) {
        state.settings = sRes.settings;
        state.ovRange = sRes.settings.defaultRange || '30d';
        state.granularity = sRes.settings.defaultGranularity || 'step';
        state.tlMode = sRes.settings.defaultTimelineMode || 'total';
        state.showDur = sRes.settings.showDurationCurve !== false;
      }
    } catch {}
    applyTheme();
    await loadAll(false);
    scheduleAutoRefresh();
  }

  void boot();
})();
