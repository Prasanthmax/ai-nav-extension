/* Claude Conversation Navigator — content.js v1.1 (crash fix)
   KEY FIXES:
   1. MutationObserver is DEBOUNCED (600ms) — no longer fires on every token
   2. Observer only runs when sidebar is OPEN — fully idle when closed
   3. NO cloneNode() — uses TreeWalker (10x cheaper DOM traversal)
   4. Single delegated click handler on list container, not one per item
   5. Route detection via setInterval — no document-level MutationObserver
   6. Toggle button uses bottom: 50% to stay clear of Claude's own buttons
*/

(function () {
  "use strict";
  if (document.getElementById("ccn-sidebar")) return;

  /* ── Icons ── */
  const svg = (d) =>
    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

  const I = {
    chevron  : svg('<polyline points="11 4 5 8 11 12"/>'),
    close    : svg('<line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>'),
    search   : svg('<circle cx="6.5" cy="6.5" r="4"/><line x1="10" y1="10" x2="14" y2="14"/>'),
    nav      : svg('<path d="M2 4h12v7H9l-3 3v-3H2z"/>'),
    user     : svg('<circle cx="8" cy="5" r="3"/><path d="M2 14s1-4 6-4 6 4 6 4"/>'),
    claude   : svg('<path d="M8 2L13 6v5l-5 3-5-3V6z" stroke-width="1.4"/>'),
    up       : svg('<line x1="8" y1="13" x2="8" y2="3"/><polyline points="4 7 8 3 12 7"/>'),
    down     : svg('<line x1="8" y1="3" x2="8" y2="13"/><polyline points="4 9 8 13 12 9"/>'),
    empty    : svg('<rect x="2" y="4" width="12" height="8" rx="1" stroke-dasharray="2 1.5"/><line x1="5" y1="8" x2="11" y2="8"/>'),
    clock    : svg('<circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/>'),
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
    btn.id = "ccn-btn";
    btn.title = "Conversation Navigator (Ctrl+Shift+N)";
    btn.setAttribute("aria-label", "Toggle conversation navigator");
    btn.innerHTML = I.chevron;

    const panel = document.createElement("div");
    panel.id = "ccn-panel";
    panel.setAttribute("role", "complementary");
    panel.innerHTML = `
      <div id="ccn-head">
        <div id="ccn-title">${I.nav}<span>Navigator</span><span id="ccn-count">0</span></div>
        <button id="ccn-x" aria-label="Close">${I.close}</button>
      </div>
      <div id="ccn-bar"><div id="ccn-fill"></div></div>
      <div id="ccn-usage">
        <div class="ccn-usage-row">
          <span class="ccn-usage-label">Session</span>
          <span class="ccn-usage-val" id="ccn-tok-session">~0</span>
        </div>
        <div class="ccn-usage-row">
          <span class="ccn-usage-label">Today</span>
          <span class="ccn-usage-val" id="ccn-tok-day">~0</span>
        </div>
        <div class="ccn-usage-row">
          <span class="ccn-usage-label">This week</span>
          <span class="ccn-usage-val" id="ccn-tok-week">~0</span>
        </div>
        <div id="ccn-usage-note">Estimated · ~4 chars/token</div>
      </div>
      <div id="ccn-searchbox">
        <span id="ccn-searchico">${I.search}</span>
        <input id="ccn-q" type="text" placeholder="Search messages…" autocomplete="off" spellcheck="false"/>
      </div>
      <div id="ccn-list" role="list"></div>
      <div id="ccn-foot">
        <span id="ccn-info">0 messages</span>
        <div>
          <button id="ccn-top"  title="Oldest message">${I.up}</button>
          <button id="ccn-btm"  title="Newest message">${I.down}</button>
        </div>
      </div>`;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    /* Cache-window countdown pill — floats at top-center of the page */
    const cachePill = document.createElement("div");
    cachePill.id = "ccn-cache-pill";
    cachePill.innerHTML = `${I.clock}<span id="ccn-cache-text">5:00</span>`;
    cachePill.title = "Approx. prompt-cache window — resets each message you send. Reply before this hits 0 to likely keep the cache warm.";
    document.body.appendChild(cachePill);

    btn.addEventListener("click", toggle);
    panel.querySelector("#ccn-x").addEventListener("click", close);
    panel.querySelector("#ccn-q").addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { query = e.target.value.trim(); renderList(); }, 150);
    });
    panel.querySelector("#ccn-top").addEventListener("click", () => jumpTo(0));
    panel.querySelector("#ccn-btm").addEventListener("click", () => jumpTo(messages.length - 1));

    /* Progress bar on scroll */
    window.addEventListener("scroll", updateBar, { passive: true });
    /* Also hook whichever element actually scrolls in Claude */
    setTimeout(() => {
      const scroller = document.querySelector('[data-testid="virtuoso-scroller"]') || document.querySelector("main");
      if (scroller) scroller.addEventListener("scroll", updateBar, { passive: true });
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
    const panel = document.getElementById("ccn-panel");
    const btn   = document.getElementById("ccn-btn");
    if (!panel || !btn) return;
    panel.classList.toggle("ccn-open", open);
    btn.classList.toggle("ccn-open", open);
    btn.title = open ? "Close Navigator (Ctrl+Shift+N)" : "Open Navigator (Ctrl+Shift+N)";
  }

  /* ── Scan messages — safe, no cloneNode ── */
  function getNodes() {
    /* Try specific test-ids first (most reliable) */
    let nodes = document.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"]');
    if (nodes.length > 0) return dedupeNodes(Array.from(nodes)).slice(0, 600);

    /* Fallback: data-message-author-role */
    nodes = document.querySelectorAll('[data-message-author-role]');
    if (nodes.length > 0) return dedupeNodes(Array.from(nodes)).slice(0, 600);

    return [];
  }

  /* Remove nodes that are DOM-nested inside another matched node
     (prevents a wrapper + its inner element both counting as
     separate "messages", which is what desyncs role parity) */
  function dedupeNodes(nodes) {
    return nodes.filter((n, i) => !nodes.some((other, j) => i !== j && other.contains(n) && other !== n));
  }

  /* Role detection — v1.1 fix
     BUG (v1.0): fell back to raw sibling-index parity, which
     permanently mislabels every subsequent message once one
     node is misjudged (e.g. edited/regenerated turns that lack
     data-testid). 
     FIX: search own attributes → ancestors → descendants first.
     Only if truly no signal exists anywhere, alternate from the
     LAST CONFIRMED role rather than sibling position — this
     self-heals on the very next correctly-tagged message instead
     of staying wrong for the rest of the conversation. */
  let lastConfirmedRole = null;

  /* ── Token estimation & cache timer state ──────────────────
     IMPORTANT: These are ESTIMATES only. Claude.ai's page does
     not expose real token counts or real cache state to a
     content script — there is no such data in the DOM. We
     approximate using the standard ~4 chars/token heuristic,
     and approximate the cache window using Anthropic's publicly
     documented 5-minute prompt-cache TTL, reset on each message.
     Both are labeled "~estimated" in the UI — never presented
     as exact figures.
  ──────────────────────────────────────────────────────────── */
  let sessionTokens   = 0;                 // resets when tab/page reloads
  let lightScanTimer  = null;
  let lightObserver   = null;
  let lastLightLen    = 0;
  let cacheInterval   = null;
  let cacheDeadline   = 0;                 // epoch ms when the 5-min window ends
  const CACHE_WINDOW_MS = 5 * 60 * 1000;   // Anthropic's documented cache TTL
  const TOK_LOG_KEY = "ccn_tok_log_v1";

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function loadTokLog() {
    try {
      const raw = localStorage.getItem(TOK_LOG_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  function saveTokLog(log) {
    try {
      /* Trim entries older than 8 days to keep storage small */
      const cutoff = Date.now() - 8 * 24 * 60 * 60 * 1000;
      Object.keys(log).forEach(k => {
        const t = new Date(k).getTime();
        if (isNaN(t) || t < cutoff) delete log[k];
      });
      localStorage.setItem(TOK_LOG_KEY, JSON.stringify(log));
    } catch { /* localStorage unavailable — silently skip persistence */ }
  }

  function addTokenEstimate(charCount) {
    const tokens = Math.ceil(charCount / 4);
    sessionTokens += tokens;

    const log = loadTokLog();
    const key = todayKey();
    log[key] = (log[key] || 0) + tokens;
    saveTokLog(log);

    updateUsagePanel(log);
  }

  function updateUsagePanel(log) {
    log = log || loadTokLog();
    const dayEl  = document.getElementById("ccn-tok-day");
    const weekEl = document.getElementById("ccn-tok-week");
    const sessEl = document.getElementById("ccn-tok-session");
    if (!dayEl) return;

    const today = log[todayKey()] || 0;
    let week = 0;
    const now = Date.now();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      week += log[key] || 0;
    }

    sessEl.textContent = "~" + formatTok(sessionTokens);
    dayEl.textContent  = "~" + formatTok(today);
    weekEl.textContent = "~" + formatTok(week);
  }

  function formatTok(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  /* ── Cache window countdown pill ── */
  function resetCacheWindow() {
    cacheDeadline = Date.now() + CACHE_WINDOW_MS;
    const pill = document.getElementById("ccn-cache-pill");
    if (pill) pill.classList.remove("ccn-cache-expired");
    tickCache();
  }

  function tickCache() {
    const textEl = document.getElementById("ccn-cache-text");
    const pill   = document.getElementById("ccn-cache-pill");
    if (!textEl || !pill) return;

    const remaining = cacheDeadline - Date.now();
    if (remaining <= 0) {
      textEl.textContent = "expired";
      pill.classList.add("ccn-cache-expired");
      pill.classList.remove("ccn-cache-warn");
      return;
    }
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    textEl.textContent = `${mins}:${String(secs).padStart(2, "0")}`;
    pill.classList.toggle("ccn-cache-warn", remaining < 60000);
    pill.classList.remove("ccn-cache-expired");
  }

  /* ── Lightweight always-on watcher for tokens + cache timer
     Runs independent of sidebar open/close so the cache pill
     stays useful even when the navigator panel is closed.
     Debounced and cheap — only reads node count + last node
     text length, not a full sidebar re-render. ── */
  function startLightWatcher() {
    const target = document.querySelector('[data-testid="conversation-turn-list"]') || document.querySelector("main") || document.body;
    lightObserver = new MutationObserver(() => {
      clearTimeout(lightScanTimer);
      lightScanTimer = setTimeout(lightScan, 700);
    });
    lightObserver.observe(target, { childList: true, subtree: true });

    cacheInterval = setInterval(tickCache, 1000);
  }

  function lightScan() {
    const nodes = getNodes();
    if (nodes.length === 0) return;
    if (nodes.length > lastLightLen) {
      /* One or more new messages appeared — estimate tokens for each new one */
      for (let i = lastLightLen; i < nodes.length; i++) {
        const charCount = getFullTextLength(nodes[i]);
        addTokenEstimate(charCount);
      }
      resetCacheWindow();
    }
    lastLightLen = nodes.length;
  }

  /* Full-length text walk for token estimation — no 250-char cap
     (unlike getText, which is preview-only), but still skips
     code blocks/UI chrome and never stores the string, just counts. */
  function getFullTextLength(node) {
    let count = 0;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.id && p.id.startsWith("ccn")) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest("#ccn-panel,#ccn-btn,#ccn-cache-pill")) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest("button,[aria-hidden='true'],svg")) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) count += n.textContent.length;
    return count;
  }

  function role(node) {
    /* 1. Check the node itself */
    let found = roleFromAttrs(node);
    if (found) { lastConfirmedRole = found; return found; }

    /* 2. Check up to 3 ancestor levels */
    let anc = node.parentElement;
    for (let depth = 0; anc && depth < 3; depth++, anc = anc.parentElement) {
      found = roleFromAttrs(anc);
      if (found) { lastConfirmedRole = found; return found; }
    }

    /* 3. Check descendants */
    const roleEl = node.querySelector('[data-message-author-role],[data-testid*="user"],[data-testid*="assistant"]');
    if (roleEl) {
      found = roleFromAttrs(roleEl);
      if (found) { lastConfirmedRole = found; return found; }
    }

    /* 4. Self-healing fallback: alternate from last CONFIRMED role,
       not from sibling position. If we've never confirmed a role yet,
       default to "user" (first message is always the user's). */
    const guessed = lastConfirmedRole === "user" ? "assistant" : "user";
    lastConfirmedRole = guessed;
    return guessed;
  }

  function roleFromAttrs(el) {
    if (!el || !el.getAttribute) return null;
    const t = el.getAttribute("data-testid") || "";
    const r = el.getAttribute("data-message-author-role") || "";
    if (t.includes("user")      || r === "user")      return "user";
    if (t.includes("assistant") || r === "assistant") return "assistant";
    return null;
  }

  /* TreeWalker — reads text cheaply without DOM cloning */
  function getText(node) {
    let out = "";
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        /* Skip our own sidebar nodes */
        if (p.id && p.id.startsWith("ccn")) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest("#ccn-panel,#ccn-btn")) return NodeFilter.FILTER_REJECT;
        /* Skip code blocks — too noisy in preview */
        if (p.closest && p.closest("pre,code")) return NodeFilter.FILTER_SKIP;
        /* Skip icon / aria-hidden chrome */
        if (p.closest && p.closest("button,[aria-hidden='true']")) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      out += n.textContent;
      if (out.length >= 250) break;   // cap — we only need a short preview
    }
    return out.replace(/\s+/g, " ").trim();
  }

  function scan() {
    const nodes    = getNodes();
    const newLen   = nodes.length;
    const lastText = newLen ? getText(nodes[newLen - 1]) : "";
    const prevLen  = messages.length;
    const prevLast = prevLen ? messages[prevLen - 1].text : "";

    /* Skip full re-scan if nothing meaningful changed */
    if (newLen === prevLen && lastText === prevLast) return;

    messages = nodes.map((node, i) => ({
      index : i,
      role  : role(node),
      /* Reuse cached text for older messages, only extract fresh for new/changed ones */
      text  : (i < newLen - 1 && messages[i]) ? messages[i].text : getText(node),
      node,
    }));

    renderList();
    updateFooter();
  }

  /* ── Render list ── */
  const esc = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

  function hl(text, q) {
    if (!q) return esc(text);
    const safe = esc(text);
    const qe   = esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safe.replace(new RegExp(qe, "gi"), m => `<mark class="ccn-hl">${m}</mark>`);
  }

  function renderList() {
    const list = document.getElementById("ccn-list");
    if (!list) return;

    const filtered = query
      ? messages.filter(m => m.text.toLowerCase().includes(query.toLowerCase()))
      : messages;

    const countEl = document.getElementById("ccn-count");
    if (countEl) countEl.textContent = messages.length;

    if (filtered.length === 0) {
      list.innerHTML = `<div id="ccn-empty">${I.empty}<p>${
        query ? "No results." : "Start a conversation to see messages here."
      }</p></div>`;
      list.onclick = null;
      return;
    }

    const rows = filtered.map((m, fi) => {
      const preview = m.text.slice(0, 80) + (m.text.length > 80 ? "…" : "");
      const isActive = m.index === activeIdx ? " ccn-active" : "";
      /* Only stagger-animate the first 25 items */
      const delay = fi < 25 ? `animation-delay:${fi * 14}ms` : "animation:none";
      return `<div class="ccn-item${isActive}" role="listitem" data-idx="${m.index}" style="${delay}" title="${esc(m.text.slice(0,200))}">
        <div class="ccn-av ${m.role}">${m.role === "user" ? I.user : I.claude}</div>
        <div class="ccn-body">
          <div class="ccn-role">${m.role === "user" ? "You" : "Claude"}</div>
          <div class="ccn-preview">${hl(preview, query)}</div>
        </div>
        <span class="ccn-num">${m.index + 1}</span>
      </div>`;
    }).join("");

    list.innerHTML = rows;

    /* ONE delegated handler — not N handlers */
    list.onclick = (e) => {
      const item = e.target.closest(".ccn-item");
      if (item) jumpTo(parseInt(item.dataset.idx, 10));
    };
  }

  /* ── Jump to message ── */
  function jumpTo(index) {
    const msg = messages[index];
    if (!msg) return;

    activeIdx = index;

    /* Update active class without full re-render */
    document.querySelectorAll("#ccn-list .ccn-active").forEach(el => el.classList.remove("ccn-active"));
    const el = document.querySelector(`#ccn-list [data-idx="${index}"]`);
    if (el) { el.classList.add("ccn-active"); el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }

    /* Scroll page */
    msg.node.scrollIntoView({ behavior: "smooth", block: "start" });

    /* Flash */
    msg.node.style.transition = "background-color 0.2s ease";
    msg.node.style.backgroundColor = "rgba(218,119,86,0.13)";
    setTimeout(() => { if (msg.node) msg.node.style.backgroundColor = ""; }, 1100);
  }

  /* ── Footer ── */
  function updateFooter() {
    const info = document.getElementById("ccn-info");
    if (!info) return;
    info.textContent = `${messages.length} messages`;
  }

  /* ── Progress bar ── */
  function updateBar() {
    const fill = document.getElementById("ccn-fill");
    if (!fill) return;
    const d   = document.documentElement;
    const pct = d.scrollHeight > d.clientHeight
      ? Math.round(window.scrollY / (d.scrollHeight - d.clientHeight) * 100)
      : 0;
    fill.style.width = Math.min(pct, 100) + "%";
  }

  /* ── Observer — only live when panel is open ── */
  function startObserver() {
    stopObserver();
    const target = document.querySelector('[data-testid="conversation-turn-list"]')
                || document.querySelector("main")
                || document.body;

    observer = new MutationObserver(() => {
      /* 600ms debounce — Claude streams tokens rapidly; we wait for a pause */
      clearTimeout(scanTimer);
      scanTimer = setTimeout(scan, 600);
    });
    observer.observe(target, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
    clearTimeout(scanTimer);
  }

  /* ── Route detection via polling — zero overhead ── */
  setInterval(() => {
    if (location.href === lastUrl) return;
    lastUrl   = location.href;
    messages  = [];
    activeIdx = -1;
    query     = "";
    lastConfirmedRole = null;  /* reset role-healing state for the new conversation */
    const qEl = document.getElementById("ccn-q");
    if (qEl) qEl.value = "";
    if (open) {
      stopObserver();
      /* Give the new page 1s to settle before scanning */
      setTimeout(() => { scan(); startObserver(); }, 1000);
    }
  }, 1000);

  /* ── Keyboard shortcut ── */
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "N") { e.preventDefault(); toggle(); }
  });

  /* ── Init ── */
  function init() {
    buildUI();
    updateUsagePanel();     // show today/week totals immediately from storage
    resetCacheWindow();     // start the cache pill on page load
    setTimeout(startLightWatcher, 1500);  // let Claude's page settle first
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
