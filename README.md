# InstaCheckList

現場でシリアル番号を読み取り、Google Spreadsheetを複数ユーザーでリアルタイム更新するチェックシートWebアプリです。

## ローカル起動

```powershell
npm start
```

`http://localhost:4174` を開きます。カメラは `localhost` または HTTPS でのみ動作します。

## Spreadsheetの準備

作業用シートの1行目を次の順番で作成します。

`有効/無効 | 順番 | 大項目 | 中項目/参照値 | 小項目/参照値 | 作業指示補足 | 作業確認 | 固有値(MACアドレスなど) | 作業メモ`

- A列は `有効` の行だけ表示されます。
- H列が `TRUE` の行だけ作業メモ欄を表示し、チェック完了時の入力を必須にします。MACアドレスなどの固有値もこの欄へ記録します。
- J列は項目を識別するシステムIDです。アプリが自動設定するため編集しないでください。
- `_InstaCheckList_Log` シートは履歴保存用として自動作成・非表示になります。
- 作業写真はGoogle Driveへ保存し、`_InstaCheckList_Photos` シートへ現在のシリアル番号、項目ID、Driveリンク、撮影日時、作業者名を保存します。
- Spreadsheetを共同編集する全ユーザーに編集権限を付与してください。

## 本番公開（Cloudflare Pages）

QRtoQRと同じ設定です。

- Framework preset: `None`
- Build command: 空欄
- Build output directory: `public`
- Production branch: `master`（運用ブランチに合わせて変更可）

Google Cloud ConsoleのOAuthクライアントとAPIキーに本番ドメインを追加してください。Google Picker API、Google Sheets API、Google Drive APIを有効化し、OAuth同意画面には `drive.file`、`spreadsheets`、`userinfo.profile` を登録します。`spreadsheets` は、共有URLのSpreadsheet IDからPickerを省略して、Google共有設定で許可されたチェックシートを直接読み書きするために使用します。

## 重要な設計

チェック結果はテンプレートの行番号ではなく、J列の項目IDとシリアル番号の組み合わせで保存します。途中で行を追加・並べ替えしても既存記録に影響しません。保存のたびに作業用シートと履歴を再読込します。
