---
name: verify
description: Build, launch, and drive this dashboard headlessly to verify UI changes at runtime.
---

# Verify Taiwan Off-Work/School Dashboard

## Build & launch

```bash
npm run build                          # tsc + vite build (typecheck gate)
npm run dev -- --port 5199 --strictPort  # dev server, run in background
```

## Drive headlessly

No Playwright in the repo. Install `playwright-core` in a scratch dir and use the
cached headless shell (already downloaded on this machine):

```
~/Library/Caches/ms-playwright/chromium_headless_shell-<latest>/chrome-headless-shell-mac-arm64/chrome-headless-shell
```

Note: `chromium-*` dirs contain `Google Chrome for Testing.app`, not `Chromium.app`.

## Flows worth driving

- Default split view: `.alert-badge` count, `.list-view .alert-card` count, `.empty-state`.
- Tab switch 縣市彙整 ↔ 全部通報; `.history-toggle` checkbox in 全部通報 shows expired
  entries tagged `.tag-expired`.
- `.status-bar` text: 通報資料/地圖資料 show MM/DD prefix when data is not from today.
- `.btn-refresh` (立即更新) re-fetches without errors.

## Gotchas

- Data comes live from `https://twoff.littlechintw.workers.dev` (`/cap` Atom feed,
  `/kmz`). The NCDR feed retains historical entries — whether the list is empty
  depends on real-world alerts; check `cap:expires` in the feed to know what to expect.
- Wait ~2.5s after page load for fetch + KMZ parse before asserting.
