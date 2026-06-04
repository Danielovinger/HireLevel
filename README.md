# HireLevel

HireLevel - level up your job search. An offline job application tracker with XP, levels, zero cloud nonsense, and absolutely free to use.

HireLevel is a small offline-first job application board inspired by common web-based job trackers, but without accounts, servers, or cloud storage. Open `index.html` in a browser and your data is stored locally in that browser with `localStorage`.

## Features

- Add a job from a manually entered URL.
- Best-effort metadata fetching for job title, company, and description when the job page allows local browser reads.
- URL fallback heuristics when a job site blocks local scraping.
- Paste-and-parse fallback for LinkedIn and other blocked job pages.
- Application XP, levels, progress meter, and title ranks.
- Multiple job-search boards.
- Global account XP or separate XP per board.
- Board and progression reset controls with confirmation prompts.
- Kanban-style columns for Saved, Applied, Received Answer, Interviewing, Offer, and Rejected.
- Add custom columns.
- Drag jobs between columns or change status from an expanded card.
- Expand cards to see the full description, notes, edit/delete actions, status selector, and original job link.
- Local JSON export and import for backups.
- No backend, login, analytics, or external package dependencies.

## Browser Limitations

Because this project is intentionally local and has no backend scraper, many job sites will block automatic page reading with CORS rules. When that happens, the app fills what it can from the URL and leaves the fields editable so you can paste the missing title, company, or description.

LinkedIn is usually blocked from direct local scraping because the job details are rendered inside a logged-in browser session and the page does not allow another local page to read it. For LinkedIn jobs, open the job, copy the visible job details panel text, paste it into **Paste job page text**, and click **Parse Pasted Text**.

Company icons are loaded from the job site's `/favicon.ico` when available. If you are offline or the favicon cannot load, the card falls back to company initials.

## XP Rules

Jobs reward XP based on their current status:

- Saved: 0 XP
- Applied: 5 XP
- First Positive Answer: 25 XP
- Rejected / Withdrawn: 25 XP
- Interviewing: 625 XP
- Offer: 390,625 XP
- Any custom column: 25 XP

Each job can earn XP from a specific column only once. Moving a job out of a column and back into it will not grant that column's XP again. Deleting a job does not remove XP that was already earned.

Level requirements use:

```text
XP needed for next level = 5 + 4 * (currentLevel - 1)^2
```

The maximum level is 200. Level 200 uses the special title **Job Holder**.

## Boards And Settings

HireLevel supports multiple boards. Use the board selector to switch boards, or create a new board from the main toolbar.

The Settings tab lets you choose whether XP is shown as:

- Global account XP across every board.
- Separate XP for the selected board.

The current board can be reset to its default state without resetting XP. Board progression can also be reset separately. Account progression reset is only available from Settings.

## Run Locally

Open `index.html` directly in your browser.

You can also serve the folder with any static file server if you prefer:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Browser Extension

The `extension/` folder contains an unpacked Chrome/Edge extension that can capture LinkedIn job details.

To install it locally:

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable developer mode.
3. Choose **Load unpacked**.
4. Select the `extension/` folder.

On LinkedIn job pages, click **Add to HireLevel**. If the extension knows about multiple boards, it will ask which board to use. If it only knows one board, it captures directly for that board. If the tracker has not been opened yet, the extension queues the job and the tracker imports it when opened.

If you open the tracker through `file://`, enable **Allow access to file URLs** for the extension in the browser's extension details page. Alternatively, run the tracker on `localhost`, which is usually smoother for extension testing.

After pulling updates, click the extension reload button in `chrome://extensions` or `edge://extensions`, then refresh any open LinkedIn and HireLevel tabs.

## Privacy

All tracker data is saved locally in your browser. Export JSON regularly if you want a portable backup or want to move the board to another browser or machine.

## Roadmap Ideas

- Optional desktop app wrapper.
- Browser extension for one-click job capture.
- CSV export.
- Reminders and follow-up dates.
- Archive view.
- Better company logo handling.

## License

Add the license you prefer before publishing. MIT is a common choice for small open source apps.
