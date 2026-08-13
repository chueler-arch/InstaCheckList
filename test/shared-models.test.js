"use strict";
const assert = require("node:assert/strict");
const validation = require("../public/core/validation.js");
const settings = require("../public/core/item-settings-model.js");
const photos = require("../public/core/photo-model.js");
const reports = require("../public/core/report-model.js");

const errors = validation.validateValue("AB-123-Z", {
  length: 8, startsWith: "AB", includes: "123", endsWith: "Z", regex: "^[A-Z]{2}-\\d{3}-Z$",
});
assert.equal(errors.length, 0);
assert.deepEqual(validation.validateValue("BC", { startsWith: "A" }).map((e) => e.code), ["startsWith"]);
assert.equal(validation.validateValue("A", { regex: "[" })[0].code, "invalidRegex");

const settingRows = [["ID"], ["item-1", "12", "^[A-Z]+$", "image", "url", "thumb", "A", "B", "Z", "input"]];
const parsedSettings = settings.parseRows(settingRows);
assert.equal(parsedSettings.get("item-1").action, "input");
assert.equal(settings.toRow(parsedSettings.get("item-1"))[9], "input");
assert.equal(settings.resolveAction({ uniqueLabel: "TRUE" }, {}, false), "input");

const photoRows = [["serial", "item"], ["S1", "I1", "url", "thumb", "file", "date", "user", "data"]];
const grouped = photos.groupRows(photoRows, "S1");
assert.equal(grouped.get("I1")[0].id, "file");
assert.deepEqual(photos.toRow(grouped.get("I1")[0]).slice(0, 2), ["S1", "I1"]);
assert.match(photos.filename("A/B", 123), /^InstaCheckList_A_B_123\.jpg$/);

const items = [{ id: "1", major: "A", small: "one" }, { id: "2", major: "A", small: "two" }];
const logs = new Map([["1", { date: "2026/08/13 10:00", user: "A" }], ["2", { date: "2026/08/14 10:00", user: "B" }]]);
assert.equal(reports.rows(items, logs)[0].majorSpan, 2);
assert.equal(reports.rows(items, logs)[1].startsMajor, false);
assert.equal(reports.workDate(logs), "2026年8月13日～2026年8月14日");
assert.equal(reports.paginate(items, logs).length, 1);
console.log("shared model tests passed");
