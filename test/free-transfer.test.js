"use strict";
const assert = require("node:assert/strict");
require("../public/core/checklist-core.js");
require("../public/core/item-settings-model.js");
require("../public/core/photo-model.js");
const transferModel = require("../public/core/free-transfer.js");

const transfer = transferModel.build({
  spreadsheetId: "sheet-1", sheetTitle: "作業", projectName: "案件A",
  exportedAt: "2026-08-14T00:00:00.000Z",
  items: [{ id: "item-1", order: 1, major: "開梱", small: "外観確認", uniqueLabel: "" }],
  settingRows: [["設定ID"], ["item-1", "", "", "ref-1", "https://drive/ref", "", "", "", "", "check"]],
  logRows: [["serial"], ["S001", "item-1", "2026/08/14 09:00", "作業者A", "", "OK", "開梱", "外観確認"]],
  photoRows: [["serial"], ["S001", "item-1", "https://drive/photo", "", "photo-1", "2026/08/14 09:01", "作業者A", "data"]],
});
assert.equal(transfer.manifest.schemaVersion, 1);
assert.equal(transfer.project.name, "案件A");
assert.equal(transfer.items[0].referenceImage.sourceFileId, "ref-1");
assert.equal(transfer.devices[0].serial, "S001");
assert.equal(transfer.results[0].inputValue, "OK");
assert.equal(transfer.photos[0].sourceFileId, "photo-1");
assert.equal(transfer.photos[0].thumbData, undefined);
assert.equal(transfer.users[0].displayName, "作業者A");
console.log("free transfer tests passed");
