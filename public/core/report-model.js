(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.InstaCheckListReports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const fallbackMajor = "チェック項目";
  function rows(items, logs) {
    return (items || []).map((item, index, all) => {
      const major = item.major || fallbackMajor;
      const startsMajor = index === 0 || (all[index - 1].major || fallbackMajor) !== major;
      let majorSpan = 0;
      if (startsMajor) {
        majorSpan = 1;
        while (index + majorSpan < all.length && (all[index + majorSpan].major || fallbackMajor) === major) majorSpan++;
      }
      return { item, log: logs.get(item.id), major, startsMajor, majorSpan };
    });
  }
  function workDate(logs) {
    const dates = [...logs.values()].map((log) => String(log.date || "").match(/\d{4}\/\d{2}\/\d{2}/)?.[0]).filter(Boolean).sort();
    if (!dates.length) return "未完了";
    const format = (value) => { const [y, m, d] = value.split("/"); return `${y}年${Number(m)}月${Number(d)}日`; };
    return dates[0] === dates.at(-1) ? format(dates[0]) : `${format(dates[0])}～${format(dates.at(-1))}`;
  }
  function paginate(items, logs, maxWeight = 30) {
    const pages = []; let page = [], weight = 0;
    (items || []).forEach((item) => {
      const log = logs.get(item.id), content = [item.middle, item.small, item.instruction, log?.memo].join("");
      const rowWeight = 1 + Math.floor(content.length / 75);
      if (page.length && weight + rowWeight > maxWeight) { pages.push(page); page = []; weight = 0; }
      page.push(item); weight += rowWeight;
    });
    if (page.length || !pages.length) pages.push(page);
    return pages;
  }
  return Object.freeze({ rows, workDate, paginate });
});
