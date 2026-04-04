/* ChatGPT Conversation Navigator — content.js v1.0
   
   ChatGPT DOM analysis (chatgpt.com, April 2025):
   ─────────────────────────────────────────────────
   Top navbar:        64px  (OpenAI logo, model picker, share)
   Chat content:      scrolls inside main > div[class*="react-scroll"]
                      OR the window itself for shorter chats
   Message nodes:     article[data-testid^="conversation-turn-"]
   User turns:        article where div[data-message-author-role="user"] exists
   Assistant turns:   article where div[data-message-author-role="assistant"] exists
   Input bar:         ~80px fixed at bottom
   
   ChatGPT color palette (dark mode default):
   ─────────────────────────────────────────────────
   --main-surface-primary:    #212121   (main bg)
   --main-surface-secondary:  #2f2f2f   (sidebar bg)
   --main-surface-tertiary:   #424242   (hover states)
   --text-primary:            #ececec
   --text-secondary:          #8e8ea0
   --text-tertiary:           #6e6e80
   --border-light:            rgba(255,255,255,0.1)
   --green-accent:            #10a37f   (OpenAI green)
   
   Light mode:
   --main-surface-primary:    #ffffff
   --main-surface-secondary:  #f9f9f9
   --main-surface-tertiary:   #efefef
   --text-primary:            #0d0d0d
   --text-secondary:          #6e6e80
*/

(function () {
  "use strict";
  if (document.getElementById("gptn-sidebar")) return;

  /* ── Icons ── */
  const svg = (d) =>
    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

  const I = {
    chevron  : svg('<polyline points="11 4 5 8 11 12"/>'),
    close    : svg('<line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>'),
    search   : svg('<circle cx="6.5" cy="6.5" r="4"/><line x1="10" y1="10" x2="14" y2="14"/>'),
    nav      : svg('<rect x="2" y="3" width="12" height="2" rx="1"/><rect x="2" y="7" width="8" height="2" rx="1"/><rect x="2" y="11" width="10" height="2" rx="1"/>'),
    user     : svg('<circle cx="8" cy="5" r="3"/><path d="M2 14s1-4 6-4 6 4 6 4"/>'),
    gpt      : svg('<circle cx="8" cy="8" r="5.5"/><path d="M5.5 8 Q8 4 10.5 8 Q8 12 5.5 8Z" stroke-width="1.2"/>'),
    up       : svg('<line x1="8" y1="13" x2="8" y2="3"/><polyline points="4 7 8 3 12 7"/>'),
    down     : svg('<line x1="8" y1="3" x2="8" y2="13"/><polyline points="4 9 8 13 12 9"/>'),
    empty    : svg('<rect x="2" y="4" width="12" height="8" rx="1" stroke-dasharray="2 1.5"/><line x1="5" y1="8" x2="11" y2="8"/>'),
  };

  /* ── State ── */
  let open        = false;
  let messages    = [];
  let query       = "";
  let activeIdx   = -1;
  let scanTimer   = null;
  let searchTimer = null;
  let observer    = null;
  let lastUrl     = location.href;

  /* ── Build DOM ── */
  function buildUI() {
    const btn = document.createElement("button");
    btn.id = "gptn-btn";
    btn.title = "Conversation Navigator (Ctrl+Shift+N)";
    btn.setAttribute("aria-label", "Toggle conversation navigator");
    btn.innerHTML = I.chevron;

    const panel = document.createElement("div");
    panel.id = "gptn-panel";
    panel.setAttribute("role", "complementary");
    panel.innerHTML = `
      <div id="gptn-head">
        <div id="gptn-title">${I.nav}<span>Navigator</span><span id="gptn-count">0</span></div>
        <button id="gptn-x" aria-label="Close">${I.close}</button>
      </div>
      <div id="gptn-bar"><div id="gptn-fill"></div></div>
      <div id="gptn-searchbox">
        <span id="gptn-searchico">${I.search}</span>
        <input id="gptn-q" type="text" placeholder="Search messages…"
               autocomplete="off" spellcheck="false" aria-label="Search messages"/>
      </div>
      <div id="gptn-list" role="list"></div>
      <div id="gptn-foot">
        <span id="gptn-info">0 messages</span>
        <div>
          <button id="gptn-top"  title="Oldest message">${I.up}</button>
          <button id="gptn-btm"  title="Newest message">${I.down}</button>
        </div>
      </div>`;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    btn.addEventListener("click", toggle);
    panel.querySelector("#gptn-x").addEventListener("click", close);
    panel.querySelector("#gptn-q").addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { query = e.target.value.trim(); renderList(); }, 150);
    });
    panel.querySelector("#gptn-top").addEventListener("click", () => jumpTo(0));
    panel.querySelector("#gptn-btm").addEventListener("click", () => jumpTo(messages.length - 1));

    /* Progress bar — ChatGPT scrolls inside main, not window */
    window.addEventListener("scroll", updateBar, { passive: true });
    setTimeout(() => {
      const scroller = getScrollEl();
      if (scroller && scroller !== window) {
        scroller.addEventListener("scroll", updateBar, { passive: true });
      }
    }, 2000);
  }

  /* ── Open / close / toggle ── */
  function toggle() { open ? close() : openPanel(); }

  function openPanel() {
    open = true;
    apply();
    scan();
    startObserver();
  }

  function close() {
    open = false;
    apply();
    stopObserver();
  }

  function apply() {
    const panel = document.getElementById("gptn-panel");
    const btn   = document.getElementById("gptn-btn");
    if (!panel || !btn) return;
    panel.classList.toggle("gptn-open", open);
    btn.classList.toggle("gptn-open", open);
    btn.title = open ? "Close Navigator (Ctrl+Shift+N)" : "Open Navigator (Ctrl+Shift+N)";
  }

  /* ── ChatGPT message scanning ──────────────────────────────
     Primary selector:  article[data-testid^="conversation-turn-"]
     Role detection:    div[data-message-author-role] inside the article
     Fallback:          div.group with alternating pattern
  ──────────────────────────────────────────────────────────── */
  function getNodes() {
    /* Primary — most reliable across ChatGPT updates */
    let nodes = document.querySelectorAll('article[data-testid^="conversation-turn-"]');
    if (nodes.length > 0) return Array.from(nodes).slice(0, 600);

    /* Fallback 1: role attribute */
    nodes = document.querySelectorAll('[data-message-author-role]');
    if (nodes.length > 0) return Array.from(nodes).slice(0, 600);

    /* Fallback 2: main content children */
    const main = document.querySelector('main');
    if (main) {
      const kids = Array.from(main.querySelectorAll('div[class]')).filter(el =>
        el.children.length > 0 && el.textContent.trim().length > 20
      );
      if (kids.length > 0) return kids.slice(0, 600);
    }

    return [];
  }

  function getRole(node) {
    /* Check inside the article for a role-bearing child */
    const roleEl = node.querySelector('[data-message-author-role]');
    if (roleEl) {
      const r = roleEl.getAttribute('data-message-author-role');
      if (r === 'user')      return 'user';
      if (r === 'assistant') return 'assistant';
    }
    /* Check the testid suffix — even numbers tend to be user, odd assistant */
    const testId = node.getAttribute('data-testid') || '';
    const match  = testId.match(/conversation-turn-(\d+)/);
    if (match) {
      return parseInt(match[1], 10) % 2 === 1 ? 'user' : 'assistant';
    }
    /* Positional fallback */
    const siblings = Array.from(node.parentElement?.children || []);
    return siblings.indexOf(node) % 2 === 0 ? 'user' : 'assistant';
  }

  /* Safe text extraction with TreeWalker — no cloneNode */
  function getText(node) {
    let out = "";
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.id && p.id.startsWith("gptn")) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest("#gptn-panel,#gptn-btn")) return NodeFilter.FILTER_REJECT;
        /* Skip code blocks */
        if (p.closest && p.closest("pre,code")) return NodeFilter.FILTER_SKIP;
        /* Skip buttons and hidden elements */
        if (p.closest && p.closest("button,[aria-hidden='true'],svg")) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      out += n.textContent;
      if (out.length >= 250) break;
    }
    return out.replace(/\s+/g, " ").trim();
  }

  function scan() {
    const nodes  = getNodes();
    const newLen = nodes.length;
    const lastTxt = newLen ? getText(nodes[newLen - 1]) : "";
    const prevLen = messages.length;
    const prevLast = prevLen ? messages[prevLen - 1].text : "";

    if (newLen === prevLen && lastTxt === prevLast) return;

    messages = nodes.map((node, i) => ({
      index : i,
      role  : getRole(node),
      text  : (i < newLen - 1 && messages[i]) ? messages[i].text : getText(node),
      node,
    }));

    renderList();
    updateFooter();
  }

  /* ── Render ── */
  const esc = (s) => s
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");

  function hl(text, q) {
    if (!q) return esc(text);
    const safe = esc(text);
    const qe   = esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safe.replace(new RegExp(qe, "gi"), m => `<mark class="gptn-hl">${m}</mark>`);
  }

  function renderList() {
    const list = document.getElementById("gptn-list");
    if (!list) return;

    const filtered = query
      ? messages.filter(m => m.text.toLowerCase().includes(query.toLowerCase()))
      : messages;

    const countEl = document.getElementById("gptn-count");
    if (countEl) countEl.textContent = messages.length;

    if (filtered.length === 0) {
      list.innerHTML = `<div id="gptn-empty">${I.empty}<p>${
        query ? "No results." : "Start a conversation to see messages here."
      }</p></div>`;
      list.onclick = null;
      return;
    }

    const rows = filtered.map((m, fi) => {
      const preview  = m.text.slice(0, 80) + (m.text.length > 80 ? "…" : "");
      const isActive = m.index === activeIdx ? " gptn-active" : "";
      const delay    = fi < 25 ? `animation-delay:${fi * 14}ms` : "animation:none";
      const label    = m.role === "user" ? "You" : "ChatGPT";
      const icon     = m.role === "user" ? I.user : I.gpt;

      return `<div class="gptn-item${isActive}" role="listitem" data-idx="${m.index}"
                   style="${delay}" title="${esc(m.text.slice(0,200))}">
        <div class="gptn-av ${m.role}">${icon}</div>
        <div class="gptn-body">
          <div class="gptn-role">${label}</div>
          <div class="gptn-preview">${hl(preview, query)}</div>
        </div>
        <span class="gptn-num">${m.index + 1}</span>
      </div>`;
    }).join("");

    list.innerHTML = rows;
    list.onclick = (e) => {
      const item = e.target.closest(".gptn-item");
      if (item) jumpTo(parseInt(item.dataset.idx, 10));
    };
  }

  /* ── Jump to message ── */
  function jumpTo(index) {
    const msg = messages[index];
    if (!msg) return;

    activeIdx = index;

    document.querySelectorAll("#gptn-list .gptn-active").forEach(el => el.classList.remove("gptn-active"));
    const el = document.querySelector(`#gptn-list [data-idx="${index}"]`);
    if (el) { el.classList.add("gptn-active"); el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }

    msg.node.scrollIntoView({ behavior: "smooth", block: "start" });

    /* Flash highlight — green tint to match ChatGPT's accent */
    msg.node.style.transition = "background-color 0.2s ease";
    msg.node.style.backgroundColor = "rgba(16, 163, 127, 0.10)";
    setTimeout(() => { if (msg.node) msg.node.style.backgroundColor = ""; }, 1100);
  }

  /* ── Footer ── */
  function updateFooter() {
    const info = document.getElementById("gptn-info");
    if (!info) return;
    info.textContent = `${messages.length} messages`;
  }

  /* ── Progress bar ── */
  function getScrollEl() {
    return (
      document.querySelector('[class*="overflow-y-auto"]') ||
      document.querySelector('main') ||
      null
    );
  }

  function updateBar() {
    const fill = document.getElementById("gptn-fill");
    if (!fill) return;
    /* Try ChatGPT's internal scroller first, fall back to window */
    const el  = getScrollEl();
    let pct;
    if (el && el.scrollHeight > el.clientHeight) {
      pct = Math.round(el.scrollTop / (el.scrollHeight - el.clientHeight) * 100);
    } else {
      const d = document.documentElement;
      pct = d.scrollHeight > d.clientHeight
        ? Math.round(window.scrollY / (d.scrollHeight - d.clientHeight) * 100)
        : 0;
    }
    fill.style.width = Math.min(pct, 100) + "%";
  }

  /* ── Observer — debounced, only when open ── */
  function startObserver() {
    stopObserver();
    const target = document.querySelector('main') || document.body;
    observer = new MutationObserver(() => {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(scan, 600);
    });
    observer.observe(target, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
    clearTimeout(scanTimer);
  }

  /* ── Route detection ── */
  setInterval(() => {
    if (location.href === lastUrl) return;
    lastUrl  = location.href;
    messages = [];
    activeIdx = -1;
    query    = "";
    const qEl = document.getElementById("gptn-q");
    if (qEl) qEl.value = "";
    if (open) {
      stopObserver();
      setTimeout(() => { scan(); startObserver(); }, 1000);
    }
  }, 1000);

  /* ── Keyboard shortcut ── */
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "N") { e.preventDefault(); toggle(); }
  });

  /* ── Init ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI);
  } else {
    buildUI();
  }
})();
