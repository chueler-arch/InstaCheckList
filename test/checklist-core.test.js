"use strict";
const assert = require("node:assert/strict");
const core = require("../public/core/checklist-core.js");

assert.equal(core.validateTemplateHeader(core.TEMPLATE_HEADERS).length, 0);
assert.equal(core.validateTemplateHeader(["誤り"])[0].column, 1);

const rows = [
  [...core.TEMPLATE_HEADERS, core.ITEM_ID_HEADER],
  ["有効", "2", "設置", "", "確認B", "説明", "", "", "", "b"],
  ["TRUE", "1", "開梱", "", "確認A", "", "", "TRUE", "", ""],
  ["無効", "3", "", "", "非表示", "", "", "", "", "c"],
];
const parsed = core.parseItemRows(rows, () => "generated");
assert.deepEqual(parsed.items.map((item) => item.id), ["generated", "b"]);
assert.deepEqual(parsed.idWrites, [{ row: 3, id: "generated" }]);

const logs = core.parseLogRows([
  ["serial", "item", "date", "user"],
  ["A001", "item-1", "2026/08/14", "作業者"],
  ["A002", "item-2", "2026/08/14", "別作業者"],
], "A001");
assert.equal(logs.size, 1);
assert.equal(logs.get("item-1").user, "作業者");

const transfer = core.createMigrationPackage({ sourceSpreadsheetId: "sheet-id" });
assert.equal(transfer.manifest.schemaVersion, 1);
assert.equal(transfer.manifest.sourceSpreadsheetId, "sheet-id");
console.log("checklist-core tests passed");
