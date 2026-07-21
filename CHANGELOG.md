# Changelog

## v2.1.1 - 2026-07-21

- Prevented LinkedIn controls such as Save and Applied now from being captured as job titles after an application is submitted.
- Restricted selected-card tracking to the actual LinkedIn search-results list instead of the application detail panel.
- Expanded LinkedIn description capture using current semantic containers, the visible About the job section, and matching JobPosting metadata.

## v2.1.0 - 2026-07-19

- Expanded browser-extension capture beyond LinkedIn and Glassdoor using standard JobPosting metadata and semantic page fallbacks.
- Improved LinkedIn capture across classic search, AI-powered search, collections, and job-detail views by following the selected job card and active details panel.
- Added a popup command to show the HireLevel capture widget manually on unrecognized job pages.
- Added local company-logo caching with compact embedded images that persist in HireLevel data and JSON exports.
- Added automatic migration for existing valid logo URLs and reliable company-initial fallbacks for unavailable images.
- Updated extension permissions, capture logs, packaged instructions, and public documentation for the wider job-site support.

## v2.0.1 - 2026-07-05

- Expanded the achievement set from 27 to 50 achievements.
- Added new job volume, saved job, response, interview, reject, board, workflow, contact, and timeline achievement tiers.
- Added app-usage achievements for changing board skins, connecting a JSON data file, and exporting JSON.
- Added app event persistence so app-usage achievements can be saved and restored through JSON data.

## v2.0.0 - 2026-07-03

- Added account-level achievements with icons, popup unlocks, JSON persistence, and backfill for existing saved data.
- Added achievement XP rewards, including a hidden capstone reward for "Why are you still here?".
- Added a dedicated Achievements tab in the sidebar.
- Renamed the default Rejected / Withdrawn column to Reject while preserving existing saved data compatibility.
- Updated project documentation for achievements and the Reject workflow.

## v1.5.0 - 2026-06-27

- Added a per-job timeline inside expanded job cards.
- Automatically records job creation, extension captures, edits, note updates, status moves, and XP awards.
- Added a contact log for recruiters, hiring managers, referrals, and other job-specific conversations.
- Included contact log details in board search.

## v1.4.2 - 2026-06-23

- Removed LinkedIn verification wording from captured job titles.
- Collapsed exact duplicated title text exposed by LinkedIn's combined visible and accessibility labels.
- Preserved legitimate titles that contain intentionally repeated words.

## v1.4.1 - 2026-06-23

- Reworked LinkedIn search-results capture to match the selected card using its numeric job ID and company.
- Prevented locations, result counts, Premium prompts, and Job Seeker Insights headings from being saved as job titles.
- Captured company logos from the matched LinkedIn card instead of unrelated jobs elsewhere on the page.
- Added LinkedIn job IDs to captured records for more reliable duplicate detection across changing search URLs.
- Kept extension success, duplicate, and error messages visible for 2.5 seconds without widget refreshes interrupting them.

## v1.4.0 - 2026-06-22

- Added Forest, Terminal, Guild Hall, Space Station, and Cozy Desk board skins.
- Added status glows for Applied, First Positive Answer, Interviewing, Offer, and Rejected / Withdrawn cards.
- Added immediate duplicate detection to the LinkedIn and Glassdoor capture widgets, with tracker-confirmed fallback detection.
- Improved LinkedIn capture for manually searched job lists by targeting the selected job ID and detail pane.
- Prevented LinkedIn feedback prompts such as "Are these results helpful?" from being saved as job titles.
- Added an acknowledgment for development assistance from OpenAI Codex.

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
