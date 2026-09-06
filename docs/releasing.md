# Releasing HireLevel

## Saved owner instruction

Daniel's release workflow is to publish directly to the GitHub repository
[`Danielovinger/HireLevel`](https://github.com/Danielovinger/HireLevel), then replace
the local desktop app with that same released package:

```text
C:\Users\Danie\OneDrive\Desktop\HireLevel-windows
```

Remove the old application files when replacing them, but **never delete, replace,
rewrite, or move `HireLevel-data.json`**. Hash the data file before and after the
update and require identical SHA-256 hashes. Preserve other local user data JSON
as well. This instruction was recovered and explicitly reaffirmed in the
statistics-page task on September 6, 2026. The previous published release was
`v2.4.0`.

When Daniel asks to stage and publish an update and replace the desktop files,
those actions are authorized; a second confirmation is not needed. Request any
required host/sandbox access through the normal execution approval mechanism.
Do not interpret this workflow as permission to discard unrelated source changes
or to publish unfinished work.

## Release sequence

1. Complete the feature, appropriate automated checks, and browser verification.
   Update `VERSION`, `CHANGELOG.md`, and relevant user documentation. Review the
   final changes before staging.
2. Build the Windows package with `scripts/build-windows-package.ps1`. Confirm
   `release/HireLevel-windows.zip` and `release/HireLevel-windows/` contain the same
   app version and all required assets. Do not include local tracker data. The
   updater's `-WhatIf` mode performs these package checks without changing the
   desktop:

   ```powershell
   & .\scripts\build-windows-package.ps1
   & .\scripts\update-desktop-release.ps1 -WhatIf
   ```

3. Stage the intended source, documentation, and scripts; commit; create the
   matching `v<VERSION>` tag; and push the commit and tag to `origin`. The ignored
   `release/` output is distributed as a release asset, not committed. Keep the
   published package tied to the exact verified commit and tag.
4. Publish a GitHub Release for that tag in `Danielovinger/HireLevel`, attaching
   `release/HireLevel-windows.zip`. Use the relevant changelog entry as release
   notes. With `gh`, prefer a notes file and `--notes-file` to preserve newlines.
   Inspect the resulting release and asset, and compare the uploaded/downloaded
   ZIP SHA-256 with the local ZIP before replacing the desktop app.
5. Run the desktop updater with the verified package. Its defaults target the
   exact directory above:

   ```powershell
   & .\scripts\update-desktop-release.ps1
   ```

6. Confirm the installed `VERSION`, every packaged file's SHA-256, and the
   unchanged before/after data SHA-256. Report the release link and desktop
   update result. Refresh the app to load its new files; if extension files
   changed, reload the unpacked extension through its browser's extension page.

The updater resolves and validates the source and destination paths, rejects
overlapping paths and symbolic links/junctions in package contents or anywhere in
the destination path, validates required package files,
and compares every package file with the release ZIP before changing anything.
It removes files individually and only deletes empty directories, preserving
`*data*.json` and any other local JSON absent from the package. It refuses package
paths that collide with protected data. It checks every operation stays within
the intended directory, then verifies all installed files and preserved hashes.
The checkout currently resolves through a directory junction to
`Q:\Storage\Codex Projects\MaxLevelApplier`; read-only source ancestor links are
resolved before package validation so that this existing checkout layout works.
OneDrive's non-redirecting cloud placeholder reparse points are allowed after
their reparse tags are verified; symbolic links, junctions, and unknown reparse
tags are rejected on the destination and inside the package.

The optional `-SourcePath`, `-ArchivePath`, and `-DestinationPath` parameters allow
isolated validation fixtures or an explicitly instructed installation path. The
destination must still be a directory named `HireLevel-windows`; do not override
the saved desktop destination during an ordinary owner release.

GitHub network commands can require elevated sandbox access. A sandbox-only
`gh auth status` failure can be caused by blocked networking; verify with allowed
network access before concluding that the saved login is invalid. Never print
authentication tokens.
