# Changelog

## v1.3.0 - 2026-06-10

- Made the Kanban board stretch across ultrawide screens when fewer columns are visible.
- Improved manual URL fetch fallbacks for slug-style job URLs and visible job-page text.
- Added scaled level-up confetti, with larger bursts when multiple levels are gained at once.

## v1.2.0 - 2026-06-07

- Added optional Chrome/Edge local JSON data-file autosave through Settings -> Data Storage.
- Kept browser storage as a fallback/cache while allowing users to reopen a saved data file after browser-storage cleanup.
- Updated public docs and Windows package instructions for the new data-file workflow.

## v1.1.1 - 2026-06-07

Simplified the Windows download package so HireLevel launches directly as a local HTML file.

- Removed the CMD/local-server launcher from the source tree and Windows ZIP.
- Packaged the user entry point as `HireLevel.html`.
- Updated Windows instructions around the required extension setting: **Allow access to file URLs**.
- Kept `index.html` as the normal source entry point for developers.
- Bumped the app and extension version to 1.1.1.

## v1.1.0 - 2026-06-07

Polished the public documentation and Windows download package.

- Cleaned up README wording so it reflects the current extension-supported LinkedIn and Glassdoor capture flow.
- Added a Windows security-warning notice for `Start HireLevel.cmd`.
- Moved packaged app files into an `app/` folder so the ZIP has one obvious launcher.
- Added a Windows package build script for repeatable release ZIP creation.
- Updated in-app fallback copy for blocked manual job-page reads.
- Bumped the app and extension version to 1.1.0.

## v1.0.1 - 2026-06-07

Fixed the Windows download package so extension captures work with the launched tracker.

- Replaced the unsupported desktop WebView package with a browser launcher package.
- Added `Start HireLevel.cmd`, which starts HireLevel on localhost and opens it in the user's browser.
- Kept extension capture compatible by running the tracker in Chrome/Edge-compatible browser context.
- Removed the Tauri desktop packaging scaffold from the source tree.

## v1.0.0 - 2026-06-06

First stable HireLevel release.

- Added Glassdoor capture support alongside LinkedIn capture.
- Added company logo capture and a branded HireLevel extension icon.
- Added live board importing from extension captures without refreshing the tracker.
- Added board card reordering and improved long-column scrolling.
- Added light/dark theme settings and multiple light color schemes.
- Added safer extension capture logging and live-updating popup diagnostics.
- Updated the XP curve so 25 XP actions remain useful through level 100 while level 200 stays offer-driven.
- Added extension widget board/status selectors with session memory for repeated captures.
- Fixed board deletion so global XP remains account history while per-board XP can be removed with the board.
- Added Windows ZIP launcher instructions for running HireLevel in a real browser with extension support.
- Documented the two-phase XP curve, supported job-board capture flow, and Windows ZIP usage.

## v0.1.2 - 2026-06-05

Improved LinkedIn capture diagnostics and Easy Apply extraction.

- Added a popup debug log for extension capture attempts.
- Logged failed capture candidates to extension storage.
- Added LinkedIn Easy Apply split-pane selector fallbacks.
- Added selected-card and detail-pane fallback extraction for title, company, and description.

## v0.1.1 - 2026-06-04

Fixed extension sync and usability issues found during Chrome testing.

- Fixed `file://` tracker messaging so pending extension captures import correctly.
- Fixed board sync from the tracker to the extension on local file pages.
- Made the LinkedIn capture widget draggable with saved position.
- Refreshed the LinkedIn board selector when the tracker syncs new boards.

## v0.1.0 - 2026-06-04

Added board-aware progression and extension capture upgrades.

- Added support for multiple application boards.
- Added settings for global account XP vs per-board XP.
- Changed XP to event-based progression so each job earns XP only once per column.
- Added 25 XP rewards for custom columns and capped custom columns at five per board.
- Added board reset, board progression reset, and account progression reset flows.
- Added confirmation dialogs for destructive reset actions.
- Updated the extension to queue multiple captured jobs.
- Updated the extension to ask which board to use when multiple boards are known.

## v0.0.1 - 2026-06-04

Initial public version of HireLevel.

- Added an offline job application board with local browser storage.
- Added default application statuses and custom columns.
- Added job cards with title, company, applied date, description, notes, status changes, edit, delete, and original job link.
- Added import and export for JSON backups.
- Added XP, levels, titles, and a progress meter.
- Added a light green HireLevel visual theme.
- Added an unpacked browser extension scaffold for capturing LinkedIn job details.
- Added project README and MIT license.
