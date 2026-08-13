(function (root) {
  "use strict";
  class ChecklistRepository {
    async getProject() { throw new Error("getProject() is not implemented"); }
    async listItems() { throw new Error("listItems() is not implemented"); }
    async listDeviceResults() { throw new Error("listDeviceResults() is not implemented"); }
    async saveDeviceResult() { throw new Error("saveDeviceResult() is not implemented"); }
    async deleteDeviceResult() { throw new Error("deleteDeviceResult() is not implemented"); }
    async listPhotos() { throw new Error("listPhotos() is not implemented"); }
    async savePhoto() { throw new Error("savePhoto() is not implemented"); }
  }
  root.InstaCheckListRepository = Object.freeze({ ChecklistRepository });
})(globalThis);
