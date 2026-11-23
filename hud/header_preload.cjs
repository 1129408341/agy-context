// ===== AGY_CONTEXT_HEADER_BEGIN =====
(function () {
  try {
    if (window.top !== window || globalThis.__AGY_CONTEXT_HEADER_PRELOAD__) return;
    globalThis.__AGY_CONTEXT_HEADER_PRELOAD__ = true;

    const { ipcRenderer } = require('electron');

    const IDS = {
      style: 'agy-context-header-style',
      bar: 'agy-context-header-tabs',
      host: 'agy-context-embed-host',
      frame: 'agy-context-embed-frame',
    };

    const CSS = `
#${IDS.bar} {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  min-height: 32px;
  padding: 0 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--border, rgba(148,163,184,0.18)) 85%, transparent);
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 12.5px;
  user-select: none;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
  z-index: 40;
  position: relative;
}
#${IDS.bar} .agy-htab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: var(--muted-foreground, #94a3b8);
  font-size: 12.5px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.14s ease;
  -webkit-app-region: no-drag;
}
#${IDS.bar} .agy-htab:hover {
  color: var(--foreground, #e5e9f0);
}
#${IDS.bar} .agy-htab.is-active {
  color: #60a5fa;
  font-weight: 600;
}
#${IDS.bar} .agy-htab.is-active::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: #60a5fa;
}
#${IDS.bar} .agy-hpill {
  display: inline-flex;
  align-items: center;
  padding: 0 5px;
  height: 16px;
  border-radius: 99px;
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: rgba(148, 163, 184, 0.14);
  color: var(--muted-foreground, #94a3b8);
}
#${IDS.bar} .agy-hpill.is-warn {
  background: rgba(245, 158, 11, 0.16);
  color: #f59e0b;
}
#${IDS.bar} .agy-hpill.is-err {
  background: rgba(239, 68, 68, 0.18);
  color: #ef4444;
}
#${IDS.bar} .agy-hpill.is-run {
  background: rgba(16, 185, 129, 0.16);
  color: #10b981;
}
#${IDS.bar} .agy-hright {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
#${IDS.bar} .agy-hicon {
  border: 0;
  background: transparent;
  color: var(--muted-foreground, #94a3b8);
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  -webkit-app-region: no-drag;
}
#${IDS.bar} .agy-hicon:hover {
  background: rgba(148, 163, 184, 0.14);
  color: var(--foreground, #e5e9f0);
}
#${IDS.host} {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 76px;
  z-index: 39;
  background: var(--background, #0d1017);
  display: none;
  flex-direction: column;
}
#${IDS.host}.is-open {
  display: flex;
}
#${IDS.frame} {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  background: transparent;
}
`;

    let activeTab = 'chat'; // chat | context | fleet | insights | settings
    let currentConvId = '';
    let serverInfo = null;
    let lastSummary = null;
    let mountedView = null;
    let frameLoadedForServer = '';
    let summaryTimer = null;

    function isVisibleEl(el) {
      if (!el || !el.isConnected) return false;
      const r = el.getBoundingClientRect();
      return r.width > 80 && r.height > 80;
    }

    function findActiveConversationView() {
      const views = Array.from(document.querySelectorAll('[data-testid="conversation-view"]')).filter(isVisibleEl);
      if (views.length === 0) return null;
      const loc = `${window.location.pathname || ''} ${window.location.hash || ''}`;
      const m = loc.match(/\/c\/([0-9a-f-]{8,})/i);
      const urlId = m ? m[1].toLowerCase() : '';
      if (urlId) {
        const hit = views.find((v) => (v.getAttribute('data-cascade-id') || '').toLowerCase() === urlId);
        if (hit) return hit;
      }
      return views[views.length - 1];
    }

    function detectConvId(view) {
      if (view) {
        const attr = (view.getAttribute('data-cascade-id') || '').trim();
        if (/^[0-9a-f-]{8,}$/i.test(attr)) return attr.toLowerCase();
      }
      const loc = `${window.location.pathname || ''} ${window.location.hash || ''}`;
      const m = loc.match(/\/c\/([0-9a-f-]{8,})/i);
      return m ? m[1].toLowerCase() : '';
    }

    function injectStyle() {
      if (document.getElementById(IDS.style)) return;
      const st = document.createElement('style');
      st.id = IDS.style;
      st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
    }

    function computeThemePayload() {
      const cs = getComputedStyle(document.documentElement);
      const bodyCs = document.body ? getComputedStyle(document.body) : cs;
      const bg = bodyCs.backgroundColor || cs.getPropertyValue('--background').trim() || '';
      const fg = bodyCs.color || cs.getPropertyValue('--foreground').trim() || '';
      const isLight = (() => {
        const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) return false;
        return (0.299 * Number(m[1]) + 0.587 * Number(m[2]) + 0.114 * Number(m[3])) / 255 > 0.55;
      })();
      return {
        isLight,
        cssVariables: isLight
          ? { '--vscode-editor-background': '#ffffff', '--vscode-sideBar-background': '#f3f5f9', '--vscode-foreground': '#0f172a' }
          : { '--vscode-editor-background': '#141923', '--vscode-sideBar-background': '#0d1017', '--vscode-foreground': fg || '#e5e9f0' },
      };
    }

    function syncIframeState() {
      const frame = document.getElementById(IDS.frame);
      if (!frame || !frame.contentWindow) return;
      try {
        frame.contentWindow.postMessage({ type: 'theme-change', payload: computeThemePayload() }, '*');
        if (activeTab !== 'chat') {
          frame.contentWindow.postMessage(
            { type: 'agy-switch-tab', payload: { tab: activeTab, conversationId: currentConvId } },
            '*'
          );
        }
      } catch {}
    }

    function positionHost() {
      const bar = document.getElementById(IDS.bar);
      const host = document.getElementById(IDS.host);
      if (!bar || !host || !mountedView) return;
      const viewRect = mountedView.getBoundingClientRect();
      const barRect = bar.getBoundingClientRect();
      const topOffset = Math.max(32, Math.round(barRect.bottom - viewRect.top));
      host.style.top = `${topOffset}px`;
    }

    function renderBar() {
      const bar = document.getElementById(IDS.bar);
      if (!bar) return;
      const pct = lastSummary && typeof lastSummary.usagePct === 'number' ? lastSummary.usagePct : null;
      const pctCls = pct !== null ? (pct >= 80 ? 'is-err' : (pct >= 55 ? 'is-warn' : '')) : '';
      const pctBadge = pct !== null ? `<span class="agy-hpill ${pctCls}">${Math.round(pct)}%</span>` : '';
      const fam = lastSummary && lastSummary.familySize ? lastSummary.familySize : 1;
      const famRun = lastSummary && lastSummary.runningCount > 0;
      const famBadge = `<span class="agy-hpill ${famRun ? 'is-run' : ''}">${fam}</span>`;

      bar.innerHTML = `
        <button class="agy-htab ${activeTab === 'chat' ? 'is-active' : ''}" data-agy-htab="chat">对话</button>
        <button class="agy-htab ${activeTab === 'context' ? 'is-active' : ''}" data-agy-htab="context">上下文 ${pctBadge}</button>
        <button class="agy-htab ${activeTab === 'fleet' ? 'is-active' : ''}" data-agy-htab="fleet">编队 ${famBadge}</button>
        <button class="agy-htab ${activeTab === 'insights' ? 'is-active' : ''}" data-agy-htab="insights">洞察</button>
        <div class="agy-hright">
          <button class="agy-hicon" data-agy-htab="settings" title="AGY Context 偏好设置">⚙</button>
          <button class="agy-hicon" data-agy-hact="popout" title="在独立浏览器中打开">↗</button>
        </div>
      `;
    }

    async function setActiveTab(tab) {
      activeTab = tab;
      renderBar();
      const host = document.getElementById(IDS.host);
      const frame = document.getElementById(IDS.frame);
      if (!host || !frame) return;

      if (tab === 'chat') {
        host.classList.remove('is-open');
        return;
      }

      positionHost();
      host.classList.add('is-open');

      if (!serverInfo || !serverInfo.ok) {
        serverInfo = await ipcRenderer.invoke('agy-context-header:ensure-server').catch(() => null);
      }
      if (!serverInfo || !serverInfo.ok) return;

      const serverKey = `${serverInfo.port}:${serverInfo.token}`;
      if (frameLoadedForServer !== serverKey) {
        const qs = new URLSearchParams({
          embed: '1',
          tab,
          conversationId: currentConvId || '',
          token: serverInfo.token || '',
        });
        frameLoadedForServer = serverKey;
        frame.onload = () => syncIframeState();
        frame.src = `http://127.0.0.1:${serverInfo.port}/ui.html?${qs.toString()}`;
      } else {
        syncIframeState();
      }
    }

    function mountIntoView(view) {
      if (!view) return;
      injectStyle();
      const cs = getComputedStyle(view);
      if (cs.position === 'static') {
        view.style.position = 'relative';
      }

      let bar = document.getElementById(IDS.bar);
      if (!bar) {
        bar = document.createElement('div');
        bar.id = IDS.bar;
        bar.addEventListener('click', (e) => {
          const btn = e.target && e.target.closest ? e.target.closest('[data-agy-htab]') : null;
          if (btn) {
            void setActiveTab(btn.getAttribute('data-agy-htab'));
            return;
          }
          const act = e.target && e.target.closest ? e.target.closest('[data-agy-hact]') : null;
          if (act && act.getAttribute('data-agy-hact') === 'popout') {
            void ipcRenderer.invoke('agy-context-header:ensure-server').then((srv) => {
              if (srv && srv.ok) {
                const qs = new URLSearchParams({
                  tab: activeTab === 'chat' ? 'context' : activeTab,
                  conversationId: currentConvId || '',
                  token: srv.token || '',
                });
                void ipcRenderer.invoke('agy-context-header:open-external', `http://127.0.0.1:${srv.port}/ui.html?${qs}`);
              }
            });
          }
        });
      }

      let host = document.getElementById(IDS.host);
      if (!host) {
        host = document.createElement('div');
        host.id = IDS.host;
        const frame = document.createElement('iframe');
        frame.id = IDS.frame;
        host.appendChild(frame);
      }

      // Insert tab bar cleanly right below the top header row inside conversation-view (or at top of view)
      if (bar.parentElement !== view) {
        const firstChild = view.firstElementChild;
        const firstRect = firstChild ? firstChild.getBoundingClientRect() : null;
        if (firstChild && firstRect && firstRect.height >= 28 && firstRect.height <= 68 && firstChild !== host) {
          firstChild.insertAdjacentElement('afterend', bar);
        } else {
          view.insertBefore(bar, view.firstChild);
        }
      }

      if (host.parentElement !== view) {
        view.appendChild(host);
      }

      mountedView = view;
      renderBar();
      if (activeTab !== 'chat') positionHost();
    }

    async function refreshSummary() {
      if (!currentConvId) return;
      const res = await ipcRenderer.invoke('agy-context-header:summary', currentConvId).catch(() => null);
      if (res && res.ok) {
        lastSummary = res;
        if (res.port) serverInfo = { ok: true, port: res.port, token: res.token || '' };
        renderBar();
      }
    }

    function syncDom() {
      const view = findActiveConversationView();
      if (!view) return;
      const nextId = detectConvId(view);
      if (view !== mountedView || !document.getElementById(IDS.bar)) {
        mountIntoView(view);
      }
      if (nextId && nextId !== currentConvId) {
        currentConvId = nextId;
        lastSummary = null;
        if (activeTab !== 'chat') {
          void setActiveTab('chat');
        } else {
          renderBar();
        }
        void refreshSummary();
      }
    }

    function boot() {
      syncDom();
      const obs = new MutationObserver(() => syncDom());
      obs.observe(document.documentElement, { childList: true, subtree: true });
      window.addEventListener('resize', () => { if (activeTab !== 'chat') positionHost(); });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activeTab !== 'chat') {
          void setActiveTab('chat');
        }
      });
      summaryTimer = setInterval(() => {
        syncDom();
        void refreshSummary();
      }, 6000);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  } catch {}
})();
// ===== AGY_CONTEXT_HEADER_END =====
