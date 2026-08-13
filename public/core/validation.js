(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.InstaCheckListValidation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const text = (value) => String(value ?? "");
  function normalizeRule(rule = {}) {
    return {
      length: Number(rule.length) > 0 ? Number(rule.length) : 0,
      startsWith: text(rule.startsWith), includes: text(rule.includes),
      endsWith: text(rule.endsWith), regex: text(rule.regex),
    };
  }
  function validateValue(value, rule = {}) {
    const input = text(value), r = normalizeRule(rule), errors = [];
    const actualLength = [...input].length;
    if (r.length && actualLength !== r.length)
      errors.push({ code: "length", expected: r.length, actual: actualLength });
    if (r.startsWith && !input.startsWith(r.startsWith))
      errors.push({ code: "startsWith", expected: r.startsWith });
    if (r.includes && !input.includes(r.includes))
      errors.push({ code: "includes", expected: r.includes });
    if (r.endsWith && !input.endsWith(r.endsWith))
      errors.push({ code: "endsWith", expected: r.endsWith });
    if (r.regex) try {
      if (!new RegExp(r.regex).test(input)) errors.push({ code: "regex", expected: r.regex });
    } catch { errors.push({ code: "invalidRegex", expected: r.regex }); }
    return errors;
  }
  function formatErrors(label, errors) {
    if (!errors.length) return "";
    const messages = errors.map((error) => ({
      length: `文字数は${error.expected}文字ではありません（現在${error.actual}文字）。`,
      startsWith: `先頭が「${error.expected}」ではありません。`,
      includes: `「${error.expected}」が含まれていません。`,
      endsWith: `末尾が「${error.expected}」ではありません。`,
      regex: `正規表現「${error.expected}」に一致しません。`,
      invalidRegex: "正規表現設定が正しくありません。",
    })[error.code]);
    return `${label}：${messages.join(" ")}`;
  }
  return Object.freeze({ normalizeRule, validateValue, formatErrors });
});
