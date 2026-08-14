# InstaCheckList transfer format v1

The portable object returned by `createMigrationPackage()` contains:

- `manifest`: format name, schema version, source, export time and source Spreadsheet ID.
- `project`: project name and project metadata.
- `templates`: reusable checklist template metadata.
- `items`: stable item IDs, ordering, instructions, action type and validation rules.
- `devices`: serial numbers and device-specific values.
- `results`: item results, entered values, worker display names and timestamps.
- `photos`: source Drive IDs and metadata. Pro copies the binary files to Cloud Storage.
- `users`: historical worker identities. Unmatched workers remain imported display-name records.

Import is one-way and creates a new Pro project in v1. Re-import must be detected using `sourceSpreadsheetId`; merging is deliberately not part of v1.

Free users create this JSON from **Settings → Pro版移行データ**. Photo binaries and reference-image binaries are not embedded; the export contains their Google Drive file IDs. During import, Pro must request temporary Google authorization, copy accessible files to Cloud Storage, record failures, and then allow the user to disconnect Google.
