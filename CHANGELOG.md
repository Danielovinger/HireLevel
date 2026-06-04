# Changelog

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
