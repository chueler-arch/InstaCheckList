(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.InstaCheckListItemSettings = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function fromRow(row, index = 0) {
    return {
      id: String(row[0] || ""), row: index + 2, length: row[1] || "",
      regex: row[2] || "", imageId: row[3] || "", imageUrl: row[4] || "",
      thumbData: row[5] || "", startsWith: row[6] || "", includes: row[7] || "",
      endsWith: row[8] || "", action: row[9] || "",
    };
  }
  function parseRows(rows) {
    const settings = new Map();
    (rows || []).slice(1).forEach((row, index) => {
      const setting = fromRow(row, index);
      if (setting.id) settings.set(setting.id, setting);
    });
    return settings;
  }
  function toRow(setting) {
    return [setting.id, setting.length || "", setting.regex || "",
      setting.imageId || "", setting.imageUrl || "", setting.thumbData || "",
      setting.startsWith || "", setting.includes || "", setting.endsWith || "",
      setting.action || ""];
  }
  function resolveAction(item, setting, serial = false) {
    if (serial) return "input";
    if (setting?.action) return setting.action;
    return /^(true|1|yes|on)$/i.test(String(item?.uniqueLabel || "").trim()) ? "input" : "check";
  }
  return Object.freeze({ fromRow, parseRows, toRow, resolveAction });
});
