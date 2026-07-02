<div align="center">

<br/>

```
  ╔══════════════════════════════════════════╗
  ║        AI Conversation Navigator         ║
  ║   Jump to any message. Instantly.        ║
  ╚══════════════════════════════════════════╝
```

**Browser extensions that add a conversation navigator sidebar
to your favourite AI chat apps — no more endless scrolling.**

<br/>

[![License MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![No data collected](https://img.shields.io/badge/Privacy-Zero%20data%20collected-brightgreen?style=flat-square)](#privacy)
[![Claude](https://img.shields.io/badge/Claude-claude.ai-CC785C?style=flat-square)](claude-nav/)
[![ChatGPT](https://img.shields.io/badge/ChatGPT-chatgpt.com-10a37f?style=flat-square)](chatgpt-nav/)
[![Gemini](https://img.shields.io/badge/Gemini-gemini.google.com-4285F4?style=flat-square)](gemini-nav/)

<br/>

</div>

---

## The problem

You're deep in a long AI conversation — 30, 40, 50+ messages. You need something from message 8.
So you scroll. And scroll. And scroll.

**There's no index. No map. No way to jump. Just an endless wall of text.**

This repo fixes that — for Claude, ChatGPT, and Gemini.

---

## Extensions

| | Extension | Works on | Extra features | Branch |
|---|---|---|---|---|
| 🟠 | [Claude Navigator](claude-nav/) | `claude.ai` | Message navigator + estimated token tracker + cache-window timer | [`claude-nav`](../../tree/claude-nav) |
| 🟢 | [ChatGPT Navigator](chatgpt-nav/) | `chatgpt.com` | Message navigator | [`chatgpt-nav`](../../tree/chatgpt-nav) |
| 🔵 | [Gemini Navigator](gemini-nav/) | `gemini.google.com` | Message navigator | [`gemini-nav`](../../tree/gemini-nav) |

Each is a standalone extension — install only the one(s) you need. The token tracker and cache timer are **Claude-only**: they're built around Claude's prompt-caching model and wouldn't map to anything meaningful for ChatGPT or Gemini's free tiers.

---

## Claude Navigator — token tracker & cache timer

**Read this before you trust the numbers.**

Claude.ai's web page does not expose real token counts or real cache state to a browser extension — that data lives entirely on Anthropic's servers and simply isn't in the DOM. So instead of pretending to read exact numbers, both widgets are clearly labeled estimates:

| Widget | What it shows | How it's computed | Honesty label |
|---|---|---|---|
| **Session / Today / This week** panel | Rough token usage | `~4 characters per token` on visible message text | "Estimated · ~4 chars/token" shown in the panel |
| **Cache countdown pill** | Time left in the likely prompt-cache window | Counts down from Anthropic's documented 5-minute cache TTL, resets each message | Tooltip explains it's approximate |

These are useful for *relative* awareness ("today was heavy" / "reply soon or the cache probably cooled") — not for exact billing or real cache-hit confirmation.

---

## What it looks like

```
┌─────────────────────────────────────────────────────────────┐
│              claude.ai  /  chatgpt.com  /  gemini.google.com│
│                     ⏱ 4:32  ← cache window pill (Claude)     │
│  ┌────────────────────────────────────┐  ┌──────────────┐   │
│  │                                    │  │  Navigator   │   │
│  │  AI response content here...       │  │ ──────────── │   │
│  │                                    │  │ Session ~1.2K│   │
│  │  More content...                   │  │ Today   ~4.8K│   │
│  │                                    │  │ Week    ~22K │   │
│  │                                    │  │ ──────────── │   │
│  │                                    │  │ 🔍 Search    │   │
│  │                                    │  │              │   │
│  │                                    │  │ You       1  │   │
│  │                                    │  │ AI        2  │   │
│  │                                    │  │ You       3  │◄──┼── click = jump
│  └────────────────────────────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Features (all three)

| Feature | Detail |
|---|---|
| **📍 Instant jump** | Click any message — page scrolls directly to it with a smooth highlight |
| **🔍 Live search** | Filter messages in real time as you type |
| **👤 Role-aware** | Distinguishes your messages from the AI's with avatars |
| **📊 Progress bar** | Shows how deep you are in the conversation |
| **⬆⬇ Endpoints** | One-click jump to oldest or newest message |
| **🔄 Auto-refresh** | Updates in real time as the AI responds |
| **🎨 Native-blend theming** | Each extension uses that app's own color palette — monochromatic, dark-mode aware, no clashing accent colors |
| **⌨️ Shortcut** | `Ctrl+Shift+N` to open and close |
| **💤 Zero idle cost** | Heavy observer only runs when sidebar is open |
| **🔒 Private** | No data ever leaves your browser |

---

## Quick install

```
1. Download or clone this repo
2. Open chrome://extensions → enable Developer mode
3. Click "Load unpacked" → select claude-nav/, chatgpt-nav/, or gemini-nav/
4. Visit the matching site
```

Full install guides in each extension's folder.

---

## Repository structure

```
ai-nav-extension/          ← this repo (main branch)
├── README.md              ← you are here
├── claude-nav/            ← Claude.ai extension (+ token tracker + cache timer)
├── chatgpt-nav/           ← ChatGPT extension
└── gemini-nav/            ← Gemini extension
```

### Branches

| Branch | Contents |
|--------|----------|
| `main` | All three extensions + this README |
| `claude-nav` | Claude extension only |
| `chatgpt-nav` | ChatGPT extension only |
| `gemini-nav` | Gemini extension only |

---

## Known bug fixed in v1.3

**v1.0–1.2 bug:** in long Claude conversations, message headers in the navigator could all mislabel as "You" partway through the list, even though clicking them correctly jumped to the right message.

**Root cause:** the role-detection fallback used raw sibling-index parity (even index = user, odd = assistant). One edited or regenerated turn without the expected `data-testid` attribute would shift that parity — and because it was positional, the mistake never self-corrected, mislabeling every message after it.

**Fix:** role detection now checks the node itself, then up to 3 ancestor levels, then descendants, for an explicit role attribute — the same signal Claude's own page uses. Only if truly no signal exists anywhere does it fall back to alternating from the *last correctly confirmed* role, which self-heals on the very next properly-tagged message instead of staying wrong for the rest of the conversation.

---

## Privacy

- ✅ Runs only on `claude.ai`, `chatgpt.com`, or `gemini.google.com` respectively
- ✅ Zero network requests made by any extension
- ✅ No analytics, no telemetry, no tracking whatsoever
- ✅ Claude Navigator persists only a local daily-token-estimate log in `localStorage` — never transmitted anywhere
- ✅ 100% local — all processing happens in your browser tab
- ✅ Open source — read every line before installing

Permissions used: none beyond a scoped content-script match on the relevant domain.

---

## How it's built — performance decisions

- `MutationObserver` debounced 600–700ms — waits for streaming to finish before scanning
- Heavy sidebar-list observer only runs when the sidebar is open
- A separate lightweight observer (Claude only) keeps the token tracker and cache pill live even when the sidebar is closed, without doing full list re-renders
- `TreeWalker` for text extraction instead of `cloneNode()` — far cheaper on long threads
- Single delegated `onclick` on the list container instead of per-item listeners
- Route changes detected via `setInterval` poll — no expensive document-level observer

---

## Compatibility

| Browser | Status |
|---------|--------|
| Chrome 88+ | ✅ Full support |
| Edge 88+ | ✅ Full support |
| Brave | ✅ Full support |
| Arc | ✅ Full support |
| Vivaldi | ✅ Full support |
| Firefox | ⚠️ Requires manifest adjustments |
| Safari | ❌ Not supported |

---

## Contributing

Found a bug? Open an issue with:
- Which extension (Claude / ChatGPT / Gemini)
- What happened vs what you expected  
- Browser + version
- Screenshot if relevant

PRs welcome. Keep it focused.

---

## License

MIT — do whatever you want with it.

---

<div align="center">

Made for anyone who's ever lost a message in a long AI conversation.

**[⭐ Star this repo](../../stargazers)** if it saved you some scrolling.

</div>
