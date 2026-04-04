# GitHub Setup Guide — ai-nav-extension

Complete step-by-step to create the repo, upload files, and set up branches.

---

## Step 1 — Create the GitHub repo

1. Go to https://github.com/new
2. Repository name: `ai-nav-extension`
3. Description: `Conversation navigator sidebar for Claude.ai and ChatGPT — jump to any message instantly`
4. Set to **Public**
5. Do NOT check "Add a README" (you have one)
6. Click **Create repository**

---

## Step 2 — Upload all files (initial push)

### Option A: GitHub web UI (no git needed)

1. On the empty repo page, click **"uploading an existing file"**
2. Drag in everything from the `ai-nav-extension/` folder:
   - `README.md`
   - `LICENSE`
   - `.gitignore`
   - `claude-nav/` folder (all files inside)
   - `chatgpt-nav/` folder (all files inside)
3. Commit message: `Initial release — Claude + ChatGPT navigators v1.0`
4. Click **Commit changes**

### Option B: Git CLI

```bash
cd ai-nav-extension
git init
git add .
git commit -m "Initial release — Claude + ChatGPT navigators v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-nav-extension.git
git push -u origin main
```

---

## Step 3 — Create the claude-nav branch

This branch contains ONLY the Claude extension — clean folder for users who want just Claude.

### Via GitHub web UI:

1. On your repo page, click the **branch dropdown** (shows "main")
2. Type `claude-nav` in the search box
3. Click **"Create branch: claude-nav from main"**
4. Switch to the `claude-nav` branch
5. Delete the `chatgpt-nav/` folder:
   - Click into `chatgpt-nav/`, open any file, click the **trash icon**, commit
   - Repeat for all files in `chatgpt-nav/`
   - Or use the GitHub UI to delete the folder
6. Edit `README.md` on this branch to point to the Claude-only install

### Via Git CLI (recommended):

```bash
# Create claude-nav branch from main
git checkout -b claude-nav

# Remove chatgpt-nav folder from this branch
git rm -r chatgpt-nav/

# Commit the removal
git commit -m "claude-nav branch: Claude extension only"

# Push
git push origin claude-nav

# Go back to main
git checkout main
```

---

## Step 4 — Create the chatgpt-nav branch

```bash
# Create chatgpt-nav branch from main
git checkout -b chatgpt-nav

# Remove claude-nav folder from this branch
git rm -r claude-nav/

# Commit
git commit -m "chatgpt-nav branch: ChatGPT extension only"

# Push
git push origin chatgpt-nav

# Go back to main
git checkout main
```

---

## Step 5 — Create a Release

This gives users a clean downloadable zip with a version tag.

1. On your repo page, click **Releases** (right sidebar) → **Create a new release**
2. Tag version: `v1.0.0`
3. Release title: `v1.0.0 — Initial Release`
4. Description:
   ```
   First release of AI Conversation Navigator.
   
   Includes:
   - 🟠 Claude.ai navigator (claude-nav/ folder)
   - 🟢 ChatGPT navigator (chatgpt-nav/ folder)
   
   Install either extension via Chrome's "Load unpacked" in Developer mode.
   See README for full instructions.
   ```
5. Click **Publish release**

GitHub automatically attaches a source zip to the release.

---

## Step 6 — Polish the repo page

1. Click the **⚙️ gear icon** next to "About" on your repo homepage
2. Add description: `Conversation navigator sidebar for Claude.ai and ChatGPT — jump to any message instantly`
3. Add website: `https://claude.ai` (or your own site)
4. Add topics (tags):
   - `chrome-extension`
   - `chatgpt`
   - `claude-ai`
   - `browser-extension`
   - `productivity`
   - `manifest-v3`
   - `openai`
   - `anthropic`
5. Check: ✅ Releases, ✅ Issues

---

## Final repo structure on GitHub

```
main branch:
├── README.md          ← Landing page (both extensions)
├── LICENSE
├── .gitignore
├── GITHUB_SETUP.md
├── claude-nav/
│   ├── README.md
│   ├── manifest.json
│   ├── content.js
│   ├── sidebar.css
│   └── icons/
└── chatgpt-nav/
    ├── README.md
    ├── manifest.json
    ├── content.js
    ├── sidebar.css
    └── icons/

claude-nav branch:    ← Only claude-nav/ files (for direct clone)
chatgpt-nav branch:   ← Only chatgpt-nav/ files (for direct clone)
```

---

## Updating later

When you fix bugs or add features:

```bash
# Fix on main first
git checkout main
# ... make changes ...
git commit -m "Fix: description of what you fixed"
git push origin main

# Merge into the relevant branch
git checkout claude-nav
git merge main
git rm -r chatgpt-nav/   # keep the branch clean
git push origin claude-nav

git checkout chatgpt-nav
git merge main
git rm -r claude-nav/
git push origin chatgpt-nav
```
