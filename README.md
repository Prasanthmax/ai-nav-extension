<div align="center">

<br/>

```
  ╔══════════════════════════════════════════╗
  ║        AI Conversation Navigator         ║
  ║   Jump to any message. Instantly.        ║
  ╚══════════════════════════════════════════╝
```

**A browser extension that adds a conversation navigator sidebar
to your favourite AI chat apps — no more endless scrolling.**

<br/>

[![License MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![No data collected](https://img.shields.io/badge/Privacy-Zero%20data%20collected-brightgreen?style=flat-square)](#privacy)
[![Works on Claude](https://img.shields.io/badge/Claude-claude.ai-CC785C?style=flat-square)](claude-nav/)
[![Works on ChatGPT](https://img.shields.io/badge/ChatGPT-chatgpt.com-10a37f?style=flat-square)](chatgpt-nav/)

<br/>

</div>

---

## The problem

You're deep in a long AI conversation — 30, 40, 50+ messages. You need something from message 8.
So you scroll. And scroll. And scroll.

**There's no index. No map. No way to jump. Just an endless wall of text.**

This repo fixes that — for both Claude and ChatGPT.

---

## Extensions

| | Extension | Works on | Branch |
|---|---|---|---|
| 🟠 | [Claude Navigator](claude-nav/) | `claude.ai` | [`claude-nav`](../../tree/claude-nav) |
| 🟢 | [ChatGPT Navigator](chatgpt-nav/) | `chatgpt.com` | [`chatgpt-nav`](../../tree/chatgpt-nav) |

Both are standalone extensions — install only the one(s) you need.

---

## What it looks like

```
┌─────────────────────────────────────────────────────────────┐
│              claude.ai  /  chatgpt.com                   ≡  │
│  ┌────────────────────────────────────┐  ┌──────────────┐   │
│  │                                    │  │  Navigator   │   │
│  │  AI response content here...       │  │ ──────────── │   │
│  │                                    │  │ 🔍 Search    │   │
│  │  More content...                   │  │              │   │
│  │                                    │  │ You       1  │   │
│  │  Even more content...              │  │ hey can ...  │   │
│  │                                    │  │              │   │
│  │                                    │  │ AI        2  │   │
│  │                                    │  │ Sure! Let... │   │
│  │                                    │  │              │   │
│  │                                    │  │ You       3  │◄──┼── click = jump
│  └────────────────────────────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Features (both extensions)

| Feature | Detail |
|---|---|
| **📍 Instant jump** | Click any message — page scrolls directly to it with a smooth highlight |
| **🔍 Live search** | Filter messages in real time as you type |
| **👤 Role-aware** | Distinguishes your messages from the AI's with avatars |
| **📊 Progress bar** | Shows how deep you are in the conversation |
| **⬆⬇ Endpoints** | One-click jump to oldest or newest message |
| **🔄 Auto-refresh** | Updates in real time as the AI responds |
| **🌗 Theme-aware** | Follows each app's light/dark mode automatically |
| **⌨️ Shortcut** | `Ctrl+Shift+N` to open and close |
| **💤 Zero idle cost** | Observer only runs when sidebar is open |
| **🔒 Private** | No data ever leaves your browser |

---

## Quick install

### Claude Navigator
```
1. Download or clone this repo
2. Open chrome://extensions → enable Developer mode
3. Click "Load unpacked" → select the claude-nav/ folder
4. Visit claude.ai
```

### ChatGPT Navigator
```
1. Download or clone this repo
2. Open chrome://extensions → enable Developer mode
3. Click "Load unpacked" → select the chatgpt-nav/ folder
4. Visit chatgpt.com
```

Full install guides in each extension's folder.

---

## Repository structure

```
ai-nav-extension/          ← this repo (main branch)
├── README.md              ← you are here
├── claude-nav/            ← Claude.ai extension
│   ├── manifest.json
│   ├── content.js
│   ├── sidebar.css
│   └── icons/
└── chatgpt-nav/           ← ChatGPT extension
    ├── manifest.json
    ├── content.js
    ├── sidebar.css
    └── icons/
```

### Branches

| Branch | Contents |
|--------|----------|
| `main` | Both extensions + this README |
| `claude-nav` | Claude extension only (standalone install) |
| `chatgpt-nav` | ChatGPT extension only (standalone install) |

The branch structure means users can download just the extension they need — a clean single folder with no unrelated files.

---

## Privacy

- ✅ Runs only on `claude.ai` / `chatgpt.com` respectively
- ✅ Zero network requests made by either extension
- ✅ No analytics, no telemetry, no tracking whatsoever
- ✅ No data stored beyond your open/closed sidebar preference (`localStorage`)
- ✅ 100% local — all processing happens in your browser tab
- ✅ Open source — read every line before installing

Permissions used: `activeTab`, `scripting` — only what's required to inject the sidebar.

---

## How it's built

**Performance-first design:**

- `MutationObserver` debounced 600ms — waits for streaming to finish before scanning
- Observer completely disconnected when sidebar is closed
- `TreeWalker` for text extraction instead of `cloneNode()` — ~10× cheaper
- Single delegated `onclick` on list container instead of per-item listeners
- Route changes detected via `setInterval` — no document-level observer

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
- Which extension (Claude / ChatGPT)
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
