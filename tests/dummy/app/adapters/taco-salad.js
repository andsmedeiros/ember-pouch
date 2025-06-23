import ApplicationAdapter from './application';

export default class TacoSaladAdapter extends ApplicationAdapter {
  async unloadedDocumentChanged(obj) {
    const recordModel = this.store.modelFor(obj.type);
    const recordTypeName = this.getRecordTypeName(recordModel);
    const doc = await this.db.rel.find(recordTypeName, obj.id);
    await this.store.pushPayload(recordTypeName, doc);
  }
}
