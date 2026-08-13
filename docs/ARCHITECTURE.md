# InstaCheckList architecture

## Product boundary

- **Free** uses Google OAuth, Google Spreadsheet and Google Drive.
- **Pro** will use Firebase Authentication, Cloud Firestore and Cloud Storage.
- The products remain separate deployments and data stores.
- Checklist rules, item/result models, validation, scanning and report models are shared.

## Layers

1. `core/`: storage-independent domain schema and conversion functions.
2. `data/`: repository contract and product-specific adapters.
3. UI: scanner, checklist cards, settings, viewer and reports.
4. Infrastructure: Google APIs in Free; Firebase SDK and trusted backend jobs in Pro.

UI code must not introduce new direct storage assumptions. New persistence features should first be expressed on `ChecklistRepository`, then implemented by the Free or Pro adapter.

Shared domain modules now include:

- `validation.js`: structured validation errors and Japanese presentation formatting.
- `item-settings-model.js`: setting row conversion and action resolution.
- `photo-model.js`: photo metadata conversion, grouping and portable filenames.
- `report-model.js`: report rows, work-date ranges and page partitioning.

Image decoding, resizing and upload remain infrastructure concerns. HTML rendering and print-window control remain UI concerns; only their data preparation belongs in `core/`.

## Migration direction

Free Spreadsheet data is imported once into Pro. Firestore becomes the source of truth after import; bidirectional synchronization is intentionally excluded. Every transfer package includes a schema version and source Spreadsheet ID so imports can be validated and deduplicated.

## Next refactoring stages

1. Move the existing Sheets/Drive calls behind a `GoogleWorkspaceRepository`.
2. Move camera scanning into a shared scanner module.
3. Move remaining photo and setting writes behind the repository.
4. Add a Free export screen using the transfer schema.
5. Implement the Pro `FirestoreRepository` in its own application.
