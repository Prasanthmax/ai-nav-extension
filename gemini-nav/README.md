<div align="center">

# 🔵 Gemini Conversation Navigator

**Jump to any message in a long Gemini conversation — instantly.**

[![Works on Gemini](https://img.shields.io/badge/Works%20on-gemini.google.com-4285F4?style=flat-square)](https://gemini.google.com)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![License MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](../LICENSE)

*Part of the [AI Conversation Navigator](../) project*

</div>

---

## Install

1. [Download this repo](../../../releases/latest) and unzip it
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `gemini-nav` folder
5. Visit [gemini.google.com](https://gemini.google.com) and open any conversation

Works in Chrome, Edge, Brave, Arc, Vivaldi.

## Usage

| Action | How |
|--------|-----|
| Open / close sidebar | Click the tab on the right edge |
| Keyboard shortcut | `Ctrl + Shift + N` |
| Jump to message | Click any item in the list |
| Search | Type in the search box |
| Go to oldest | Click `↑` in footer |
| Go to newest | Click `↓` in footer |

## Why no token tracker?

Gemini's free tier doesn't expose usage figures in the UI the way it matters for Claude's prompt-caching model, so this extension focuses purely on navigation — kept simple on purpose.

## Design notes

Built against Gemini's Angular-based DOM, which uses semantic custom elements (`<user-query>`, `<model-response>`) instead of `data-testid` attributes — these are more stable across Gemini's frequent UI refreshes. Colors follow Google's Material 3 palette (`#4285f4` accent, `#131314` dark surface).

## Privacy

All processing is local. No data leaves your browser. Ever.
