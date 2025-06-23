import { assert } from '@ember/debug';
import { isPresent } from '@ember/utils';
import { Adapter, PouchDB } from 'ember-pouch';
import config from 'dummy/config/environment';

function createDatabase() {
  const {
    localDb: localDatabasePath,
    remoteDb: remoteDatabasePath,
    remote = false,
  } = config.emberPouch ?? {};
  assert('emberPouch.localDb must be set', isPresent(localDatabasePath));

  const localDb = new PouchDB(localDatabasePath);

  if (remote) {
    const remoteDb = new PouchDB(remoteDatabasePath);
    localDb.sync(remoteDb, {
      live: true,
      retry: true,
    });
  }

  return localDb;
}

export default class ApplicationAdapter extends Adapter {
  #eventRelay = new EventTarget();

  constructor(owner) {
    super(owner, createDatabase());
  }

  prepare(store, type) {
    const { async = true, saveHasMany = false } = config.emberPouch ?? {};
    for (const [_name, relationship] of type.relationshipsByName) {
      relationship.options.async = async;

      if (relationship.kind === 'hasMany') {
        relationship.options.save = saveHasMany;
      }
    }

    return super.prepare(store, type);
  }

  async onChange(target) {
    await super.onChange(target);
    this.#eventRelay.dispatchEvent(
      new CustomEvent('change', { detail: target }),
    );
  }

  waitForChangeWithID(id) {
    return new Promise((resolve) => {
      const listener = ({ detail: target }) => {
        if (target.id === id) {
          resolve(target);
        }
      };

      this.#eventRelay.addEventListener('change', listener, {
        once: true,
      });
    });
  }
}
