(() => {
  "use strict";
  const button = document.getElementById("settingsExportBtn");
  if (!button) return;
  const sheetExists = (titles, title) => titles.has(title);
  const download = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  button.addEventListener("click", async () => {
    if (!state.spreadsheetId) return toast("先に作業用Spreadsheetを選択してください。");
    button.disabled = true;
    try {
      await authorize();
      await loadItems();
      await window.loadChecklistSettings?.();
      const meta = await api(sheetsUrl("?fields=sheets.properties.title"));
      const titles = new Set((meta.sheets || []).map((sheet) => sheet.properties.title));
      const read = (title, range) => sheetExists(titles, title) ? valuesGet(`${title}!${range}`) : Promise.resolve({ values: [] });
      const [logs, settings, photos] = await Promise.all([
        read(InstaCheckListCore.SHEETS.log, "A:H"),
        read(InstaCheckListCore.SHEETS.settings, "A:J"),
        read(InstaCheckListCore.SHEETS.photos, "A:H"),
      ]);
      const transfer = InstaCheckListFreeTransfer.build({
        spreadsheetId: state.spreadsheetId, sheetTitle: state.sheetTitle,
        projectName: window.checklistProjectName || "", items: state.items,
        logRows: logs.values || [], settingRows: settings.values || [],
        photoRows: photos.values || [],
      });
      const safeName = (window.checklistProjectName || "InstaCheckList").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
      download(transfer, `${safeName}_Pro移行データ.json`);
      toast(`移行データを書き出しました（機器${transfer.devices.length}台・結果${transfer.results.length}件・写真${transfer.photos.length}件）`);
    } catch (error) {
      toast(error.message || "移行データを書き出せませんでした。");
    } finally { button.disabled = false; }
  });
})();
