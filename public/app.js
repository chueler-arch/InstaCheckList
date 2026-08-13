"use strict";
const GOOGLE_CLIENT_ID =
  "30097772627-p5tt4ma2vivtfk7erb2j3912eie0tv3o.apps.googleusercontent.com";
const GOOGLE_API_KEY = "AIzaSyBAYtRW9s0IQEFi4lEU7L9TZZqAKz5AjO0";
const GOOGLE_APP_ID = "30097772627";
const SCOPE =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile";
const LOG_SHEET = "_InstaCheckList_Log",
  ITEM_ID_HEADER = "_InstaCheckList_ID";
const TEMPLATE_HEADERS = [
  "有効/無効",
  "順番",
  "大項目",
  "中項目/参照値",
  "小項目/参照値",
  "作業指示補足",
  "作業確認",
  "固有値(MACアドレスなど)",
  "作業メモ",
];
const $ = (id) => document.getElementById(id);
const dom = {
  setup: $("setup"),
  scanner: $("scanner"),
  workspace: $("workspace"),
  selectSheetBtn: $("selectSheetBtn"),
  changeSheetBtn: $("changeSheetBtn"),
  setupStatus: $("setupStatus"),
  video: $("video"),
  cameraMessage: $("cameraMessage"),
  serialInput: $("serialInput"),
  openDeviceBtn: $("openDeviceBtn"),
  cameraToggleBtn: $("cameraToggleBtn"),
  newScanBtn: $("newScanBtn"),
  serialLabel: $("serialLabel"),
  syncBar: $("syncBar"),
  progress: $("progress"),
  checklist: $("checklist"),
  emptyItems: $("emptyItems"),
  toast: $("toast"),
};
const state = {
  token: "",
  expires: 0,
  tokenClient: null,
  pickerReady: false,
  spreadsheetId: "",
  folderId: "",
  folderName: "",
  folderSelectionOnly: false,
  sheetTitle: "",
  items: [],
  logs: new Map(),
  serial: "",
  userName: "Googleユーザー",
  stream: null,
  reader: null,
  scanning: false,
  saving: false,
  pendingReload: false,
};
let saveQueue = Promise.resolve();
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function toast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => dom.toast.classList.remove("show"), 2600);
}
function friendlyError(text) {
  return /service is currently unavailable|backend error|503/i.test(
    String(text),
  )
    ? "Googleサービスが一時的に利用できません。通信状態を確認し、しばらく待ってから再試行してください。"
    : text;
}
function status(text, kind = "ready") {
  const target = $("syncText");
  if (target) target.textContent = friendlyError(text);
  else dom.syncBar.textContent = friendlyError(text);
  dom.syncBar.dataset.kind = kind;
}
function setupStatus(text, error = false) {
  dom.setupStatus.textContent = text;
  dom.setupStatus.classList.toggle("error", error);
}
function updateFolderUi() {
  const ready = Boolean(state.folderId),
    status = $("folderStatus");
  status.textContent = ready
    ? `保存先: ${state.folderName || state.folderId}`
    : "保存先が選択されていません";
  status.classList.toggle("selected", ready);
  dom.selectSheetBtn.disabled = !ready;
  $("createSheetBtn").disabled = !ready;
}
function initGoogle() {
  if (window.google?.accounts?.oauth2 && !state.tokenClient)
    state.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: () => {},
    });
  if (window.gapi && !state.pickerReady)
    gapi.load("picker", () => (state.pickerReady = true));
}
function authorize(forceAccount = false) {
  return new Promise((resolve, reject) => {
    initGoogle();
    if (!forceAccount && state.token && Date.now() < state.expires - 60000)
      return resolve();
    if (!state.tokenClient)
      return reject(
        new Error("Google認証の読み込み中です。数秒後に再試行してください。"),
      );
    if (forceAccount) {
      state.token = "";
      state.expires = 0;
    }
    state.tokenClient.callback = (r) => {
      if (r.error) return reject(new Error(r.error));
      state.token = r.access_token;
      state.expires = Date.now() + (Number(r.expires_in) || 3600) * 1000;
      localStorage.setItem("instachecklist-google-authorized-v2", "true");
      resolve();
    };
    const previouslyAuthorized =
      localStorage.getItem("instachecklist-google-authorized-v2") === "true";
    state.tokenClient.requestAccessToken({
      prompt: forceAccount
        ? "select_account"
        : state.token || previouslyAuthorized
          ? ""
          : "consent",
    });
  });
}
async function api(url, options = {}) {
  await authorize();
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${state.token}`,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = (await response.json()).error?.message || "";
    } catch {}
    throw new Error(detail || `Google API error (${response.status})`);
  }
  return response.status === 204 ? {} : response.json();
}
async function loadUser() {
  try {
    const u = await api("https://www.googleapis.com/oauth2/v3/userinfo");
    state.userName = u.name || u.email || state.userName;
  } catch {}
}
async function driveFile(id, fields = "id,name,parents,driveId") {
  return api(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`,
  );
}
async function verifySheetFolder(id) {
  if (!state.folderId)
    throw new Error("先に保存先フォルダを選択してください。");
  const file = await driveFile(id);
  if (!(file.parents || []).includes(state.folderId))
    throw new Error(
      "選択したSpreadsheetは指定した保存先フォルダ直下にありません。",
    );
}
async function chooseFolder() {
  try {
    await authorize();
    initGoogle();
    if (!state.pickerReady)
      throw new Error(
        "Google Pickerを準備中です。数秒後に再試行してください。",
      );
    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMimeTypes("application/vnd.google-apps.folder");
    new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(state.token)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setAppId(GOOGLE_APP_ID)
      .setOrigin(location.origin)
      .setTitle("保存先の共有フォルダを選択")
      .setCallback(async (data) => {
        if (data.action !== google.picker.Action.PICKED) {
          state.folderSelectionOnly = false;
          return;
        }
        try {
          const folder = await driveFile(
            data.docs[0].id,
            "id,name,driveId,shared,capabilities(canAddChildren)",
          );
          if (!folder.driveId && !folder.shared)
            throw new Error(
              "共有設定されていないフォルダです。共有フォルダまたは共有ドライブを選択してください。",
            );
          if (folder.capabilities?.canAddChildren === false)
            throw new Error(
              "このフォルダへファイルを追加する権限がありません。",
            );
          state.folderId = folder.id;
          state.folderName = folder.name || "選択済みフォルダ";
          localStorage.setItem("instachecklist-folder-id", state.folderId);
          localStorage.setItem("instachecklist-folder-name", state.folderName);
          updateFolderUi();
          if (!state.folderSelectionOnly) window.showStorageStep?.("file");
          setupStatus("保存先フォルダを選択しました");
        } catch (e) {
          setupStatus(e.message, true);
        } finally {
          state.folderSelectionOnly = false;
        }
      })
      .build()
      .setVisible(true);
  } catch (e) {
    state.folderSelectionOnly = false;
    setupStatus(e.message, true);
  }
}
async function chooseSheet() {
  try {
    if (!state.folderId)
      throw new Error("先に保存先の共有フォルダを選択してください。");
    await authorize();
    initGoogle();
    if (!state.pickerReady)
      throw new Error(
        "Google Pickerを準備中です。数秒後に再試行してください。",
      );
    const view = new google.picker.DocsView()
      .setMimeTypes("application/vnd.google-apps.spreadsheet")
      .setSelectFolderEnabled(false);
    new google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(state.token)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setAppId(GOOGLE_APP_ID)
      .setOrigin(location.origin)
      .setCallback(async (data) => {
        if (data.action !== google.picker.Action.PICKED) return;
        setupStatus("Spreadsheetを確認しています…");
        try {
          await verifySheetFolder(data.docs[0].id);
          state.spreadsheetId = data.docs[0].id;
          localStorage.setItem("instachecklist-sheet-id", state.spreadsheetId);
          await Promise.all([loadUser(), loadWorkbook()]);
          dom.setup.hidden = true;
          dom.scanner.hidden = false;
          document
            .getElementById("storageFlowModal")
            ?.classList.remove("is-open");
          document
            .getElementById("storageFlowModal")
            ?.setAttribute("aria-hidden", "true");
          setupStatus("接続済み");
          startCamera();
        } catch (e) {
          setupStatus(e.message, true);
        }
      })
      .build()
      .setVisible(true);
  } catch (e) {
    setupStatus(e.message, true);
  }
}
async function createSpreadsheet() {
  const createButton = $("createSheetBtn");
  dom.selectSheetBtn.disabled = true;
  createButton.disabled = true;
  setupStatus("新しいSpreadsheetを作成しています…");
  try {
    if (!state.folderId)
      throw new Error("先に保存先の共有フォルダを選択してください。");
    await authorize();
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14),
      metadata = {
        name: `InstaCheckList_${stamp}`,
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: [state.folderId],
      };
    const created = await api(
      "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      },
    );
    state.spreadsheetId = created.id;
    state.sheetTitle = "シート1";
    localStorage.setItem("instachecklist-sheet-id", state.spreadsheetId);
    const meta = await api(sheetsUrl("?fields=sheets.properties"));
    state.sheetTitle = meta.sheets[0].properties.title;
    await valuesUpdate(`${state.sheetTitle}!A1:I1`, [TEMPLATE_HEADERS]);
    await Promise.all([loadUser(), loadWorkbook()]);
    dom.setup.hidden = true;
    dom.scanner.hidden = false;
    $("sharingNotice").hidden = false;
    setupStatus("新しいチェックシートを作成しました");
    toast("同時作業する方を共有設定をしてください。");
    startCamera();
  } catch (e) {
    setupStatus(e.message || "Spreadsheetを作成できませんでした。", true);
  } finally {
    updateFolderUi();
  }
}
const sheetsUrl = (path = "") =>
  `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(state.spreadsheetId)}${path}`;
async function batchUpdate(requests) {
  return api(sheetsUrl(":batchUpdate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
}
async function valuesGet(range) {
  return api(
    sheetsUrl(`/values/${encodeURIComponent(range)}?majorDimension=ROWS`),
  );
}
async function valuesUpdate(range, values) {
  return api(
    sheetsUrl(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    },
  );
}
async function loadWorkbook() {
  const meta = await api(sheetsUrl("?fields=sheets.properties"));
  const visible = meta.sheets.find(
    (s) => s.properties.title !== LOG_SHEET && !s.properties.hidden,
  );
  if (!visible) throw new Error("作業用シートが見つかりません。");
  state.sheetTitle = visible.properties.title;
  await ensureLogSheet(meta.sheets);
  await loadItems();
  await window.loadChecklistSettings?.();
  if (state.serial) await loadLogs();
}
async function ensureLogSheet(sheets) {
  if (sheets.some((s) => s.properties.title === LOG_SHEET)) return;
  await batchUpdate([
    { addSheet: { properties: { title: LOG_SHEET, hidden: true } } },
  ]);
  await valuesUpdate(`${LOG_SHEET}!A1:H1`, [
    [
      "シリアル番号",
      "項目ID",
      "完了日時",
      "ユーザー名",
      "固有値",
      "作業メモ",
      "大項目",
      "項目名",
    ],
  ]);
}
function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
async function loadItems() {
  const data = await valuesGet(`${state.sheetTitle}!A:J`);
  const rows = data.values || [];
  const expected = [
    "有効/無効",
    "順番",
    "大項目",
    "中項目/参照値",
    "小項目/参照値",
    "作業指示補足",
    "作業確認",
    "固有値(MACアドレスなど)",
    "作業メモ",
  ];
  if (
    !rows[0] ||
    expected.some((h, i) => String(rows[0][i] || "").trim() !== h)
  )
    throw new Error("タイトル行（A1:I1）が指定の形式と一致しません。");
  const idWrites = [];
  state.items = rows
    .slice(1)
    .map((r, index) => {
      let id = r[9];
      if (!id) {
        id = uuid();
        idWrites.push({
          range: `${state.sheetTitle}!J${index + 2}`,
          values: [[id]],
        });
      }
      return {
        row: index + 2,
        id,
        enabled: /^(有効|true|1|yes|on|✓)$/i.test(String(r[0] || "").trim()),
        order: r[1] || index + 1,
        major: r[2] || "",
        middle: r[3] || "",
        small: r[4] || "",
        instruction: r[5] || "",
        confirm: r[6] || "",
        uniqueLabel: r[7] || "",
        memoDefault: r[8] || "",
      };
    })
    .filter((x) => x.enabled)
    .sort(
      (a, b) =>
        Number(a.order) - Number(b.order) ||
        String(a.order).localeCompare(String(b.order), "ja"),
    );
  if (idWrites.length)
    await api(sheetsUrl("/values:batchUpdate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valueInputOption: "RAW", data: idWrites }),
    });
  if (rows[0][9] !== ITEM_ID_HEADER)
    await valuesUpdate(`${state.sheetTitle}!J1`, [[ITEM_ID_HEADER]]);
}
async function loadLogs(renderNow = true) {
  const data = await valuesGet(`${LOG_SHEET}!A:H`);
  state.logs.clear();
  (data.values || []).slice(1).forEach((r, index) => {
    if (String(r[0]) === state.serial)
      state.logs.set(String(r[1]), {
        row: index + 2,
        date: r[2] || "",
        user: r[3] || "",
        unique: r[4] || "",
        memo: r[5] || "",
      });
  });
  if (renderNow) render();
}
function render() {
  let lastMajor = "";
  dom.checklist.innerHTML = state.items
    .map((item) => {
      const log = state.logs.get(item.id),
        configured=window.getChecklistItemAction?.(item.id),needsMemo=configured?configured==="input":/^(true|1|yes|on)$/i.test(String(item.uniqueLabel).trim()),
        audit = log
          ? `<span class="check-audit">${esc(log.date)}<br>${esc(log.user)}</span>`
          : "";
      const heading =
        item.major !== lastMajor
          ? `<h2 class="group-title">${esc(item.major || "チェック項目")}</h2>`
          : "";
      lastMajor = item.major;
      const result = needsMemo
        ? `<div class="fields"><label>作業メモ <span class="required">必須</span><textarea class="memo" rows="2">${esc(log?.memo || item.memoDefault)}</textarea></label></div>${log ? `<p class="audit">✓ ${esc(log.date)}　${esc(log.user)}</p>` : ""}`
        : `<div class="check-cluster"><button class="check-btn" aria-label="完了を切り替える">✓</button>${audit}</div>`;
      return `${heading}<article class="item ${log ? "done" : ""} ${needsMemo ? "memo-required" : ""}" data-id="${esc(item.id)}"><div class="item-top"><div><span class="order">${esc(item.order)}</span><h3>${esc(item.small || item.middle || "名称未設定")}</h3>${item.middle && item.small ? `<p class="middle">${esc(item.middle)}</p>` : ""}${item.instruction ? `<p class="instruction">${esc(item.instruction)}</p>` : ""}</div></div><div class="worker-area">${result}</div></article>`;
    })
    .join("");
  dom.emptyItems.hidden = state.items.length > 0;
  dom.checklist
    .querySelectorAll(".check-btn")
    .forEach((b) =>
      b.addEventListener("click", () => toggleItem(b.closest(".item"))),
    );
  dom.checklist
    .querySelectorAll(".memo-required .memo")
    .forEach((m) =>
      m.addEventListener("change", () => saveMemoItem(m.closest(".item"))),
    );
  updateProgress();
}
function updateProgress() {
  const done = dom.checklist.querySelectorAll(".item.done").length,
    total = state.items.length;
  dom.progress.firstElementChild.style.width = `${total ? (done / total) * 100 : 0}%`;
  const label = $("syncProgress");
  if (label) label.textContent = `${done}/${total} 確認済み`;
}
function enqueueSave(task) {
  state.saving = true;
  saveQueue = saveQueue.then(task, task).finally(() => {
    state.saving = false;
  });
  return saveQueue;
}
function localDate() {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(new Date());
}
function toggleItem(el) {
  const id = el.dataset.id;
  el.classList.toggle("done");
  updateProgress();
  status("保存中…", "saving");
  enqueueSave(async () => {
    try {
      await loadItems();
      await loadLogs(false);
      const item = state.items.find((x) => x.id === id),
        existing = state.logs.get(id);
      if (!item)
        throw new Error(
          "この項目はSpreadsheet側で削除または無効化されました。",
        );
      if (existing) {
        await batchUpdate([
          {
            deleteDimension: {
              range: {
                sheetId: await logSheetId(),
                dimension: "ROWS",
                startIndex: existing.row - 1,
                endIndex: existing.row,
              },
            },
          },
        ]);
        state.logs.delete(id);
      } else {
        const date = localDate();
        await api(
          sheetsUrl(
            `/values/${encodeURIComponent(LOG_SHEET + "!A:H")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
          ),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              values: [
                [
                  state.serial,
                  id,
                  date,
                  state.userName,
                  "",
                  "",
                  item.major,
                  item.small || item.middle,
                ],
              ],
            }),
          },
        );
        state.logs.set(id, {
          date,
          user: state.userName,
          unique: "",
          memo: "",
        });
      }
      await loadItems();
      await loadLogs();
      status(`保存済み · ${new Date().toLocaleTimeString("ja-JP")}`, "saved");
    } catch (e) {
      await loadLogs().catch(() => render());
      status(`保存失敗: ${e.message}`, "error");
      toast(e.message || "保存できませんでした。");
    }
  });
}
function saveMemoItem(el) {
  const id = el.dataset.id,
    input = el.querySelector(".memo"),
    memo = input.value.trim();
  let error = el.querySelector(".item-validation-error");
  if (!error) {
    error = document.createElement("p");
    error.className = "validation-error item-validation-error";
    input.after(error);
  }
  if (!memo) {
    error.textContent = "作業メモを入力してください。";
    toast(error.textContent);
    return;
  }
  const validation = window.validateItemValue?.(id, memo);
  error.textContent = validation || "";
  if (validation) {
    toast(validation);
    input.focus();
    return;
  }
  el.classList.add("done");
  updateProgress();
  status("保存中…", "saving");
  enqueueSave(async () => {
    try {
      await loadItems();
      await loadLogs(false);
      const item = state.items.find((x) => x.id === id),
        existing = state.logs.get(id);
      if (!item)
        throw new Error(
          "この項目はSpreadsheet側で削除または無効化されました。",
        );
      const date = localDate(),
        row = [
          state.serial,
          id,
          date,
          state.userName,
          "",
          memo,
          item.major,
          item.small || item.middle,
        ];
      if (existing)
        await valuesUpdate(`${LOG_SHEET}!A${existing.row}:H${existing.row}`, [
          row,
        ]);
      else
        await api(
          sheetsUrl(
            `/values/${encodeURIComponent(LOG_SHEET + "!A:H")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
          ),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ values: [row] }),
          },
        );
      state.logs.set(id, {
        row: existing?.row,
        date,
        user: state.userName,
        unique: "",
        memo,
      });
      await loadItems();
      await loadLogs();
      status(`保存済み · ${new Date().toLocaleTimeString("ja-JP")}`, "saved");
    } catch (e) {
      await loadLogs().catch(() => render());
      status(`保存失敗: ${e.message}`, "error");
      toast(e.message || "保存できませんでした。");
    }
  });
}
async function logSheetId() {
  const m = await api(sheetsUrl("?fields=sheets.properties"));
  return m.sheets.find((s) => s.properties.title === LOG_SHEET).properties
    .sheetId;
}
async function openDevice(serial = dom.serialInput.value.trim()) {
  const error = $("serialValidationError");
  if (!serial) {
    if (error) error.textContent = "シリアル番号を入力してください。";
    return toast("シリアル番号を入力してください。");
  }
  const validation = window.validateSerial?.(serial);
  if (error) error.textContent = validation || "";
  if (validation) {
    toast(validation);
    dom.serialInput.focus();
    return;
  }
  state.serial = serial;
  dom.serialLabel.textContent = serial;
  dom.scanner.hidden = true;
  dom.workspace.hidden = false;
  stopCamera();
  status("最新データを読み込み中…");
  try {
    await loadItems();
    await window.loadChecklistSettings?.();
    await loadLogs();
    status("準備完了");
  } catch (e) {
    status(e.message, "error");
  }
}
async function startCamera() {
  if (state.stream) return;
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
      audio: false,
    });
    dom.video.srcObject = state.stream;
    await dom.video.play();
    dom.cameraMessage.hidden = true;
    state.scanning = true;
    scanLoop();
  } catch {
    dom.cameraMessage.textContent =
      "カメラを利用できません。手入力してください。";
  }
}
function stopCamera() {
  state.scanning = false;
  state.stream?.getTracks().forEach((t) => t.stop());
  state.stream = null;
  dom.video.srcObject = null;
}
async function scanLoop() {
  if (!state.scanning) return;
  try {
    if ("BarcodeDetector" in window) {
      const detector =
        scanLoop.detector ||
        (scanLoop.detector = new BarcodeDetector({
          formats: [
            "code_128",
            "code_39",
            "ean_13",
            "ean_8",
            "qr_code",
            "data_matrix",
          ],
        }));
      const codes = await detector.detect(dom.video);
      if (codes[0]?.rawValue) {
        dom.serialInput.value = codes[0].rawValue;
        openDevice(codes[0].rawValue);
        return;
      }
    } else if (window.ZXing) {
      state.reader = state.reader || new ZXing.BrowserMultiFormatReader();
      const result = await state.reader
        .decodeOnceFromVideoElement(dom.video)
        .catch(() => null);
      if (result) {
        openDevice(result.text);
        return;
      }
    }
  } catch {}
  if (state.scanning) setTimeout(scanLoop, 250);
}
function moveToNextDevice() {
  state.serial = "";
  state.logs.clear();
  dom.workspace.hidden = true;
  dom.scanner.hidden = false;
  dom.serialInput.value = "";
  startCamera();
}
$("selectFolderBtn").addEventListener("click", chooseFolder);
dom.selectSheetBtn.addEventListener("click", chooseSheet);
dom.changeSheetBtn.addEventListener("click", chooseSheet);
dom.openDeviceBtn.addEventListener("click", () => openDevice());
dom.serialInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") openDevice();
});
dom.cameraToggleBtn.addEventListener("click", () =>
  state.stream ? stopCamera() : startCamera(),
);
dom.newScanBtn.addEventListener("click", () => {
  const pending = state.items.filter((i) => !state.logs.has(i.id));
  if (!pending) return moveToNextDevice();
  $("incompleteList").innerHTML = pending
    .map((i) => `<li>${esc(i.small || i.middle || "名称未設定")}</li>`)
    .join("");
  $("incompleteModal").classList.add("is-open");
});
$("cancelNewDeviceBtn").addEventListener("click", () =>
  $("incompleteModal").classList.remove("is-open"),
);
$("confirmNewDeviceBtn").addEventListener("click", () => {
  $("incompleteModal").classList.remove("is-open");
  moveToNextDevice();
});
window.addEventListener("load", initGoogle);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopCamera();
});
