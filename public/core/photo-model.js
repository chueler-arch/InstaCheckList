(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.InstaCheckListPhotos = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function fromRow(row, index = 0) {
    return { serial: String(row[0] || ""), itemId: String(row[1] || ""),
      url: row[2] || "", thumb: row[3] || "", id: row[4] || "",
      date: row[5] || "", user: row[6] || "", thumbData: row[7] || "", row: index + 2 };
  }
  function groupRows(rows, serial) {
    const result = new Map();
    (rows || []).slice(1).forEach((row, index) => {
      const photo = fromRow(row, index);
      if (photo.serial !== String(serial)) return;
      if (!result.has(photo.itemId)) result.set(photo.itemId, []);
      result.get(photo.itemId).push(photo);
    });
    return result;
  }
  function toRow(photo) {
    return [photo.serial, photo.itemId, photo.url || "", photo.thumb || "",
      photo.id || "", photo.date || "", photo.user || "", photo.thumbData || ""];
  }
  const previewKey = (itemId, photo, index) => photo.id || `${itemId}:${index}`;
  function filename(serial, timestamp = Date.now()) {
    const safe = String(serial).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
    return `InstaCheckList_${safe}_${timestamp}.jpg`;
  }
  return Object.freeze({ fromRow, groupRows, toRow, previewKey, filename });
});
