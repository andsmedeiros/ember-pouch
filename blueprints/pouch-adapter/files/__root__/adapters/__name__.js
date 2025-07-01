import config from '<%= dasherizedPackageName %>/config/environment';
import { Adapter, PouchDB } from 'ember-pouch';
import { assert } from '@ember/debug';
import { isPresent } from '@ember/utils';

const localDatabasePath = config.emberPouch?.localDb;
assert(
  '<%= classifiedModuleName %>Adapter is configured to load the database path from ' +
  'config.emberPouch.localDb, but this was not set. \n' +
  'Either configure the local database path or manually override this setting',
  isPresent(localDatabasePath)
);

const localDatabase = new PouchDB(localDatabasePath);

export default class <%= classifiedModuleName %>Adapter extends Adapter {
  constructor(owner) {
    super(owner, localDatabase);

    if (isPresent(config.emberPouch?.remoteDb)) {
      const remoteDatabase = new PouchDB(config.emberPouch.remoteDb);

      localDatabase.sync(remoteDatabase, {
        live: true,
        retry: true
      });
    }
  }

  // By default, Ember-pouch does not push changes from records not tracked
  // by EmberData into the store, even though they are stored into the local
  // database.
  // If you wish to override this method and immediately load any changes into
  // EmberData's store, even for records not queried yet, uncomment the
  // following method.

  // async unloadedDocumentChanged(obj) {
  //   const recordTypeName = this.getRecordTypeName(this.store.modelFor(obj.type));
  //   const doc = await this.db.rel.find(recordTypeName, obj.id)
  //   this.store.pushPayload(recordTypeName, doc);
  // }
}
