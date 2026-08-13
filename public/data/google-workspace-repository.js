(function (root) {
  "use strict";
  const Base = root.InstaCheckListRepository.ChecklistRepository;
  const core = root.InstaCheckListCore;

  class GoogleWorkspaceRepository extends Base {
    constructor(gateway) {
      super();
      this.gateway = gateway;
    }
    async listItems() {
      const title = this.gateway.getSheetTitle();
      const data = await this.gateway.valuesGet(`${title}!A:J`);
      const parsed = core.parseItemRows(data.values || [], this.gateway.createId);
      if (parsed.headerErrors.length) {
        const error = new Error("タイトル行（A1:I1）が指定の形式と一致しません。");
        error.code = "INVALID_TEMPLATE_HEADER";
        error.details = parsed.headerErrors;
        throw error;
      }
      if (parsed.idWrites.length) {
        await this.gateway.batchValuesUpdate(parsed.idWrites.map(({ row, id }) => ({
          range: `${title}!J${row}`, values: [[id]],
        })));
      }
      const header = (data.values || [])[0] || [];
      if (header[9] !== core.ITEM_ID_HEADER)
        await this.gateway.valuesUpdate(`${title}!J1`, [[core.ITEM_ID_HEADER]]);
      return parsed.items;
    }
    async listDeviceResults(serial) {
      const data = await this.gateway.valuesGet(`${core.SHEETS.log}!A:H`);
      return core.parseLogRows(data.values || [], serial);
    }
  }

  root.InstaCheckListGoogleRepository = Object.freeze({ GoogleWorkspaceRepository });
})(globalThis);
