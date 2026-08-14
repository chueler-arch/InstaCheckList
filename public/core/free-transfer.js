(function (root, factory) {
  const api = factory(root.InstaCheckListCore, root.InstaCheckListItemSettings, root.InstaCheckListPhotos);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.InstaCheckListFreeTransfer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (core, settingModel, photoModel) {
  "use strict";
  const value = (v) => String(v ?? "");
  function build(input) {
    const settingMap = settingModel.parseRows(input.settingRows || []);
    const itemSettings = (id) => settingMap.get(id) || {};
    const items = (input.items || []).map((item) => {
      const setting = itemSettings(item.id);
      return {
        id: item.id, order: item.order, major: item.major, middle: item.middle,
        title: item.small, instruction: item.instruction, confirm: item.confirm,
        memoDefault: item.memoDefault,
        action: settingModel.resolveAction(item, setting),
        validation: {
          length: setting.length || "", startsWith: setting.startsWith || "",
          includes: setting.includes || "", endsWith: setting.endsWith || "",
          regex: setting.regex || "",
        },
        referenceImage: setting.imageId ? {
          source: "google-drive", sourceFileId: setting.imageId,
          sourceUrl: setting.imageUrl || "",
        } : null,
      };
    });
    const results = (input.logRows || []).slice(1).filter((row) => row[0] && row[1]).map((row) => ({
      serial: value(row[0]), itemId: value(row[1]), completedAt: row[2] || "",
      workerName: row[3] || "", uniqueValue: row[4] || "", inputValue: row[5] || "",
      majorAtWork: row[6] || "", titleAtWork: row[7] || "",
    }));
    const devices = [...new Set(results.map((result) => result.serial))].map((serial) => ({ serial }));
    const photos = (input.photoRows || []).slice(1).map((row, index) => photoModel.fromRow(row, index)).filter((photo) => photo.serial && photo.itemId).map((photo) => ({
      serial: photo.serial, itemId: photo.itemId, source: "google-drive",
      sourceFileId: photo.id, sourceUrl: photo.url, capturedAt: photo.date,
      workerName: photo.user,
    }));
    const workerNames = new Set([...results.map((r) => r.workerName), ...photos.map((p) => p.workerName)].filter(Boolean));
    const users = [...workerNames].sort().map((displayName) => ({
      legacyId: `free:${displayName}`, displayName, source: "instachecklist-free",
    }));
    const serialSetting = itemSettings("serial");
    return core.createMigrationPackage({
      sourceSpreadsheetId: input.spreadsheetId,
      project: {
        name: input.projectName || "", sourceSheetName: input.sheetTitle || "",
        serialValidation: {
          length: serialSetting.length || "", startsWith: serialSetting.startsWith || "",
          includes: serialSetting.includes || "", endsWith: serialSetting.endsWith || "",
          regex: serialSetting.regex || "",
        },
        serialReferenceImage: serialSetting.imageId ? {
          source: "google-drive", sourceFileId: serialSetting.imageId,
          sourceUrl: serialSetting.imageUrl || "",
        } : null,
      },
      items, devices, results, photos, users,
      exportedAt: input.exportedAt,
    });
  }
  return Object.freeze({ build });
});
