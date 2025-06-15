import { run } from '@ember/runloop';
import { assert } from '@ember/debug';
import { isEmpty } from '@ember/utils';
import { Adapter } from 'ember-pouch';
import PouchDB from 'dummy/pouchdb';
import config from 'dummy/config/environment';

function createDb() {
  let localDb = config.emberPouch.localDb;

  assert('emberPouch.localDb must be set', !isEmpty(localDb));

  let db = new PouchDB(localDb);

  if (config.emberPouch.remote) {
    let remoteDb = new PouchDB(config.emberPouch.remoteDb);

    db.sync(remoteDb, {
      live: true,
      retry: true,
    });
  }

  return db;
}

export default class TacoSaladAdapter extends Adapter {
  constructor(owner) {
    super(owner, createDb());
  }

  prepare(store, type, indexPromises) {
    type.eachRelationship((name, rel) => {
      rel.options.async = config.emberPouch.async;
      if (rel.kind === 'hasMany') {
        rel.options.save = config.emberPouch.saveHasMany;
      }
    });

    return super.prepare(store, type, indexPromises);
  }

  async unloadedDocumentChanged(obj) {
    const recordModel = this.store.modelFor(obj.type);
    const recordTypeName = this.getRecordTypeName(recordModel);
    const doc = await this.db.rel.find(recordTypeName, obj.id)
    await this.store.pushPayload(recordTypeName, doc);
  }
}
