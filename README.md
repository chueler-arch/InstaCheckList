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
- H列に文字（例: `MACアドレス`）がある行は、固有値と作業メモが必須です。
- J列は項目を識別するシステムIDです。アプリが自動設定するため編集しないでください。
- `_InstaCheckList_Log` シートは履歴保存用として自動作成・非表示になります。
- Spreadsheetを共同編集する全ユーザーに編集権限を付与してください。

## 本番公開（Cloudflare Pages）

QRtoQRと同じ設定です。

- Framework preset: `None`
- Build command: 空欄
- Build output directory: `public`
- Production branch: `master`（運用ブランチに合わせて変更可）

Google Cloud ConsoleのOAuthクライアントとAPIキーに、本番ドメインを追加してください。Google Picker API、Google Sheets API、Google Drive APIを有効化し、OAuth同意画面のスコープに Sheets、Drive file、ユーザープロフィールを登録します。

## 重要な設計

チェック結果はテンプレートの行番号ではなく、J列の項目IDとシリアル番号の組み合わせで保存します。途中で行を追加・並べ替えしても既存記録に影響しません。保存のたびに作業用シートと履歴を再読込します。
