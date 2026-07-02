<div align="center">

# 🟠 Claude Conversation Navigator

**Jump to any message in a long Claude.ai conversation — instantly.
Plus an estimated token tracker and cache-window timer.**

[![Works on Claude.ai](https://img.shields.io/badge/Works%20on-claude.ai-CC785C?style=flat-square)](https://claude.ai)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![License MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](../LICENSE)

*Part of the [AI Conversation Navigator](../) project*

</div>

---

## Install

1. [Download this repo](../../../releases/latest) and unzip it
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `claude-nav` folder
5. Visit [claude.ai](https://claude.ai) and open any conversation

Works in Chrome, Edge, Brave, Arc, Vivaldi.

## Features

### Navigator
Click the tab on the right edge to open a scrollable list of every message. Click any entry to jump straight to it. Search filters live as you type.

### Session token tracker
A small panel at the top of the navigator shows:
- **Session** — tokens used since you opened this tab
- **Today** — tokens used today across all Claude.ai tabs
- **This week** — rolling 7-day total

> ⚠️ **These are estimates**, not real numbers. Claude.ai's page doesn't expose actual token counts to a browser extension — nothing does, short of Anthropic's own billing dashboard. This uses the standard ~4-characters-per-token approximation on visible message text. It's useful for *relative* tracking ("today was a heavy day") — not for exact billing.

### Cache-window timer
A small pill floats at the top-center of the page showing a countdown, resetting every time a new message is sent or received.

> ⚠️ **This is also an approximation.** Anthropic's documented prompt-cache TTL is 5 minutes. This pill counts down from 5:00 and resets on each turn — it's a visual reminder of "reply soon or your cache may cool," not a live read of Claude's actual cache state (which isn't exposed to the page either).

## Usage

| Action | How |
|--------|-----|
| Open / close sidebar | Click the tab on the right edge |
| Keyboard shortcut | `Ctrl + Shift + N` |
| Jump to message | Click any item in the list |
| Search | Type in the search box |
| Go to oldest | Click `↑` in footer |
| Go to newest | Click `↓` in footer |

## Privacy

All processing is local. No data leaves your browser. Ever. The only thing persisted is your daily token estimate log, stored in `localStorage` on your own machine — never transmitted anywhere.

## Changelog

- **v1.3.0** — Added token estimate tracker, cache-window timer. Fixed a bug where message headers could permanently mislabel as "You" after an edited/regenerated turn.
- **v1.2.0** — Repositioned panel to avoid colliding with Claude's own Share/close buttons.
- **v1.1.0** — Performance fixes: debounced observer, TreeWalker text extraction.
- **v1.0.0** — Initial release.
