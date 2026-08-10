# Google OAuth申請資料

## 本番情報

- App name: `InstaCheckList`
- Homepage: `https://instachecklist.sona-craft.com/`
- Privacy Policy: `https://instachecklist.sona-craft.com/privacy.html`
- Terms of Service: `https://instachecklist.sona-craft.com/terms.html`
- Authorized domain: `sona-craft.com`
- Developer contact: `chueler@gmail.com`

## 使用するスコープ

```text
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/userinfo.profile
```

`https://www.googleapis.com/auth/spreadsheets` は、共有URLからGoogle Pickerを省略し、共有先アカウントがアクセス権を持つ対象SpreadsheetをIDで直接読み書きするために要求する。

## Scope justification（申請欄へ貼り付け可能）

### drive.file

```text
InstaCheckList uses the drive.file scope so a user can explicitly select one Google Spreadsheet through Google Picker or create a new checklist Spreadsheet. The app reads checklist rows from that file and writes device-specific completion timestamps, operator names, work notes, and links to user-captured work photos back to it. When the user explicitly takes a work photo, the app creates that image in the user's Google Drive and records its Drive link in the selected Spreadsheet. The app does not need access to unrelated Drive files. The narrower drive.file scope is sufficient because the app only accesses files selected by the user or created by the app.
```

### spreadsheets

```text
InstaCheckList uses the spreadsheets scope to open a specific checklist Spreadsheet from a shared app URL containing its Spreadsheet ID, without requiring every field operator to select the same file again in Google Picker. Google sharing permissions remain authoritative: only users who already have access to that Spreadsheet can read or update it. The app uses the scope only for the Spreadsheet explicitly selected, created, or identified by the shared URL, and does not search or list other Spreadsheets.
```

### userinfo.profile

```text
InstaCheckList uses the basic profile scope only to retrieve the signed-in user's display name. The display name is shown as the operator and is written to the user-selected Spreadsheet together with each completion timestamp so collaborators can identify who completed the task. The app does not use profile data for advertising or analytics.
```

## デモ動画の構成

1. `https://instachecklist.sona-craft.com/` を未ログイン状態で開く。
2. アプリ名、目的、Footerの利用規約・プライバシーポリシーを映す。
3. Google認証画面の言語を英語にする。
4. 「Google DriveからSpreadsheetを選択」を押す。
5. OAuth同意画面全体と、要求される権限を映す。
6. Google Pickerでテスト用Spreadsheetを明示的に選択する。
7. チェック項目が読み込まれることを映す。
8. シリアル番号を入力または読み取る。
9. 固有値・作業メモを入力してチェックする。
10. 選択したSpreadsheetへ日時、作業者名、値、メモが保存されることを映す。
11. 別のDriveファイルを自動的に閲覧しないことを説明する。

動画は限定公開YouTubeまたは、審査担当者がログインなしで閲覧できる共有リンクにする。
