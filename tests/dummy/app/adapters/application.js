import { defer } from 'rsvp';
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

export default class ApplicationAdapter extends Adapter {
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

  onChangeListenerTest = null;
  async onChange() {
    if (super.onChange) {
      await super.onChange(...arguments);
    }
    if (this.onChangeListenerTest) {
      this.onChangeListenerTest(...arguments);
    }
  }

  waitForChangeWithID(id) {
    let defered = defer();
    this.onChangeListenerTest = (c) => {
      if (c.id === id) {
        this.onChangeListenerTest = null;
        defered.resolve(c);
      }
    };
    return defered.promise;
  }
}
