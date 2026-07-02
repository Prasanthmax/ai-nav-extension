/* Gemini Conversation Navigator — content.js v1.0
   
   Gemini DOM analysis (gemini.google.com):
   Gemini's frontend is Angular-based and uses custom elements
   rather than data-testid attributes:
   
   User turns:      <user-query>  containing  .query-text
   Model turns:      <model-response>  containing  .markdown / message-content
   Conversation:     <div class="conversation-container"> or <infinite-scroller>
   
   These custom element tags are far more stable across Gemini UI
   refreshes than class names (which are obfuscated/hashed by Angular).
*/

(function () {
  "use strict";
  if (document.getElementById("gmnv-sidebar")) return;

  const svg = (d) =>
    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

  const I = {
    chevron : svg('<polyline points="11 4 5 8 11 12"/>'),
    close   : svg('<line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>'),
    search  : svg('<circle cx="6.5" cy="6.5" r="4"/><line x1="10" y1="10" x2="14" y2="14"/>'),
    nav     : svg('<path d="M2 3l5 5-5 5" stroke-width="1.6"/><path d="M9 13h5" stroke-width="1.6"/>'),
    user    : svg('<circle cx="8" cy="5" r="3"/><path d="M2 14s1-4 6-4 6 4 6 4"/>'),
    gem     : svg('<path d="M8 2l4 3-4 9-4-9z" stroke-width="1.2"/><path d="M4 5h8" stroke-width="1"/>'),
    up      : svg('<line x1="8" y1="13" x2="8" y2="3"/><polyline points="4 7 8 3 12 7"/>'),
    down    : svg('<line x1="8" y1="3" x2="8" y2="13"/><polyline points="4 9 8 13 12 9"/>'),
    empty   : svg('<rect x="2" y="4" width="12" height="8" rx="1" stroke-dasharray="2 1.5"/><line x1="5" y1="8" x2="11" y2="8"/>'),
  };

  let open = false, messages = [], query = "", activeIdx = -1;
  let scanTimer = null, searchTimer = null, observer = null, lastUrl = location.href;

  function buildUI() {
    const btn = document.createElement("button");
    btn.id = "gmnv-btn";
    btn.title = "Conversation Navigator (Ctrl+Shift+N)";
    btn.setAttribute("aria-label", "Toggle conversation navigator");
    btn.innerHTML = I.chevron;

    const panel = document.createElement("div");
    panel.id = "gmnv-panel";
    panel.setAttribute("role", "complementary");
    panel.innerHTML = `
      <div id="gmnv-head">
        <div id="gmnv-title">${I.nav}<span>Navigator</span><span id="gmnv-count">0</span></div>
        <button id="gmnv-x" aria-label="Close">${I.close}</button>
      </div>
      <div id="gmnv-bar"><div id="gmnv-fill"></div></div>
      <div id="gmnv-searchbox">
        <span id="gmnv-searchico">${I.search}</span>
        <input id="gmnv-q" type="text" placeholder="Search messages…" autocomplete="off" spellcheck="false"/>
      </div>
      <div id="gmnv-list" role="list"></div>
      <div id="gmnv-foot">
        <span id="gmnv-info">0 messages</span>
        <div>
          <button id="gmnv-top" title="Oldest message">${I.up}</button>
          <button id="gmnv-btm" title="Newest message">${I.down}</button>
        </div>
      </div>`;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    btn.addEventListener("click", toggle);
    panel.querySelector("#gmnv-x").addEventListener("click", close);
    panel.querySelector("#gmnv-q").addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { query = e.target.value.trim(); renderList(); }, 150);
    });
    panel.querySelector("#gmnv-top").addEventListener("click", () => jumpTo(0));
    panel.querySelector("#gmnv-btm").addEventListener("click", () => jumpTo(messages.length - 1));

    window.addEventListener("scroll", updateBar, { passive: true });
    setTimeout(() => {
      const s = getScrollEl();
      if (s && s !== window) s.addEventListener("scroll", updateBar, { passive: true });
    }, 2000);
  }

  function toggle() { open ? close() : openPanel(); }
  function openPanel() { open = true; apply(); scan(); startObserver(); }
  function close() { open = false; apply(); stopObserver(); }
  function apply() {
    const panel = document.getElementById("gmnv-panel");
    const btn = document.getElementById("gmnv-btn");
    if (!panel || !btn) return;
    panel.classList.toggle("gmnv-open", open);
    btn.classList.toggle("gmnv-open", open);
    btn.title = open ? "Close Navigator (Ctrl+Shift+N)" : "Open Navigator (Ctrl+Shift+N)";
  }

  /* ── Message scanning — Gemini custom elements ── */
  function getNodes() {
    /* Primary: Gemini's Angular custom elements, in document order */
    const nodes = document.querySelectorAll('user-query, model-response');
    if (nodes.length > 0) return Array.from(nodes).slice(0, 600);

    /* Fallback: generic conversation container children */
    const container = document.querySelector('[class*="conversation-container"], infinite-scroller, main');
    if (container) {
      const kids = Array.from(container.querySelectorAll('div[class]')).filter(el =>
        el.children.length > 0 && el.textContent.trim().length > 20
      );
      if (kids.length > 0) return kids.slice(0, 600);
    }
    return [];
  }

  /* Role is unambiguous here — the tag name itself tells us */
  function getRole(node) {
    const tag = node.tagName ? node.tagName.toLowerCase() : "";
    if (tag === "user-query")     return "user";
    if (tag === "model-response") return "assistant";
    /* Fallback for generic divs */
    const siblings = Array.from(node.parentElement?.children || []);
    return siblings.indexOf(node) % 2 === 0 ? "user" : "assistant";
  }

  function getText(node) {
    let out = "";
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.id && p.id.startsWith("gmnv")) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest("#gmnv-panel,#gmnv-btn")) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest("pre,code")) return NodeFilter.FILTER_SKIP;
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
    const nodes = getNodes();
    const newLen = nodes.length;
    const lastTxt = newLen ? getText(nodes[newLen - 1]) : "";
    const prevLen = messages.length;
    const prevLast = prevLen ? messages[prevLen - 1].text : "";
    if (newLen === prevLen && lastTxt === prevLast) return;

    messages = nodes.map((node, i) => ({
      index: i,
      role: getRole(node),
      text: (i < newLen - 1 && messages[i]) ? messages[i].text : getText(node),
      node,
    }));
    renderList();
    updateFooter();
  }

  const esc = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  function hl(text, q) {
    if (!q) return esc(text);
    const safe = esc(text);
    const qe = esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safe.replace(new RegExp(qe, "gi"), m => `<mark class="gmnv-hl">${m}</mark>`);
  }

  function renderList() {
    const list = document.getElementById("gmnv-list");
    if (!list) return;
    const filtered = query
      ? messages.filter(m => m.text.toLowerCase().includes(query.toLowerCase()))
      : messages;
    const countEl = document.getElementById("gmnv-count");
    if (countEl) countEl.textContent = messages.length;

    if (filtered.length === 0) {
      list.innerHTML = `<div id="gmnv-empty">${I.empty}<p>${
        query ? "No results." : "Start a conversation to see messages here."
      }</p></div>`;
      list.onclick = null;
      return;
    }

    const rows = filtered.map((m, fi) => {
      const preview = m.text.slice(0, 80) + (m.text.length > 80 ? "…" : "");
      const isActive = m.index === activeIdx ? " gmnv-active" : "";
      const delay = fi < 25 ? `animation-delay:${fi * 14}ms` : "animation:none";
      const label = m.role === "user" ? "You" : "Gemini";
      const icon = m.role === "user" ? I.user : I.gem;
      return `<div class="gmnv-item${isActive}" role="listitem" data-idx="${m.index}"
                   style="${delay}" title="${esc(m.text.slice(0,200))}">
        <div class="gmnv-av ${m.role}">${icon}</div>
        <div class="gmnv-body">
          <div class="gmnv-role">${label}</div>
          <div class="gmnv-preview">${hl(preview, query)}</div>
        </div>
        <span class="gmnv-num">${m.index + 1}</span>
      </div>`;
    }).join("");

    list.innerHTML = rows;
    list.onclick = (e) => {
      const item = e.target.closest(".gmnv-item");
      if (item) jumpTo(parseInt(item.dataset.idx, 10));
    };
  }

  function jumpTo(index) {
    const msg = messages[index];
    if (!msg) return;
    activeIdx = index;
    document.querySelectorAll("#gmnv-list .gmnv-active").forEach(el => el.classList.remove("gmnv-active"));
    const el = document.querySelector(`#gmnv-list [data-idx="${index}"]`);
    if (el) { el.classList.add("gmnv-active"); el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    msg.node.scrollIntoView({ behavior: "smooth", block: "start" });
    msg.node.style.transition = "background-color 0.2s ease";
    msg.node.style.backgroundColor = "rgba(66, 133, 244, 0.10)";
    setTimeout(() => { if (msg.node) msg.node.style.backgroundColor = ""; }, 1100);
  }

  function updateFooter() {
    const info = document.getElementById("gmnv-info");
    if (info) info.textContent = `${messages.length} messages`;
  }

  function getScrollEl() {
    return document.querySelector('infinite-scroller, [class*="conversation-container"], main') || null;
  }

  function updateBar() {
    const fill = document.getElementById("gmnv-fill");
    if (!fill) return;
    const el = getScrollEl();
    let pct;
    if (el && el.scrollHeight > el.clientHeight) {
      pct = Math.round(el.scrollTop / (el.scrollHeight - el.clientHeight) * 100);
    } else {
      const d = document.documentElement;
      pct = d.scrollHeight > d.clientHeight ? Math.round(window.scrollY / (d.scrollHeight - d.clientHeight) * 100) : 0;
    }
    fill.style.width = Math.min(pct, 100) + "%";
  }

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

  setInterval(() => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    messages = []; activeIdx = -1; query = "";
    const qEl = document.getElementById("gmnv-q");
    if (qEl) qEl.value = "";
    if (open) { stopObserver(); setTimeout(() => { scan(); startObserver(); }, 1000); }
  }, 1000);

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "N") { e.preventDefault(); toggle(); }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI);
  } else {
    buildUI();
  }
})();
