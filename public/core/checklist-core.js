(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.InstaCheckListCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = 1;
  const SHEETS = Object.freeze({
    log: "_InstaCheckList_Log",
    photos: "_InstaCheckList_Photos",
    settings: "_InstaCheckList_Settings",
  });
  const ITEM_ID_HEADER = "_InstaCheckList_ID";
  const TEMPLATE_HEADERS = Object.freeze([
    "有効/無効", "順番", "大項目", "中項目/参照値", "小項目/参照値",
    "作業指示補足", "作業確認", "固有値(MACアドレスなど)", "作業メモ",
  ]);

  const text = (value) => String(value ?? "").trim();
  const enabled = (value) => /^(有効|true|1|yes|on|✓)$/i.test(text(value));

  function validateTemplateHeader(row) {
    const actual = row || [];
    return TEMPLATE_HEADERS.reduce((errors, expected, index) => {
      if (text(actual[index]) !== expected)
        errors.push({ column: index + 1, expected, actual: text(actual[index]) });
      return errors;
    }, []);
  }

  function parseItemRows(rows, createId) {
    const source = rows || [];
    const headerErrors = validateTemplateHeader(source[0]);
    if (headerErrors.length) return { items: [], idWrites: [], headerErrors };
    const idWrites = [];
    const items = source.slice(1).map((row, index) => {
      let id = text(row[9]);
      if (!id && createId) {
        id = createId();
        idWrites.push({ row: index + 2, id });
      }
      return {
        row: index + 2, id, enabled: enabled(row[0]), order: row[1] || index + 1,
        major: row[2] || "", middle: row[3] || "", small: row[4] || "",
        instruction: row[5] || "", confirm: row[6] || "",
        uniqueLabel: row[7] || "", memoDefault: row[8] || "",
      };
    }).filter((item) => item.enabled).sort((a, b) =>
      Number(a.order) - Number(b.order) || text(a.order).localeCompare(text(b.order), "ja"));
    return { items, idWrites, headerErrors: [] };
  }

  function parseLogRows(rows, serial) {
    const logs = new Map();
    (rows || []).slice(1).forEach((row, index) => {
      if (text(row[0]) !== text(serial)) return;
      logs.set(text(row[1]), {
        row: index + 2, date: row[2] || "", user: row[3] || "",
        unique: row[4] || "", memo: row[5] || "",
        major: row[6] || "", title: row[7] || "",
      });
    });
    return logs;
  }

  function createMigrationPackage(data) {
    const now = data.exportedAt || new Date().toISOString();
    return {
      manifest: {
        format: "instachecklist-transfer", schemaVersion: SCHEMA_VERSION,
        source: data.source || "instachecklist-free", exportedAt: now,
        sourceSpreadsheetId: data.sourceSpreadsheetId || "",
      },
      project: data.project || {}, templates: data.templates || [],
      items: data.items || [], devices: data.devices || [],
      results: data.results || [], photos: data.photos || [], users: data.users || [],
    };
  }

  return Object.freeze({
    SCHEMA_VERSION, SHEETS, ITEM_ID_HEADER, TEMPLATE_HEADERS,
    validateTemplateHeader, parseItemRows, parseLogRows, createMigrationPackage,
  });
});
