# HireLevel

HireLevel - level up your job search. An offline job application tracker with XP, levels, zero cloud nonsense, and absolutely free to use.

HireLevel is a small offline-first job application board for organizing job-search progress without accounts, servers, or cloud storage. Download the Windows ZIP and launch it by double-clicking `HireLevel.html`, or open `index.html` directly when working from the source code. Your data is stored locally in that browser with `localStorage`.

## Features

- Add a job from a manually entered URL.
- Best-effort metadata fetching for job title, company, and description when the job page allows local browser reads.
- Browser extension capture across LinkedIn, Glassdoor, and job pages that expose standard job metadata.
- Paste-and-parse fallback for blocked job pages.
- Application XP, levels, progress meter, and title ranks.
- 50 account-level achievements with XP rewards, popup unlocks, icons, and JSON persistence.
- Multiple job-search boards.
- Global account XP or separate XP per board.
- Board and progression reset controls with confirmation prompts.
- Kanban-style columns for Saved, Applied, First Positive Answer, Interviewing, Offer, and Reject.
- Add custom columns.
- Drag jobs between columns or change status from an expanded card.
- Expand cards to see the full description, notes, edit/delete actions, status selector, and original job link.
- Personalize the board with Forest, Terminal, Guild Hall, Space Station, or Cozy Desk skins.
- See application progress at a glance: Applied glows green, First Positive Answer blue, Interviewing purple, Offer gold, and Reject red. Saved and custom columns stay plain.
- Optional local JSON data file with autosave in Chrome/Edge.
- Local JSON export and import for backups.
- No backend, login, analytics, or external package dependencies.

## Job Capture

HireLevel has two capture paths:

- Use the included Chrome/Edge extension on LinkedIn, Glassdoor, and other job pages. It reads the page you are viewing, prioritizes standard `JobPosting` metadata when available, then sends the captured job to your local HireLevel board.
- Use the app's manual URL form for other job sites. If a page blocks direct local reading with CORS rules, HireLevel fills what it can from the URL and leaves the fields editable so you can paste the missing title, company, or description.

Company icons captured by the extension are resized and embedded in HireLevel's local data, including JSON exports, so expiring image links cannot remove them later. Existing remote icons are cached locally when possible. If an icon is unavailable, the card falls back to company initials instead of showing an empty image.

## XP Rules

Jobs reward XP based on their current status:

- Saved: 0 XP
- Applied: 5 XP
- First Positive Answer: 25 XP
- Reject: 25 XP
- Interviewing: 625 XP
- Offer: 390,625 XP
- Any custom column: 25 XP

Each job can earn XP from a specific column only once. Moving a job out of a column and back into it will not grant that column's XP again. Deleting a job does not remove XP that was already earned.

Achievements are account-level and unlock only once. Achievement XP is saved as account XP in the same JSON data and can help push the account into higher levels.

Level requirements use a two-phase curve:

```text
Levels 1-99:   XP needed for next level = 5 + 3 * (currentLevel - 1)
Levels 100-199: XP needed for next level = round(300 + 4.6 * (currentLevel - 99)^2)
```

This keeps 25 XP actions useful through level 100, then makes the climb to level 200 offer-driven. Level 100 takes about 15,048 total XP. Level 200 takes about 1,601,458 total XP, or roughly four offers plus regular application activity. The maximum level is 200. Level 200 uses the special title **Job Holder**.

## Boards And Settings

HireLevel supports multiple boards. Use the board selector to switch boards, or create a new board from the main toolbar.

The Settings tab lets you choose whether XP is shown as:

- Global account XP across every board.
- Separate XP for the selected board.

The current board can be reset to its default state without resetting XP. Board progression can also be reset separately. Account progression reset is only available from Settings.

## Use HireLevel

For non-technical users, download `HireLevel-windows.zip` from the latest GitHub Release. It contains:

```text
HireLevel.html
app.js
styles.css
extension/
windows-release-readme.txt
```

That download lets users launch the app by double-clicking `HireLevel.html`. The ZIP instructions are maintained in `docs/windows-release-readme.txt`.

## Please Notice

The packaged app opens as a local `file://` page. For the extension to sync captured jobs into HireLevel, Chrome or Edge must allow the extension to access local files. In the extension details page, enable **Allow access to file URLs**.

HireLevel does not upload job data, account data, or tracking data to a cloud service. The app files open locally in the browser, and tracker data stays in that browser's local storage.

For stronger protection against accidental browser-storage cleanup, open **Settings -> Data Storage** and create or open a local `HireLevel-data.json` file. Once connected, HireLevel autosaves changes to that file. If browser storage is ever cleared, open the same data file again to restore the board.

For source users and developers:

Open `index.html` directly in your browser.

You can also serve the folder with any static file server if you prefer:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Browser Extension

The `extension/` folder contains an unpacked Chrome/Edge extension that captures LinkedIn and Glassdoor directly and supports many other career sites through standard job-page metadata and semantic page content.

To install it locally:

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable developer mode.
3. Choose **Load unpacked**.
4. Select the `extension/` folder.

On a recognized job page, choose whether the job should start as **Applied** or **Saved**, then click **Add to HireLevel**. If the widget does not appear automatically, open the extension and choose **Show capture widget on this page**. If the extension knows about multiple boards, it will also ask which board to use. If it only knows one board, it captures directly for that board. Saved captures do not grant XP. Applied captures grant the normal 5 XP once. If the tracker has not been opened yet, the extension queues the job and the tracker imports it when opened.

Dedicated capture logic is included for:

- LinkedIn
- Glassdoor

Other career sites are captured using standard `JobPosting` structured data first, then common job-title, company, description, logo, and canonical-link patterns. Sites with unusual or protected page structures can still be tracked with URL entry and pasted job text.

If a captured job is already on the selected board, the extension reports **Job already exists** instead of creating a duplicate.

For the packaged Windows download, open `HireLevel.html` first, then enable **Allow access to file URLs** for the extension in the browser's extension details page. This lets the extension sync captures into the local tracker.

Because job capture can run across career sites and cache their company logos locally, Chrome or Edge will show that the extension can read pages on websites. HireLevel uses that access inside the browser to recognize job pages, perform captures, and download logo images into local data. It does not upload page contents, job data, or browsing activity.

After pulling updates, click the extension reload button in `chrome://extensions` or `edge://extensions`, then refresh any open LinkedIn and HireLevel tabs.

## Privacy And Data Safety

Tracker data is saved locally. By default, HireLevel uses browser storage. In Chrome/Edge, the optional Data Storage setting can also autosave to a local JSON file chosen by the user. Export JSON regularly if you want an extra portable backup or want to move the board to another browser or machine.

## Roadmap Ideas

- CSV export.
- Reminders and follow-up dates.
- Archive view.

## Acknowledgments

HireLevel was built by Daniel Lovinger with development assistance from OpenAI Codex.

## License

HireLevel is released under the MIT License. See `LICENSE` for details.
